import "react-toastify/dist/ReactToastify.css";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaBook,
  FaCalendar,
  FaClock,
  FaCopy,
  FaMoneyBillWave,
  FaUserGraduate,
  FaVideo,
} from "react-icons/fa";

// ── Types (replace with real imports if already defined) ───────────────
type TabId = "overview" | "group" | "classroom" | "live";
type FilterType = "all" | "active" | "inactive";

type NotificationState = {
  msg: string;
  type: "info" | "success" | "error";
};

type TeachingSubscriptionState = {
  isActive: boolean;
  features: {
    maxScheduledOfflineClasses: number;
  };
  currentPeriodEndLabel?: string;
};

type NewClassData = {
  id: string;
  title: string;
  date: string;
  time: string;
  students: number;
  source: "independent" | "assigned-school";
};

// ── Component ──────────────────────────────────────────────────────────
export default function TutorDashboard() {
  const navigate = useNavigate();

  // ── Profile ─────────────────────────────────
  const [profileSrc, setProfileSrc] = useState<string | null>(null);
  const [name] = useState("Abdulrahman Farhan");
  const [username] = useState("abdulrahman");
  const [description] = useState(
    "Experienced tutor specializing in mathematics and science."
  );

  // ── UI State ─────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [notification, setNotification] =
    useState<NotificationState | null>(null);

  // ── Subscription ────────────────────────────
  const [subscriptionState, setSubscriptionState] =
    useState<TeachingSubscriptionState | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);

  // ── Classes ─────────────────────────────────
  const [independentClasses, setIndependentClasses] = useState<NewClassData[]>([]);
  const [assignedSchoolClasses, setAssignedSchoolClasses] = useState<NewClassData[]>([]);
  const [isUpcomingLoading, setIsUpcomingLoading] = useState(false);
  const [upcomingNotice, setUpcomingNotice] = useState("");

  const classroomId = "224091556";

  const isSubscriptionActive = Boolean(subscriptionState?.isActive);
  const offlineScheduleLimit =
    subscriptionState?.features.maxScheduledOfflineClasses ?? 1;

  // ── Helpers ─────────────────────────────────
  const notify = (msg: string, type: NotificationState["type"] = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const upcomingClasses = useMemo(() => {
    return [...independentClasses, ...assignedSchoolClasses];
  }, [independentClasses, assignedSchoolClasses]);

  // ── Effects ─────────────────────────────────
  useEffect(() => {
    setIsSubscriptionLoading(true);

    // MOCK subscription (replace with API)
    setTimeout(() => {
      setSubscriptionState({
        isActive: false,
        features: { maxScheduledOfflineClasses: 1 },
      });
      setIsSubscriptionLoading(false);
    }, 500);

    // MOCK classes
    setIndependentClasses([
      {
        id: "1",
        title: "Algebra Basics",
        date: "Mon 22",
        time: "10:00 AM",
        students: 5,
        source: "independent",
      },
    ]);
  }, []);

  // ── Actions ─────────────────────────────────
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(classroomId);
      toast.success("Classroom ID copied");
    } catch {
      toast.error("Failed to copy ID");
    }
  };

  const handleStartClass = (classItem: NewClassData) => {
    if (!isSubscriptionActive) {
      toast.info("Upgrade to Edamaa Pro to start live classes");
      navigate("/subscription?actor=tutor");
      return;
    }

    navigate(`/live-class/${classItem.id}?role=teacher`);
  };

  // ── Render ──────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded px-4 py-2">
          {notification.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{name}</h1>
          <p className="text-sm text-gray-500">@{username}</p>
        </div>

        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 bg-[#F68C29] text-white px-4 py-2 rounded-lg"
        >
          ID: {classroomId} <FaCopy />
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 px-6 py-4">
        {(["overview", "classroom", "live"] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded ${
              activeTab === tab
                ? "bg-[#3D08BA] text-white"
                : "bg-white border"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <AnimatePresence mode="wait">
        {activeTab === "classroom" && (
          <motion.div
            key="classroom"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-6"
          >
            {isUpcomingLoading && <p>Loading classes...</p>}
            {upcomingNotice && <p>{upcomingNotice}</p>}

            <div className="grid md:grid-cols-2 gap-4">
              {upcomingClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white p-4 rounded-xl shadow"
                >
                  <h3 className="font-bold">{cls.title}</h3>
                  <p className="text-sm text-gray-500">
                    {cls.date} • {cls.time}
                  </p>

                  <button
                    onClick={() => handleStartClass(cls)}
                    className="mt-3 bg-[#F68C29] text-white px-4 py-2 rounded"
                  >
                    Start Class
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}