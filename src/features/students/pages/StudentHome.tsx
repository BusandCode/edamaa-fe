import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BuildingOffice2Icon,
  ClockIcon,
  FireIcon,
  MagnifyingGlassIcon,
  PlayCircleIcon,
  UserGroupIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import NewLogo from '../../../components/common/NewLogo';
import StudentBottomNavigation from '../../../components/layout/student-layout/StudentBottomNavigation';
import { RECORDED_COURSES } from '../data/recordedCourses';

type OnlineTutor = {
  id: number;
  name: string;
  focus: string;
  responseTime: string;
  school: string;
  avatar: string;
};

type OnlineSchool = {
  id: number;
  name: string;
  city: string;
  activeClasses: number;
  activeTutors: number;
  theme: string;
};

type LiveClass = {
  id: number;
  title: string;
  tutor: string;
  school: string;
  learners: number;
  startsIn: string;
  category: string;
};

const onlineTutors: OnlineTutor[] = [
  {
    id: 1,
    name: 'Dr. Adetokunbo Andrew',
    focus: 'Data Science Math',
    responseTime: '~2 mins',
    school: 'Edamaa Science Academy',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AndrewTutor',
  },
  {
    id: 2,
    name: 'Prof. Sobowale Olamide',
    focus: 'Quantum Physics',
    responseTime: '~4 mins',
    school: 'Lagos STEM Hub',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=OlamideTutor',
  },
  {
    id: 3,
    name: 'Dr. Ajayi Olubukunmi',
    focus: 'Literature & Writing',
    responseTime: '~3 mins',
    school: 'Royal Arts Institute',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BukunmiTutor',
  },
  {
    id: 4,
    name: 'Prof. Chinedu Nwosu',
    focus: 'Full Stack Web Dev',
    responseTime: '~1 min',
    school: 'BuildLab School',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChineduTutor',
  },
];

const onlineSchools: OnlineSchool[] = [
  {
    id: 1,
    name: 'Edamaa Science Academy',
    city: 'Lagos',
    activeClasses: 14,
    activeTutors: 28,
    theme: 'from-[#3D08BA] to-[#5b2ddb]',
  },
  {
    id: 2,
    name: 'Royal Arts Institute',
    city: 'Abuja',
    activeClasses: 9,
    activeTutors: 16,
    theme: 'from-[#F68C29] to-[#ffb361]',
  },
  {
    id: 3,
    name: 'Lagos STEM Hub',
    city: 'Ikeja',
    activeClasses: 18,
    activeTutors: 33,
    theme: 'from-[#1f6f78] to-[#34a0a4]',
  },
];

const liveClasses: LiveClass[] = [
  {
    id: 1,
    title: 'Calculus for Machine Learning',
    tutor: 'Dr. Adetokunbo Andrew',
    school: 'Edamaa Science Academy',
    learners: 122,
    startsIn: 'Live now',
    category: 'Mathematics',
  },
  {
    id: 2,
    title: 'React Architecture for Beginners',
    tutor: 'Prof. Chinedu Nwosu',
    school: 'BuildLab School',
    learners: 89,
    startsIn: 'Starts in 12 mins',
    category: 'Technology',
  },
  {
    id: 3,
    title: 'Poetry Breakdown Workshop',
    tutor: 'Dr. Ajayi Olubukunmi',
    school: 'Royal Arts Institute',
    learners: 64,
    startsIn: 'Starts in 18 mins',
    category: 'Literature',
  },
];

const quickFilters = ['All', 'Technology', 'Science', 'Arts', 'Social Studies', 'Exam Prep'];

