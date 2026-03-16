import { useState } from "react";
import { FiBookOpen, FiCalendar, FiClock, FiX, FiPlus } from "react-icons/fi";
import type { Course } from "../Types";
import { S } from "../Styles";

interface NewCourseProps {
  onAddCourse: (course: Course) => void;
  onCancel: () => void;
}

export default function NewCourse({ onAddCourse, onCancel }: NewCourseProps) {
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");

  const handleSubmit = () => {
    if (!category || !title || !day || !time) return;

    const newCourse: Course = {
      id: Date.now(),
      category,
      title,
      students: 0,
      progress: 0,
      revenue: 0,
      nextClass: `${day} · ${time}`,
      color: "#3D08BA",
    };

    onAddCourse(newCourse);
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
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
          Post New Course
        </h2>

        <button style={S.btn(false)} onClick={onCancel}>
          <FiX />
        </button>
      </div>

      {/* Card */}
      <div style={{ ...S.card, padding: 20 }}>
        {/* Category */}
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Course Category</label>
          <div style={{ position: "relative" }}>
            <FiBookOpen style={S.icon} />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g Mathematics"
              style={S.input}
            />
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Course Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g Differential Equations"
            style={S.input}
          />
        </div>

        {/* Day & Time */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={S.label}>Day</label>
            <div style={{ position: "relative" }}>
              <FiCalendar style={S.icon} />
              <input
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="Monday"
                style={S.input}
              />
            </div>
          </div>

          <div>
            <label style={S.label}>Time</label>
            <div style={{ position: "relative" }}>
              <FiClock style={S.icon} />
              <input
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="2:00 PM"
                style={S.input}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 20,
          }}
        >
          <button className="text-red-600 bg-red-100 w-25 rounded-xl font-medium cursor-pointer" onClick={onCancel}>
            Cancel
          </button>

          <button
          className="flex items-center"
            style={{
              ...S.btn(true),
              background: "#3D08BA",
              boxShadow: "0 6px 14px #3D08BA40",
            }}
            onClick={handleSubmit}
          >
            <FiPlus style={{ marginRight: 6 }} />
            Post Course
          </button>
        </div>
      </div>
    </div>
  );
}