import type { TutorData, Course, EarningsEntry } from "./Types";
import EarningsChart from "./EarningsChart";
import { S } from "./Styles";

interface EarningsTabProps {
  tutorData: TutorData;
  courses: Course[];
  earningsData: EarningsEntry[];
}

export default function EarningsTab({ tutorData, courses, earningsData }: EarningsTabProps) {
  const earningCards = [
    { label: "This Month",        value: "$7,200", trend: "+22%",    color: "#3D08BA", icon: "📈" },
    { label: "Pending Payout",    value: "$1,840", trend: "3 days",  color: "#F68C29", icon: "⏳" },
    { label: "Per Student Avg",   value: "$183",   trend: "+5%",     color: "#10B981", icon: "👤" },
    { label: "Top Course Revenue",value: "$9,800", trend: "Physics", color: "#8B5CF6", icon: "🏆" },
  ] as { label: string; value: string; trend: string; color: string; icon: string }[];

  const sortedCourses = [...courses].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(...courses.map((c) => c.revenue));

  return (
    <div>
      <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800 }}>Earnings Overview</h2>

      {/* Hero earnings card */}
      <div style={{ ...S.card, background: "linear-gradient(135deg, #1a0550, #3D08BA)", color: "#fff", marginBottom: 16 }}>
        <p style={{ margin: "0 0 4px", fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Total Lifetime Earnings</p>
        <h1 style={{ margin: "0 0 4px", fontSize: 36, fontWeight: 900 }}>${tutorData.stats.totalEarnings.toLocaleString()}</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          Last updated: Today, 9:00 AM ·{" "}
          <span style={{ color: "#10B981", fontWeight: 700 }}>↑ +18.4% vs last month</span>
        </p>
        <div style={{ marginTop: 16, height: 80 }}>
          <EarningsChart data={earningsData} />
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        {earningCards.map((e, i) => (
          <div key={i} style={S.statCard(e.color)}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{e.icon}</div>
            <p style={{ margin: "0 0 2px", fontSize: 11, color: "#6B7280", fontWeight: 600 }}>{e.label}</p>
            <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: "#111" }}>{e.value}</p>
            <span style={{ fontSize: 11, fontWeight: 700, color: e.color }}>{e.trend}</span>
          </div>
        ))}
      </div>

      {/* Revenue by course */}
      <div style={S.card}>
        <p style={{ margin: "0 0 14px", fontWeight: 700, fontSize: 14 }}>Revenue by Course</p>
        {sortedCourses.map((c, i) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#9CA3AF", minWidth: 16 }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{c.title}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: c.color }}>${c.revenue.toLocaleString()}</span>
              </div>
              <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(c.revenue / maxRevenue) * 100}%`, background: c.color, borderRadius: 3 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}