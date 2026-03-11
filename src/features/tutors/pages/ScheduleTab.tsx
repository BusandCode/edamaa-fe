import type { ScheduleItem } from "./Types";
import { SCHEDULE_TYPE_STYLE } from "./Data";
import { S } from "./Styles";

interface ScheduleTabProps {
  schedule: ScheduleItem[];
  onNotify: (msg: string, type?: "info" | "success" | "error") => void;
}

export default function ScheduleTab({ schedule, onNotify }: ScheduleTabProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Schedule</h2>
        <button style={S.btn()} onClick={() => onNotify("Schedule builder coming soon!")}>+ Schedule Class</button>
      </div>

      {/* Live Now Banner */}
      <div style={{
        background: "linear-gradient(135deg, #EF4444, #DC2626)",
        borderRadius: 16, padding: 18, marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", animation: "pulse 1.5s infinite" }} />
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 700 }}>LIVE NOW</span>
          </div>
          <p style={{ margin: 0, color: "#fff", fontWeight: 800, fontSize: 16 }}>Financial Accounting 101</p>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.75)", fontSize: 12 }}>68 students online · Started 12:00 PM</p>
        </div>
        <button
          style={{ background: "#fff", color: "#EF4444", padding: "10px 20px", borderRadius: 10, border: "none", fontWeight: 800, cursor: "pointer", fontSize: 13 }}
          onClick={() => onNotify("Joining live class...")}
        >
          Join Now →
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {schedule.map((s, i) => {
          const typeStyle = SCHEDULE_TYPE_STYLE[s.type];
          return (
            <div key={s.id} style={{ ...S.card, padding: 16, display: "flex", gap: 16, alignItems: "center", marginBottom: 0 }}>
              <div style={{ textAlign: "center", minWidth: 56 }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#111" }}>{s.time.split(" ")[0]}</p>
                <p style={{ margin: 0, fontSize: 10, color: "#6B7280", fontWeight: 600 }}>{s.time.split(" ")[1]}</p>
              </div>
              <div style={{ width: 1, background: "#E5E7EB", alignSelf: "stretch" }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{s.title}</h4>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: typeStyle.bg, color: typeStyle.color }}>
                    {s.type.toUpperCase()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>{s.date} · {s.duration} · 👥 {s.students}</p>
              </div>
              <button
                style={{ ...S.btn(i === 0), fontSize: 12, padding: "8px 16px" }}
                onClick={() => onNotify(`Opening ${s.title}...`)}
              >
                {i === 0 ? "Join" : "View"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}