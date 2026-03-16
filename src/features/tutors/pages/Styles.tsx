export const S = {
  root: {
    fontFamily: "'DM Sans', 'Nunito', sans-serif",
    background: "#F8F7FF",
    minHeight: "100vh",
    color: "#111827",
  } as React.CSSProperties,

  // Header is now white
  header: {
    background: "#ffffff",
    padding: "16px 24px 0",
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    boxShadow: "0 1px 0 #E5E7EB",
  } as React.CSSProperties,

  avatar: {
    width: 44, height: 44, borderRadius: "50%",
    background: "linear-gradient(135deg, #F68C29, #e07020)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontWeight: 800, fontSize: 16,
    border: "2px solid #F3F4F6",
    cursor: "pointer", flexShrink: 0,
  } as React.CSSProperties,

  classroomBadge: {
    background: "#F3F0FF",
    border: "1px solid #EDE9FF",
    borderRadius: 10,
    padding: "6px 14px",
    display: "flex", alignItems: "center", gap: 8,
    cursor: "pointer",
  } as React.CSSProperties,

  tabBar: {
    display: "flex", gap: 0,
    borderTop: "1px solid #F3F4F6",
    marginTop: 14, overflowX: "auto" as const,
  } as React.CSSProperties,

  tab: (active: boolean): React.CSSProperties => ({
    padding: "11px 18px", background: "none", border: "none",
    color: active ? "#3D08BA" : "#6B7280",
    fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer",
    borderBottom: active ? "2px solid #3D08BA" : "2px solid transparent",
    transition: "all 0.2s", whiteSpace: "nowrap",
    display: "flex", alignItems: "center", gap: 6,
  }),

  main: {
    maxWidth: 900, margin: "0 auto", padding: "20px 16px 80px",
  } as React.CSSProperties,

  card: {
    background: "#fff", borderRadius: 16, padding: 20,
    boxShadow: "0 1px 12px rgba(61,8,186,0.06)", marginBottom: 16,
  } as React.CSSProperties,

  statCard: (color: string): React.CSSProperties => ({
    background: "#fff", borderRadius: 14, padding: 18,
    boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
    borderLeft: `4px solid ${color}`, flex: 1, minWidth: 130,
  }),

  tag: (color: string, bg: string): React.CSSProperties => ({
    display: "inline-block", padding: "2px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 700, color, background: bg,
  }),

  btn: (primary = true): React.CSSProperties => ({
    padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer",
    fontWeight: 700, fontSize: 13, transition: "all 0.2s",
    background: primary ? "linear-gradient(135deg, #3D08BA, #5e1fd4)" : "#F3F0FF",
    color: primary ? "#fff" : "#3D08BA",
    boxShadow: primary ? "0 4px 12px rgba(61,8,186,0.3)" : "none",
  }),

  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  } as React.CSSProperties,

  icon: {
    position: "absolute" as const,
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9CA3AF",
    zIndex: 1,
  } as React.CSSProperties,

  input: {
    width: "100%",
    padding: "12px 12px 12px 40px",
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
};