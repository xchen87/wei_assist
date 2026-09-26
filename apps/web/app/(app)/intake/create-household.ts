"use server";

import { prisma } from "@meridian/db";
import { revalidatePath } from "next/cache";
import { scoreRiskTolerance, type RiskAnswers } from "@/lib/calc/risk";
import { centsToNumber, parseDollarsToCents } from "@/lib/format/money";

/** Turn a completed intake into a real household (M-demo item 1).
 *
 * The hard part was never the insert — it is what the seventy-odd fields
 * the wizard doesn't collect should start as. Two options were available:
 * invent plausible figures so every section renders like a seeded
 * household, or start them empty and let the completeness rings say so.
 * Empty wins, and not only because inventing a household's allocation is
 * the exact failure CLAUDE.md §1 calls a bug: a brand-new household that
 * reads as 90% complete is a lie the advisor has to un-believe, while one
 * that reads as 23% complete is a worklist.
 *
 * So: figures the wizard actually collected are carried across, everything
 * downstream of a custodian feed is zero, and per-section completeness is
 * computed from what was genuinely provided rather than seeded.
 */

export type IntakeMember = {
  name: string;
  role: string;
  birthDate: string;
  occupation: string;
  annualIncome: string;
  annualExpenses: string;
  risk: RiskAnswers;
};

export type IntakeGoal = { name: string; priority: string; horizon: string };

export type IntakeHolding = {
  ticker: string;
  name: string;
  assetClass: string;
  kind: string;
  marketValue: string;
  costBasis: string;
};

export type IntakeAccount = {
  name: string;
  kind: string;
  custodian: string;
  ownerName: string;
  holdings: IntakeHolding[];
};

export type IntakeProperty = { label: string; value: string; mortgage: string };
export type IntakeOtherAsset = { label: string; value: string };

export type IntakePayload = {
  name: string;
  segment: string;
  advisorId: string;
  prospectId: string | null;
  members: IntakeMember[];
  goals: IntakeGoal[];
  accounts: IntakeAccount[];
  properties: IntakeProperty[];
  otherAssets: IntakeOtherAsset[];
  otherLiabilities: string;
  /** The opening analysis, when the advisor ran one. Filed against the
   * household as an activity entry so it sits in the record's timeline
   * rather than only in the browser tab it was written in. */
  analysis: { report: string; instruction: string } | null;
};

const TAX_TREATMENT: Record<string, string> = {
  Taxable: "Taxable",
  Trust: "Taxable",
  TraditionalIRA: "TaxDeferred",
  Retirement401k: "TaxDeferred",
  RothIRA: "TaxFree",
  Education529: "TaxFree",
};

export type CreateResult = { ok: true; householdId: string } | { ok: false; error: string };

function ageFrom(birthDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const dob = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const had =
    now.getUTCMonth() > dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() >= dob.getUTCDate());
  if (!had) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

const sum = (values: (bigint | null)[]) => values.reduce<bigint>((total, v) => total + (v ?? 0n), 0n);

/**
 * What the entered accounts add up to.
 *
 * Every figure the Allocation section states about a household is derived
 * from its positions rather than stored beside them (D-029), and a
 * household created here has to arrive holding to that: the asset mix,
 * the distinct-holdings count and the largest position are all read back
 * off what was typed, so the summary and the holdings table agree on day
 * one exactly as they do for a seeded household.
 */
function summariseIntakeAccounts(accounts: IntakeAccount[]) {
  const byClass: Record<string, bigint> = {};
  const byTicker = new Map<string, { ticker: string; name: string; cents: bigint }>();
  let totalCents = 0n;

  for (const account of accounts) {
    for (const holding of account.holdings) {
      const value = parseDollarsToCents(holding.marketValue);
      const ticker = holding.ticker.trim().toUpperCase();
      if (value === null || value <= 0n || !ticker) continue;
      byClass[holding.assetClass] = (byClass[holding.assetClass] ?? 0n) + value;
      totalCents += value;
      const existing = byTicker.get(ticker);
      if (existing) existing.cents += value;
      else byTicker.set(ticker, { ticker, name: holding.name.trim() || ticker, cents: value });
    }
  }

  const pct: Record<string, number> = {};
  if (totalCents > 0n) {
    for (const [cls, cents] of Object.entries(byClass)) {
      // Ratios are number math; convert before dividing (D-023).
      pct[cls] = Math.round((centsToNumber(cents) / centsToNumber(totalCents)) * 1000) / 10;
    }
  }

  // Largest by *security*, not by position: a name held in two accounts is
  // one holding of that name (D-030).
  const largest = [...byTicker.values()].reduce<{ ticker: string; name: string; cents: bigint } | null>(
    (max, h) => (max === null || h.cents > max.cents ? h : max),
    null,
  );

  return {
    totalCents,
    pct,
    distinctHoldings: byTicker.size,
    largest,
    largestPct:
      largest && totalCents > 0n
        ? Math.round((centsToNumber(largest.cents) / centsToNumber(totalCents)) * 1000) / 10
        : 0,
  };
}

