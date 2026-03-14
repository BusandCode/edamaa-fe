import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
import type { TabId, FilterType, NotificationState } from "./Types";

// ── Data ───────────────────────────────────────────────────────────────────
import {
  tutorData,
  earningsData,
  courses,
  students,
  schedule,
  recentActivity,
  TABS,
} from "./Data";

// ── Components ─────────────────────────────────────────────────────────────
import DashboardHeader    from "./DashboardHeader"
import BottomNav          from "./Bottomnav";
import NotificationToast    from "./NotificationToast";
import OverviewTab from "./OverviewTab";
import CoursesTab from "./CoursesTab";
import StudentsTab        from "./StudentsTab"
import EarningsTab        from "./EarningsTab"
import ScheduleTab        from "./ScheduleTab"

// ── Styles ─────────────────────────────────────────────────────────────────
import { S } from "./Styles";
// ── Main Component ─────────────────────────────────────────────────────────

export default function TutorDashboard() {
  const [activeTab,    setActiveTab]    = useState<TabId>("overview");
  const [copied,       setCopied]       = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [profileImg]                    = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const notify = (msg: string, type: NotificationState["type"] = "info"): void => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const copyId = (): void => {
    setCopied(true);
    notify("Classroom ID copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={S.root}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {notification && <NotificationToast notification={notification} />}

      <DashboardHeader
        tutorData={tutorData}
        copied={copied}
        profileImg={profileImg}
        onCopyId={copyId} tabs={[]} activeTab={"overview"} onTabChange={function (_tab: TabId): void {
          throw new Error("Function not implemented.");
        } }      />

      <div style={S.main}>
        {activeTab === "overview" && (
          <OverviewTab
            tutorData={tutorData}
            earningsData={earningsData}
            schedule={schedule}
            recentActivity={recentActivity}
            onTabChange={setActiveTab}
            onNotify={notify}
          />
        )}

        {activeTab === "courses" && (
          <CoursesTab
            courses={courses}
            onNotify={notify}
          />
        )}

        {activeTab === "students" && (
          <StudentsTab
            students={students}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onNotify={notify}
          />
        )}

        {activeTab === "earnings" && (
          <EarningsTab
            tutorData={tutorData}
            courses={courses}
            earningsData={earningsData}
          />
        )}

        {activeTab === "schedule" && (
          <ScheduleTab
            schedule={schedule}
            onNotify={notify}
          />
        )}
      </div>

      <BottomNav
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c4b0ff; border-radius: 2px; }
        input::placeholder { color: #9CA3AF; }
        input:focus { border-color: #C4B0FF !important; outline: none; }
        @media (max-width: 480px) {
          .logo-search-bar { display: none !important; }
        }
      `}</style>
    </div>
  );
}
