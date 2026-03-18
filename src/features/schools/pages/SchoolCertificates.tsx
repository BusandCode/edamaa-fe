import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { SchoolFinanceStudent } from '../utils/schoolFinanceApi';
import { fetchSchoolFinanceStudents } from '../utils/schoolFinanceApi';
import {
  createSchoolCertificate,
  deleteSchoolCertificate,
  fetchSchoolCertificatesWorkspace,
  schoolCertificateTemplates,
  updateSchoolCertificate,
  type CreateSchoolCertificateInput,
  type SchoolCertificateRecord,
  type SchoolCertificateTemplateId,
} from '../utils/schoolCertificatesApi';
import { createPdfBlob, downloadFile, joinCsvRow, loadSchoolBrandingDetails } from '../../../utils/exportFiles';

const templateToneClasses: Record<SchoolCertificateTemplateId, string> = {
  completion: 'from-[#3D08BA] via-[#5520dd] to-[#7c3aed]',
  excellence: 'from-emerald-500 via-teal-500 to-cyan-500',
  attendance: 'from-amber-500 via-orange-500 to-rose-500',
  graduation: 'from-sky-500 via-blue-500 to-indigo-500',
};

type EditorMode = 'create' | 'edit';

type EditorState = {
  templateId: SchoolCertificateTemplateId;
  certificateTitle: string;
  programName: string;
  achievement: string;
  studentName: string;
  studentEmail: string;
  admissionNumber: string;
  department: string;
  classGroup: string;
  issueDate: string;
  signatoryName: string;
  signatoryRole: string;
  notes: string;
};

const getTemplate = (templateId: SchoolCertificateTemplateId) =>
  schoolCertificateTemplates.find((template) => template.id === templateId) || schoolCertificateTemplates[0];

const createEditorState = (templateId: SchoolCertificateTemplateId = 'completion'): EditorState => {
  const template = getTemplate(templateId);
  const branding = loadSchoolBrandingDetails();
  return {
    templateId,
    certificateTitle: template.defaultTitle,
    programName: '',
    achievement: '',
    studentName: '',
    studentEmail: '',
    admissionNumber: '',
    department: '',
    classGroup: '',
    issueDate: new Date().toISOString().slice(0, 10),
    signatoryName: branding.adminName,
    signatoryRole: 'School Admin',
    notes: '',
  };
};

