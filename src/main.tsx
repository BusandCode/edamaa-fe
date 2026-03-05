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

        {/* Proile routes */}
        <Route path='/my-profile' element={<StudentProfile />} />

        {/* Students Route */}
        <Route path='/student-list-tutor' element={<StudentListTutor />} />
        <Route path='/student-list-school' element={<StudentListSchool />} />

        {/* Courses */}
        <Route path='/courses' element={<CoursesList />} />

        {/* Subjects */}
        <Route path='/mycourses' element={<StudentSubjects />} />
        <Route path='/course/:courseId' element={<CourseLearning />} />
        {/* Assignments */}
        <Route path='/assignments' element={<Assignments />} />

        {/* Notifications */}
        <Route path="/notifications" element={<StudentNotifications />} />
        {/* Join Class */}
        <Route path="/join-class" element={<JoinClass />} />
        <Route path="/live-class/:classId" element={<LiveClassroom />} />
        {/* Resource Library */}
        <Route path="/resources" element={<ResourceLibrary />} />
        {/* Payments */}
        <Route path="/payments" element={<Payments />} />
        {/* Subscription */}
        <Route path="/subscription" element={<SubscriptionPlans />} />
        <Route path="/edamaa3d-verified" element={<Edamaa3DVerified />} />
        {/* Payments */}
        <Route path="/performance" element={<ProtectedRoute><Performancestats /></ProtectedRoute>} />
      </Routes>
    </Router>
  </StrictMode>
)
