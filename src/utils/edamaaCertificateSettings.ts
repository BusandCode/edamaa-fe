export type EdamaaCertificateSignatorySettings = {
  issuerName: string;
  issuerInitials: string;
  issuerLogoDataUrl: string;
  signatoryName: string;
  signatoryTitle: string;
  signatureDataUrl: string;
};

const STORAGE_KEY = 'edamaa_certificate_signatory_v1';

const DEFAULT_SETTINGS: EdamaaCertificateSignatorySettings = {
  issuerName: 'Edamaa3D',
  issuerInitials: 'E3',
  issuerLogoDataUrl: '',
  signatoryName: 'Sobowale Olamide G.',
  signatoryTitle: 'President, Edamaa3D',
  signatureDataUrl: '',
};

const normalizeText = (value: unknown) => String(value || '').trim();

const normalizeDataUrl = (value: unknown) => {
  const normalized = normalizeText(value);
  return /^data:image\//.test(normalized) ? normalized : '';
};

export const loadEdamaaCertificateSignatorySettings = (): EdamaaCertificateSignatorySettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(rawValue) as Partial<EdamaaCertificateSignatorySettings> | null;
    return {
      issuerName: normalizeText(parsed?.issuerName) || DEFAULT_SETTINGS.issuerName,
      issuerInitials: normalizeText(parsed?.issuerInitials) || DEFAULT_SETTINGS.issuerInitials,
      issuerLogoDataUrl: normalizeDataUrl(parsed?.issuerLogoDataUrl),
      signatoryName: normalizeText(parsed?.signatoryName) || DEFAULT_SETTINGS.signatoryName,
      signatoryTitle: normalizeText(parsed?.signatoryTitle) || DEFAULT_SETTINGS.signatoryTitle,
      signatureDataUrl: normalizeDataUrl(parsed?.signatureDataUrl),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const persistEdamaaCertificateSignatorySettings = (
  input: Partial<EdamaaCertificateSignatorySettings>
) => {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  const current = loadEdamaaCertificateSignatorySettings();
  const nextSettings: EdamaaCertificateSignatorySettings = {
    issuerName: normalizeText(input.issuerName) || current.issuerName,
    issuerInitials: normalizeText(input.issuerInitials) || current.issuerInitials,
    issuerLogoDataUrl:
      normalizeDataUrl(input.issuerLogoDataUrl) || current.issuerLogoDataUrl,
    signatoryName: normalizeText(input.signatoryName) || current.signatoryName,
    signatoryTitle: normalizeText(input.signatoryTitle) || current.signatoryTitle,
    signatureDataUrl: normalizeDataUrl(input.signatureDataUrl) || current.signatureDataUrl,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
  return nextSettings;
};

export const edamaaCertificateSignatoryDefaults = DEFAULT_SETTINGS;