const StudentHome = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const recommendedCourses = useMemo(() => {
    const source = RECORDED_COURSES.filter((course) =>
      activeFilter === 'All' ? true : course.category.toLowerCase() === activeFilter.toLowerCase()
    );

    const searched = source.filter((course) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) {
        return true;
      }
      return (
        course.title.toLowerCase().includes(query) ||
        course.instructor.toLowerCase().includes(query) ||
        course.category.toLowerCase().includes(query)
      );
    });

    return searched.slice(0, 6);
  }, [searchQuery, activeFilter]);

  const onHomeClick = () => navigate('/student-home');
  const onCoursesClick = () => navigate('/mycourses');
  const onAssignmentsClick = () => navigate('/assignments');
  const onPerformanceClick = () => navigate('/performance');

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100">
      {/* Soft background accents keep the page premium without feeling noisy. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-[#3D08BA]/10 blur-3xl"></div>
        <div className="absolute top-56 -right-20 h-72 w-72 rounded-full bg-[#F68C29]/10 blur-3xl"></div>
      </div>

      <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <NewLogo logoWidth={30} logoHeight={30} textSize="text-base" gap="gap-2" centered={false} />

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/student-dashboard')}
                className="rounded-full border border-[#3D08BA]/25 bg-[#3D08BA]/6 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10 transition-colors"
              >
                Student Dashboard
              </button>
              <button
                onClick={() => navigate('/notifications')}
                className="relative rounded-full border border-gray-200 bg-white p-2 hover:bg-gray-50 transition-colors"
                aria-label="Notifications"
              >
                <BellSolidIcon className="h-5 w-5 text-[#3D08BA]" />
                <span className="absolute -top-1 -right-1 rounded-full bg-[#F68C29] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  4
                </span>
              </button>
              <button
                onClick={() => navigate('/my-profile')}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                My Profile
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#2e0a91] via-[#3D08BA] to-[#5f2ce0] p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute -right-12 -top-10 h-44 w-44 rounded-full bg-white/10"></div>
          <div className="absolute -bottom-20 right-20 h-52 w-52 rounded-full bg-[#F68C29]/20"></div>

          <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] items-end">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <FireIcon className="h-3.5 w-3.5" />
                Personalized learning hub
              </p>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
                Learn faster with live insights, active tutors, and curated short lessons.
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/85">
                Your Edamaa home now highlights who is online, what classes are happening, and the best next course for your goals.
              </p>

              <div className="mt-5 relative max-w-xl">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/65" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tutors, schools, courses..."
                  className="w-full rounded-xl border border-white/20 bg-white/12 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Tutors Online</p>
                <p className="mt-1 text-2xl font-bold">{onlineTutors.length}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Schools Active</p>
                <p className="mt-1 text-2xl font-bold">{onlineSchools.length}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Live Classes</p>
                <p className="mt-1 text-2xl font-bold">{liveClasses.length}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-white/70">My Streak</p>
                <p className="mt-1 text-2xl font-bold">12d</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Classes Going On</h2>
            <button
              onClick={() => navigate('/join-class')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              View Schedule
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {liveClasses.map((session) => (
              <article key={session.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                    {session.startsIn}
                  </span>
                  <span className="text-[11px] font-medium text-gray-500">{session.category}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">{session.title}</h3>
                <p className="mt-1 text-xs text-gray-600">
                  {session.tutor} • {session.school}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <UserGroupIcon className="h-4 w-4" />
                    {session.learners} learners
                  </span>
                  <button
                    onClick={() => navigate('/join-class')}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#3D08BA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2D0690]"
                  >
                    <VideoCameraIcon className="h-4 w-4" />
                    Join
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tutors Online</h2>
              <button
                onClick={() => navigate('/mycourses')}
                className="text-xs font-semibold text-[#3D08BA] hover:text-[#2D0690]"
              >
                Explore tutors
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {onlineTutors.map((tutor) => (
                <div key={tutor.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={tutor.avatar} alt={tutor.name} className="h-11 w-11 rounded-full border border-gray-200" />
                      <span className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500"></span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{tutor.name}</p>
                      <p className="text-xs text-gray-600">{tutor.focus}</p>
                      <p className="text-[11px] text-gray-500">{tutor.school}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-500">Replies</p>
                    <p className="text-xs font-semibold text-green-600">{tutor.responseTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Schools Online</h2>
              <button
                onClick={() => navigate('/resources')}
                className="text-xs font-semibold text-[#3D08BA] hover:text-[#2D0690]"
              >
                View all schools
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {onlineSchools.map((school) => (
                <article key={school.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-lg bg-linear-to-r ${school.theme} flex items-center justify-center`}>
                        <BuildingOffice2Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{school.name}</p>
                        <p className="text-xs text-gray-500">{school.city}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      Online
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <p className="rounded-lg bg-gray-50 px-2 py-1 text-gray-600">
                      {school.activeClasses} active classes
                    </p>
                    <p className="rounded-lg bg-gray-50 px-2 py-1 text-gray-600">
                      {school.activeTutors} tutors online
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            {quickFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeFilter === filter
                    ? 'bg-[#3D08BA] text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedCourses.map((course) => (
              <article
                key={course.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all"
              >
                <div className="relative aspect-video overflow-hidden bg-gray-100">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent"></div>
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#3D08BA]">
                    {course.level}
                  </span>
                  <span className="absolute left-3 bottom-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {course.category}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{course.title}</h3>
                  <p className="mt-1 text-xs text-gray-600">{course.instructor}</p>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      {course.modules[0]?.lessons[0]?.durationMinutes || 6} min next lesson
                    </span>
                    <span>{course.completedLessons}/{course.totalLessons}</span>
                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-[#3D08BA] to-[#F68C29]"
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>

                  <button
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2D0690] transition-colors"
                  >
                    <PlayCircleIcon className="h-4 w-4" />
                    Continue Learning
                  </button>
                </div>
              </article>
            ))}
          </div>

          {recommendedCourses.length === 0 && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm font-medium text-gray-700">No courses match your search or filter yet.</p>
            </div>
          )}
        </section>
      </main>

      <StudentBottomNavigation
        activeTab="student-dashboard"
        onHomeClick={onHomeClick}
        onCoursesClick={onCoursesClick}
        onAssignmentsClick={onAssignmentsClick}
        onPerformanceClick={onPerformanceClick}
      />
    </div>
  );
};

export default StudentHome;
