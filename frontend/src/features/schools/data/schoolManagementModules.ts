export type SchoolModule = {
  id: string;
  title: string;
  summary: string;
  solves: string;
  action: string;
  iconKey:
    | 'fees'
    | 'timetable'
    | 'exams'
    | 'homework'
    | 'certificates'
    | 'onlineCourses'
    | 'branches'
    | 'library'
    | 'attendance'
    | 'hostel';
};

export const schoolManagementModules: SchoolModule[] = [
  {
    id: 'fees-management',
    title: 'Fees Management',
    summary: 'Track student fees, balances, invoices, and receipts in one place.',
    solves: 'It removes manual fee tracking errors and gives your finance team a clear payment record.',
    action: 'Create fee plans, confirm payments, and monitor outstanding balances with confidence.',
    iconKey: 'fees',
  },
  {
    id: 'class-timetable-management',
    title: 'Class & Timetable Management',
    summary: 'Build conflict-free class schedules and assign teachers to each session.',
    solves: 'It prevents timetable clashes and keeps classroom, teacher, and period allocation organized.',
    action: 'Set class routines, assign tutors, and keep every school day running on schedule.',
    iconKey: 'timetable',
  },
  {
    id: 'exam-result-management',
    title: 'Exam & Result Management',
    summary: 'Record exam scores and generate report cards faster.',
    solves: 'It reduces grading bottlenecks and improves consistency in student result reporting.',
    action: 'Capture marks, review performance, and publish structured report cards to families.',
    iconKey: 'exams',
  },
  {
    id: 'homework-study-materials',
    title: 'Homework & Study Materials',
    summary: 'Share homework and study materials with students and parents anytime.',
    solves: 'It keeps learning resources in one place and improves assignment follow-through.',
    action: 'Upload materials, attach instructions, and make updates without repeated manual messaging.',
    iconKey: 'homework',
  },
  {
    id: 'student-certificates',
    title: 'Student Certificates',
    summary: 'Generate certificates quickly using reusable school templates.',
    solves: 'It removes repetitive formatting work and keeps certificate output consistent.',
    action: 'Select a template, fill student details, and generate official certificates in minutes.',
    iconKey: 'certificates',
  },
  {
    id: 'online-courses',
    title: 'Online Courses',
    summary: 'Deliver digital lessons for remote and blended learning.',
    solves: 'It extends your school beyond physical classrooms so students can keep learning anywhere.',
    action: 'Publish lessons, organize course flow, and monitor remote class participation.',
    iconKey: 'onlineCourses',
  },
  {
    id: 'multiple-branch-management',
    title: 'Multiple Branch Management',
    summary: 'Manage multiple campuses from one centralized dashboard.',
    solves: 'It reduces branch-level data silos and gives leadership unified visibility.',
    action: 'Coordinate teams across campuses and monitor students, classes, and operations together.',
    iconKey: 'branches',
  },
  {
    id: 'library-management',
    title: 'Library Management',
    summary: 'Track books, borrowing activity, due dates, and returns.',
    solves: 'It prevents lost inventory and helps your school maintain a reliable library system.',
    action: 'Register items, manage check-outs, and monitor return status in real time.',
    iconKey: 'library',
  },
  {
    id: 'attendance-management',
    title: 'Attendance Management',
    summary: 'Record daily attendance for students and staff with clear history.',
    solves: 'It replaces scattered attendance records and improves accountability.',
    action: 'Mark attendance quickly and review trends for early intervention when needed.',
    iconKey: 'attendance',
  },
  {
    id: 'hostel-management',
    title: 'Hostel Management',
    summary: 'Organize rooms, bed spaces, allocations, and occupancy status.',
    solves: 'It keeps boarding operations structured and reduces allocation confusion.',
    action: 'Assign students to rooms, track capacity, and monitor occupancy from one panel.',
    iconKey: 'hostel',
  },
];
