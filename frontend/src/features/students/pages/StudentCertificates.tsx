import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import BottomNavigation from '../../../components/layout/student-layout/StudentBottomNavigation';
import { createPdfBlob, downloadFile } from '../../../utils/exportFiles';
import {
  buildCourseCertificateDocDefinition,
  fetchStudentCourseCertificates,
  type CourseCertificateIssuerType,
  type CourseCertificateRecord,
} from '../utils/courseCertificatesApi';

const issuerBadgeClass: Record<CourseCertificateIssuerType, string> = {
  school: 'bg-[#3D08BA]/10 text-[#3D08BA]',
  tutor: 'bg-emerald-100 text-emerald-700',
  edamaa: 'bg-sky-100 text-sky-700',
};

const issuerAccentClass: Record<CourseCertificateIssuerType, string> = {
  school: 'from-[#3D08BA] via-[#5520dd] to-[#7c3aed]',
  tutor: 'from-emerald-500 via-teal-500 to-cyan-500',
  edamaa: 'from-sky-500 via-blue-500 to-indigo-500',
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }
  return parsed.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const StudentCertificates = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<CourseCertificateRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, schoolIssued: 0, tutorIssued: 0, edamaaIssued: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [issuerFilter, setIssuerFilter] = useState<'all' | CourseCertificateIssuerType>('all');
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);

  const refreshWallet = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const payload = await fetchStudentCourseCertificates();
      setCertificates(payload.certificates);
      setSummary(payload.summary);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load your certificates right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refreshWallet(false);
  }, []);

  const filteredCertificates = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return certificates.filter((certificate) => {
      const matchesFilter = issuerFilter === 'all' || certificate.issuerType === issuerFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          certificate.courseTitle,
          certificate.issuerName,
          certificate.certificateCode,
          certificate.studentName,
          certificate.courseCategory,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [certificates, issuerFilter, searchQuery]);

  const latestCertificate = certificates[0] || null;

  const handleDownload = async (certificate: CourseCertificateRecord) => {
    setActiveDownloadId(certificate.id);
    setNotice(null);
    try {
      const pdfBlob = await createPdfBlob(buildCourseCertificateDocDefinition(certificate));
      const safeTitle = certificate.courseTitle.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'course';
      downloadFile(pdfBlob, `${certificate.certificateCode.toLowerCase()}-${safeTitle}.pdf`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not prepare your certificate PDF.');
    } finally {
      setActiveDownloadId(null);
    }
  };

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.09),_transparent_34%),linear-gradient(180deg,_#f8fafc,_#f5f3ff_52%,_#eef2ff)] pb-24 md:pb-8'>
      <main className='mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6'>
        <section className='overflow-hidden rounded-[28px] border border-white/70 bg-white/92 shadow-[0_24px_80px_rgba(15,23,42,0.10)]'>
          <div className='border-b border-slate-100 bg-[linear-gradient(135deg,rgba(61,8,186,0.10),rgba(124,58,237,0.04),rgba(255,255,255,0.92))] px-5 py-5 sm:px-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
              <div className='max-w-2xl'>
                <button
                  type='button'
                  onClick={() => navigate('/student-dashboard')}
                  className='inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/15 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] transition hover:bg-white'
                >
                  <ArrowLeftIcon className='h-4 w-4' />
                  Back to dashboard
                </button>
                <p className='mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#3D08BA]'>Certificate wallet</p>
                <h1 className='mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]'>Your completed course certificates in one place.</h1>
                <p className='mt-3 max-w-xl text-sm leading-6 text-slate-600'>Certificates appear here automatically after you complete all lessons and pass every course checkpoint required for issue.</p>
              </div>
              <button
                type='button'
                onClick={() => void refreshWallet(true)}
                className='inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
              >
                <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh wallet
              </button>
            </div>
            <div className='mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              {[
                { label: 'Total certificates', value: summary.total, meta: 'Auto-issued completed courses' },
                { label: 'School-branded', value: summary.schoolIssued, meta: 'Issued with school branding' },
                { label: 'Tutor-branded', value: summary.tutorIssued, meta: 'Issued with tutor branding' },
                { label: 'Edamaa3D issued', value: summary.edamaaIssued, meta: 'Platform-issued certificates' },
              ].map((item) => (
                <div key={item.label} className='rounded-2xl border border-white/80 bg-white/92 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)]'>
                  <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>{item.label}</p>
                  <p className='mt-3 text-2xl font-semibold text-slate-950'>{item.value}</p>
                  <p className='mt-1 text-xs text-slate-500'>{item.meta}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {notice && (
          <div className='mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
            {notice}
          </div>
        )}

        {latestCertificate && (
          <section className='mt-6 rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3D08BA]'>Latest certificate</p>
                <h2 className='mt-2 text-lg font-semibold text-slate-950'>Most recent certificate issued into your wallet.</h2>
              </div>
              <div className='flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={() => navigate(`/course/${latestCertificate.courseId}`)}
                  className='rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
                >
                  Open course
                </button>
                <button
                  type='button'
                  onClick={() => void handleDownload(latestCertificate)}
                  className='inline-flex items-center gap-2 rounded-full bg-[#3D08BA] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#2f068e]'
                >
                  <ArrowDownTrayIcon className='h-4 w-4' />
                  Download latest
                </button>
              </div>
            </div>
            <div className='mt-5 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#faf5ff_48%,#eef2ff)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'>
              <div className={`mx-auto h-2 w-40 rounded-full bg-gradient-to-r ${issuerAccentClass[latestCertificate.issuerType]}`}></div>
              <p className='mt-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>Issued via Edamaa3D</p>
              <h3 className='mt-3 text-center text-3xl font-semibold text-slate-950'>{latestCertificate.certificateTitle}</h3>
              <p className='mt-8 text-center text-sm text-slate-500'>Awarded to</p>
              <p className='mt-3 text-center text-4xl font-semibold tracking-tight text-slate-950'>{latestCertificate.studentName}</p>
              <p className='mx-auto mt-5 max-w-3xl text-center text-base leading-7 text-slate-600'>
                {latestCertificate.achievementLine}
              </p>
              <div className='mt-8 grid gap-4 sm:grid-cols-3'>
                <div className='rounded-2xl bg-white p-4 shadow-sm'>
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Course</p>
                  <p className='mt-2 text-sm font-semibold text-slate-900'>{latestCertificate.courseTitle}</p>
                </div>
                <div className='rounded-2xl bg-white p-4 shadow-sm'>
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Issued by</p>
                  <p className='mt-2 text-sm font-semibold text-slate-900'>{latestCertificate.issuerName}</p>
                </div>
                <div className='rounded-2xl bg-white p-4 shadow-sm'>
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Date</p>
                  <p className='mt-2 text-sm font-semibold text-slate-900'>{formatDate(latestCertificate.issueDate)}</p>
                </div>
              </div>
              <div className='mt-4 rounded-2xl bg-white p-4 shadow-sm'>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Signed by</p>
                <p className='mt-2 text-sm font-semibold text-slate-900'>{latestCertificate.signatoryName}</p>
                <p className='mt-1 text-xs text-slate-500'>{latestCertificate.signatoryTitle}</p>
              </div>
            </div>
          </section>
        )}

        <section className='mt-6 rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3D08BA]'>Issued history</p>
              <h2 className='mt-2 text-lg font-semibold text-slate-950'>Review every course certificate already earned.</h2>
            </div>
            <div className='flex flex-1 flex-col gap-3 lg:max-w-3xl lg:flex-row lg:items-center lg:justify-end'>
              <label className='relative flex-1 lg:max-w-md'>
                <MagnifyingGlassIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder='Search by course, issuer, code...'
                  className='w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                />
              </label>
              <div className='flex flex-wrap gap-2'>
                {['all', 'school', 'tutor', 'edamaa'].map((issuer) => {
                  const value = issuer as 'all' | CourseCertificateIssuerType;
                  return (
                    <button
                      key={issuer}
                      type='button'
                      onClick={() => setIssuerFilter(value)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                        issuerFilter === value
                          ? 'bg-[#3D08BA] text-white shadow-[0_10px_24px_rgba(61,8,186,0.24)]'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {issuer === 'all' ? 'All issuers' : issuer}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {loading ? (
            <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`wallet-skeleton-${index}`} className='h-60 animate-pulse rounded-[24px] border border-slate-200 bg-slate-100' />
              ))}
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className='mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center'>
              <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3D08BA]/8 text-[#3D08BA]'>
                <AcademicCapIcon className='h-7 w-7' />
              </div>
              <h3 className='mt-4 text-base font-semibold text-slate-950'>No certificates yet.</h3>
              <p className='mt-2 text-sm text-slate-500'>Complete a recorded course and pass every module checkpoint to unlock your first certificate.</p>
            </div>
          ) : (
            <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {filteredCertificates.map((certificate) => (
                <article key={certificate.id} className='overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]'>
                  <div className={`h-1.5 bg-gradient-to-r ${issuerAccentClass[certificate.issuerType]}`}></div>
                  <div className='p-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>{certificate.courseCategory}</p>
                        <h3 className='mt-2 text-base font-semibold text-slate-950'>{certificate.courseTitle}</h3>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${issuerBadgeClass[certificate.issuerType]}`}>
                        {certificate.issuerType}
                      </span>
                    </div>
                    <div className='mt-4 rounded-2xl bg-slate-50 p-4'>
                      <div className='flex items-center gap-3'>
                        <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm'>
                          <SparklesIcon className='h-6 w-6' />
                        </div>
                        <div>
                          <p className='text-sm font-semibold text-slate-900'>{certificate.certificateTitle}</p>
                          <p className='text-xs text-slate-500'>{certificate.issuerName}</p>
                        </div>
                      </div>
                    </div>
                    <dl className='mt-4 space-y-3 text-sm'>
                      <div className='flex items-start justify-between gap-4'>
                        <dt className='text-slate-500'>Certificate code</dt>
                        <dd className='text-right font-semibold text-slate-900'>{certificate.certificateCode}</dd>
                      </div>
                      <div className='flex items-start justify-between gap-4'>
                        <dt className='text-slate-500'>Issued on</dt>
                        <dd className='text-right font-semibold text-slate-900'>{formatDate(certificate.issueDate)}</dd>
                      </div>
                      <div className='flex items-start justify-between gap-4'>
                        <dt className='text-slate-500'>Verification code</dt>
                        <dd className='text-right text-slate-700'>{certificate.verificationCode}</dd>
                      </div>
                      <div className='flex items-start justify-between gap-4'>
                        <dt className='text-slate-500'>Signed by</dt>
                        <dd className='text-right'>
                          <span className='block font-semibold text-slate-900'>{certificate.signatoryName}</span>
                          <span className='text-xs text-slate-500'>{certificate.signatoryTitle}</span>
                        </dd>
                      </div>
                    </dl>
                    <div className='mt-5 flex flex-wrap gap-2'>
                      <button
                        type='button'
                        onClick={() => void handleDownload(certificate)}
                        disabled={activeDownloadId === certificate.id}
                        className='inline-flex items-center gap-2 rounded-full bg-[#3D08BA] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#2f068e] disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        <ArrowDownTrayIcon className='h-4 w-4' />
                        {activeDownloadId === certificate.id ? 'Preparing...' : 'Download PDF'}
                      </button>
                      <button
                        type='button'
                        onClick={() => navigate(`/course/${certificate.courseId}`)}
                        className='rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
                      >
                        Open course
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNavigation
        activeTab='student-dashboard'
        onHomeClick={() => navigate('/student-dashboard')}
        onCoursesClick={() => navigate('/mycourses')}
        onAssignmentsClick={() => navigate('/assignments')}
        onPerformanceClick={() => navigate('/performance')}
      />
    </div>
  );
};

export default StudentCertificates;
