import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  PhotoIcon,
  MusicalNoteIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ClockIcon,
  FunnelIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'image' | 'audio' | 'document';
  subject: string;
  instructor: string;
  size: string;
  uploadedDate: string;
  downloads: number;
  thumbnail?: string;
  description: string;
}

const Resources = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const resources: Resource[] = [
    {
      id: '1',
      title: 'Advanced Calculus Problem Set',
      type: 'pdf',
      subject: 'Mathematics',
      instructor: 'Dr. Adetokunbo Andrew',
      size: '2.4 MB',
      uploadedDate: '2 days ago',
      downloads: 234,
      description: 'Comprehensive problem set covering derivatives, integrals, and applications'
    },
    {
      id: '2',
      title: 'Quantum Mechanics Lecture Series',
      type: 'video',
      subject: 'Physics',
      instructor: 'Prof. Sobowale Olamide',
      size: '1.2 GB',
      uploadedDate: '1 week ago',
      downloads: 456,
      thumbnail: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400',
      description: 'Complete video series on quantum mechanics fundamentals and wave functions'
    },
    {
      id: '3',
      title: 'Organic Chemistry Reaction Diagrams',
      type: 'image',
      subject: 'Chemistry',
      instructor: 'Mide Code',
      size: '5.8 MB',
      uploadedDate: '3 days ago',
      downloads: 189,
      thumbnail: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400',
      description: 'Visual guide to common organic chemistry reactions and mechanisms'
    },
    {
      id: '4',
      title: 'English Literature Audio Book',
      type: 'audio',
      subject: 'English',
      instructor: 'Dr. Ajayi Olubukunmi',
      size: '156 MB',
      uploadedDate: '5 days ago',
      downloads: 312,
      description: 'Narrated classic literature selections and poetry analysis'
    },
    {
      id: '5',
      title: 'Data Structures Study Guide',
      type: 'document',
      subject: 'Computer Science',
      instructor: 'Prof. Andrew',
      size: '3.1 MB',
      uploadedDate: '1 day ago',
      downloads: 567,
      description: 'Complete guide to trees, graphs, sorting algorithms, and complexity analysis'
    },
    {
      id: '6',
      title: 'World History Timeline',
      type: 'pdf',
      subject: 'History',
      instructor: 'Prof. Ajayi',
      size: '4.2 MB',
      uploadedDate: '4 days ago',
      downloads: 201,
      description: 'Comprehensive timeline of ancient civilizations and major historical events'
    },
    {
      id: '7',
      title: 'Python Programming Tutorial',
      type: 'video',
      subject: 'Computer Science',
      instructor: 'Prof. Andrew',
      size: '856 MB',
      uploadedDate: '6 days ago',
      downloads: 789,
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
      description: 'Beginner to advanced Python programming with practical examples'
    },
    {
      id: '8',
      title: 'Physics Lab Manual',
      type: 'pdf',
      subject: 'Physics',
      instructor: 'Prof. Sobowale Olamide',
      size: '6.7 MB',
      uploadedDate: '1 week ago',
      downloads: 423,
      description: 'Laboratory procedures and experiments for physics practicals'
    },
  ];

  const subjects = ['all', 'Mathematics', 'Physics', 'Chemistry', 'English', 'Computer Science', 'History'];
  const types = ['all', 'pdf', 'video', 'image', 'audio', 'document'];

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || resource.type === filterType;
    const matchesSubject = filterSubject === 'all' || resource.subject === filterSubject;
    return matchesSearch && matchesType && matchesSubject;
  });

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
      case 'document':
        return DocumentTextIcon;
      case 'video':
        return VideoCameraIcon;
      case 'image':
        return PhotoIcon;
      case 'audio':
        return MusicalNoteIcon;
      default:
        return FolderIcon;
    }
  };

  const getResourceColor = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'bg-red-500';
      case 'video':
        return 'bg-[#3D08BA]';
      case 'image':
        return 'bg-green-500';
      case 'audio':
        return 'bg-orange-500';
      case 'document':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const stats = {
    totalResources: resources.length,
    totalDownloads: resources.reduce((sum, r) => sum + r.downloads, 0),
    subjects: new Set(resources.map(r => r.subject)).size,
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {/* Title with Back Button */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => navigate(-1)}
                  className="hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                 <p className="text-sm sm:text-base text-gray-600">
                Access all your learning materials in one place
              </p>
              </div>
             
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-sm text-gray-600">
              <span>
                <strong className="text-gray-900">{stats.totalResources}</strong> resources
              </span>
              <span className="hidden sm:inline">•</span>
              <span>
                <strong className="text-gray-900">{stats.totalDownloads}</strong> downloads
              </span>
              <span className="hidden sm:inline">•</span>
              <span>
                <strong className="text-gray-900">{stats.subjects}</strong> subjects
              </span>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent bg-white shadow-sm"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <FunnelIcon className="w-5 h-5" />
                Filters
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="mt-4 space-y-3">
                {/* Type Filter */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                    Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {types.map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          filterType === type
                            ? 'bg-[#3D08BA] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject Filter */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                    Subject
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((subject) => (
                      <button
                        key={subject}
                        onClick={() => setFilterSubject(subject)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          filterSubject === subject
                            ? 'bg-[#3D08BA] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {subject.charAt(0).toUpperCase() + subject.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredResources.map((resource) => {
            const Icon = getResourceIcon(resource.type);
            const colorClass = getResourceColor(resource.type);

            return (
              <div
                key={resource.id}
                className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200"
              >
                {/* Thumbnail or Icon */}
                <div className="relative h-40 sm:h-48 bg-gray-100 overflow-hidden">
                  {resource.thumbnail ? (
                    <>
                      <img
                        src={resource.thumbnail}
                        alt={resource.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                    </>
                  ) : (
                    <div className={`w-full h-full ${colorClass} flex items-center justify-center`}>
                      <Icon className="w-16 h-16 sm:w-20 sm:h-20 text-white opacity-90" />
                    </div>
                  )}

                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`${colorClass} text-white px-3 py-1 rounded-full text-xs font-medium uppercase`}>
                      {resource.type}
                    </span>
                  </div>

                  {/* Size Badge */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full">
                    <span className="text-xs font-semibold text-gray-700">{resource.size}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5">
                  {/* Subject */}
                  <span className="text-xs font-semibold text-[#3D08BA] uppercase tracking-wider">
                    {resource.subject}
                  </span>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-2 mb-2 line-clamp-2 group-hover:text-[#3D08BA] transition-colors">
                    {resource.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">
                    {resource.description}
                  </p>

                  {/* Instructor */}
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 flex items-center gap-1">
                    <span className="font-medium">By:</span> {resource.instructor}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {resource.uploadedDate}
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                      {resource.downloads}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                      <EyeIcon className="w-4 h-4" />
                      View
                    </button>
                    <button className="flex items-center justify-center gap-2 px-3 py-2 bg-[#3D08BA] text-white rounded-lg text-sm font-medium hover:bg-[#2D0690] transition-colors">
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredResources.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterSubject('all');
              }}
              className="px-6 py-3 bg-[#3D08BA] text-white rounded-xl font-semibold hover:bg-[#2D0690] transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </main>

    </div>
  );
};

export default Resources;