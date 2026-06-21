import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaBook,
  FaCalendar,
  FaClock,
  FaCopy,
  FaMoneyBillWave,
  FaUserGraduate,
  FaVideo,
  FaChartLine,
  FaBell,
  FaCheckCircle,
  FaExclamationCircle,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaFileAlt,
  FaStar,
  FaPlay,
  FaPlus,
  FaArrowRight,
  FaUsers,
  FaClipboardList,
  FaTrophy,
  FaSignal,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

// ── Types ──────────────────────────────────────────────────────────────
type TabId = "overview" | "classroom" | "live";

type NewClassData = {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  students: number;
  duration: string;
  source: "independent" | "assigned-school";
  status: "upcoming" | "live" | "completed";
};

type Assignment = {
  id: string;
  title: string;
  subject: string;
  classGroup: string;
  submissionsCount: number;
  gradedCount: number;
  dueAt: string;
  isOpen: boolean;
};

type Student = {
  id: string;
  name: string;
  initials: string;
  subject: string;
  lastActive: string;
  progress: number;
  color: string;
};

type Notification = {
  id: string;
  type: "submission" | "enrollment" | "message" | "reminder";
  message: string;
  time: string;
  unread: boolean;
};

type EarningEntry = {
  label: string;
  amount: number;
};

// ── Mock data ──────────────────────────────────────────────────────────
const MOCK_CLASSES: NewClassData[] = [
  { id: "1", title: "Algebra Basics", subject: "Mathematics", date: "Mon 26", time: "10:00 AM", students: 12, duration: "60 min", source: "independent", status: "upcoming" },
  { id: "2", title: "Chemical Bonding", subject: "Chemistry", date: "Tue 27", time: "2:00 PM", students: 8, duration: "90 min", source: "assigned-school", status: "upcoming" },
  { id: "3", title: "Essay Writing", subject: "English", date: "Wed 28", time: "11:00 AM", students: 15, duration: "45 min", source: "independent", status: "upcoming" },
  { id: "4", title: "Newton's Laws", subject: "Physics", date: "Today", time: "3:00 PM", students: 10, duration: "60 min", source: "independent", status: "live" },
];

const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: "a1", title: "Week 4 Algebra Homework", subject: "Mathematics", classGroup: "SS2", submissionsCount: 10, gradedCount: 4, dueAt: "May 27, 9:00 PM", isOpen: true },
  { id: "a2", title: "Chemical Equations Quiz", subject: "Chemistry", classGroup: "SS3", submissionsCount: 7, gradedCount: 7, dueAt: "May 28, 8:00 AM", isOpen: false },
  { id: "a3", title: "Essay: Climate Change", subject: "English", classGroup: "SS1", submissionsCount: 3, gradedCount: 0, dueAt: "May 30, 11:59 PM", isOpen: true },
];

const MOCK_STUDENTS: Student[] = [
  { id: "s1", name: "Amara Okonkwo", initials: "AO", subject: "Mathematics", lastActive: "2h ago", progress: 82, color: "#3D08BA" },
  { id: "s2", name: "Emeka Chukwu", initials: "EC", subject: "Chemistry", lastActive: "5h ago", progress: 67, color: "#F68C29" },
  { id: "s3", name: "Fatima Bello", initials: "FB", subject: "English", lastActive: "1d ago", progress: 91, color: "#0D9E75" },
  { id: "s4", name: "Tunde Adeyemi", initials: "TA", subject: "Physics", lastActive: "3h ago", progress: 55, color: "#D85A30" },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "submission", message: "Amara submitted 'Week 4 Algebra Homework'", time: "15 min ago", unread: true },
  { id: "n2", type: "enrollment", message: "2 new students enrolled in Chemistry", time: "1h ago", unread: true },
  { id: "n3", type: "submission", message: "Tunde submitted Chemical Equations Quiz (late)", time: "3h ago", unread: false },
  { id: "n4", type: "reminder", message: "Newton's Laws class starts in 30 minutes", time: "5h ago", unread: false },
];

const WEEKLY_EARNINGS: EarningEntry[] = [
  { label: "Mon", amount: 4500 },
  { label: "Tue", amount: 7200 },
  { label: "Wed", amount: 3800 },
  { label: "Thu", amount: 9100 },
  { label: "Fri", amount: 6300 },
  { label: "Sat", amount: 2100 },
  { label: "Sun", amount: 0 },
];

