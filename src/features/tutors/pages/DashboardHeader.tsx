import NewLogo from "../../../components/common/NewLogo";
import type { TutorData, TabId, Tab } from "./Types";
import { S } from "./Styles";

interface DashboardHeaderProps {
  tutorData: TutorData;
  tabs: Tab[];
  activeTab: TabId;
  copied: boolean;
  profileImg: string | null;
  onTabChange: (tab: TabId) => void;
  onCopyId: () => void;
}

export default function DashboardHeader({
  tutorData,
  tabs,
  activeTab,
  copied,
  profileImg,
  onTabChange,
  onCopyId,
}: DashboardHeaderProps) {
  return (
    <div style={S.header}>
      {/* Top bar: Logo + Search + Bell */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap", rowGap: 10 }}>
        {/* Logo */}
        <div className="shrink-0">
          <NewLogo logoWidth={50} logoHeight={50} textSize="text-[13px]" gap="gap-2" centered={false} />
        </div>

        {/* Search bar */}
        <div
          className="logo-search-bar"
          style={{ flex: 1, minWidth: 0, maxWidth: 380, position: "relative" }}
        >
          <svg
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search course, tutorial..."
            style={{
              width: "100%", boxSizing: "border-box",
              paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              background: "#F9FAFB", border: "1px solid #E5E7EB",
              borderRadius: 10, color: "#111", fontSize: 13, outline: "none",
            }}
          />
        </div>

        {/* Bell */}
        <button
          style={{
            flexShrink: 0, background: "#F9FAFB", border: "1px solid #E5E7EB",
            borderRadius: 10, padding: "8px 10px", cursor: "pointer",
            color: "#374151", fontSize: 16, position: "relative",
          }}
          aria-label="Notifications"
        >
          🔔
          <span style={{
            position: "absolute", top: 6, right: 6, width: 6, height: 6,
            borderRadius: "50%", background: "#EF4444", border: "1.5px solid #F9FAFB",
          }} />
        </button>
      </div>

      {/* Avatar row: Welcome + Classroom ID */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "space-between", flexWrap: "wrap", rowGap: 10 }}>
        {/* Avatar + Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={S.avatar}>
            {profileImg
              ? <img src={profileImg} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} alt="Profile" />
              : "AF"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Welcome back 👋</span>
              <span style={{ background: "#F68C29", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>PRO</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111" }}>{tutorData.name}</h1>
            <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>{tutorData.title}</p>
          </div>
        </div>

        {/* Classroom ID */}
        <div style={S.classroomBadge} onClick={onCopyId} role="button" tabIndex={0}>
          <span style={{ fontSize: 11, color: "#6B7280" }}>Classroom ID</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#3D08BA" }}>{tutorData.classroomId}</span>
          <span style={{ fontSize: 14, color: "#3D08BA" }}>{copied ? "✓" : "⧉"}</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={S.tabBar}>
        {tabs.map((t) => (
          <button key={t.id} style={S.tab(activeTab === t.id)} onClick={() => onTabChange(t.id)}>
            <span style={{ fontSize: 14 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}