const toEditorState = (certificate: SchoolCertificateRecord): EditorState => ({
  templateId: certificate.templateId,
  certificateTitle: certificate.certificateTitle,
  programName: certificate.programName,
  achievement: certificate.achievement,
  studentName: certificate.studentName,
  studentEmail: certificate.studentEmail,
  admissionNumber: certificate.admissionNumber,
  department: certificate.department,
  classGroup: certificate.classGroup,
  issueDate: certificate.issueDate,
  signatoryName: certificate.signatoryName,
  signatoryRole: certificate.signatoryRole,
  notes: certificate.notes,
});

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return '--';
  }
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

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '--';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }
  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const buildCertificateDocDefinition = (certificate: SchoolCertificateRecord) => {
  const branding = loadSchoolBrandingDetails();
  const awardBody = certificate.achievement.trim()
    ? certificate.achievement.trim()
    : certificate.programName.trim()
      ? `for successfully completing ${certificate.programName.trim()}`
      : 'for outstanding participation and achievement';
  const classLine = [certificate.department, certificate.classGroup].filter(Boolean).join(' • ');

  return {
    pageSize: 'A4',
    pageMargins: [26, 30, 26, 32],
    background: [
      {
        canvas: [
          {
            type: 'rect',
            x: 18,
            y: 18,
            w: 559,
            h: 806,
            r: 20,
            lineColor: '#3D08BA',
            lineWidth: 2,
          },
          {
            type: 'rect',
            x: 28,
            y: 28,
            w: 539,
            h: 786,
            r: 16,
            lineColor: '#c4b5fd',
            lineWidth: 1,
          },
        ],
      },
    ],
    content: [
      {
        text: branding.schoolName,
        alignment: 'center',
        fontSize: 24,
        bold: true,
        color: '#0f172a',
        margin: [0, 8, 0, 6],
      },
      {
        text: 'Official student certificate',
        alignment: 'center',
        fontSize: 10,
        bold: true,
        color: '#64748b',
        margin: [0, 0, 0, 16],
      },
      {
        text: certificate.certificateTitle,
        alignment: 'center',
        fontSize: 28,
        bold: true,
        color: '#3D08BA',
        margin: [0, 12, 0, 24],
      },
      {
        text: 'This is to certify that',
        alignment: 'center',
        fontSize: 14,
        color: '#475569',
        margin: [0, 0, 0, 10],
      },
      {
        text: certificate.studentName,
        alignment: 'center',
        fontSize: 26,
        bold: true,
        color: '#0f172a',
        margin: [0, 0, 0, 10],
      },
      {
        text: awardBody,
        alignment: 'center',
        fontSize: 14,
        color: '#334155',
        margin: [40, 0, 40, 18],
      },
      ...(certificate.programName
        ? [
            {
              text: `Programme: ${certificate.programName}`,
              alignment: 'center',
              fontSize: 12,
              color: '#475569',
              margin: [0, 0, 0, 8],
            },
          ]
        : []),
      ...(classLine
        ? [
            {
              text: `Class: ${classLine}`,
              alignment: 'center',
              fontSize: 12,
              color: '#475569',
              margin: [0, 0, 0, 8],
            },
          ]
        : []),
      ...(certificate.admissionNumber
        ? [
            {
              text: `Admission No: ${certificate.admissionNumber}`,
              alignment: 'center',
              fontSize: 12,
              color: '#475569',
              margin: [0, 0, 0, 16],
            },
          ]
        : [{ text: '', margin: [0, 0, 0, 16] }]),
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Issued on', fontSize: 10, color: '#64748b', bold: true, margin: [0, 0, 0, 4] },
              { text: formatDate(certificate.issueDate), fontSize: 14, color: '#0f172a' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Certificate no.', fontSize: 10, color: '#64748b', bold: true, margin: [0, 0, 0, 4] },
              { text: certificate.serialNumber, fontSize: 14, color: '#0f172a' },
            ],
          },
        ],
        columnGap: 20,
        margin: [52, 0, 52, 30],
      },
      ...(certificate.notes
        ? [
            {
              table: {
                widths: ['*'],
                body: [[{ text: certificate.notes, fontSize: 11, color: '#475569', margin: [12, 10, 12, 10] }]],
              },
              layout: {
                hLineColor: () => '#e2e8f0',
                vLineColor: () => '#e2e8f0',
              },
              margin: [52, 0, 52, 28],
            },
          ]
        : []),
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                canvas: [
                  { type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineColor: '#94a3b8', lineWidth: 0.8 },
                ],
              },
              { text: certificate.signatoryName, fontSize: 12, bold: true, color: '#0f172a', margin: [0, 8, 0, 2] },
              { text: certificate.signatoryRole, fontSize: 10, color: '#64748b' },
            ],
          },
          {
            width: '*',
            stack: [
              {
                canvas: [
                  { type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineColor: '#94a3b8', lineWidth: 0.8 },
                ],
              },
              { text: branding.schoolName, fontSize: 12, bold: true, color: '#0f172a', margin: [0, 8, 0, 2] },
              { text: 'School seal / records', fontSize: 10, color: '#64748b' },
            ],
          },
        ],
        columnGap: 40,
        margin: [52, 8, 52, 0],
      },
    ],
    footer: {
      margin: [28, 8, 28, 16],
      columns: [
        {
          text: `${branding.schoolName} • Generated via Edamaa`,
          color: '#64748b',
          fontSize: 9,
        },
        {
          text: certificate.serialNumber,
          alignment: 'right',
          color: '#64748b',
          fontSize: 9,
        },
      ],
    },
  };
};

