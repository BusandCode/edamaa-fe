import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import ProtectedRoute from './components/auth/ProtectedRoute.tsx'
import RoleProtectedRoute from './components/auth/RoleProtectedRoute.tsx'
import { hasPersistedAuthSession } from './utils/authSession'

const SignUp = lazy(() => import('./features/auth/SignUp.tsx'))
const SignIn = lazy(() => import('./features/auth/SignIn.tsx'))
const SchoolRegistration = lazy(() => import('./features/schools/pages/SchoolRegistration.tsx'))
const TutorRegistration = lazy(() => import('./features/tutors/pages/TutorRegistration.tsx'))
const PasswordRecovery = lazy(() => import('./features/auth/PasswordRecovery.tsx'))
const AccountRoles = lazy(() => import('./features/auth/AccountRoles.tsx'))
const StudentRegistration = lazy(() => import('./features/students/pages/StudentRegistration.tsx'))
const SchoolDashboard = lazy(() => import('./features/schools/pages/SchoolDashboard.tsx'))
const SchoolFinance = lazy(() => import('./features/schools/pages/SchoolFinance.tsx'))
const SchoolSchedule = lazy(() => import('./features/schools/pages/SchoolSchedule.tsx'))
const SchoolTeacherClassAccess = lazy(() => import('./features/schools/pages/SchoolTeacherClassAccess.tsx'))
const SchoolExams = lazy(() => import('./features/schools/pages/SchoolExams.tsx'))
const SchoolAssignments = lazy(() => import('./features/schools/pages/SchoolAssignments.tsx'))
const SchoolResources = lazy(() => import('./features/schools/pages/SchoolResources.tsx'))
const TutorDashboard = lazy(() => import('./features/tutors/pages/TutorDashboard.tsx'))
const TutorAssignments = lazy(() => import('./features/tutors/pages/TutorAssignments.tsx'))
const TutorResources = lazy(() => import('./features/tutors/pages/TutorResources.tsx'))
const StudentDashboard = lazy(() => import('./features/students/pages/StudentDashboard.tsx'))
const StudentHome = lazy(() => import('./features/students/pages/StudentHome.tsx'))
const StudentProfile = lazy(() => import('./features/students/pages/StudentProfile.tsx'))
const StudentListTutor = lazy(() => import('./features/tutors/pages/lists/StudentList.tsx'))
const StudentListSchool = lazy(() => import('./features/schools/pages/lists/StudentListSchool.tsx'))
const TutorListSchool = lazy(() => import('./features/schools/pages/lists/TutorListSchool.tsx'))
const Assignments = lazy(() => import('./features/students/pages/Assignments.tsx'))
const Payments = lazy(() => import('./features/students/pages/Payments.tsx'))
const JoinClass = lazy(() => import('./features/students/pages/JoinClass.tsx'))
const StudentNotifications = lazy(() => import('./features/students/components/StudentNotifications.tsx'))
const ResourceLibrary = lazy(() => import('./features/students/pages/Resources.tsx'))
const LiveClassroom = lazy(() => import('./features/students/pages/LiveClassroom.tsx'))
const StudentExams = lazy(() => import('./features/students/pages/StudentExams.tsx'))
const CoursesList = lazy(() => import('./features/tutors/pages/courses/CoursesList.tsx'))
const StudentSubjects = lazy(() => import('./features/students/pages/Courses.tsx'))
const CourseLearning = lazy(() => import('./features/students/pages/CourseLearning.tsx'))
const Performancestats = lazy(() => import('./features/students/pages/Performancestats.tsx'))
const SubscriptionPlans = lazy(() => import('./features/subscriptions/pages/SubscriptionPlans.tsx'))
const Edamaa3DVerified = lazy(() => import('./features/subscriptions/pages/Edamaa3DVerified.tsx'))
const InternalAdminPayouts = lazy(() => import('./features/admin/pages/InternalAdminPayouts.tsx'))

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.10),_transparent_34%),linear-gradient(135deg,_#f8fafc,_#f5f3ff_58%,_#eff6ff)] px-6 text-center">
    <div className="max-w-sm rounded-[28px] border border-white/80 bg-white/90 px-6 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Edamaa</p>
      <p className="mt-3 text-sm font-semibold text-slate-900">Loading workspace...</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Preparing the next screen and keeping your session in place.
      </p>
    </div>
  </div>
)