export async function createHouseholdFromIntake(payload: IntakePayload): Promise<CreateResult> {
  const name = payload.name.trim();
  const members = payload.members.filter((m) => m.name.trim());
  const goals = payload.goals.filter((g) => g.name.trim());

  if (!name) return { ok: false, error: "The household needs a name." };
  if (members.length === 0) return { ok: false, error: "Add at least one member." };

  const advisor = await prisma.advisor.findUnique({ where: { id: payload.advisorId } });
  if (!advisor) return { ok: false, error: "Pick an advisor for this household." };

  const income = sum(members.map((m) => parseDollarsToCents(m.annualIncome)));
  const expenses = sum(members.map((m) => parseDollarsToCents(m.annualExpenses)));
  const savings = income > expenses ? income - expenses : 0n;

  // The balance sheet is the sum of what was itemised, never a figure
  // typed twice. Accounts, property and other assets each carry their own
  // rows; a household that skipped a step simply has nothing there, which
  // the completeness rings then say out loud.
  const portfolio = summariseIntakeAccounts(payload.accounts);
  const realEstate = sum(payload.properties.map((p) => parseDollarsToCents(p.value)));
  const mortgages = sum(payload.properties.map((p) => parseDollarsToCents(p.mortgage)));
  const otherAssetsCents = sum(payload.otherAssets.map((a) => parseDollarsToCents(a.value)));
  const otherLiabilities = parseDollarsToCents(payload.otherLiabilities) ?? 0n;

  const assets = portfolio.totalCents + realEstate + otherAssetsCents;
  const liabilities = mortgages + otherLiabilities;
  const netWorth = assets - liabilities;

  const hasCashflow = income > 0n || expenses > 0n;
  const hasBalance = assets > 0n || liabilities > 0n;
  const hasPortfolio = portfolio.totalCents > 0n;
  const membersComplete = members.filter((m) => m.birthDate && m.occupation.trim()).length;
  const riskComplete = members.filter((m) => scoreRiskTolerance(m.risk).complete).length;

  // Completeness reflects what is on file, nothing more. Sections that need
  // a custodian feed, a document, or a planning conversation start at zero —
  // which is the true answer on day one.
  //
  // Two different numbers, and conflating them was the first bug here: the
  // Household *section* can legitimately be 100% when every member has a
  // name, a date of birth, an occupation and a completed questionnaire,
  // while plan health is the roll-up across all twelve sections and should
  // read around 18% for a household created this morning. Showing the
  // section score as plan health made a brand-new household look finished.
  const householdPct = Math.round(
    (members.length > 0 ? 40 : 0) +
      (membersComplete / members.length) * 40 +
      (riskComplete / members.length) * 20,
  );

  const sectionCompleteness = {
    householdCompletenessPct: householdPct,
    cashflowCompletenessPct: hasCashflow ? 45 : 0,
    balanceCompletenessPct: hasBalance ? 35 : 0,
    // Every figure the Allocation section states is derived from these
    // positions (D-029), so the section is as complete as the holdings
    // are — and honestly zero when none were entered.
    allocationCompletenessPct: hasPortfolio ? 60 : 0,
    goalsCompletenessPct: goals.length > 0 ? 30 : 0,
    retirementCompletenessPct: 0,
    taxCompletenessPct: 0,
    protectionCompletenessPct: 0,
    estateCompletenessPct: 0,
    documentsCompletenessPct: 0,
    activityCompletenessPct: 10,
    complianceCompletenessPct: 0,
  };

  const sectionValues = Object.values(sectionCompleteness);
  // The same mean the Overview ring shows in its centre, so the two agree.
  const planHealthPct = Math.round(sectionValues.reduce((a, b) => a + b, 0) / sectionValues.length);

  // Review cadence starts a quarter out: the first review is the natural
  // next step after onboarding, and an empty next-review date would make
  // this household invisible to Schedule and the Reviews widget.
  const nextReview = new Date();
  nextReview.setUTCMonth(nextReview.getUTCMonth() + 3);
  nextReview.setUTCHours(0, 0, 0, 0);

  const household = await prisma.household.create({
    data: {
      name,
      segment: payload.segment,
      advisorId: advisor.id,
      clientSinceYear: new Date().getUTCFullYear(),

      // Nothing is custodied on day one. AUM stays zero until a feed or a
      // manual account entry says otherwise — the Clients list showing $0
      // is the honest reading, not a bug.
      aumCents: portfolio.totalCents,
      heldAwayCents: 0n,
      netWorthCents: netWorth,
      ytdReturnPct: 0,
      cashPct: portfolio.pct.Cash ?? 0,
      // A target mix comes out of the first planning conversation and the
      // IPS that follows it, not out of an intake form. Zero here means
      // "not agreed yet", and the drift reading below says so.
      targetCashPct: 0,
      driftPct: 0,
      planHealthPct,
      lastContactDays: 0,
      nextReviewDate: nextReview,
      reviewStatus: "scheduled",
      completenessPct: planHealthPct,
      whatChanged: "Household created from intake\nNo plan sections completed yet",

      incomeCents: income,
      // Taxes aren't assessed at intake, so net income is income until a
      // tax position exists. Zero here means "not yet known", and the Tax
      // section's completeness says so.
      taxesCents: 0n,
      netIncomeCents: income,
      spendingCents: expenses,
      savingsCents: savings,
      // A ratio, not money: convert both sides before dividing, since
      // bigint division truncates (D-023).
      savingsRatePct:
        income > 0n ? Math.round((centsToNumber(savings) / centsToNumber(income)) * 1000) / 10 : 0,

      balanceStartCents: 0n,
      balanceContributionsCents: 0n,
      balanceGrowthCents: 0n,
      balanceTaxesCents: 0n,
      balanceSpendingCents: 0n,
      investmentAccountsCents: portfolio.totalCents,
      realEstateCents: realEstate,
      // Cash the household holds is a position in an account like any
      // other, so it is inside the portfolio rather than beside it.
      cashCents: 0n,
      otherAssetsCents,
      mortgageCents: mortgages + otherLiabilities,

      equityTargetPct: 0,
      equityActualPct: portfolio.pct.Equity ?? 0,
      fixedIncomeTargetPct: 0,
      fixedIncomeActualPct: portfolio.pct.FixedIncome ?? 0,
      topHoldingName: portfolio.largest?.name ?? "—",
      topHoldingTicker: portfolio.largest?.ticker ?? "—",
      topHoldingPct: portfolio.largestPct,
      distinctHoldings: portfolio.distinctHoldings,
      blendedExpenseRatioPct: 0,

      retirementAgePrimary: 65,
      retirementAgeSpouse: null,
      ssClaimAgePrimary: 67,
      ssClaimAgeSpouse: null,
      monthlySpendingNeedCents: 0n,
      withdrawalSequencing: "Not set",
      retirementSuccessDeltaPts: 0,

      filingStatus: "Not set",
      taxableIncomeCents: 0n,
      effectiveRatePct: 0,
      realizedGainsCents: 0n,
      unrealizedGainsCents: 0n,
      harvestableLossesCents: 0n,

      ...sectionCompleteness,

      members: {
        create: members.map((m) => ({
          name: m.name.trim(),
          role: m.role,
          age: ageFrom(m.birthDate) ?? 0,
          occupation: m.occupation.trim() || "Not given",
          birthDate: m.birthDate ? new Date(`${m.birthDate}T00:00:00Z`) : null,
          riskProfile: scoreRiskTolerance(m.risk).profile,
        })),
      },
      goals: {
        create: goals.map((g) => ({
          name: g.name.trim(),
          priority: g.priority,
          // Named, not costed: the target and funded percentage come out of
          // the first planning conversation, not the intake form.
          targetCents: null,
          fundedPct: 0,
          status: "unset",
          horizonLabel: g.horizon,
        })),
      },
      activityEvents: {
        create: [
          {
            kind: "PlanChange",
            label: "Household created from intake",
            detail: payload.prospectId ? "Converted from a prospect at Agreement stage." : null,
            occurredAt: new Date(),
          },
          ...(payload.analysis
            ? [
                {
                  kind: "Note",
                  label: "Opening analysis drafted at intake",
                  detail: payload.analysis.instruction.trim()
                    ? `Advisor's instruction: ${payload.analysis.instruction.trim()}\n\n${payload.analysis.report}`
                    : payload.analysis.report,
                  occurredAt: new Date(),
                },
              ]
            : []),
        ],
      },
      // The worklist this household starts with, written as insights so it
      // shows up in Tasks and on each section exactly like every other
      // open item in the app.
      insights: {
        create: [
          {
            section: "Allocation",
            text: hasPortfolio
              ? `${portfolio.distinctHoldings} position${portfolio.distinctHoldings === 1 ? "" : "s"} entered at intake across ${payload.accounts.filter((a) => a.holdings.some((h) => parseDollarsToCents(h.marketValue))).length} account(s). No target allocation is agreed yet, so drift can't be measured — set one in the IPS at the first review.`
              : "No accounts are on file yet — allocation, drift, and AUM stay empty until this household's accounts are connected or entered.",
            sourceLabel: "Intake, today",
          },
          {
            section: "Goals",
            text:
              goals.length > 0
                ? `${goals.length} goal${goals.length === 1 ? "" : "s"} captured at intake without target amounts — worth costing them at the first planning meeting.`
                : "No goals captured yet — worth agreeing the first two or three at the opening meeting.",
            sourceLabel: "Intake, today",
          },
          {
            section: "Compliance",
            text: "Onboarding documents aren't on file yet: IPS, advisory agreement, and disclosures all need to be issued and signed.",
            sourceLabel: "Intake, today",
          },
        ],
      },
    },
    select: { id: true, members: { select: { id: true, name: true } } },
  });

  // Accounts and their positions, after the household exists so members
  // have ids to own them. A security the firm has never held before is
  // created here rather than rejected: a client arrives holding what they
  // hold, and a closed catalogue would send the advisor to a spreadsheet.
  await createAccounts(household.id, household.members, payload.accounts);

  // A converted prospect shouldn't stay in the pipeline competing for
  // attention with live ones. Anything on the calendar or the worklist for
  // the prospect follows it to the household first — a signing meeting
  // booked last week is still a meeting with these people.
  if (payload.prospectId) {
    const moved = { where: { prospectId: payload.prospectId }, data: { prospectId: null, householdId: household.id } };
    await prisma.meeting.updateMany(moved);
    await prisma.task.updateMany(moved);
    await prisma.prospect.deleteMany({ where: { id: payload.prospectId } });
    revalidatePath("/prospects");
  }

  revalidatePath("/clients");
  revalidatePath("/today");
  return { ok: true, householdId: household.id };
}