const SchoolCertificates = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [certificates, setCertificates] = useState<SchoolCertificateRecord[]>([]);
  const [summary, setSummary] = useState({ totalIssued: 0, issuedThisMonth: 0, uniqueStudents: 0, completionCount: 0 });
  const [students, setStudents] = useState<SchoolFinanceStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [editingCertificateId, setEditingCertificateId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(createEditorState());
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [templateFilter, setTemplateFilter] = useState<'all' | SchoolCertificateTemplateId>('all');
  const [activeActionId, setActiveActionId] = useState<string | 'csv' | null>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);

  const modeParam = (searchParams.get('mode') || '').trim().toLowerCase();

  const refreshWorkspace = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);

    try {
      const [workspace, studentPayload] = await Promise.all([
        fetchSchoolCertificatesWorkspace(),
        fetchSchoolFinanceStudents().catch(() => ({ students: [] })),
      ]);
      setCertificates(workspace.certificates);
      setSummary(workspace.summary);
      setStudents(Array.isArray(studentPayload.students) ? studentPayload.students : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load certificates right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refreshWorkspace(false);
  }, []);

  useEffect(() => {
    if (modeParam === 'issue') {
      setEditor(createEditorState());
      setEditorMode('create');
      setEditingCertificateId(null);
      setEditorOpen(true);
    }
  }, [modeParam]);

  const filteredCertificates = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return certificates.filter((certificate) => {
      const matchesFilter = templateFilter === 'all' || certificate.templateId === templateFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          certificate.studentName,
          certificate.studentEmail,
          certificate.serialNumber,
          certificate.certificateTitle,
          certificate.programName,
          certificate.department,
          certificate.classGroup,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [certificates, searchQuery, templateFilter]);

  const latestCertificate = certificates[0] || null;
  const editorTemplate = getTemplate(editor.templateId);

  const handleOpenCreate = (templateId?: SchoolCertificateTemplateId) => {
    setEditorMode('create');
    setEditingCertificateId(null);
    setEditor(createEditorState(templateId || 'completion'));
    setEditorOpen(true);
    setNotice(null);
  };

  const handleOpenEdit = (certificate: SchoolCertificateRecord) => {
    setEditorMode('edit');
    setEditingCertificateId(certificate.id);
    setEditor(toEditorState(certificate));
    setEditorOpen(true);
    setNotice(null);
  };

  const handleReuse = (certificate: SchoolCertificateRecord) => {
    setEditorMode('create');
    setEditingCertificateId(null);
    setEditor({
      ...toEditorState(certificate),
      issueDate: new Date().toISOString().slice(0, 10),
    });
    setEditorOpen(true);
    setNotice('Certificate draft copied. Update the student details if needed before issuing it.');
  };

  const handleStudentSelect = (value: string) => {
    if (!value) {
      return;
    }
    const selectedStudent = students.find((student) => student.email === value);
    if (!selectedStudent) {
      return;
    }
    setEditor((current) => ({
      ...current,
      studentEmail: selectedStudent.email,
      studentName: selectedStudent.name || current.studentName,
    }));
  };

  const buildPayload = (): CreateSchoolCertificateInput => ({
    templateId: editor.templateId,
    certificateTitle: editor.certificateTitle,
    programName: editor.programName,
    achievement: editor.achievement,
    studentName: editor.studentName,
    studentEmail: editor.studentEmail,
    admissionNumber: editor.admissionNumber,
    department: editor.department,
    classGroup: editor.classGroup,
    issueDate: editor.issueDate,
    signatoryName: editor.signatoryName,
    signatoryRole: editor.signatoryRole,
    notes: editor.notes,
  });

  const handleSave = async () => {
    if (!editor.studentName.trim()) {
      setNotice('Enter the student name before issuing this certificate.');
      return;
    }
    if (!editor.certificateTitle.trim()) {
      setNotice('Enter the certificate title before saving.');
      return;
    }
    if (!editor.issueDate.trim()) {
      setNotice('Choose the issue date for this certificate.');
      return;
    }
    if (!editor.signatoryName.trim() || !editor.signatoryRole.trim()) {
      setNotice('Add the signatory name and role before saving.');
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      if (editorMode === 'edit' && editingCertificateId) {
        await updateSchoolCertificate(editingCertificateId, buildPayload());
        setNotice('Certificate updated.');
      } else {
        await createSchoolCertificate(buildPayload());
        setNotice('Certificate issued successfully.');
      }
      setEditorOpen(false);
      setEditingCertificateId(null);
      setEditor(createEditorState());
      await refreshWorkspace(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save the certificate right now.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (certificateId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Remove this certificate from the school record?')) {
      return;
    }

    setActiveDeleteId(certificateId);
    setNotice(null);
    try {
      await deleteSchoolCertificate(certificateId);
      setNotice('Certificate removed from the record.');
      await refreshWorkspace(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not remove the certificate.');
    } finally {
      setActiveDeleteId(null);
    }
  };

  const handleDownloadPdf = async (certificate: SchoolCertificateRecord) => {
    setActiveActionId(certificate.id);
    setNotice(null);
    try {
      const pdfBlob = await createPdfBlob(buildCertificateDocDefinition(certificate));
      const safeStudentName = certificate.studentName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'student';
      downloadFile(pdfBlob, `${certificate.serialNumber.toLowerCase()}-${safeStudentName}.pdf`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not generate the certificate PDF.');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleExportCsv = () => {
    setActiveActionId('csv');
    try {
      const lines = [
        joinCsvRow([
          'Serial Number',
          'Template',
          'Certificate Title',
          'Student Name',
          'Student Email',
          'Admission Number',
          'Department',
          'Class',
          'Issue Date',
          'Signatory',
          'Created At',
        ]),
        ...filteredCertificates.map((certificate) =>
          joinCsvRow([
            certificate.serialNumber,
            certificate.templateLabel,
            certificate.certificateTitle,
            certificate.studentName,
            certificate.studentEmail,
            certificate.admissionNumber,
            certificate.department,
            certificate.classGroup,
            certificate.issueDate,
            `${certificate.signatoryName} (${certificate.signatoryRole})`,
            formatDateTime(certificate.createdAt),
          ])
        ),
      ];
      downloadFile(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }), 'edamaa-school-certificates.csv');
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.09),_transparent_34%),linear-gradient(180deg,_#f8fafc,_#f5f3ff_52%,_#eef2ff)] pb-16'>
      <main className='mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8'>
        <section className='overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur'>
          <div className='border-b border-slate-100 bg-[linear-gradient(135deg,rgba(61,8,186,0.10),rgba(124,58,237,0.04),rgba(255,255,255,0.92))] px-5 py-5 sm:px-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
              <div className='max-w-2xl'>
                <button
                  type='button'
                  onClick={() => navigate('/school-dashboard')}
                  className='inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/15 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] transition hover:bg-white'
                >
                  <ArrowLeftIcon className='h-4 w-4' />
                  Back to dashboard
                </button>
                <p className='mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#3D08BA]'>Student certificates</p>
                <h1 className='mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]'>Issue branded student certificates from one school workspace.</h1>
                <p className='mt-3 max-w-xl text-sm leading-6 text-slate-600'>Use reusable certificate templates, record every issued certificate, and download school-branded PDFs without redesigning the document each time.</p>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <button
                  type='button'
                  onClick={() => void refreshWorkspace(true)}
                  className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
                >
                  <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  type='button'
                  onClick={handleExportCsv}
                  disabled={filteredCertificates.length === 0 || activeActionId === 'csv'}
                  className='inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-3.5 py-2 text-xs font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  <ArrowDownTrayIcon className='h-4 w-4' />
                  {activeActionId === 'csv' ? 'Exporting...' : 'Export CSV'}
                </button>
                <button
                  type='button'
                  onClick={() => handleOpenCreate()}
                  className='inline-flex items-center gap-2 rounded-full bg-[#3D08BA] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(61,8,186,0.28)] transition hover:bg-[#2f068e]'
                >
                  <PlusIcon className='h-4 w-4' />
                  Issue certificate
                </button>
              </div>
            </div>
            <div className='mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              {[
                {
                  label: 'Total issued',
                  value: summary.totalIssued,
                  meta: 'All certificate records',
                },
                {
                  label: 'Issued this month',
                  value: summary.issuedThisMonth,
                  meta: 'Recent certificate activity',
                },
                {
                  label: 'Students covered',
                  value: summary.uniqueStudents,
                  meta: 'Unique student recipients',
                },
                {
                  label: 'Completion certificates',
                  value: summary.completionCount,
                  meta: 'Most common school issue type',
                },
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
          <div className='rounded-2xl border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-4 py-3 text-sm text-[#3D08BA]'>
            {notice}
          </div>
        )}

        {loadError && (
          <div className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
            {loadError}
          </div>
        )}

        <section className='rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3D08BA]'>Template library</p>
              <h2 className='mt-2 text-lg font-semibold text-slate-950'>Choose the certificate style that matches the student outcome.</h2>
            </div>
            <p className='max-w-xl text-sm leading-6 text-slate-500'>Each template keeps the school identity consistent. You can still edit the wording, student details, and signatory before issuing the final certificate.</p>
          </div>
          <div className='mt-5 grid gap-4 xl:grid-cols-4 md:grid-cols-2'>
            {schoolCertificateTemplates.map((template) => (
              <button
                key={template.id}
                type='button'
                onClick={() => handleOpenCreate(template.id)}
                className='group overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left shadow-[0_14px_38px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[#3D08BA]/25 hover:shadow-[0_18px_46px_rgba(61,8,186,0.12)]'
              >
                <div className={`h-2 bg-gradient-to-r ${templateToneClasses[template.id]}`}></div>
                <div className='p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <span className='inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D08BA]/8 text-[#3D08BA]'>
                      <SparklesIcon className='h-5 w-5' />
                    </span>
                    <span className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600'>
                      {template.shortLabel}
                    </span>
                  </div>
                  <h3 className='mt-4 text-base font-semibold text-slate-950'>{template.defaultTitle}</h3>
                  <p className='mt-2 text-sm leading-6 text-slate-500'>{template.description}</p>
                  <div className='mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#3D08BA]'>
                    <PlusIcon className='h-4 w-4' />
                    Use template
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className='rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3D08BA]'>Issued records</p>
              <h2 className='mt-2 text-lg font-semibold text-slate-950'>Track every certificate the school has already issued.</h2>
            </div>
            <div className='flex flex-1 flex-col gap-3 lg:max-w-3xl lg:flex-row lg:items-center lg:justify-end'>
              <label className='relative flex-1 lg:max-w-md'>
                <MagnifyingGlassIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder='Search student, title, class, serial number...'
                  className='w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                />
              </label>
              <div className='flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={() => setTemplateFilter('all')}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    templateFilter === 'all'
                      ? 'bg-[#3D08BA] text-white shadow-[0_10px_24px_rgba(61,8,186,0.24)]'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  All templates
                </button>
                {schoolCertificateTemplates.map((template) => (
                  <button
                    key={template.id}
                    type='button'
                    onClick={() => setTemplateFilter(template.id)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      templateFilter === template.id
                        ? 'bg-[#3D08BA] text-white shadow-[0_10px_24px_rgba(61,8,186,0.24)]'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {template.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`certificate-skeleton-${index}`} className='h-64 animate-pulse rounded-[24px] border border-slate-200 bg-slate-100' />
              ))}
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className='mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center'>
              <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3D08BA]/8 text-[#3D08BA]'>
                <AcademicCapIcon className='h-7 w-7' />
              </div>
              <h3 className='mt-4 text-base font-semibold text-slate-950'>No certificates found yet.</h3>
              <p className='mt-2 text-sm text-slate-500'>Issue your first student certificate to start building the school certificate record.</p>
              <button
                type='button'
                onClick={() => handleOpenCreate()}
                className='mt-5 inline-flex items-center gap-2 rounded-full bg-[#3D08BA] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2f068e]'
              >
                <PlusIcon className='h-4 w-4' />
                Issue first certificate
              </button>
            </div>
          ) : (
            <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {filteredCertificates.map((certificate) => {
                const template = getTemplate(certificate.templateId);
                return (
                  <article
                    key={certificate.id}
                    className='overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]'
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${templateToneClasses[certificate.templateId]}`}></div>
                    <div className='p-4'>
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>{template.label}</p>
                          <h3 className='mt-2 text-base font-semibold text-slate-950'>{certificate.certificateTitle}</h3>
                        </div>
                        <span className='rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700'>Issued</span>
                      </div>

                      <div className='mt-4 rounded-2xl bg-slate-50 p-4'>
                        <div className='flex items-center gap-3'>
                          <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm'>
                            <UserCircleIcon className='h-6 w-6' />
                          </div>
                          <div>
                            <p className='text-sm font-semibold text-slate-900'>{certificate.studentName}</p>
                            <p className='text-xs text-slate-500'>
                              {[certificate.department, certificate.classGroup].filter(Boolean).join(' • ') || 'Class not added'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <dl className='mt-4 space-y-3 text-sm'>
                        <div className='flex items-start justify-between gap-4'>
                          <dt className='text-slate-500'>Serial number</dt>
                          <dd className='text-right font-semibold text-slate-900'>{certificate.serialNumber}</dd>
                        </div>
                        <div className='flex items-start justify-between gap-4'>
                          <dt className='text-slate-500'>Issued on</dt>
                          <dd className='text-right font-semibold text-slate-900'>{formatDate(certificate.issueDate)}</dd>
                        </div>
                        {certificate.programName && (
                          <div className='flex items-start justify-between gap-4'>
                            <dt className='text-slate-500'>Programme</dt>
                            <dd className='text-right font-semibold text-slate-900'>{certificate.programName}</dd>
                          </div>
                        )}
                        <div className='flex items-start justify-between gap-4'>
                          <dt className='text-slate-500'>Updated</dt>
                          <dd className='text-right text-slate-700'>{formatDateTime(certificate.updatedAt)}</dd>
                        </div>
                      </dl>

                      <div className='mt-5 flex flex-wrap gap-2'>
                        <button
                          type='button'
                          onClick={() => void handleDownloadPdf(certificate)}
                          disabled={activeActionId === certificate.id}
                          className='inline-flex items-center gap-2 rounded-full bg-[#3D08BA] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#2f068e] disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          <ArrowDownTrayIcon className='h-4 w-4' />
                          {activeActionId === certificate.id ? 'Preparing PDF...' : 'Download PDF'}
                        </button>
                        <button
                          type='button'
                          onClick={() => handleOpenEdit(certificate)}
                          className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
                        >
                          <PencilSquareIcon className='h-4 w-4' />
                          Edit
                        </button>
                        <button
                          type='button'
                          onClick={() => handleReuse(certificate)}
                          className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
                        >
                          <DocumentDuplicateIcon className='h-4 w-4' />
                          Reuse
                        </button>
                        <button
                          type='button'
                          onClick={() => void handleDelete(certificate.id)}
                          disabled={activeDeleteId === certificate.id}
                          className='inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          <TrashIcon className='h-4 w-4' />
                          {activeDeleteId === certificate.id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {latestCertificate && !editorOpen && (
          <section className='rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3D08BA]'>Latest issue</p>
                <h2 className='mt-2 text-lg font-semibold text-slate-950'>Most recent certificate issued by the school.</h2>
              </div>
              <button
                type='button'
                onClick={() => void handleDownloadPdf(latestCertificate)}
                className='inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-3.5 py-2 text-xs font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10'
              >
                <ArrowDownTrayIcon className='h-4 w-4' />
                Download latest PDF
              </button>
            </div>
            <div className='mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#faf5ff_48%,#eef2ff)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'>
              <div className={`mx-auto max-w-4xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]`}>
                <div className={`mx-auto h-2 w-40 rounded-full bg-gradient-to-r ${templateToneClasses[latestCertificate.templateId]}`}></div>
                <p className='mt-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>Official student certificate</p>
                <h3 className='mt-3 text-center text-3xl font-semibold text-[#3D08BA]'>{latestCertificate.certificateTitle}</h3>
                <p className='mt-8 text-center text-sm text-slate-500'>This is to certify that</p>
                <p className='mt-3 text-center text-4xl font-semibold tracking-tight text-slate-950'>{latestCertificate.studentName}</p>
                <p className='mx-auto mt-5 max-w-3xl text-center text-base leading-7 text-slate-600'>
                  {latestCertificate.achievement || latestCertificate.programName || 'has met the school requirements for this recognition.'}
                </p>
                <div className='mt-8 grid gap-4 sm:grid-cols-3'>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Certificate no.</p>
                    <p className='mt-2 text-sm font-semibold text-slate-900'>{latestCertificate.serialNumber}</p>
                  </div>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Issue date</p>
                    <p className='mt-2 text-sm font-semibold text-slate-900'>{formatDate(latestCertificate.issueDate)}</p>
                  </div>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Class</p>
                    <p className='mt-2 text-sm font-semibold text-slate-900'>{[latestCertificate.department, latestCertificate.classGroup].filter(Boolean).join(' • ') || 'Not added'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {editorOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6'>
          <div className='flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.24)]'>
            <div className='flex items-start justify-between gap-4 border-b border-slate-100 bg-[linear-gradient(135deg,rgba(61,8,186,0.10),rgba(124,58,237,0.04),rgba(255,255,255,0.92))] px-5 py-4 sm:px-6'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3D08BA]'>Certificate editor</p>
                <h2 className='mt-2 text-xl font-semibold text-slate-950'>
                  {editorMode === 'edit' ? 'Update certificate record' : 'Issue student certificate'}
                </h2>
                <p className='mt-2 text-sm text-slate-500'>Complete the student details, confirm the certificate wording, and save the school record.</p>
              </div>
              <button
                type='button'
                onClick={() => setEditorOpen(false)}
                className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50'
              >
                <XMarkIcon className='h-5 w-5' />
              </button>
            </div>

            <div className='grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]'>
              <div className='min-h-0 overflow-y-auto px-5 py-5 sm:px-6'>
                <div className='grid gap-5'>
                  <section className='rounded-[24px] border border-slate-200 bg-slate-50/80 p-4'>
                    <div className='flex items-center gap-2'>
                      <SparklesIcon className='h-5 w-5 text-[#3D08BA]' />
                      <h3 className='text-sm font-semibold text-slate-950'>Certificate type</h3>
                    </div>
                    <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                      {schoolCertificateTemplates.map((template) => {
                        const active = editor.templateId === template.id;
                        return (
                          <button
                            key={template.id}
                            type='button'
                            onClick={() =>
                              setEditor((current) => ({
                                ...current,
                                templateId: template.id,
                                certificateTitle:
                                  current.certificateTitle === getTemplate(current.templateId).defaultTitle || !current.certificateTitle.trim()
                                    ? template.defaultTitle
                                    : current.certificateTitle,
                              }))
                            }
                            className={`rounded-[20px] border px-4 py-4 text-left transition ${
                              active
                                ? 'border-[#3D08BA]/30 bg-white shadow-[0_14px_34px_rgba(61,8,186,0.10)]'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`h-1.5 rounded-full bg-gradient-to-r ${templateToneClasses[template.id]}`}></div>
                            <p className='mt-3 text-sm font-semibold text-slate-950'>{template.defaultTitle}</p>
                            <p className='mt-2 text-xs leading-5 text-slate-500'>{template.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className='rounded-[24px] border border-slate-200 bg-white p-4'>
                    <h3 className='text-sm font-semibold text-slate-950'>Student details</h3>
                    <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                      <label className='grid gap-2 sm:col-span-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Pick school student record</span>
                        <select
                          value={editor.studentEmail}
                          onChange={(event) => handleStudentSelect(event.target.value)}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                        >
                          <option value=''>Select a saved student record</option>
                          {students.map((student) => (
                            <option key={`certificate-student-${student.id || student.email}`} value={student.email}>
                              {(student.name || student.email) + (student.name ? ` (${student.email})` : '')}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className='grid gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Student name</span>
                        <input
                          value={editor.studentName}
                          onChange={(event) => setEditor((current) => ({ ...current, studentName: event.target.value }))}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                          placeholder='Student full name'
                        />
                      </label>
                      <label className='grid gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Student email</span>
                        <input
                          value={editor.studentEmail}
                          onChange={(event) => setEditor((current) => ({ ...current, studentEmail: event.target.value }))}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                          placeholder='student@example.com'
                        />
                      </label>
                      <label className='grid gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Admission number</span>
                        <input
                          value={editor.admissionNumber}
                          onChange={(event) => setEditor((current) => ({ ...current, admissionNumber: event.target.value }))}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                          placeholder='Optional school admission number'
                        />
                      </label>
                      <label className='grid gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Department</span>
                        <input
                          value={editor.department}
                          onChange={(event) => setEditor((current) => ({ ...current, department: event.target.value }))}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                          placeholder='Science, Arts, Commercial...'
                        />
                      </label>
                      <label className='grid gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Class</span>
                        <input
                          value={editor.classGroup}
                          onChange={(event) => setEditor((current) => ({ ...current, classGroup: event.target.value }))}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                          placeholder='SS 3, JSS 2, Year 6...'
                        />
                      </label>
                    </div>
                  </section>

                  <section className='rounded-[24px] border border-slate-200 bg-white p-4'>
                    <h3 className='text-sm font-semibold text-slate-950'>Certificate wording</h3>
                    <div className='mt-4 grid gap-4'>
                      <label className='grid gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Certificate title</span>
                        <input
                          value={editor.certificateTitle}
                          onChange={(event) => setEditor((current) => ({ ...current, certificateTitle: event.target.value }))}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                          placeholder='Certificate title'
                        />
                      </label>
                      <label className='grid gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Course / programme</span>
                        <input
                          value={editor.programName}
                          onChange={(event) => setEditor((current) => ({ ...current, programName: event.target.value }))}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                          placeholder='For example: WAEC prep programme, Introductory coding bootcamp'
                        />
                      </label>
                      <label className='grid gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Achievement statement</span>
                        <textarea
                          value={editor.achievement}
                          onChange={(event) => setEditor((current) => ({ ...current, achievement: event.target.value }))}
                          rows={4}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                          placeholder='Describe what the student achieved or completed.'
                        />
                      </label>
                      <label className='grid gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Internal note</span>
                        <textarea
                          value={editor.notes}
                          onChange={(event) => setEditor((current) => ({ ...current, notes: event.target.value }))}
                          rows={3}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                          placeholder='Optional note for school record or certificate footer.'
                        />
                      </label>
                    </div>
                  </section>

                  <section className='rounded-[24px] border border-slate-200 bg-white p-4'>
                    <h3 className='text-sm font-semibold text-slate-950'>Issue details</h3>
                    <div className='mt-4 grid gap-4 sm:grid-cols-3'>
                      <label className='grid gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Issue date</span>
                        <input
                          type='date'
                          value={editor.issueDate}
                          onChange={(event) => setEditor((current) => ({ ...current, issueDate: event.target.value }))}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                        />
                      </label>
                      <label className='grid gap-2 sm:col-span-2'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Signatory name</span>
                        <input
                          value={editor.signatoryName}
                          onChange={(event) => setEditor((current) => ({ ...current, signatoryName: event.target.value }))}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                          placeholder='School admin or principal name'
                        />
                      </label>
                      <label className='grid gap-2 sm:col-span-3'>
                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Signatory role</span>
                        <input
                          value={editor.signatoryRole}
                          onChange={(event) => setEditor((current) => ({ ...current, signatoryRole: event.target.value }))}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10'
                          placeholder='Principal, School Admin, Director of Studies...'
                        />
                      </label>
                    </div>
                  </section>
                </div>
              </div>

              <aside className='border-t border-slate-100 bg-slate-50/80 px-5 py-5 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0 sm:px-6'>
                <div className='rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]'>
                  <div className={`h-2 rounded-full bg-gradient-to-r ${templateToneClasses[editor.templateId]}`}></div>
                  <p className='mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500'>Certificate preview</p>
                  <h3 className='mt-3 text-center text-2xl font-semibold text-[#3D08BA]'>
                    {editor.certificateTitle || editorTemplate.defaultTitle}
                  </h3>
                  <p className='mt-6 text-center text-sm text-slate-500'>This is to certify that</p>
                  <p className='mt-3 text-center text-3xl font-semibold tracking-tight text-slate-950'>
                    {editor.studentName || 'Student name'}
                  </p>
                  <p className='mt-5 text-center text-sm leading-6 text-slate-600'>
                    {editor.achievement || editor.programName || editorTemplate.description}
                  </p>
                  <div className='mt-6 grid gap-3'>
                    <div className='rounded-2xl bg-slate-50 p-4'>
                      <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Class lane</p>
                      <p className='mt-2 text-sm font-semibold text-slate-900'>
                        {[editor.department, editor.classGroup].filter(Boolean).join(' • ') || 'Department • Class'}
                      </p>
                    </div>
                    <div className='rounded-2xl bg-slate-50 p-4'>
                      <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Signatory</p>
                      <p className='mt-2 text-sm font-semibold text-slate-900'>
                        {editor.signatoryName || 'School signatory'}
                      </p>
                      <p className='mt-1 text-xs text-slate-500'>{editor.signatoryRole || 'Role not added'}</p>
                    </div>
                    <div className='rounded-2xl bg-slate-50 p-4'>
                      <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>Issue date</p>
                      <p className='mt-2 text-sm font-semibold text-slate-900'>{formatDate(editor.issueDate)}</p>
                    </div>
                  </div>
                </div>
                <div className='mt-4 rounded-[24px] border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-[0_16px_40px_rgba(15,23,42,0.05)]'>
                  <p className='font-semibold text-slate-900'>Good certificate practice</p>
                  <ul className='mt-3 space-y-2 text-sm text-slate-600'>
                    <li>Use the exact student name used in school records.</li>
                    <li>Add class and admission number when the certificate will be filed offline.</li>
                    <li>Keep the achievement statement short and official.</li>
                  </ul>
                </div>
              </aside>
            </div>

            <div className='flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6'>
              <p className='text-sm text-slate-500'>Saving will update the school certificate record immediately.</p>
              <div className='flex flex-wrap items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setEditorOpen(false)}
                  className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className='inline-flex items-center gap-2 rounded-full bg-[#3D08BA] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(61,8,186,0.28)] transition hover:bg-[#2f068e] disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <CheckCircleIcon className='h-4 w-4' />
                  {saving ? 'Saving...' : editorMode === 'edit' ? 'Save changes' : 'Issue certificate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolCertificates;
