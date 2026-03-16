import { useState } from "react";
import type { Course } from "./Types";
import { S } from "./Styles";
import NewCourse from "./courses/NewCourse";

interface CoursesTabProps {
  courses: Course[];
  onNotify: (message: string, type?: string) => void;
}

export default function CoursesTab({ courses, onNotify }: CoursesTabProps) {
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [courseList, setCourseList] = useState<Course[]>(courses);

  const BRAND = "#3D08BA";

  const handleAddCourse = (newCourse: Course) => {
    setCourseList((prev) => [newCourse, ...prev]);
    setShowNewCourse(false);
    onNotify("Course posted successfully!", "success");
  };

  return (
    <div>
      {showNewCourse ? (
        <NewCourse
          onAddCourse={handleAddCourse}
          onCancel={() => setShowNewCourse(false)}
        />
      ) : (
        <>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              My Courses
            </h2>
            <button style={S.btn()} onClick={() => setShowNewCourse(true)}>
              + New Course
            </button>
          </div>

          {/* Courses Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {courseList.map((c) => (
              <div
                key={c.id}
                style={{
                  ...S.card,
                  padding: 0,
                  overflow: "hidden",
                  border: "1px solid #E5E7EB",
                }}
              >
                {/* Top Accent */}
                <div style={{ height: 4, background: BRAND }} />

                <div style={{ padding: 18 }}>
                  {/* Category + Revenue */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 12,
                        background: `${BRAND}15`,
                        color: BRAND,
                      }}
                    >
                      {c.category}
                    </span>

                    <span style={{ fontSize: 11, color: "#6B7280" }}>
                      ${c.revenue.toLocaleString()}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      margin: "0 0 6px",
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#111827",
                    }}
                  >
                    {c.title}
                  </h3>

                  {/* Meta */}
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "#6B7280" }}>
                    {c.students} students · Next: {c.nextClass}
                  </p>

                  {/* Progress */}
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <span style={{ fontSize: 11, color: "#6B7280" }}>
                        Course Progress
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: BRAND,
                        }}
                      >
                        {c.progress}%
                      </span>
                    </div>

                    <div
                      style={{
                        height: 6,
                        background: "#F3F4F6",
                        borderRadius: 3,
                      }}
                    >
                      <div
                        style={{
                          width: `${c.progress}%`,
                          height: "100%",
                          background: BRAND,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={{
                        ...S.btn(true),
                        flex: 1,
                        fontSize: 12,
                        background: BRAND,
                        boxShadow: `0 4px 10px ${BRAND}30`,
                      }}
                      onClick={() => onNotify(`Opening ${c.title}...`)}
                    >
                      Manage
                    </button>

                    <button
                      style={{
                        ...S.btn(false),
                        fontSize: 12,
                        border: `1px solid ${BRAND}30`,
                        color: BRAND,
                      }}
                      onClick={() => onNotify("Analytics coming soon")}
                    >
                      Analytics
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}