const LiveClassRouteGuard = () => {
  const location = useLocation()
  const { classId } = useParams()
  const searchParams = new URLSearchParams(location.search)
  const isSchoolTeacherLink =
    searchParams.get('role') === 'teacher' && searchParams.get('actor') === 'school'

  if (!hasPersistedAuthSession()) {
    if (isSchoolTeacherLink && classId) {
      if (typeof window !== 'undefined') {
        const accessKey = `edamaa_teacher_access_${classId}`
        if (window.sessionStorage.getItem(accessKey)) {
          return <LiveClassroom />
        }
      }
      return (
        <Navigate
          to={`/school-teacher/live/${encodeURIComponent(classId)}${location.search}`}
          replace
        />
      )
    }
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    )
  }

  return <LiveClassroom />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Home/Landing Page */}
        <Route path="/" element={<App />} />
        
        {/* Authentication Routes */}
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/password-recovery" element={<PasswordRecovery />} />
        
        {/* Registration Routes */}
        <Route path="/school-registration" element={<SchoolRegistration />} />
        <Route path="/tutor-registration" element={<TutorRegistration />} />
        <Route path="/student-registration" element={<StudentRegistration />} />
        
        {/* Dashboard Routes */}
        <Route
          path="/school-dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['school', 'admin']}>
              <SchoolDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/school-finance"
          element={
            <RoleProtectedRoute allowedRoles={['school', 'admin']}>
              <SchoolFinance />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/school-schedule"
          element={
            <RoleProtectedRoute allowedRoles={['school', 'admin']}>
              <SchoolSchedule />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/school-exams"
          element={
            <RoleProtectedRoute allowedRoles={['school', 'admin']}>
              <SchoolExams />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/school-assignments"
          element={
            <RoleProtectedRoute allowedRoles={['school', 'admin']}>
              <SchoolAssignments />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/school-resources"
          element={
            <RoleProtectedRoute allowedRoles={['school', 'admin']}>
              <SchoolResources />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/internal-admin/payouts"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <InternalAdminPayouts />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/tutor-dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['tutor', 'admin']}>
              <TutorDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/tutor-resources"
          element={
            <RoleProtectedRoute allowedRoles={['tutor', 'admin']}>
              <TutorResources />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/tutor-assignments"
          element={
            <RoleProtectedRoute allowedRoles={['tutor', 'admin']}>
              <TutorAssignments />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/student-home"
          element={
            <RoleProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentHome />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/student-dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route path="/account-roles" element={<ProtectedRoute><AccountRoles /></ProtectedRoute>} />

        {/* Profile routes */}
        <Route
          path='/my-profile'
          element={
            <RoleProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentProfile />
            </RoleProtectedRoute>
          }
        />

        {/* Students Route */}
        <Route
          path='/student-list-tutor'
          element={
            <RoleProtectedRoute allowedRoles={['tutor', 'admin']}>
              <StudentListTutor />
            </RoleProtectedRoute>
          }
        />
        <Route
          path='/student-list-school'
          element={
            <RoleProtectedRoute allowedRoles={['school', 'admin']}>
              <StudentListSchool />
            </RoleProtectedRoute>
          }
        />
        <Route
          path='/tutor-list-school'
          element={
            <RoleProtectedRoute allowedRoles={['school', 'admin']}>
              <TutorListSchool />
            </RoleProtectedRoute>
          }
        />

        {/* Courses */}
        <Route
          path='/courses'
          element={
            <RoleProtectedRoute allowedRoles={['tutor', 'admin']}>
              <CoursesList />
            </RoleProtectedRoute>
          }
        />

        {/* Subjects */}
        <Route
          path='/mycourses'
          element={
            <RoleProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentSubjects />
            </RoleProtectedRoute>
          }
        />
        <Route
          path='/course/:courseId'
          element={
            <RoleProtectedRoute allowedRoles={['student', 'admin']}>
              <CourseLearning />
            </RoleProtectedRoute>
          }
        />
        {/* Assignments */}
        <Route
          path='/assignments'
          element={
            <RoleProtectedRoute allowedRoles={['student', 'admin']}>
              <Assignments />
            </RoleProtectedRoute>
          }
        />

        {/* Notifications */}
        <Route
          path="/notifications"
          element={
            <RoleProtectedRoute allowedRoles={['student', 'tutor', 'school', 'admin']}>
              <StudentNotifications />
            </RoleProtectedRoute>
          }
        />
        {/* Join Class */}
        <Route
          path="/join-class"
          element={
            <RoleProtectedRoute allowedRoles={['student', 'admin']}>
              <JoinClass />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/live-class/:classId"
          element={
            <LiveClassRouteGuard />
          }
        />
        <Route
          path="/school-teacher/live/:sessionId"
          element={
            <SchoolTeacherClassAccess />
          }
        />
        {/* Resource Library */}
        <Route
          path="/resources"
          element={
            <RoleProtectedRoute allowedRoles={['student', 'tutor', 'school', 'admin']}>
              <ResourceLibrary />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/student-exams"
          element={
            <RoleProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentExams />
            </RoleProtectedRoute>
          }
        />
        {/* Payments */}
        <Route
          path="/payments"
          element={
            <RoleProtectedRoute allowedRoles={['student', 'admin']}>
              <Payments />
            </RoleProtectedRoute>
          }
        />
        {/* Subscription */}
        <Route
          path="/subscription"
          element={
            <RoleProtectedRoute allowedRoles={['student', 'tutor', 'school', 'admin']}>
              <SubscriptionPlans />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/edamaa3d-verified"
          element={
            <RoleProtectedRoute allowedRoles={['student', 'tutor', 'school', 'admin']}>
              <Edamaa3DVerified />
            </RoleProtectedRoute>
          }
        />
        {/* Performance */}
        <Route
          path="/performance"
          element={
            <RoleProtectedRoute allowedRoles={['student', 'admin']}>
              <Performancestats />
            </RoleProtectedRoute>
          }
        />
      </Routes>
      </Suspense>
    </Router>
  </StrictMode>
)
