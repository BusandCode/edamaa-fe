import type { EarningsEntry } from "./Types";

interface EarningsChartProps {
  data: EarningsEntry[];
}

export default function EarningsChart({ data }: EarningsChartProps) {
  const max = Math.max(...data.map((d) => d.amount));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: "100%",
              height: `${(d.amount / max) * 68}px`,
              background:
                i === data.length - 1
                  ? "linear-gradient(to top, #3D08BA, #7B2FBE)"
                  : "linear-gradient(to top, #e0d4ff, #c4b0ff)",
              borderRadius: "4px 4px 0 0",
              transition: "height 0.5s ease",
            }}
          />
          <span style={{ fontSize: 9, color: "#9CA3AF", whiteSpace: "nowrap" }}>{d.month}</span>
        </div>
      ))}
    </div>
  );
}