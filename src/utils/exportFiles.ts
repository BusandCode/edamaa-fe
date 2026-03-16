import { loadSchoolBrandingNames, loadSchoolProfileImage } from './schoolBranding';

type PdfDocumentLike = {
  getBlob: () => Promise<Blob>;
};

type PdfMakeLike = {
  createPdf: (docDefinition: Record<string, unknown>) => PdfDocumentLike;
  addFontContainer?: (container: { vfs: Record<string, unknown>; fonts: Record<string, unknown> }) => void;
};

export const csvEscape = (value: string | number) => {
  const rawValue = String(value);
  if (/[",\n]/.test(rawValue)) {
    return `"${rawValue.replaceAll('"', '""')}"`;
  }
  return rawValue;
};

export const joinCsvRow = (values: Array<string | number>) => values.map(csvEscape).join(',');

export const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const readLocalStorageValue = (key: string) => {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return (window.localStorage.getItem(key) || '').trim();
  } catch {
    return '';
  }
};

const deriveInitials = (value: string) => {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return initials || 'SC';
};

export type SchoolBrandingDetails = {
  schoolName: string;
  adminName: string;
  initials: string;
  logoDataUrl: string;
};

export const loadSchoolBrandingDetails = (
  overrides?: Partial<Pick<SchoolBrandingDetails, 'schoolName' | 'adminName'>>
): SchoolBrandingDetails => {
  const storedBranding = loadSchoolBrandingNames();
  const storedSchoolName = storedBranding.schoolName || readLocalStorageValue('edamaa_school_display_name');
  const storedAdminName = storedBranding.adminName || readLocalStorageValue('edamaa_school_admin_name');
  const schoolName = overrides?.schoolName?.trim() || storedSchoolName || 'School';
  const adminName = overrides?.adminName?.trim() || storedAdminName || 'School Admin';
  const logoDataUrl = loadSchoolProfileImage();

  return {
    schoolName,
    adminName,
    initials: deriveInitials(schoolName),
    logoDataUrl: /^data:image\//.test(logoDataUrl) ? logoDataUrl : '',
  };
};

type SchoolReportFrameOptions = {
  title: string;
  subtitle?: string;
  metaLines?: string[];
  documentLabel?: string;
  documentCode?: string;
  generatedAt?: string;
  accentColor?: string;
  schoolName?: string;
  adminName?: string;
  leftSignatoryRole?: string;
  rightSignatoryRole?: string;
};

export const schoolReportStyles = {
  reportBrand: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 0, 0, 2] },
  reportEyebrow: { fontSize: 9, bold: true, color: '#475569', margin: [0, 0, 0, 4] },
  signatoryLabel: { fontSize: 9, bold: true, color: '#64748b', margin: [0, 0, 0, 8] },
  signatoryName: { fontSize: 12, bold: true, color: '#0f172a', margin: [0, 0, 0, 16] },
  mutedSmall: { fontSize: 9, color: '#64748b', margin: [0, 6, 0, 0] },
} satisfies Record<string, Record<string, unknown>>;

