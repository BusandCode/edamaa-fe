import type { TutorData, ScheduleItem, ActivityItem, ActivityType, TabId } from "./Types";
import type { EarningsEntry } from "./Types";
import EarningsChart from "./EarningsChart";
import { S } from "./Styles";
import { ACTIVITY_ICONS, ACTIVITY_BG } from "./Data";

interface OverviewTabProps {
  tutorData: TutorData;
  earningsData: EarningsEntry[];
  schedule: ScheduleItem[];
  recentActivity: ActivityItem[];
  onTabChange: (tab: TabId) => void;
  onNotify: (msg: string, type?: "info" | "success" | "error") => void;
}

export default function OverviewTab({
  tutorData,
  earningsData,
  schedule,
  recentActivity,
  onTabChange,
  onNotify,
}: OverviewTabProps) {
  const stats = [
    { label: "Total Students", value: tutorData.stats.totalStudents, icon: "👥", color: "#3D08BA" },
    { label: "Total Courses",  value: tutorData.stats.totalCourses,  icon: "📚", color: "#F68C29" },
    { label: "Avg Rating",     value: `${tutorData.stats.avgRating}⭐`, icon: "🏆", color: "#10B981" },
    { label: "Hours/Week",     value: `${tutorData.stats.hoursThisWeek}h`, icon: "⏱", color: "#8B5CF6" },
  ] as { label: string; value: string | number; icon: string; color: string }[];

  const performance = [
    { label: "Completion Rate",      value: 87, color: "#3D08BA" },
    { label: "Student Satisfaction", value: 94, color: "#10B981" },
    { label: "On-time Delivery",     value: 91, color: "#F68C29" },
  ] as { label: string; value: number; color: string }[];

  return (
    <div>
      {/* Hero Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {stats.map((s, i) => (
          <div key={i} style={S.statCard(s.color)}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Earnings + Performance */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Total Earnings</p>
              <h2 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: "#111" }}>
                ${tutorData.stats.totalEarnings.toLocaleString()}
              </h2>
              <span style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>↑ +18.4% this month</span>
            </div>
            <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "8px 12px" }}>
              <div style={{ fontSize: 20 }}>💰</div>
            </div>
          </div>
          <EarningsChart data={earningsData} />
        </div>

        <div style={S.card}>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#374151" }}>Performance</p>
          {performance.map((p, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{p.label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#111" }}>{p.value}%</span>
              </div>
              <div style={{ height: 7, background: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${p.value}%`, background: p.color, borderRadius: 4, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Schedule Preview */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Today's Schedule</p>
          <button style={{ ...S.btn(false), padding: "6px 14px", fontSize: 12 }} onClick={() => onTabChange("schedule")}>
            View All
          </button>
        </div>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
          {schedule.slice(0, 3).map((s, i) => (
            <div
              key={s.id}
              style={{
                minWidth: 200,
                background: i === 0 ? "linear-gradient(135deg, #3D08BA, #7B2FBE)" : "#F9F8FF",
                borderRadius: 14, padding: 16,
                color: i === 0 ? "#fff" : "#111",
                border: i !== 0 ? "1px solid #EDE9FF" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: i === 0 ? "rgba(255,255,255,0.2)" : "#EDE9FF", color: i === 0 ? "#fff" : "#3D08BA" }}>
                  {s.type.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>{s.duration}</span>
              </div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{s.title}</p>
              <p style={{ margin: "0 0 10px", fontSize: 12, opacity: 0.7 }}>{s.time} · {s.date}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>👥 {s.students}</span>
                <button style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: i === 0 ? "#F68C29" : "#3D08BA", color: "#fff" }}>
                  {i === 0 ? "Go Live" : "View"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={S.card}>
        <p style={{ margin: "0 0 14px", fontWeight: 700, fontSize: 14 }}>Recent Activity</p>
        {recentActivity.map((a, i) => (
          <div
            key={a.id}
            style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              paddingBottom: 12, marginBottom: 12,
              borderBottom: i < recentActivity.length - 1 ? "1px solid #F3F4F6" : "none",
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16, background: ACTIVITY_BG[a.type as ActivityType] }}>
              {ACTIVITY_ICONS[a.type as ActivityType]}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{a.action}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>{a.detail}</p>
            </div>
            <span style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap" }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}