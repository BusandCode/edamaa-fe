import {
  buildSchoolCourseDurationLabel,
  countSchoolCourseLessons,
  formatSchoolCourseAudience,
  loadPublishedSchoolOnlineCoursesForStudent,
  type SchoolOnlineCourseRecord,
} from '../../courses/utils/schoolOnlineCoursesStore';

export type CourseMate = {
  id: number;
  name: string;
  avatar?: string;
};

export type RecordedLesson = {
  id: string;
  title: string;
  durationMinutes: number;
  summary: string;
  videoUrl: string;
};

export type RecordedModule = {
  id: string;
  title: string;
  lessons: RecordedLesson[];
};

export type RecordedCourse = {
  id: number;
  title: string;
  instructor: string;
  category: string;
  thumbnail: string;
  rating: number;
  totalStudents: number;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  duration: string;
  nextLesson: string;
  lastAccessed: string;
  level: string;
  description: string;
  skills: string[];
  classmates: CourseMate[];
  modules: RecordedModule[];
  source?: 'catalog' | 'school';
  issuerType?: 'edamaa' | 'school' | 'tutor';
  issuerName?: string;
  audienceSummary?: string;
};

const SAMPLE_VIDEOS = {
  intro: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  explain: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  demo: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  recap: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
};

export const CURRENT_STUDENT: CourseMate = {
  id: 1001,
  name: 'Adetokunbo Andrew',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Adetokunbo',
};