export const buildSchoolReportFrame = ({
  title,
  subtitle,
  metaLines = [],
  documentLabel = 'Official school report',
  documentCode,
  generatedAt,
  accentColor = '#3D08BA',
  schoolName,
  adminName,
  leftSignatoryRole = 'Prepared by',
  rightSignatoryRole = 'For school records',
}: SchoolReportFrameOptions) => {
  const branding = loadSchoolBrandingDetails({ schoolName, adminName });
  const generatedLabel = generatedAt || new Date().toLocaleString();
  const logoBlock: Record<string, unknown> = branding.logoDataUrl
    ? {
        image: branding.logoDataUrl,
        fit: [44, 44],
        alignment: 'center',
        margin: [0, 2, 0, 2],
      }
    : {
        table: {
          widths: [44],
          body: [
            [
              {
                text: branding.initials,
                alignment: 'center',
                color: '#ffffff',
                bold: true,
                fillColor: accentColor,
                fontSize: 18,
                margin: [0, 12, 0, 12],
              },
            ],
          ],
        },
        layout: 'noBorders',
      };
  const headerContent = [
    {
      columns: [
        {
          width: 56,
          stack: [logoBlock],
        },
        {
          width: '*',
          stack: [
            { text: branding.schoolName, style: 'reportBrand' },
            { text: documentLabel, style: 'reportEyebrow' },
            { text: title, style: 'header' },
            ...(subtitle ? [{ text: subtitle, style: 'subheader' }] : []),
            ...(documentCode ? [{ text: `Document code: ${documentCode}`, style: 'muted' }] : []),
            ...metaLines.map((line) => ({ text: line, style: 'muted' })),
            { text: `Generated: ${generatedLabel}`, style: 'muted' },
          ],
        },
      ],
      columnGap: 14,
      margin: [0, 0, 0, 12],
    },
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 536,
          y2: 0,
          lineColor: '#dbe4f0',
          lineWidth: 1,
        },
      ],
      margin: [0, 0, 0, 12],
    },
  ] as Array<Record<string, unknown>>;

  const signOffContent = [
    { text: 'Sign-off', style: 'sectionHeader' },
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: leftSignatoryRole, style: 'signatoryLabel' },
            { text: branding.adminName, style: 'signatoryName' },
            {
              canvas: [
                {
                  type: 'line',
                  x1: 0,
                  y1: 0,
                  x2: 180,
                  y2: 0,
                  lineColor: '#94a3b8',
                  lineWidth: 0.8,
                },
              ],
            },
            { text: 'School admin / exam officer', style: 'mutedSmall' },
          ],
        },
        {
          width: '*',
          stack: [
            { text: rightSignatoryRole, style: 'signatoryLabel' },
            { text: branding.schoolName, style: 'signatoryName' },
            {
              canvas: [
                {
                  type: 'line',
                  x1: 0,
                  y1: 0,
                  x2: 180,
                  y2: 0,
                  lineColor: '#94a3b8',
                  lineWidth: 0.8,
                },
              ],
            },
            { text: 'Generated through Edamaa reporting', style: 'mutedSmall' },
          ],
        },
      ],
      columnGap: 24,
      margin: [0, 6, 0, 0],
    },
  ] as Array<Record<string, unknown>>;

  const footer = (currentPage: number, pageCount: number) => ({
    margin: [28, 8, 28, 12],
    columns: [
      {
        text: `${branding.schoolName} • ${documentLabel}`,
        color: '#64748b',
        fontSize: 9,
      },
      {
        text: `Page ${currentPage} of ${pageCount}`,
        alignment: 'right',
        color: '#64748b',
        fontSize: 9,
      },
    ],
  });

  return {
    branding,
    headerContent,
    signOffContent,
    footer,
  };
};

const resolvePdfMake = (pdfMakeModule: unknown): PdfMakeLike => {
  return (pdfMakeModule as { default?: PdfMakeLike }).default || (pdfMakeModule as PdfMakeLike);
};

const resolveFontContainer = (fontModule: unknown) => {
  const resolved =
    (fontModule as { default?: { vfs: Record<string, unknown>; fonts: Record<string, unknown> } }).default ||
    (fontModule as { vfs: Record<string, unknown>; fonts: Record<string, unknown> });
  return resolved;
};

export const createPdfBlob = async (docDefinition: Record<string, unknown>) => {
  const [pdfMakeModule, helveticaModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/standard-fonts/Helvetica'),
  ]);
  const pdfMake = resolvePdfMake(pdfMakeModule);
  const fontContainer = resolveFontContainer(helveticaModule);
  pdfMake.addFontContainer?.(fontContainer);
  const normalizedDocDefinition = {
    ...docDefinition,
    defaultStyle: {
      font: 'Helvetica',
      ...(((docDefinition as { defaultStyle?: Record<string, unknown> }).defaultStyle || {}) as Record<string, unknown>),
    },
  };
  const pdfDocument = pdfMake.createPdf(normalizedDocDefinition);
  return pdfDocument.getBlob();
};
