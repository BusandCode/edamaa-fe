import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Import page components
import SignUp from './pages/SignUp.tsx'
import SignIn from './pages/SignIn.tsx'
import SchoolRegistration from './pages/SchoolRegistration.tsx'
import TutorRegistration from './pages/TutorRegistration.tsx'
import PasswordRecovery from './pages/PasswordRecovery.tsx'
import StudentRegistration from './pages/StudentRegistration.tsx'

// Import Dashboard components
import SchoolDashboard from './pages/dashboards/SchoolDashboard.tsx'
import TutorDashboard from './pages/dashboards/TutorDashboard.tsx'
import StudentDashboard from './pages/dashboards/StudentDashboard.tsx'
import StudentProfile from './pages/profiles/StudentProfile.tsx'

//Import Notifications
import StudentNotifications from './components/modules/students/StudentNotifications.tsx'

//Import Join class
import JoinClass from './components/modules/students/JoinClass.tsx'

//Import Assignments
import Assignments from './pages/assignments/Assignments.tsx'
//Import students
import StudentListTutor from './pages/lists/tutors/StudentListTutor.tsx'
import StudentListSchool from './pages/lists/schools/StudentListSchool.tsx'

//Import courses
import CoursesList from './pages/courses/CoursesList.tsx'

//Import subjects
import StudentSubjects from './pages/subjects/StudentSubjects.tsx'

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
        <Route path="/student-dashboard" element={<StudentDashboard />} />

        {/* Proile routes */}
        <Route path='/my-profile' element={<StudentProfile />} />

        {/* Students Route */}
        <Route path='/student-list-tutor' element={<StudentListTutor />} />
        <Route path='/student-list-school' element={<StudentListSchool />} />

        {/* Courses */}
        <Route path='/courses' element={<CoursesList />} />

        {/* Subjects */}
        <Route path='/mysubjects' element={<StudentSubjects />} />
        {/* Assignments */}
        <Route path='/assignments' element={<Assignments />} />

        {/* Notifications */}
        <Route path="/notifications" element={<StudentNotifications />} />
        {/* Join Class */}
        <Route path="/join-class" element={<JoinClass />} />
      </Routes>
    </Router>
  </StrictMode>,
)