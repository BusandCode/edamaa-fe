import { courses } from "./Courses"
const CoursesList = () => {
  return (
    <div>
        {courses.map((course) => (
            <div key={course.id} className="p-4 border-b">
                <h2 className="text-xl font-bold">{course.title}</h2>
                <p className="text-gray-600">{course.description}</p>
                <p className="text-sm text-gray-500">Tutor: {course.tutor}</p>
                <p className="text-sm text-gray-500">Duration: {course.duration}</p>
                <p className="text-sm text-gray-500">Students Enrolled: {course.studentsEnrolled}</p>
                <p className="text-sm text-gray-500">Rating: {course.rating}</p>
            </div>
        ))}
    </div>
  )
}

export default CoursesList