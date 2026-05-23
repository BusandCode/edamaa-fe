import { useState } from 'react'
import { FiMenu, FiX, FiSearch } from 'react-icons/fi'
import { FaBookOpen, FaUsers, FaGraduationCap, FaLaptop, FaPlay, FaAward, FaTrophy, FaClock } from 'react-icons/fa'
import { IoTrendingUp } from 'react-icons/io5'
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaYoutube } from 'react-icons/fa'
import { MdEmail, MdPhone, MdLocationOn } from 'react-icons/md'
import NewLogo from './components/common/NewLogo'
import { motion } from "framer-motion";


const App = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All courses');

  const handleSignup = () => {
    window.location.href = '/signup'
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <NewLogo logoWidth={30} logoHeight={30} textSize="text-[14px]" gap="gap-1.5" centered={false} />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {/* <div className="flex items-center space-x-2 cursor-pointer">
                <select name="" id="" className='outline-0 w-22.5 rounded-md'>
                  <option value="Learning">Learning</option>
                  <option value="Explore">Explore</option>
                </select>
              </div> */}
              
              <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2 w-96">
                <FiSearch className="w-5 h-5 text-gray-500 mr-2" />
                <input 
                  type="text" 
                  placeholder="Search courses, subjects, or topics"
                  className="bg-transparent outline-none w-full text-gray-700 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <button className="text-[#3D08BA] font-semibold hover:text-[#F68C29] transition-colors">
                Start free trial
              </button>
              <button 
                onClick={handleSignup}
                className="px-6 py-2 cursor-pointer border-2 border-[#3D08BA] text-[#3D08BA] rounded-full font-semibold hover:bg-[#3D08BA] hover:text-white transition-all"
              >
                Sign up
              </button>
            </div>
            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <FiX className="w-6 h-6 text-[#3D08BA]" /> : <FiMenu className="w-6 h-6 text-[#3D08BA]" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-4">
              <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
                <FiSearch className="w-5 h-5 text-gray-500 mr-2" />
                <input 
                  type="text" 
                  placeholder="Search courses"
                  className="bg-transparent outline-none w-full text-gray-700"
                />
              </div>
              <button className="w-full text-left text-gray-700 font-medium py-2">
                Learning
              </button>
              <button className="w-full text-left text-[#3D08BA] font-medium py-2">
                Start free trial
              </button>
              <button 
                onClick={handleSignup}
                className="w-full px-6 py-2 bg-[#3D08BA] text-white rounded-full font-semibold"
              >
                Sign up
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="bg-linear-to-br from-purple-50 to-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#3D08BA] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#F68C29] rounded-full blur-3xl"></div>
        </div>
        <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}

        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-[#F68C29]/10 border border-[#F68C29]/30 rounded-full px-4 py-2 mb-6">
                <span className="text-[#F68C29] font-semibold text-sm">🎓 #1 Educational Platform</span>
              </div>
              <h1 className="text-[32px] font-bold text-[#3D08BA] mb-6 leading-tight">
                Transform Your Learning Journey
              </h1>
              <p className="text-[16px] text-gray-700 mb-4 leading-relaxed">
                An immersive learning experience that fosters <span className="font-semibold text-[#3D08BA]">active participation</span>, peer interaction and effective learning transfer.
              </p>
              <div className="h-1 w-24 bg-[#F68C29] rounded-full mb-8"></div>
              <p className="text-[14px] text-gray-600 mb-8">
                Join thousands of students learning better with expert teachers and engaging virtual classes.
              </p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-[#3D08BA]">10K+</p>
                  <p className="text-sm text-gray-600">Students</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-[#F68C29]">200+</p>
                  <p className="text-sm text-gray-600">Courses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-[#3D08BA]">98%</p>
                  <p className="text-sm text-gray-600">Success Rate</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleSignup}
                  className="px-8 py-4 bg-[#3D08BA] text-white rounded-lg font-semibold text-[14px] hover:bg-[#F68C29] transition-colors shadow-lg"
                >
                  Start Learning Now
                </button>
                <button className="px-8 py-4 border-2 border-[#3D08BA] text-[#3D08BA] rounded-lg font-semibold text-[14px] hover:bg-purple-50 transition-colors">
                  Explore Courses
                </button>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
                alt="Students learning together"
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#F68C29] rounded-full flex items-center justify-center">
                    <FaUsers className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-[#3D08BA]">10,000+</p>
                    <p className="text-sm text-gray-600">Active Students</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 bg-[#3D08BA] rounded-xl shadow-xl p-4 hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <FaTrophy className="text-[#F68C29]" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Award Winning</p>
                    <p className="text-sm text-white/80">Platform 2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <motion.section 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-[#3D08BA] mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-[14px] text-gray-600">
              Comprehensive learning tools designed for modern education
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border-2 border-[#3D08BA]/20 rounded-xl p-8 flex flex-col items-center gap-4 shadow-sm hover:shadow-xl hover:border-[#3D08BA] transition-all group">
              <div className="w-20 h-20 bg-[#3D08BA] rounded-full flex items-center justify-center group-hover:bg-[#F68C29] transition-colors">
                <FaBookOpen className="text-white" size={32} />
              </div>
              <h3 className="text-[#3D08BA] text-[14px] font-semibold text-center">Study Resources</h3>
              <p className="text-gray-600 text-sm text-center">
                Access comprehensive materials and interactive content anytime
              </p>
            </div>

            <div className="bg-white border-2 border-[#3D08BA]/20 rounded-xl p-8 flex flex-col items-center gap-4 shadow-sm hover:shadow-xl hover:border-[#F68C29] transition-all group">
              <div className="w-20 h-20 bg-[#F68C29] rounded-full flex items-center justify-center group-hover:bg-[#3D08BA] transition-colors">
                <FaUsers className="text-white" size={32} />
              </div>
              <h3 className="text-[#3D08BA] text-[14px] font-semibold text-center">Peer Learning</h3>
              <p className="text-gray-600 text-sm text-center">
                Collaborate and grow with a community of learners
              </p>
            </div>

            <div className="bg-white border-2 border-[#3D08BA]/20 rounded-xl p-8 flex flex-col items-center gap-4 shadow-sm hover:shadow-xl hover:border-[#3D08BA] transition-all group">
              <div className="w-20 h-20 bg-[#3D08BA] rounded-full flex items-center justify-center group-hover:bg-[#F68C29] transition-colors">
                <FaLaptop className="text-white" size={32} />
              </div>
              <h3 className="text-[#3D08BA] text-[14px] font-semibold text-center">Virtual Classes</h3>
              <p className="text-gray-600 text-sm text-center">
                Live interactive sessions from anywhere in the world
              </p>
            </div>

            <div className="bg-white border-2 border-[#3D08BA]/20 rounded-xl p-8 flex flex-col items-center gap-4 shadow-sm hover:shadow-xl hover:border-[#F68C29] transition-all group">
              <div className="w-20 h-20 bg-[#F68C29] rounded-full flex items-center justify-center group-hover:bg-[#3D08BA] transition-colors">
                <FaGraduationCap className="text-white" size={32} />
              </div>
              <h3 className="text-[#3D08BA] text-[14px] font-semibold text-center">Expert Tutors</h3>
              <p className="text-gray-600 text-sm text-center">
                Learn from experienced educators and industry professionals
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Why Choose Us */}
      <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 3, ease: "easeOut", delay: 0.1 }}

      className="py-20 bg-linear-to-br from-purple-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <div className="inline-block bg-[#F68C29]/10 border border-[#F68C29]/30 rounded-full px-4 py-2 mb-4">
                <span className="text-[#F68C29] font-semibold text-sm">💡 Smart Learning</span>
              </div>
              <h2 className="text-3xl font-semibold text-[#3D08BA] mb-6">
                Personalized Learning Paths
              </h2>
              <p className="text-[14px] text-gray-700 leading-relaxed mb-8">
                Learn at your own pace with the guidance of experienced 
                tutors who are committed to your success.
              </p>
              <div className="space-y-4">
                <motion.div 
                initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                  className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#3D08BA] rounded-lg flex items-center justify-center shrink-0">
                    <FaAward className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#3D08BA] mb-2">Track Your Progress</h3>
                    <p className="text-gray-600 text-sm">Monitor achievements and stay motivated with detailed analytics and performance reports</p>
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                  
                className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#F68C29] rounded-lg flex items-center justify-center shrink-0">
                    <IoTrendingUp className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#3D08BA] mb-2">Adaptive Learning</h3>
                    <p className="text-gray-600 text-sm">Content adjusts to your skill level and learning style for optimal results</p>
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#3D08BA] rounded-lg flex items-center justify-center shrink-0">
                    <FaClock className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#3D08BA] mb-2">Learn at Your Pace</h3>
                    <p className="text-gray-600 text-sm">Flexible scheduling that fits your busy lifestyle with 24/7 access</p>
                  </div>
                </motion.div>
              </div>
            </div>
            <motion.div
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }} 
            className="relative">
              <img 
                src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80"
                alt="Student studying"
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -bottom-6 -right-6 bg-[#F68C29] rounded-xl shadow-xl p-6 hidden lg:block">
                <div className="text-white">
                  <p className="text-3xl font-bold mb-1">4.9/5</p>
                  <p className="text-sm">Average Rating</p>
                  <div className="flex gap-1 mt-2">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className="text-yellow-300">⭐</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Student Success Stories */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 3, ease: "easeOut", delay: 0.1 }}
          className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-[#3D08BA] mb-4">What Our Students Say</h2>
              <p className="text-[14px] text-gray-600">Real stories from real students</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} className="text-[#F68C29]">⭐</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"Edamaa3D transformed the way I learn. The interactive courses and peer support made complex topics easy to understand. I've achieved more in 3 months than I did in a year of self-study!"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#3D08BA] rounded-full flex items-center justify-center text-white font-bold">
                    SO
                  </div>
                  <div>
                    <p className="font-bold text-[#3D08BA]">Sobowale Olamide</p>
                    <p className="text-sm text-gray-600">Founder,Hurkify</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} className="text-[#F68C29]">⭐</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"The expert teachers are incredible! They explain concepts clearly and are always available to help. The virtual classes feel just like being in a real classroom. Highly recommended!"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#F68C29] rounded-full flex items-center justify-center text-white font-bold">
                    AA
                  </div>
                  <div>
                    <p className="font-bold text-[#3D08BA]">Adetokunbo Andrew</p>
                    <p className="text-sm text-gray-600">Frontend Developer</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} className="text-[#F68C29]">⭐</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"Learning with peers has been amazing! We collaborate, share ideas, and motivate each other. The study resources are comprehensive and the platform is so easy to use. Best investment ever!"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#3D08BA] rounded-full flex items-center justify-center text-white font-bold">
                    AB
                  </div>
                  <div>
                    <p className="font-bold text-[#3D08BA]">Alaka Olakunle</p>
                    <p className="text-sm text-gray-600">Lead UI/UX Designer</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 3, ease: "easeOut", delay: 0.1 }}

      className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold text-[#3D08BA] text-center mb-4">
            Join Our Growing Community
          </h2>
          <p className="text-[14px] text-gray-600 text-center mb-16">
            Be part of a thriving educational ecosystem transforming lives across Nigeria and beyond
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-linear-to-br from-purple-50 to-white rounded-2xl">
              <div className="text-5xl font-bold text-[#3D08BA] mb-2">200+</div>
              <div className="text-gray-600 font-medium">Courses Available</div>
              <p className="text-sm text-gray-500 mt-2">Across 25+ categories</p>
            </div>
            <div className="text-center p-6 bg-linear-to-br from-orange-50 to-white rounded-2xl">
              <div className="text-5xl font-bold text-[#F68C29] mb-2">100+</div>
              <div className="text-gray-600 font-medium">Expert Instructors</div>
              <p className="text-sm text-gray-500 mt-2">Industry professionals</p>
            </div>
            <div className="text-center p-6 bg-linear-to-br from-purple-50 to-white rounded-2xl">
              <div className="text-5xl font-bold text-[#3D08BA] mb-2">50,000+</div>
              <div className="text-gray-600 font-medium">Active Students</div>
              <p className="text-sm text-gray-500 mt-2">Learning together</p>
            </div>
            <div className="text-center p-6 bg-linear-to-br from-orange-50 to-white rounded-2xl">
              <div className="text-5xl font-bold text-[#F68C29] mb-2">25+</div>
              <div className="text-gray-600 font-medium">Subject Categories</div>
              <p className="text-sm text-gray-500 mt-2">From tech to arts</p>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border-2 border-[#3D08BA]/20 rounded-2xl p-8 text-center hover:border-[#3D08BA] transition-all">
              <div className="w-16 h-16 bg-[#3D08BA] rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTrophy className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-[#3D08BA] mb-2">98%</h3>
              <p className="text-gray-600 font-medium mb-2">Success Rate</p>
              <p className="text-sm text-gray-500">Students achieving their learning goals</p>
            </div>
            <div className="bg-white border-2 border-[#F68C29]/20 rounded-2xl p-8 text-center hover:border-[#F68C29] transition-all">
              <div className="w-16 h-16 bg-[#F68C29] rounded-full flex items-center justify-center mx-auto mb-4">
                <FaClock className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-[#F68C29] mb-2">24/7</h3>
              <p className="text-gray-600 font-medium mb-2">Access</p>
              <p className="text-sm text-gray-500">Learn anytime, anywhere at your convenience</p>
            </div>
            <div className="bg-white border-2 border-[#3D08BA]/20 rounded-2xl p-8 text-center hover:border-[#3D08BA] transition-all">
              <div className="w-16 h-16 bg-[#3D08BA] rounded-full flex items-center justify-center mx-auto mb-4">
                <FaAward className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-[#3D08BA] mb-2">500K+</h3>
              <p className="text-gray-600 font-medium mb-2">Certificates</p>
              <p className="text-sm text-gray-500">Issued to successful graduates</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Trending Courses */}
      <section className="py-20 bg-linear-to-br from-purple-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-semibold text-[#3D08BA] mb-2">Featured Courses</h2>
              <p className="text-gray-600">Start learning with our most popular courses</p>
            </div>
            <button className="hidden md:block px-6 py-3 border-2 border-[#3D08BA] text-[#3D08BA] rounded-lg font-medium hover:bg-[#3D08BA] hover:text-white transition-all">
              View All Courses
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-8 mb-12 border-b border-gray-200 overflow-x-auto">
            <button
            onClick={() => setActiveTab('All Courses')}
            className={`pb-4 whitespace-nowrap ${
              activeTab === 'All Courses'
                ? 'pb-4 border-b-4 border-[#3D08BA] font-semibold text-[#3D08BA] whitespace-nowrap'
                : 'text-gray-600 hover:bg-gray-50'
            }`}>All Courses</button>
            <button 
            onClick={() => setActiveTab('Technology')}
            className={`pb-4 whitespace-nowrap ${
              activeTab === 'Technology'
                ? 'pb-4 border-b-4 border-[#3D08BA] font-semibold text-[#3D08BA] whitespace-nowrap'
                : 'text-gray-600 hover:bg-gray-50'
            }`}>Technology</button>
            <button
            onClick={() => setActiveTab('Science')}
            className={`pb-4 whitespace-nowrap ${
              activeTab === 'Science'
                ? 'pb-4 border-b-4 border-[#3D08BA] font-semibold text-[#3D08BA] whitespace-nowrap'
                : 'text-gray-600 hover:bg-gray-50'
            }`}>Sciences</button>
          </div>

          
        {/* Conditional Content Based on Active Tab */}
        {activeTab === 'All courses' && (
          // All courses
          <div className="mb-16">            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                // { title: "Complete Web Development Bootcamp", duration: "45h", students: "12,450", rating: "4.9", img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80", instructor: "John Doe", level: "Beginner" },
                { title: "Node.js Backend Mastery", duration: "28h", students: "7,330", rating: "5.0", img: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&q=80", instructor: "Mike Johnson", level: "Advanced" },
                { title: "Full Stack Web Development", duration: "52h", students: "10,780", rating: "4.9", img: "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=400&q=80", instructor: "Sarah Williams", level: "Intermediate" }
              ].map((course, idx) => (
                <div key={idx} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group border border-gray-100">
                  <div className="relative overflow-hidden">
                    <img src={course.img} alt={course.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                      <FaPlay className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={40} />
                    </div>
                    <div className="absolute top-2 left-2 bg-white/90 text-[#3D08BA] text-xs px-2 py-1 rounded font-medium">
                      {course.level}
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
                      {course.duration}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-[#F68C29] font-medium">COURSE</div>
                      <div className="flex items-center gap-1">
                        <span className="text-[#F68C29]">⭐</span>
                        <span className="text-sm font-medium text-gray-700">{course.rating}</span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-[#3D08BA] mb-2 text-[14px] line-clamp-2">{course.title}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-[#F68C29] rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {course.instructor.split(' ').map(n => n[0]).join('')}
                      </div>
                      <p className="text-xs text-gray-600">{course.instructor}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-600">{course.students} students</p>
                      <button className="text-[#3D08BA] font-medium text-xs hover:text-[#F68C29] transition-colors">
                        Enroll →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        )}

          {/* Web Development Category */}
          
          {/* Sciences Category */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-xl font-semibold text-[#3D08BA]">Sciences</h3>
              <div className="h-px grow bg-gray-200"></div>
              <button className="text-[#3D08BA] font-medium text-sm hover:text-[#F68C29] transition-colors">
                See all →
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Physics for Everyone", duration: "32h", students: "7,450", rating: "4.8", img: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&q=80", instructor: "Dr. Robert Chen", level: "Beginner" },
                { title: "Chemistry Fundamentals", duration: "28h", students: "6,920", rating: "4.9", img: "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=400&q=80", instructor: "Dr. Anna Smith", level: "Intermediate" },
                { title: "Biology: Life Sciences", duration: "35h", students: "8,330", rating: "5.0", img: "https://images.unsplash.com/photo-1530210124550-912dc1381cb8?w=400&q=80", instructor: "Dr. James Wilson", level: "Beginner" },
                { title: "Astronomy & Space", duration: "24h", students: "10,780", rating: "4.9", img: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&q=80", instructor: "Dr. Lisa Brown", level: "Beginner" }
              ].map((course, idx) => (
                <div key={idx} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group border border-gray-100">
                  <div className="relative overflow-hidden">
                    <img src={course.img} alt={course.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                      <FaPlay className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={40} />
                    </div>
                    <div className="absolute top-2 left-2 bg-white/90 text-[#3D08BA] text-xs px-2 py-1 rounded font-medium">
                      {course.level}
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
                      {course.duration}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-[#F68C29] font-medium">COURSE</div>
                      <div className="flex items-center gap-1">
                        <span className="text-[#F68C29]">⭐</span>
                        <span className="text-sm font-medium text-gray-700">{course.rating}</span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-[#3D08BA] mb-2 text-[14px] line-clamp-2">{course.title}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-[#F68C29] rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {course.instructor.split(' ').map(n => n[0]).join('')}
                      </div>
                      <p className="text-xs text-gray-600">{course.instructor}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-600">{course.students} students</p>
                      <button className="text-[#3D08BA] font-medium text-xs hover:text-[#F68C29] transition-colors">
                        Enroll →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-linear-to-br from-[#3D08BA] to-[#2a0688] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#F68C29] rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-block bg-white/10 border border-white/30 rounded-full px-4 py-2 mb-6">
            <span className="text-white font-semibold text-sm">🎉 Limited Time Offer</span>
          </div>
          <h2 className="text-3xl sm:text-[32px] font-semibold text-white mb-6">
            Ready to Transform Your Future?
          </h2>
          <p className="text-[14px] text-white/90 mb-4">
            Join thousands of students already learning smarter with Edamaa3D
          </p>
          <p className="text-sm text-white/80 mb-8">
            Get started with a 30-day free trial. No credit card required. Cancel anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button 
              onClick={handleSignup}
              className="px-10 py-4 bg-[#F68C29] text-white rounded-lg font-semibold text-[14px] hover:bg-white hover:text-[#3D08BA] transition-all shadow-xl"
            >
              Start Your Free Trial Today
            </button>
            <button className="px-10 py-4 border-2 border-white text-white rounded-lg font-semibold text-[14px] hover:bg-white hover:text-[#3D08BA] transition-all">
              View Pricing
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <span className="text-[#F68C29]">✓</span>
              <span>30-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#F68C29]">✓</span>
              <span>No credit card needed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#F68C29]">✓</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Benefits */}
      <motion.section 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 3, ease: "easeOut", delay: 0.1 }}
        className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
          initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 2, ease: "easeOut", delay: 0.1 }}
           className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-[#3D08BA] mb-4">
              Why Choose Edamaa3D?
            </h2>
            <p className="text-[14px] text-gray-600">
              More than just an online learning platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 2, ease: "easeOut", delay: 0.1 }}
              className="flex gap-6">
                <div className="w-16 h-16 bg-linear-to-br from-[#3D08BA] to-[#2a0688] rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-3xl">🎯</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#3D08BA] mb-2">Goal-Oriented Learning</h3>
                  <p className="text-gray-600 text-sm">Set clear objectives and track your progress with our intelligent learning management system. Stay motivated with milestone achievements and personalized recommendations.</p>
                </div>
              </motion.div >

              <motion.div 
              initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 2, ease: "easeOut", delay: 0.1 }}
              className="flex gap-6">
                <div className="w-16 h-16 bg-linear-to-br from-[#F68C29] to-[#e57a1a] rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-3xl">🤝</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#3D08BA] mb-2">Collaborative Environment</h3>
                  <p className="text-gray-600 text-sm">Connect with fellow learners, form study groups, and participate in discussions. Learning is better together with our vibrant community support.</p>
                </div>
              </motion.div>

              <motion.div 
              initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 2, ease: "easeOut", delay: 0.1 }}
              className="flex gap-6">
                <div className="w-16 h-16 bg-linear-to-br from-[#3D08BA] to-[#2a0688] rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-3xl">📱</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#3D08BA] mb-2">Learn Anywhere, Anytime</h3>
                  <p className="text-gray-600 text-sm">Access courses on any device - desktop, tablet, or mobile. Download lessons for offline viewing and never miss a learning opportunity.</p>
                </div>
              </motion.div>
            </div>

            <div className="space-y-8">
              <motion.div 
              initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 2, ease: "easeOut", delay: 0.1 }}
              className="flex gap-6">
                <div className="w-16 h-16 bg-linear-to-br from-[#F68C29] to-[#e57a1a] rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-3xl">🏆</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#3D08BA] mb-2">Recognized Certificates</h3>
                  <p className="text-gray-600 text-sm">Earn industry-recognized certificates upon course completion. Showcase your achievements on LinkedIn and boost your career prospects.</p>
                </div>
              </motion.div>

              <motion.div 
              initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 2, ease: "easeOut", delay: 0.1 }}
              className="flex gap-6">
                <div className="w-16 h-16 bg-linear-to-br from-[#3D08BA] to-[#2a0688] rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-3xl">💡</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#3D08BA] mb-2">Practical Projects</h3>
                  <p className="text-gray-600 text-sm">Apply your knowledge through hands-on projects and real-world case studies. Build a portfolio that demonstrates your skills to employers.</p>
                </div>
              </motion.div>

              <motion.div 
              initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 2, ease: "easeOut", delay: 0.1 }}
              className="flex gap-6">
                <div className="w-16 h-16 bg-linear-to-br from-[#F68C29] to-[#e57a1a] rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-3xl">👨‍🏫</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#3D08BA] mb-2">Expert Support</h3>
                  <p className="text-gray-600 text-sm">Get help when you need it with 24/7 support from instructors and teaching assistants. Join live Q&A sessions and office hours.</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Company Info */}
            <div>
              <div className="mb-6">
                <NewLogo logoWidth={30} logoHeight={30} textSize="text-[14px]" gap="gap-1.5" centered={false} />
              </div>
              <p className="text-gray-400 mb-6">
                Transform your learning journey with expert teachers, interactive courses, and a supportive community.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#3D08BA] rounded-full flex items-center justify-center transition-colors">
                  <FaFacebook size={20} />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#3D08BA] rounded-full flex items-center justify-center transition-colors">
                  <FaTwitter size={20} />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#3D08BA] rounded-full flex items-center justify-center transition-colors">
                  <FaInstagram size={20} />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#3D08BA] rounded-full flex items-center justify-center transition-colors">
                  <FaLinkedin size={20} />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#3D08BA] rounded-full flex items-center justify-center transition-colors">
                  <FaYoutube size={20} />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-[16px] font-bold mb-6">Quick Links</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors">Courses</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors">Instructors</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors">Events</a></li>
                <li><a href="/signup" onClick={handleSignup} className="text-gray-400 hover:text-[#F68C29] transition-colors">Become an Instructor</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-[16px] font-bold mb-6">Support</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors">FAQs</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors">Contact Us</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-[16px] font-bold mb-6">Contact Us</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MdEmail className="text-[#F68C29] mt-1 shrink-0" size={20} />
                  <div>
                    <p className="text-gray-400">support@edamaa3d.com</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MdPhone className="text-[#F68C29] mt-1 shrink-0" size={20} />
                  <div>
                    <a href="tel:+2347048222080" className="text-gray-400">+234 (0) 70 4822 2080</a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MdLocationOn className="text-[#F68C29] mt-1 shrink-0" size={20} />
                  <div>
                    <p className="text-gray-400">Lagos, Nigeria</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-center md:text-left">
                © 2025 Edamaa3D. All rights reserved.
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                <a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors text-sm">Privacy</a>
                <a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors text-sm">Terms</a>
                <a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors text-sm">Cookies</a>
                <a href="#" className="text-gray-400 hover:text-[#F68C29] transition-colors text-sm">Accessibility</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App