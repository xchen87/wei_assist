export type EstateFlowRow = { id: string; assetName: string; beneficiaryLabel: string; missingDesignation: boolean };

const ROW_HEIGHT = 60;
const BOX_H = 44;
const LEFT_X = 20;
const RIGHT_X = 430;
const BOX_W = 210;
const TOP = 20;

/** Directed flow diagram (CLAUDE.md §8, Estate/Household): one row per
 * asset, arrow to where it's titled or designated to pass. Missing
 * designations get a dashed red arrow into a flagged "No beneficiary on
 * file" pill, driven by real per-asset data. See design/Estate.dc.html. */
export function EstateFlowDiagram({ rows }: { rows: EstateFlowRow[] }) {
  const height = rows.length * ROW_HEIGHT + TOP;
  const width = RIGHT_X + BOX_W + LEFT_X;
  const centerY = (i: number) => TOP + i * ROW_HEIGHT + BOX_H / 2;

  return (
    <div>
      <div className="relative mx-auto" style={{ width, height }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute left-0 top-0 h-full w-full">
          <defs>
            <marker id="arrowPine" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--pine)" />
            </marker>
            <marker id="arrowLoss" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--loss)" />
            </marker>
          </defs>
          {rows.map((row, i) => {
            const y1 = centerY(i);
            const y2 = centerY(i); // straight rows; a real force-layout could offset these, this is a demo-scale simplification
            const x1 = LEFT_X + BOX_W;
            const x2 = RIGHT_X;
            const midX = (x1 + x2) / 2;
            return (
              <path
                key={row.id}
                d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                fill="none"
                stroke={row.missingDesignation ? "var(--loss)" : "var(--pine)"}
                strokeWidth={2}
                strokeDasharray={row.missingDesignation ? "5,4" : undefined}
                markerEnd={`url(#${row.missingDesignation ? "arrowLoss" : "arrowPine"})`}
              />
            );
          })}
        </svg>

        {rows.map((row, i) => (
          <div
            key={row.id}
            className="absolute flex items-center rounded-card border border-rule bg-surface px-3 text-sm"
            style={{ left: LEFT_X, top: TOP + i * ROW_HEIGHT, width: BOX_W, height: BOX_H }}
          >
            {row.assetName}
          </div>
        ))}
        {rows.map((row, i) =>
          row.missingDesignation ? (
            <div
              key={row.id}
              className="absolute flex items-center gap-2 rounded-card border border-loss bg-loss-tint px-3 text-sm font-semibold text-loss"
              style={{ left: RIGHT_X, top: TOP + i * ROW_HEIGHT, width: BOX_W, height: BOX_H }}
            >
              <svg width={14} height={14} viewBox="0 0 20 20" fill="none" stroke="var(--loss)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M10 3.2L2.3 16.8h15.4z" />
                <path d="M10 8.3v4M10 14.6h.01" />
              </svg>
              {row.beneficiaryLabel}
            </div>
          ) : (
            <div
              key={row.id}
              className="absolute flex items-center rounded-card border border-rule bg-surface px-3 text-sm"
              style={{ left: RIGHT_X, top: TOP + i * ROW_HEIGHT, width: BOX_W, height: BOX_H }}
            >
              {row.beneficiaryLabel}
            </div>
          ),
        )}
      </div>

      <div className="mt-3 flex gap-4 text-xs text-ink-muted">
        <div className="flex items-center gap-1.5">
          <div className="h-[2px] w-3.5 bg-pine" />
          Titled or designated
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-[2px] w-3.5 bg-loss" style={{ backgroundImage: "linear-gradient(to right, var(--loss) 60%, transparent 40%)", backgroundSize: "6px 2px" }} />
          Missing designation
        </div>
      </div>
    </div>
  );
}
