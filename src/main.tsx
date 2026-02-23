import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Import page components
import SignUp from './features/auth/SignUp.tsx'
import SignIn from './features/auth/SignIn.tsx'
import SchoolRegistration from './features/schools/pages/SchoolRegistration.tsx'
import TutorRegistration from './features/tutors/pages/TutorRegistration.tsx'
import PasswordRecovery from './features/auth/PasswordRecovery.tsx'
import StudentRegistration from './features/students/pages/StudentRegistration.tsx'

// Import Dashboard components
import SchoolDashboard from './features/schools/pages/SchoolDashboard.tsx'
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
//Import courses
import CoursesList from './features/tutors/pages/courses/CoursesList.tsx'

//Import subjects
import StudentSubjects from './features/students/pages/Courses.tsx'
import CourseLearning from './features/students/pages/CourseLearning.tsx'

//Import performance stats
import  Performancestats  from './features/students/pages/Performancestats.tsx'

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
        <Route path="/school-dashboard" element={<SchoolDashboard />} />
        <Route path="/tutor-dashboard" element={<TutorDashboard />} />
        <Route path="/student-home" element={<StudentHome />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />

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
        {/* Resource Library */}
        <Route path="/resources" element={<ResourceLibrary />} />
        {/* Payments */}
        <Route path="/payments" element={<Payments />} />
        {/* Payments */}
        <Route path="/performance" element={<Performancestats />} />
      </Routes>
    </Router>
  </StrictMode>
)