// ── Helpers ────────────────────────────────────────────────────────────
const notifIcon = (type: Notification["type"]) => {
  if (type === "submission") return <FaFileAlt className="text-[#3D08BA]" />;
  if (type === "enrollment") return <FaUserGraduate className="text-[#0D9E75]" />;
  if (type === "reminder") return <FaClock className="text-[#F68C29]" />;
  return <FaBell className="text-slate-400" />;
};

const maxEarning = Math.max(...WEEKLY_EARNINGS.map((e) => e.amount));

// ── Main Component ─────────────────────────────────────────────────────
export default function TutorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [showNotifs, setShowNotifs] = useState(false);

  const classroomId = "224091556";
  const name = "Abdulrahman Farhan";
  const username = "abdulrahman";

  const unreadCount = notifications.filter((n) => n.unread).length;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(classroomId);
      toast.success("Classroom ID copied");
    } catch {
      toast.error("Failed to copy ID");
    }
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setShowNotifs(false);
  };

  const totalStudents = 45;
  const totalEarnings = WEEKLY_EARNINGS.reduce((s, e) => s + e.amount, 0);
  const completedClasses = 28;
  const avgRating = 4.8;

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <FaChartLine size={13} /> },
    { id: "classroom", label: "Classroom", icon: <FaChalkboardTeacher size={13} /> },
    { id: "live", label: "Live", icon: <FaSignal size={13} /> },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* TOP NAV */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/70 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Left: brand + user */}
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-[#3D08BA] flex items-center justify-center">
              <FaGraduationCap className="text-white" size={16} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-900 leading-none">{name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">@{username}</p>
            </div>
          </div>

          {/* Center: tabs */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-[#3D08BA] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="hidden sm:flex items-center gap-2 border border-slate-200 bg-white text-slate-600 text-[11px] font-semibold px-3 py-2 rounded-lg hover:border-[#3D08BA]/30 hover:text-[#3D08BA] transition"
            >
              ID: {classroomId} <FaCopy size={11} />
            </button>

            {/* Notifications bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <FaBell size={14} className="text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F68C29] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="text-[12px] font-semibold text-slate-700">Notifications</p>
                    <button onClick={markAllRead} className="text-[11px] text-[#3D08BA] font-semibold hover:underline">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 ${n.unread ? "bg-[#3D08BA]/3" : ""}`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          {notifIcon(n.type)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[12px] leading-5 ${n.unread ? "text-slate-800 font-medium" : "text-slate-600"}`}>
                            {n.message}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{n.time}</p>
                        </div>
                        {n.unread && <div className="w-2 h-2 rounded-full bg-[#3D08BA] shrink-0 mt-1.5" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="sm:hidden flex items-center gap-1 bg-slate-100 rounded-xl p-1 mt-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                activeTab === tab.id ? "bg-white text-[#3D08BA] shadow-sm" : "text-slate-500"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <OverviewTab
                totalStudents={totalStudents}
                totalEarnings={totalEarnings}
                completedClasses={completedClasses}
                avgRating={avgRating}
                assignments={MOCK_ASSIGNMENTS}
                students={MOCK_STUDENTS}
                earnings={WEEKLY_EARNINGS}
                maxEarning={maxEarning}
                onGoToAssignments={() => navigate("/tutor-assignments")}
                onGoToResources={() => navigate("/tutor-resources")}
              />
            </motion.div>
          )}

          {activeTab === "classroom" && (
            <motion.div
              key="classroom"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ClassroomTab classes={MOCK_CLASSES} />
            </motion.div>
          )}

          {activeTab === "live" && (
            <motion.div
              key="live"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <LiveTab classes={MOCK_CLASSES} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────
function OverviewTab({
  totalStudents,
  totalEarnings,
  completedClasses,
  avgRating,
  assignments,
  students,
  earnings,
  maxEarning,
  onGoToAssignments,
  onGoToResources,
}: {
  totalStudents: number;
  totalEarnings: number;
  completedClasses: number;
  avgRating: number;
  assignments: Assignment[];
  students: Student[];
  earnings: EarningEntry[];
  maxEarning: number;
  onGoToAssignments: () => void;
  onGoToResources: () => void;
}) {
  const pendingGrades = assignments.reduce(
    (s, a) => s + Math.max(0, a.submissionsCount - a.gradedCount),
    0
  );

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Good morning, Abdulrahman 👋</h1>
          <p className="text-sm text-slate-500 mt-1">Here's what's happening in your teaching workspace.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={onGoToAssignments}
            className="flex items-center gap-2 bg-[#3D08BA] text-white text-[12px] font-semibold px-4 py-2.5 rounded-xl hover:bg-[#2D0690] transition shadow-[0_4px_14px_rgba(61,8,186,0.3)]"
          >
            <FaClipboardList size={12} /> Assignments
          </button>
          <button
            onClick={onGoToResources}
            className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 text-[12px] font-semibold px-4 py-2.5 rounded-xl hover:border-[#3D08BA]/30 hover:text-[#3D08BA] transition"
          >
            <FaBook size={12} /> Resources
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FaUsers className="text-[#3D08BA]" size={16} />}
          label="Total students"
          value={String(totalStudents)}
          sub="+3 this week"
          accent="#3D08BA"
        />
        <StatCard
          icon={<FaMoneyBillWave className="text-[#0D9E75]" size={16} />}
          label="Weekly earnings"
          value={`₦${totalEarnings.toLocaleString()}`}
          sub="From 7 classes"
          accent="#0D9E75"
        />
        <StatCard
          icon={<FaCheckCircle className="text-[#F68C29]" size={16} />}
          label="Classes taught"
          value={String(completedClasses)}
          sub="This month"
          accent="#F68C29"
        />
        <StatCard
          icon={<FaStar className="text-amber-500" size={16} />}
          label="Avg. rating"
          value={String(avgRating)}
          sub="From 38 reviews"
          accent="#F59E0B"
        />
      </div>

      {/* Alert banner if pending grades */}
      {pendingGrades > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <FaExclamationCircle className="text-amber-500 shrink-0" size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-amber-800">
              {pendingGrades} submission{pendingGrades > 1 ? "s" : ""} awaiting your review
            </p>
            <p className="text-[12px] text-amber-600 mt-0.5">Students are waiting for feedback on their work.</p>
          </div>
          <button
            onClick={onGoToAssignments}
            className="shrink-0 flex items-center gap-1.5 bg-amber-500 text-white text-[11px] font-semibold px-3 py-2 rounded-lg hover:bg-amber-600 transition"
          >
            Review now <FaArrowRight size={10} />
          </button>
        </div>
      )}

      {/* Main grid: earnings chart + assignments + students */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Earnings chart */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">This week</p>
              <h3 className="text-[16px] font-bold text-slate-900 mt-0.5">Earnings</h3>
            </div>
            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2.5 py-1 rounded-full">
              +12% vs last week
            </span>
          </div>
          <div className="flex items-end gap-2 h-28">
            {earnings.map((e) => (
              <div key={e.label} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end" style={{ height: "96px" }}>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: maxEarning > 0 ? `${(e.amount / maxEarning) * 96}px` : "4px",
                      background: e.amount > 0 ? "linear-gradient(180deg,#3D08BA,#6B3FD4)" : "#e2e8f0",
                      minHeight: "4px",
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{e.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-500">Total this week</p>
            <p className="text-[20px] font-bold text-slate-900">₦{totalEarnings.toLocaleString()}</p>
          </div>
        </div>

        {/* Assignments */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Active tasks</p>
              <h3 className="text-[16px] font-bold text-slate-900 mt-0.5">Assignments</h3>
            </div>
            <button
              onClick={onGoToAssignments}
              className="flex items-center gap-1.5 text-[11px] text-[#3D08BA] font-semibold hover:underline"
            >
              View all <FaArrowRight size={9} />
            </button>
          </div>

          <div className="space-y-3">
            {assignments.map((a) => {
              const pending = Math.max(0, a.submissionsCount - a.gradedCount);
              const pct = a.submissionsCount > 0 ? Math.round((a.gradedCount / a.submissionsCount) * 100) : 0;
              return (
                <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                  <div className="w-9 h-9 rounded-xl bg-[#3D08BA]/8 flex items-center justify-center shrink-0">
                    <FaFileAlt className="text-[#3D08BA]" size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{a.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {a.subject} · {a.classGroup} · Due {a.dueAt}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3D08BA] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {a.gradedCount}/{a.submissionsCount} graded
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                        a.isOpen
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {a.isOpen ? "Open" : "Closed"}
                    </span>
                    {pending > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {pending} pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Students */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Active learners</p>
            <h3 className="text-[16px] font-bold text-slate-900 mt-0.5">Recent students</h3>
          </div>
          <button className="flex items-center gap-1.5 text-[11px] text-[#3D08BA] font-semibold hover:underline">
            All students <FaArrowRight size={9} />
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {students.map((s) => (
            <div key={s.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                  style={{ background: s.color }}
                >
                  {s.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-800 truncate">{s.name}</p>
                  <p className="text-[11px] text-slate-400">{s.subject}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-500">Progress</span>
                <span className="text-[11px] font-semibold" style={{ color: s.color }}>{s.progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.progress}%`, background: s.color }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Active {s.lastActive}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <QuickLinkCard
          icon={<FaClipboardList className="text-[#3D08BA]" size={20} />}
          title="Assignments & Classwork"
          desc="Create tasks, set release timing, grade submissions."
          cta="Open workspace"
          bg="#3D08BA"
          onClick={onGoToAssignments}
        />
        <QuickLinkCard
          icon={<FaBook className="text-[#F68C29]" size={20} />}
          title="Study Resources"
          desc="Publish notes, recordings, and library materials."
          cta="Manage resources"
          bg="#F68C29"
          onClick={onGoToResources}
        />
      </div>
    </div>
  );
}

// ── Classroom Tab ──────────────────────────────────────────────────────
function ClassroomTab({ classes }: { classes: NewClassData[] }) {
  const [filter, setFilter] = useState<"all" | "upcoming" | "live" | "completed">("all");
  const navigate = useNavigate();

  const filtered = useMemo(
    () => (filter === "all" ? classes : classes.filter((c) => c.status === filter)),
    [classes, filter]
  );

  const statusBadge = (status: NewClassData["status"]) => {
    if (status === "live")
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Live now
        </span>
      );
    if (status === "upcoming")
      return (
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Upcoming
        </span>
      );
    return (
      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
        Completed
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-slate-900">My Classroom</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your scheduled and ongoing classes.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#3D08BA] text-white text-[12px] font-semibold px-4 py-2.5 rounded-xl hover:bg-[#2D0690] transition shadow-[0_4px_14px_rgba(61,8,186,0.3)]">
          <FaPlus size={11} /> Schedule class
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total scheduled", val: classes.length, color: "#3D08BA" },
          { label: "Live now", val: classes.filter((c) => c.status === "live").length, color: "#EF4444" },
          { label: "Upcoming", val: classes.filter((c) => c.status === "upcoming").length, color: "#10B981" },
          { label: "Total students", val: classes.reduce((s, c) => s + c.students, 0), color: "#F68C29" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] text-slate-400 font-medium">{item.label}</p>
            <p className="text-[24px] font-bold mt-1" style={{ color: item.color }}>{item.val}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "live", "upcoming", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-[12px] font-semibold transition ${
              filter === f
                ? "bg-[#3D08BA] text-white shadow-[0_4px_10px_rgba(61,8,186,0.25)]"
                : "bg-white border border-slate-200 text-slate-600 hover:border-[#3D08BA]/30 hover:text-[#3D08BA]"
            }`}
          >
            {f === "all" ? "All classes" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Class cards */}
      <div className="grid sm:grid-cols-2 gap-5">
        {filtered.map((cls) => (
          <motion.div
            key={cls.id}
            layout
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition"
          >
            {/* Colored top bar by subject */}
            <div
              className="h-1.5"
              style={{
                background:
                  cls.subject === "Mathematics" ? "#3D08BA"
                  : cls.subject === "Chemistry" ? "#0D9E75"
                  : cls.subject === "English" ? "#F68C29"
                  : "#D85A30",
              }}
            />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {statusBadge(cls.status)}
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {cls.source === "assigned-school" ? "School assigned" : "Independent"}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900">{cls.title}</h3>
                  <p className="text-[12px] text-slate-500 mt-0.5">{cls.subject}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <InfoChip icon={<FaCalendar size={10} />} text={cls.date} />
                <InfoChip icon={<FaClock size={10} />} text={cls.time} />
                <InfoChip icon={<FaUserGraduate size={10} />} text={`${cls.students} students`} />
              </div>

              <div className="flex items-center gap-2">
                {cls.status === "live" ? (
                  <button
                    onClick={() => navigate(`/live-class/${cls.id}?role=teacher`)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white text-[12px] font-bold py-2.5 rounded-xl hover:bg-red-600 transition animate-pulse"
                  >
                    <FaPlay size={10} /> Join live class
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/live-class/${cls.id}?role=teacher`)}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#3D08BA] text-white text-[12px] font-semibold py-2.5 rounded-xl hover:bg-[#2D0690] transition"
                  >
                    <FaVideo size={11} /> Start class
                  </button>
                )}
                <button className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 transition">
                  <FaCalendar size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="sm:col-span-2 flex flex-col items-center justify-center py-20 text-center">
            <FaChalkboardTeacher size={36} className="text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">No classes match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Live Tab ───────────────────────────────────────────────────────────
function LiveTab({ classes }: { classes: NewClassData[] }) {
  const navigate = useNavigate();
  const liveClasses = classes.filter((c) => c.status === "live");
  const upcomingToday = classes.filter((c) => c.status === "upcoming" && c.date === "Mon 26");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-bold text-slate-900">Live & Upcoming</h2>
        <p className="text-sm text-slate-500 mt-1">Jump into active sessions or prepare for what's next.</p>
      </div>

      {/* Live now */}
      {liveClasses.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-red-500 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            Live now
          </p>
          <div className="space-y-4">
            {liveClasses.map((cls) => (
              <div
                key={cls.id}
                className="relative overflow-hidden bg-linear-to-br from-[#3D08BA] to-[#6B3FD4] rounded-2xl p-6 text-white"
              >
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500 text-white mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Live now
                    </span>
                    <h3 className="text-[20px] font-bold leading-tight">{cls.title}</h3>
                    <p className="text-[13px] text-white/70 mt-1">{cls.subject}</p>
                    <div className="flex items-center gap-4 mt-4 text-[12px] text-white/80">
                      <span className="flex items-center gap-1.5"><FaUserGraduate size={11} /> {cls.students} students</span>
                      <span className="flex items-center gap-1.5"><FaClock size={11} /> {cls.duration}</span>
                      <span className="flex items-center gap-1.5"><FaCalendar size={11} /> {cls.time}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/live-class/${cls.id}?role=teacher`)}
                    className="shrink-0 flex items-center gap-2 bg-white text-[#3D08BA] font-bold text-[13px] px-6 py-3 rounded-xl hover:bg-white/90 transition shadow-lg"
                  >
                    <FaPlay size={12} /> Rejoin session
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl py-14 text-center">
          <FaSignal size={28} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No live classes right now</p>
          <p className="text-[12px] text-slate-400 mt-1">Your upcoming sessions will appear here when they go live.</p>
        </div>
      )}

      {/* Upcoming classes */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Today's upcoming</p>
        {upcomingToday.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-10 text-center">
            <p className="text-slate-500 text-sm">No more classes scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingToday.map((cls) => (
              <div key={cls.id} className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-sm transition">
                <div className="w-12 h-12 rounded-xl bg-[#3D08BA]/8 flex items-center justify-center shrink-0">
                  <FaVideo className="text-[#3D08BA]" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-800">{cls.title}</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    {cls.subject} · {cls.time} · {cls.duration} · {cls.students} students
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/live-class/${cls.id}?role=teacher`)}
                  className="shrink-0 flex items-center gap-2 bg-[#3D08BA] text-white text-[11px] font-semibold px-4 py-2.5 rounded-xl hover:bg-[#2D0690] transition"
                >
                  <FaPlay size={9} /> Start
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-[28px] font-bold text-[#3D08BA]">28</p>
          <p className="text-[11px] text-slate-500 mt-1">Total sessions this month</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-[28px] font-bold text-[#0D9E75]">92%</p>
          <p className="text-[11px] text-slate-500 mt-1">Attendance rate</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-[28px] font-bold text-[#F68C29]">45h</p>
          <p className="text-[11px] text-slate-500 mt-1">Teaching hours</p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}14` }}
        >
          {icon}
        </div>
      </div>
      <p className="text-[24px] font-bold text-slate-900 leading-none">{value}</p>
      <p className="text-[11px] text-slate-500 mt-1.5">{label}</p>
      <p className="text-[11px] font-medium mt-0.5" style={{ color: accent }}>{sub}</p>
    </div>
  );
}

function InfoChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[11px] font-medium text-slate-600 truncate">{text}</span>
    </div>
  );
}

function QuickLinkCard({
  icon,
  title,
  desc,
  cta,
  bg,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition group">
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -translate-y-1/2 translate-x-1/4"
        style={{ background: bg }}
      />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${bg}14` }}>
        {icon}
      </div>
      <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
      <p className="text-[12px] text-slate-500 mt-1 mb-4">{desc}</p>
      <button
        onClick={onClick}
        className="flex items-center gap-2 text-[12px] font-semibold transition"
        style={{ color: bg }}
      >
        {cta} <FaArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}