import type { Tab, TabId } from "./Types";

interface BottomNavProps {
  tabs: Tab[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function BottomNav({ tabs, activeTab, onTabChange }: BottomNavProps) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#fff", borderTop: "1px solid #E5E7EB",
      display: "flex", justifyContent: "space-around",
      padding: "10px 0", zIndex: 50,
    }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            background: "none", border: "none", cursor: "pointer",
            color: activeTab === t.id ? "#3D08BA" : "#9CA3AF",
            transition: "color 0.2s",
          }}
        >
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontSize: 10, fontWeight: activeTab === t.id ? 700 : 500 }}>{t.label}</span>
          {activeTab === t.id && (
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#3D08BA" }} />
          )}
        </button>
      ))}
    </div>
  );
}