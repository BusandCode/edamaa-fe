import type { Course } from "./Types";
import { S } from "./Styles"

interface CoursesTabProps {
  courses: Course[];
  onNotify: (msg: string, type?: "info" | "success" | "error") => void;
}

export default function CoursesTab({ courses, onNotify }: CoursesTabProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>My Courses</h2>
        <button style={S.btn()} onClick={() => onNotify("Create course flow coming soon!")}>+ New Course</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {courses.map((c) => (
          <div key={c.id} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
            <div style={{ height: 6, background: c.color }} />
            <div style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={S.tag(c.color, `${c.color}20`)}>{c.category}</span>
                <span style={{ fontSize: 11, color: "#6B7280" }}>💰 ${c.revenue.toLocaleString()}</span>
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "#111" }}>{c.title}</h3>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#6B7280" }}>👥 {c.students} students · Next: {c.nextClass}</p>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "#6B7280" }}>Course Progress</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: c.color }}>{c.progress}%</span>
                </div>
                <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${c.progress}%`, background: c.color, borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{ ...S.btn(true), flex: 1, fontSize: 12, padding: "8px 0", background: c.color, boxShadow: `0 4px 12px ${c.color}40` }}
                  onClick={() => onNotify(`Opening ${c.title}...`)}
                >
                  Manage
                </button>
                <button
                  style={{ ...S.btn(false), padding: "8px 14px", fontSize: 12 }}
                  onClick={() => onNotify("Analytics coming soon!")}
                >
                  📊
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}