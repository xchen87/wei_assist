/**
 * A household to test the planning model against.
 *
 * Fictional throughout, and deliberately so (CLAUDE.md §13): these are
 * fixture values, not figures drawn from any real book, benchmark or
 * table. The shape is what matters — a couple whose primary is the
 * younger of the two, retiring at different ages and claiming at
 * different ages, which is the case that per-member planning exists for
 * and the case that the position-versus-role bug hid in.
 */

export type FixtureHousehold = Parameters<
  typeof import("./baseline").buildBaseline
>[0];

export const FIXTURE_MEMBERS = {
  primary: "fixture-member-primary",
  spouse: "fixture-member-spouse",
  child: "fixture-member-child",
};

/** Primary is 58 and the *younger* of the couple: ordering members by age
 * rather than by role hands her retirement age to her spouse. */
export function fixtureHousehold(overrides: Partial<FixtureHousehold> = {}): FixtureHousehold {
  return {
    netWorthCents: 790_000_000n,
    savingsCents: 4_200_000n,
    monthlySpendingNeedCents: 3_000_000n,
    retirementAgePrimary: 62,
    retirementAgeSpouse: 66,
    ssClaimAgePrimary: 66,
    ssClaimAgeSpouse: 64,
    members: [
      { id: FIXTURE_MEMBERS.primary, name: "Ada Fixture", role: "Primary", age: 58 },
      { id: FIXTURE_MEMBERS.spouse, name: "Bo Fixture", role: "Spouse", age: 60 },
      { id: FIXTURE_MEMBERS.child, name: "Cy Fixture", role: "Dependent", age: 19 },
    ],
    goals: [
      {
        id: "fixture-goal-tuition",
        name: "Tuition",
        targetCents: 20_000_000n,
        horizonLabel: "3–7 years",
        priority: "High",
      },
      {
        id: "fixture-goal-uncosted",
        name: "Someday boat",
        targetCents: null,
        horizonLabel: null,
        priority: "Low",
      },
    ],
    ...overrides,
  };
}

/** A fixed seed, so a test that moves a lever is seeing the lever and not
 * a different random draw. */
export const FIXTURE_SEED = 20260921;
