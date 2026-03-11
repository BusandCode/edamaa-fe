import type {
    TutorData,
    EarningsEntry,
    Course,
    Student,
    ScheduleItem,
    ActivityItem,
    Tab,
    ActivityType,
    ScheduleType,
} from "./Types";

export const tutorData: TutorData = {
  name: "Abdulrahman Farhan",
  title: "Senior Mathematics & Science Tutor",
  bio: "Helping students unlock their potential through engaging, result-oriented teaching.",
  classroomId: "224091556",
  stats: {
    totalCourses: 12,
    totalStudents: 247,
    totalEarnings: 45280,
    avgRating: 4.9,
    completionRate: 87,
    hoursThisWeek: 18,
  },
};

export const earningsData: EarningsEntry[] = [
  { month: "Aug", amount: 3200 },
  { month: "Sep", amount: 4100 },
  { month: "Oct", amount: 3800 },
  { month: "Nov", amount: 5200 },
  { month: "Dec", amount: 4700 },
  { month: "Jan", amount: 6100 },
  { month: "Feb", amount: 5800 },
  { month: "Mar", amount: 7200 },
];

export const courses: Course[] = [
  { id: 1, title: "Financial Accounting 101", students: 68, progress: 72, color: "#3D08BA", category: "Finance", nextClass: "Today, 12:00pm", revenue: 8200 },
  { id: 2, title: "Advanced Mathematics", students: 45, progress: 58, color: "#F68C29", category: "Math", nextClass: "Tomorrow, 2:30pm", revenue: 5400 },
  { id: 3, title: "Introduction to Physics", students: 82, progress: 91, color: "#10B981", category: "Science", nextClass: "Thu, 10:00am", revenue: 9800 },
  { id: 4, title: "English Literature", students: 52, progress: 44, color: "#EF4444", category: "Arts", nextClass: "Fri, 1:00pm", revenue: 6200 },
];

export const students: Student[] = [
  { id: 1, name: "Chioma Adaeze", course: "Financial Accounting", progress: 89, grade: "A", status: "active", avatar: "CA" },
  { id: 2, name: "Emeka Okonkwo", course: "Advanced Mathematics", progress: 65, grade: "B+", status: "active", avatar: "EO" },
  { id: 3, name: "Fatima Hassan", course: "Physics", progress: 94, grade: "A+", status: "active", avatar: "FH" },
  { id: 4, name: "James Adebayo", course: "English Literature", progress: 42, grade: "C+", status: "at-risk", avatar: "JA" },
  { id: 5, name: "Ngozi Eze", course: "Financial Accounting", progress: 78, grade: "B+", status: "active", avatar: "NE" },
  { id: 6, name: "Tunde Bakare", course: "Advanced Mathematics", progress: 31, grade: "D", status: "at-risk", avatar: "TB" },
];

export const schedule: ScheduleItem[] = [
  { id: 1, title: "Financial Accounting 101", time: "12:00 PM", date: "Today", type: "live", students: 68, duration: "90 min" },
  { id: 2, title: "Advanced Mathematics", time: "2:30 PM", date: "Tomorrow", type: "offline", students: 45, duration: "60 min" },
  { id: 3, title: "Physics Lab Session", time: "10:00 AM", date: "Thu, Jan 22", type: "group", students: 20, duration: "120 min" },
  { id: 4, title: "English Literature Review", time: "1:00 PM", date: "Fri, Jan 23", type: "offline", students: 52, duration: "75 min" },
];

export const recentActivity: ActivityItem[] = [
  { id: 1, action: "Assignment submitted", detail: "Chioma Adaeze · Financial Accounting", time: "5 min ago", type: "submit" },
  { id: 2, action: "New enrollment", detail: "3 new students joined Physics", time: "1 hr ago", type: "enroll" },
  { id: 3, action: "Payment received", detail: "₦45,000 from 12 students", time: "2 hr ago", type: "payment" },
  { id: 4, action: "Live class ended", detail: "Advanced Math · 45 attended", time: "Yesterday", type: "class" },
  { id: 5, action: "New review", detail: "Fatima Hassan rated you ⭐⭐⭐⭐⭐", time: "Yesterday", type: "review" },
];

export const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: "⊞" },
  { id: "courses", label: "Courses", icon: "📚" },
  { id: "students", label: "Students", icon: "👥" },
  { id: "earnings", label: "Earnings", icon: "💰" },
  { id: "schedule", label: "Schedule", icon: "📅" },
];

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  submit: "📝",
  enroll: "✅",
  payment: "💳",
  class: "🎥",
  review: "⭐",
};

export const ACTIVITY_BG: Record<ActivityType, string> = {
  submit: "#EEF2FF",
  enroll: "#F0FDF4",
  payment: "#FFF7ED",
  class: "#F3F0FF",
  review: "#FFFBEB",
};

export const SCHEDULE_TYPE_STYLE: Record<ScheduleType, { bg: string; color: string }> = {
  live:    { bg: "#FEE2E2", color: "#EF4444" },
  group:   { bg: "#EDE9FF", color: "#3D08BA" },
  offline: { bg: "#F0FDF4", color: "#10B981" },
};