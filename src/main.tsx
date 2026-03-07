import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import ProtectedRoute from './components/auth/ProtectedRoute.tsx'
import RoleProtectedRoute from './components/auth/RoleProtectedRoute.tsx'

// Import page components
import SignUp from './features/auth/SignUp.tsx'
import SignIn from './features/auth/SignIn.tsx'
import SchoolRegistration from './features/schools/pages/SchoolRegistration.tsx'
import TutorRegistration from './features/tutors/pages/TutorRegistration.tsx'
import PasswordRecovery from './features/auth/PasswordRecovery.tsx'
import AccountRoles from './features/auth/AccountRoles.tsx'
import StudentRegistration from './features/students/pages/StudentRegistration.tsx'

// Import Dashboard components
import SchoolDashboard from './features/schools/pages/SchoolDashboard.tsx'
import SchoolFinance from './features/schools/pages/SchoolFinance.tsx'
import TutorDashboard from './features/tutors/pages/TutorDashboard.tsx'
import StudentDashboard from './features/students/pages/StudentDashboard.tsx'
import StudentHome from './features/students/pages/StudentHome.tsx'
import StudentProfile from './features/students/pages/StudentProfile.tsx'

// For Students
import StudentListTutor from './features/tutors/pages/lists/StudentList.tsx'
import StudentListSchool from './features/schools/pages/lists/StudentListSchool.tsx'
import Assignments from './features/students/pages/Assignments.tsx'
import Payments from './features/students/pages/Payments.tsx'
import JoinClass from './features/students/pages/JoinClass.tsx'
import StudentNotifications from './features/students/components/StudentNotifications.tsx'
import ResourceLibrary from './features/students/pages/Resources.tsx'
import LiveClassroom from './features/students/pages/LiveClassroom.tsx'
//Import courses
import CoursesList from './features/tutors/pages/courses/CoursesList.tsx'

//Import subjects
import StudentSubjects from './features/students/pages/Courses.tsx'
import CourseLearning from './features/students/pages/CourseLearning.tsx'

//Import performance stats
import  Performancestats  from './features/students/pages/Performancestats.tsx'
import SubscriptionPlans from './features/subscriptions/pages/SubscriptionPlans.tsx'
import Edamaa3DVerified from './features/subscriptions/pages/Edamaa3DVerified.tsx'
import InternalAdminPayouts from './features/admin/pages/InternalAdminPayouts.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
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
            <RoleProtectedRoute allowedRoles={['student', 'tutor', 'school', 'admin']}>
              <LiveClassroom />
            </RoleProtectedRoute>
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
    </Router>
  </StrictMode>
)