const classmatesByCourse: Record<number, CourseMate[]> = {
  1: [
    { id: 2101, name: 'Ajayi Bukunmi', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bukunmi' },
    { id: 2102, name: 'Olamide Sobowale', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olamide' },
    { id: 2103, name: 'Adewale Susan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Susan' },
  ],
  2: [
    { id: 2201, name: 'Kehinde Ajibola', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kehinde' },
    { id: 2202, name: 'Fadekemi Alabi', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fadekemi' },
    { id: 2203, name: 'David Okon', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
  ],
  3: [
    { id: 2301, name: 'Maryam Bello', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maryam' },
    { id: 2302, name: 'Ifeanyi Obi', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ifeanyi' },
    { id: 2303, name: 'Tolulope Ogun', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tolulope' },
  ],
  4: [
    { id: 2401, name: 'Hammed Lawal', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hammed' },
    { id: 2402, name: 'Damilola Yusuf', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Damilola' },
    { id: 2403, name: 'Ruth Nwosu', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ruth' },
  ],
  5: [
    { id: 2501, name: 'Emeka Godwin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emeka' },
    { id: 2502, name: 'Amina Garba', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amina' },
    { id: 2503, name: 'Janet Udo', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Janet' },
  ],
  6: [
    { id: 2601, name: 'Victor Akpan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Victor' },
    { id: 2602, name: 'Blessing Madu', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Blessing' },
    { id: 2603, name: 'Seun Oladipo', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Seun' },
  ],
};

export const RECORDED_COURSES: RecordedCourse[] = [
  {
    id: 1,
    title: 'Advanced Mathematics for Data Science',
    instructor: 'Dr. Adetokunbo Andrew',
    category: 'Science',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=900',
    rating: 4.8,
    totalStudents: 2453,
    progress: 65,
    totalLessons: 12,
    completedLessons: 8,
    duration: '12 hours',
    nextLesson: 'Calculus Applications',
    lastAccessed: '2 hours ago',
    level: 'Intermediate',
    description: 'Master practical math concepts used in data science projects with concise recorded lessons.',
    skills: ['Limits', 'Derivatives', 'Optimization', 'Modeling'],
    classmates: classmatesByCourse[1],
    modules: [
      {
        id: 'm1',
        title: 'Core Calculus Concepts',
        lessons: [
          {
            id: 'm1-l1',
            title: 'Why Calculus Still Matters in Data Science',
            durationMinutes: 7,
            summary: 'See where derivatives and integrals appear in modern machine learning workflows.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
          {
            id: 'm1-l2',
            title: 'Limits and Continuity in 8 Minutes',
            durationMinutes: 8,
            summary: 'Understand continuity quickly before moving to derivative-based methods.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm1-l3',
            title: 'Derivative Rules You Actually Use',
            durationMinutes: 9,
            summary: 'Focus on chain, product, and quotient rules with direct applied examples.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm1-l4',
            title: 'Mini Recap: Calculus Fast Review',
            durationMinutes: 5,
            summary: 'A short checkpoint before moving into optimization methods.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
        ],
      },
      {
        id: 'm2',
        title: 'Optimization for ML',
        lessons: [
          {
            id: 'm2-l1',
            title: 'Gradient Descent Intuition',
            durationMinutes: 10,
            summary: 'Build a geometric understanding of gradient descent with practical intuition.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm2-l2',
            title: 'Learning Rate: Too Fast vs Too Slow',
            durationMinutes: 6,
            summary: 'Learn how learning rate impacts convergence and model stability.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm2-l3',
            title: 'Convex vs Non-Convex Loss Landscapes',
            durationMinutes: 8,
            summary: 'Recognize why real-world optimization can still work in non-convex spaces.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
          {
            id: 'm2-l4',
            title: 'Optimization Cheatsheet',
            durationMinutes: 4,
            summary: 'A quick reference summary you can replay before coding sessions.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
        ],
      },
      {
        id: 'm3',
        title: 'Applications',
        lessons: [
          {
            id: 'm3-l1',
            title: 'Calculus in Linear Regression',
            durationMinutes: 9,
            summary: 'Watch derivatives appear directly in cost minimization for regression.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm3-l2',
            title: 'From Cost Function to Gradient Update',
            durationMinutes: 7,
            summary: 'Bridge theory and implementation with one complete gradient update walkthrough.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
          {
            id: 'm3-l3',
            title: 'Regularization and Smoothness',
            durationMinutes: 6,
            summary: 'Understand why regularization terms can improve generalization and stability.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm3-l4',
            title: 'Module Wrap-Up',
            durationMinutes: 5,
            summary: 'A short summary and readiness checklist before the assignment.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Modern Physics: Quantum Mechanics',
    instructor: 'Prof. Sobowale Olamide',
    category: 'Science',
    thumbnail: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=900',
    rating: 4.9,
    totalStudents: 1876,
    progress: 45,
    totalLessons: 10,
    completedLessons: 4,
    duration: '9 hours',
    nextLesson: 'Wave Functions',
    lastAccessed: '1 day ago',
    level: 'Advanced',
    description: 'A modern, structured path through quantum mechanics, taught in short focused recordings.',
    skills: ['Wave Functions', 'Operators', 'Tunneling', 'Measurement'],
    classmates: classmatesByCourse[2],
    modules: [
      {
        id: 'm1',
        title: 'Quantum Foundations',
        lessons: [
          {
            id: 'm1-l1',
            title: 'From Classical to Quantum Thinking',
            durationMinutes: 8,
            summary: 'Understand where classical intuition breaks down and quantum ideas begin.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
          {
            id: 'm1-l2',
            title: 'Wave-Particle Duality',
            durationMinutes: 7,
            summary: 'A quick conceptual model for wave-particle duality and experiments.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm1-l3',
            title: 'The Schrodinger Equation at a Glance',
            durationMinutes: 11,
            summary: 'Parse the equation terms and what each part means physically.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
        ],
      },
      {
        id: 'm2',
        title: 'State, Measurement, and Probability',
        lessons: [
          {
            id: 'm2-l1',
            title: 'Wave Functions and Probability Density',
            durationMinutes: 9,
            summary: 'Relate the wave function to measurable probability outcomes.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm2-l2',
            title: 'Observables and Operators',
            durationMinutes: 10,
            summary: 'Learn how physical measurements map to operators in Hilbert space.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm2-l3',
            title: 'Expectation Values Quickly',
            durationMinutes: 6,
            summary: 'Compute expectation values with practical examples in under ten minutes.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
          {
            id: 'm2-l4',
            title: 'Measurement Postulate Recap',
            durationMinutes: 5,
            summary: 'A short replay-friendly summary of state collapse and outcomes.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
        ],
      },
      {
        id: 'm3',
        title: 'Applications',
        lessons: [
          {
            id: 'm3-l1',
            title: 'Quantum Tunneling Explained',
            durationMinutes: 8,
            summary: 'A compact explanation of tunneling with potential barrier intuition.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm3-l2',
            title: 'Hydrogen Atom in Short Form',
            durationMinutes: 9,
            summary: 'See why the hydrogen atom became the reference model for quantum structure.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm3-l3',
            title: 'Final Course Summary',
            durationMinutes: 6,
            summary: 'Wrap up the main principles and prepare for quizzes.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'English Literature: Classic to Contemporary',
    instructor: 'Dr. Ajayi Olubukunmi',
    category: 'Arts',
    thumbnail: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900',
    rating: 4.7,
    totalStudents: 3201,
    progress: 80,
    totalLessons: 9,
    completedLessons: 7,
    duration: '7 hours',
    nextLesson: 'Modernist Poetry',
    lastAccessed: '3 hours ago',
    level: 'Beginner',
    description: 'Study literary movements and styles through bite-sized recorded lessons and examples.',
    skills: ['Close Reading', 'Poetry Analysis', 'Themes', 'Narrative Voice'],
    classmates: classmatesByCourse[3],
    modules: [
      {
        id: 'm1',
        title: 'Literary Periods Fast Track',
        lessons: [
          {
            id: 'm1-l1',
            title: 'Classical and Romantic Eras in Context',
            durationMinutes: 8,
            summary: 'Anchor key literary eras with social and historical context.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
          {
            id: 'm1-l2',
            title: 'Victorian Themes in 7 Minutes',
            durationMinutes: 7,
            summary: 'Identify dominant themes and motifs from major Victorian texts.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm1-l3',
            title: 'Modernism: What Changed',
            durationMinutes: 8,
            summary: 'Understand fragmentation and voice shifts in modernist writing.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
        ],
      },
      {
        id: 'm2',
        title: 'Reading and Analysis',
        lessons: [
          {
            id: 'm2-l1',
            title: 'Close Reading Framework',
            durationMinutes: 6,
            summary: 'A reusable framework for reading any prose or poem critically.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm2-l2',
            title: 'Poetic Devices You Must Spot',
            durationMinutes: 9,
            summary: 'Practice identifying meter, imagery, and symbolism quickly.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm2-l3',
            title: 'Character and Voice',
            durationMinutes: 7,
            summary: 'Evaluate narration style, tone, and character construction.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
        ],
      },
      {
        id: 'm3',
        title: 'Assessment Prep',
        lessons: [
          {
            id: 'm3-l1',
            title: 'Essay Structure for Literature Exams',
            durationMinutes: 8,
            summary: 'Build clear, evidence-backed arguments under exam timing.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm3-l2',
            title: 'Model Answer Walkthrough',
            durationMinutes: 10,
            summary: 'Break down a high-scoring answer and how it is structured.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
          {
            id: 'm3-l3',
            title: 'Final Revision Checklist',
            durationMinutes: 4,
            summary: 'Short list to replay before tests and assignments.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
        ],
      },
    ],
  },
  {
    id: 4,
    title: 'Full Stack Web Development',
    instructor: 'Prof. Andrew',
    category: 'Technology',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900',
    rating: 4.9,
    totalStudents: 5678,
    progress: 55,
    totalLessons: 14,
    completedLessons: 8,
    duration: '14 hours',
    nextLesson: 'React Hooks Deep Dive',
    lastAccessed: '5 hours ago',
    level: 'Intermediate',
    description: 'Build modern full-stack apps through short practical lessons and modular projects.',
    skills: ['REST APIs', 'React', 'Postgres', 'Deployment'],
    classmates: classmatesByCourse[4],
    modules: [
      {
        id: 'm1',
        title: 'Frontend Foundations',
        lessons: [
          {
            id: 'm1-l1',
            title: 'Responsive Layout Patterns',
            durationMinutes: 9,
            summary: 'Structure scalable responsive layouts without bloated CSS.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
          {
            id: 'm1-l2',
            title: 'Component Thinking',
            durationMinutes: 7,
            summary: 'Design reusable UI components and keep props/state clean.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm1-l3',
            title: 'State Management Basics',
            durationMinutes: 8,
            summary: 'Understand local and shared state with practical examples.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm1-l4',
            title: 'Debugging Frontend Fast',
            durationMinutes: 6,
            summary: 'Use browser tools efficiently for quick debugging cycles.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
        ],
      },
      {
        id: 'm2',
        title: 'Backend APIs',
        lessons: [
          {
            id: 'm2-l1',
            title: 'API Route Design in 10 Minutes',
            durationMinutes: 10,
            summary: 'Learn clean endpoint naming and versioning strategies.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm2-l2',
            title: 'Auth and Session Patterns',
            durationMinutes: 8,
            summary: 'Compare token-based and session-based approaches quickly.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm2-l3',
            title: 'Database Access Layer',
            durationMinutes: 9,
            summary: 'Keep database logic maintainable with service-based patterns.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
          {
            id: 'm2-l4',
            title: 'Error Handling and Logging',
            durationMinutes: 5,
            summary: 'Centralize error handling for reliability and observability.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
        ],
      },
      {
        id: 'm3',
        title: 'Production Delivery',
        lessons: [
          {
            id: 'm3-l1',
            title: 'CI/CD Essentials',
            durationMinutes: 7,
            summary: 'Automate checks and deploys for stable releases.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm3-l2',
            title: 'Monitoring and Alerts',
            durationMinutes: 6,
            summary: 'Add practical monitoring signals before scaling up.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm3-l3',
            title: 'Release Readiness Checklist',
            durationMinutes: 4,
            summary: 'Short pre-deploy checklist for safer launches.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
        ],
      },
    ],
  },
  {
    id: 5,
    title: 'Organic Chemistry Fundamentals',
    instructor: 'Mide Code',
    category: 'Science',
    thumbnail: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=900',
    rating: 4.6,
    totalStudents: 1543,
    progress: 70,
    totalLessons: 10,
    completedLessons: 7,
    duration: '10 hours',
    nextLesson: 'Reaction Mechanisms',
    lastAccessed: '1 day ago',
    level: 'Intermediate',
    description: 'Understand core organic chemistry through short concept-based recorded lessons.',
    skills: ['Functional Groups', 'Mechanisms', 'Acids/Bases', 'Stereochemistry'],
    classmates: classmatesByCourse[5],
    modules: [
      {
        id: 'm1',
        title: 'Building Blocks',
        lessons: [
          {
            id: 'm1-l1',
            title: 'Functional Groups in Real Time',
            durationMinutes: 8,
            summary: 'Identify major functional groups quickly in compounds.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
          {
            id: 'm1-l2',
            title: 'Hybridization in 6 Minutes',
            durationMinutes: 6,
            summary: 'Understand bonding geometry and why it matters.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm1-l3',
            title: 'Resonance and Stability',
            durationMinutes: 9,
            summary: 'Use resonance to reason about stability and reactivity.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
        ],
      },
      {
        id: 'm2',
        title: 'Mechanisms',
        lessons: [
          {
            id: 'm2-l1',
            title: 'Reaction Arrows and Flow',
            durationMinutes: 7,
            summary: 'Decode electron movement clearly using arrow pushing.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm2-l2',
            title: 'SN1 vs SN2 Fast Comparison',
            durationMinutes: 10,
            summary: 'Compare conditions, kinetics, and outcomes in one shot.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm2-l3',
            title: 'E1/E2 Elimination Cases',
            durationMinutes: 8,
            summary: 'Predict elimination products under common scenarios.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
          {
            id: 'm2-l4',
            title: 'Reaction Strategy Recap',
            durationMinutes: 5,
            summary: 'A compact recap you can replay before practice.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
        ],
      },
      {
        id: 'm3',
        title: 'Exam and Practice',
        lessons: [
          {
            id: 'm3-l1',
            title: 'Common Trap Questions',
            durationMinutes: 7,
            summary: 'Avoid frequent mistakes with mechanism questions.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm3-l2',
            title: 'Speed Practice Walkthrough',
            durationMinutes: 9,
            summary: 'Watch a timed approach for solving reaction questions.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm3-l3',
            title: 'Final Wrap Up',
            durationMinutes: 4,
            summary: 'Last-minute checklist to consolidate key concepts.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
        ],
      },
    ],
  },
  {
    id: 6,
    title: 'World History: Ancient Civilizations',
    instructor: 'Prof. Ajayi',
    category: 'Social Studies',
    thumbnail: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=900',
    rating: 4.5,
    totalStudents: 2109,
    progress: 40,
    totalLessons: 9,
    completedLessons: 4,
    duration: '8 hours',
    nextLesson: 'Roman Empire',
    lastAccessed: '2 days ago',
    level: 'Beginner',
    description: 'Travel through ancient civilizations using concise, high-retention recorded lessons.',
    skills: ['Historical Analysis', 'Chronology', 'Empires', 'Cultural Context'],
    classmates: classmatesByCourse[6],
    modules: [
      {
        id: 'm1',
        title: 'Origins of Civilizations',
        lessons: [
          {
            id: 'm1-l1',
            title: 'Cradles of Civilization',
            durationMinutes: 8,
            summary: 'Map where and why early civilizations emerged.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
          {
            id: 'm1-l2',
            title: 'Mesopotamia in Short Form',
            durationMinutes: 7,
            summary: 'Key contributions from Mesopotamia in governance and writing.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm1-l3',
            title: 'Ancient Egypt Essentials',
            durationMinutes: 9,
            summary: 'Summarize state, belief systems, and technological influence.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
        ],
      },
      {
        id: 'm2',
        title: 'Classical Powers',
        lessons: [
          {
            id: 'm2-l1',
            title: 'Greek City States Quickly',
            durationMinutes: 6,
            summary: 'Compare Sparta and Athens through political structures.',
            videoUrl: SAMPLE_VIDEOS.explain,
          },
          {
            id: 'm2-l2',
            title: 'Rise of the Roman Republic',
            durationMinutes: 8,
            summary: 'How Roman institutions formed and expanded.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm2-l3',
            title: 'The Roman Empire in 10 Minutes',
            durationMinutes: 10,
            summary: 'Track expansion, administration, and eventual decline.',
            videoUrl: SAMPLE_VIDEOS.intro,
          },
        ],
      },
      {
        id: 'm3',
        title: 'Comparative Analysis',
        lessons: [
          {
            id: 'm3-l1',
            title: 'Trade, Culture, and Exchange',
            durationMinutes: 8,
            summary: 'See how trade routes shaped culture and power.',
            videoUrl: SAMPLE_VIDEOS.demo,
          },
          {
            id: 'm3-l2',
            title: 'Legacy of Ancient Civilizations',
            durationMinutes: 7,
            summary: 'Connect historical systems to present-day institutions.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
          {
            id: 'm3-l3',
            title: 'Final Revision Snapshot',
            durationMinutes: 4,
            summary: 'Quick recap before assessment or discussion.',
            videoUrl: SAMPLE_VIDEOS.recap,
          },
        ],
      },
    ],
  },
];

const LESSON_PROGRESS_STORAGE_KEY = 'edamaa_recorded_lesson_progress_v1';
const RESUME_LESSON_STORAGE_KEY = 'edamaa_recorded_resume_lesson_v1';

const readStoredObject = <T,>(key: string): T => {
  if (typeof window === 'undefined') {
    return {} as T;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {} as T;
    }

    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
};

const formatPublishedLabel = (value: string | null) => {
  if (!value) {
    return 'Newly published';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Newly published';
  }

  return `Published ${parsed.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })}`;
};

const mapSchoolOnlineCourseToRecordedCourse = (
  course: SchoolOnlineCourseRecord,
  completedLessonMap: Record<number, string[]>,
  resumeLessonMap: Record<number, string>
): RecordedCourse => {
  const allLessons = course.modules.flatMap((module) => module.lessons);
  const totalLessons = countSchoolCourseLessons(course);
  const completedLessonsList = Array.isArray(completedLessonMap[course.id]) ? completedLessonMap[course.id] : [];
  const uniqueCompleted = Array.from(new Set(completedLessonsList.filter(Boolean)));
  const completedLessons = Math.min(uniqueCompleted.length, totalLessons);
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const nextLesson =
    allLessons.find((lesson) => !uniqueCompleted.includes(lesson.id))?.title ||
    allLessons[0]?.title ||
    'Course introduction';
  const resumeLessonId = resumeLessonMap[course.id];
  const resumeLessonTitle = allLessons.find((lesson) => lesson.id === resumeLessonId)?.title || '';

  return {
    id: course.id,
    title: course.title,
    instructor: course.instructor,
    category: course.category,
    thumbnail: course.thumbnailUrl,
    rating: 5,
    totalStudents: 0,
    progress,
    totalLessons,
    completedLessons,
    duration: buildSchoolCourseDurationLabel(course),
    nextLesson,
    lastAccessed: resumeLessonTitle ? `Resume: ${resumeLessonTitle}` : formatPublishedLabel(course.publishedAt),
    level: course.level,
    description: course.description,
    skills: course.skills,
    classmates: [],
    modules: course.modules,
    source: 'school',
    issuerType: 'school',
    issuerName: course.issuerName,
    audienceSummary: formatSchoolCourseAudience(course),
  };
};

export const getRecordedCourses = () => {
  const completedLessonMap = readStoredObject<Record<number, string[]>>(LESSON_PROGRESS_STORAGE_KEY);
  const resumeLessonMap = readStoredObject<Record<number, string>>(RESUME_LESSON_STORAGE_KEY);
  const schoolCourses = loadPublishedSchoolOnlineCoursesForStudent().map((course) =>
    mapSchoolOnlineCourseToRecordedCourse(course, completedLessonMap, resumeLessonMap)
  );

  return [...RECORDED_COURSES, ...schoolCourses];
};

export const getRecordedCourseById = (courseId: number) =>
  getRecordedCourses().find((course) => course.id === courseId);
