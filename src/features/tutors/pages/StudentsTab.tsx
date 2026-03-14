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

const getStatusBadge = (status: string) => ({
  background: status === "at-risk" ? "#FEE2E2" : "#EEF2FF",
  color: status === "at-risk" ? "#EF4444" : "#3D08BA",
  label: status === "at-risk" ? "At Risk" : "Active",
});

export default function StudentsTab({
  students,
  activeFilter,
  onFilterChange,
  onNotify,
}: StudentsTabProps) {
  const filteredStudents =
    activeFilter === "all"
      ? students
      : students.filter((s) => s.status === activeFilter);

  const atRiskCount = students.filter((s) => s.status === "at-risk").length;
  const activeCount = students.filter((s) => s.status === "active").length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Students</h2>
          <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>
            {activeCount} Active · {atRiskCount} At Risk
          </p>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "active", "at-risk"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 11,
                background:
                  activeFilter === f
                    ? f === "at-risk"
                      ? "#FEE2E2"
                      : "#3D08BA"
                    : "#F3F4F6",
                color:
                  activeFilter === f
                    ? f === "at-risk"
                      ? "#EF4444"
                      : "#fff"
                    : "#6B7280",
              }}
            >
              {f.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Alert */}
      {activeFilter !== "active" && atRiskCount > 0 && (
        <div
          style={{
            background: "#FFF7ED",
            border: "1px solid #FED7AA",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 14,
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#C2410C" }}>
            {atRiskCount} students require immediate attention
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#9A3412" }}>
            Their performance has dropped below the expected threshold.
          </p>
        </div>
      )}

      {/* Student Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredStudents.map((s) => {
          const badge = getStatusBadge(s.status);

          return (
            <div
              key={s.id}
              style={{
                ...S.card,
                padding: 16,
                display: "flex",
                gap: 14,
                alignItems: "center",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#fff",
                  background:
                    s.status === "at-risk"
                      ? "linear-gradient(135deg, #FCA5A5, #EF4444)"
                      : "linear-gradient(135deg, #A78BFA, #3D08BA)",
                }}
              >
                {s.avatar}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>{s.name}</p>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: badge.background,
                      color: badge.color,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                <p style={{ margin: "4px 0", fontSize: 12, color: "#6B7280" }}>
                  {s.course} · Last active 2 days ago
                </p>

                {/* Progress */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: "#F3F4F6",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${s.progress}%`,
                        height: "100%",
                        background: getProgressColor(s.progress),
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>
                    {s.progress}%
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onNotify(`Messaging ${s.name}`)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "#EEF2FF",
                    color: "#3D08BA",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Message
                </button>

                {s.status === "at-risk" && (
                  <button
                    onClick={() => onNotify(`Alert sent to ${s.name}`, "error")}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: "#FEF3C7",
                      color: "#D97706",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Alert
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}