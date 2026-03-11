export interface TutorStats {
  totalCourses: number;
  totalStudents: number;
  totalEarnings: number;
  avgRating: number;
  completionRate: number;
  hoursThisWeek: number;
}

export interface TutorData {
  name: string;
  title: string;
  bio: string;
  classroomId: string;
  stats: TutorStats;
}

export interface EarningsEntry {
  month: string;
  amount: number;
}

export interface Course {
  id: number;
  title: string;
  students: number;
  progress: number;
  color: string;
  category: string;
  nextClass: string;
  revenue: number;
}

export type StudentStatus = "active" | "at-risk";

export interface Student {
  id: number;
  name: string;
  course: string;
  progress: number;
  grade: string;
  status: StudentStatus;
  avatar: string;
}

export type ScheduleType = "live" | "offline" | "group";

export interface ScheduleItem {
  id: number;
  title: string;
  time: string;
  date: string;
  type: ScheduleType;
  students: number;
  duration: string;
}

export type ActivityType = "submit" | "enroll" | "payment" | "class" | "review";

export interface ActivityItem {
  id: number;
  action: string;
  detail: string;
  time: string;
  type: ActivityType;
}

export type TabId = "overview" | "courses" | "students" | "earnings" | "schedule";

export interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

export type FilterType = "all" | "active" | "at-risk";

export interface NotificationState {
  msg: string;
  type: "info" | "success" | "error";
}