async function createAccounts(
  householdId: string,
  members: { id: string; name: string }[],
  accounts: IntakeAccount[],
) {
  let sortOrder = 0;

  for (const account of accounts) {
    const holdings = account.holdings.filter(
      (h) => h.ticker.trim() && (parseDollarsToCents(h.marketValue) ?? 0n) > 0n,
    );
    // An account with nothing in it is a row the advisor started and
    // abandoned, not a statement that the account is empty.
    if (holdings.length === 0) continue;

    const owner = members.find((m) => m.name === account.ownerName.trim());
    const created = await prisma.account.create({
      data: {
        householdId,
        name: account.name.trim() || "Account",
        kind: account.kind,
        taxTreatment: TAX_TREATMENT[account.kind] ?? "Taxable",
        custodian: account.custodian.trim() || "Not given",
        ownerMemberId: owner?.id ?? null,
        openedYear: new Date().getUTCFullYear(),
        sortOrder: sortOrder++,
      },
      select: { id: true },
    });

    // One position per security per account, so two rows for the same
    // ticker in one account merge rather than collide with the unique
    // constraint.
    const merged = new Map<string, { marketValue: bigint; costBasis: bigint; row: IntakeHolding }>();
    for (const holding of holdings) {
      const ticker = holding.ticker.trim().toUpperCase();
      const marketValue = parseDollarsToCents(holding.marketValue) ?? 0n;
      // No cost basis given means no gain is claimed: carrying it at
      // market is the only figure that asserts nothing (§13).
      const costBasis = parseDollarsToCents(holding.costBasis) ?? marketValue;
      const existing = merged.get(ticker);
      if (existing) {
        existing.marketValue += marketValue;
        existing.costBasis += costBasis;
      } else {
        merged.set(ticker, { marketValue, costBasis, row: holding });
      }
    }

    for (const [ticker, position] of merged) {
      const security = await prisma.security.upsert({
        where: { ticker },
        update: {},
        create: {
          ticker,
          name: position.row.name.trim() || ticker,
          kind: position.row.kind,
          assetClass: position.row.assetClass,
          sector: null,
          region: "Not given",
          // An expense ratio isn't asked for at intake and isn't guessed:
          // zero here means "not on file", and the blended figure the
          // Allocation section shows says as much.
          expenseRatioPct: 0,
        },
        select: { id: true },
      });

      await prisma.position.create({
        data: {
          accountId: created.id,
          securityId: security.id,
          marketValueCents: position.marketValue,
          costBasisCents: position.costBasis,
        },
      });
    }
  }
}
