import type { Student, FilterType } from "./Types";
import { S } from "./Styles";

interface StudentsTabProps {
  students: Student[];
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onNotify: (msg: string, type?: "info" | "success" | "error") => void;
}

const getProgressColor = (progress: number): string =>
  progress >= 70 ? "#10B981" : progress >= 50 ? "#F68C29" : "#EF4444";

export default function StudentsTab({
  students,
  activeFilter,
  onFilterChange,
  onNotify,
}: StudentsTabProps) {
  const filteredStudents: Student[] =
    activeFilter === "all"
      ? students
      : students.filter((s) => s.status === activeFilter);

  const atRiskCount = students.filter((s) => s.status === "at-risk").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Students ({students.length})</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "active", "at-risk"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              style={{
                padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 11, textTransform: "capitalize",
                background: activeFilter === f ? (f === "at-risk" ? "#FEE2E2" : "#3D08BA") : "#F3F4F6",
                color: activeFilter === f ? (f === "at-risk" ? "#EF4444" : "#fff") : "#6B7280",
              }}
            >
              {f === "at-risk" ? "⚠ At Risk" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeFilter !== "active" && atRiskCount > 0 && (
        <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#C2410C" }}>{atRiskCount} students need attention</p>
            <p style={{ margin: 0, fontSize: 12, color: "#9A3412" }}>These students have low progress scores. Consider reaching out.</p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredStudents.map((s) => (
          <div key={s.id} style={{ ...S.card, padding: 14, display: "flex", alignItems: "center", gap: 14, marginBottom: 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 13,
              background: s.status === "at-risk"
                ? "linear-gradient(135deg, #FCA5A5, #EF4444)"
                : "linear-gradient(135deg, #a78bfa, #3D08BA)",
            }}>
              {s.avatar}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{s.name}</p>
                <span style={{ fontWeight: 800, fontSize: 13, color: getProgressColor(s.progress) }}>{s.grade}</span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6B7280" }}>{s.course}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 5, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${s.progress}%`, background: getProgressColor(s.progress), borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", minWidth: 30 }}>{s.progress}%</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: "#F0FDF4", color: "#10B981" }}
                onClick={() => onNotify(`Messaging ${s.name}...`)}
              >
                💬
              </button>
              {s.status === "at-risk" && (
                <button
                  style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: "#FEF3C7", color: "#D97706" }}
                  onClick={() => onNotify(`Sending alert to ${s.name}`)}
                >
                  ⚠
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}