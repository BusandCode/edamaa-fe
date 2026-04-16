import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

export type SchoolLibrarySummary = {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCount: number;
  overdueCount: number;
  returnedCount: number;
};

export type SchoolLibraryBook = {
  id: string;
  title: string;
  author: string;
  category: string;
  referenceCode?: string | null;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  createdAt: string;
  updatedAt: string;
};

export type SchoolLibraryLoan = {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerName: string;
  borrowerRef?: string | null;
  classGroup?: string | null;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string | null;
  status: 'borrowed' | 'overdue' | 'returned';
};

export type SchoolLibraryOverview = {
  summary: SchoolLibrarySummary;
  books: SchoolLibraryBook[];
  loans: SchoolLibraryLoan[];
};

type LibraryBookPayload = {
  title: string;
  author: string;
  category: string;
  referenceCode?: string;
  totalCopies: number;
};

type LibraryLoanPayload = {
  bookId: string;
  borrowerName: string;
  borrowerRef?: string;
  classGroup?: string;
  borrowedAt?: string;
  dueAt: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const isLocalhostHost = (host: string) => host === '127.0.0.1' || host === 'localhost';

const resolveApiBaseCandidates = () => {
  const candidates = new Set<string>();
  candidates.add('/api');

  if (API_BASE_URL && API_BASE_URL !== '/api') {
    candidates.add(API_BASE_URL);
  }

  if (typeof window !== 'undefined') {
    const host = (window.location.hostname || '').trim();
    if (isLocalhostHost(host)) {
      candidates.add(`http://${host}:3001`);
    }
  }

  candidates.add('http://127.0.0.1:3001');
  candidates.add('http://localhost:3001');
  return Array.from(candidates).map((base) => base.replace(/\/+$/, ''));
};

const extractErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // fall through
  }

  try {
    const textPayload = (await response.text()).replace(/\s+/g, ' ').trim();
    if (textPayload && !/^</.test(textPayload)) {
      return textPayload;
    }
  } catch {
    // fall through
  }

  return `Request failed with status ${response.status}`;
};

const requestWithAuth = async (endpoint: string, init?: RequestInit) => {
  const token = loadPersistedSupabaseAccessToken();
  const localDevSession = loadPersistedLocalDevAuthSession();
  if (!token && !localDevSession?.email) {
    throw new Error('Sign in to continue.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (localDevSession?.email) {
    headers['x-dev-user-email'] = localDevSession.email;
    headers['x-dev-user-role'] = localDevSession.role || 'school';
  }

  const bases = resolveApiBaseCandidates();
  let networkError: Error | null = null;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${endpoint}`, {
        ...init,
        headers,
      });
      if (!response.ok) {
        const message = await extractErrorMessage(response);
        throw new Error(message);
      }
      return response;
    } catch (error) {
      networkError = error as Error;
    }
  }

  throw networkError || new Error('Failed to fetch');
};

export const fetchSchoolLibraryOverview = async (): Promise<SchoolLibraryOverview> => {
  const response = await requestWithAuth('/school-library');
  return response.json();
};

export const createSchoolLibraryBook = async (payload: LibraryBookPayload) => {
  const response = await requestWithAuth('/school-library/books', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.json() as Promise<{ book: SchoolLibraryBook }>;
};

export const updateSchoolLibraryBook = async (
  bookId: string,
  payload: Partial<LibraryBookPayload>
) => {
  const response = await requestWithAuth(`/school-library/books/${encodeURIComponent(bookId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return response.json() as Promise<{ book: SchoolLibraryBook }>;
};

export const checkoutSchoolLibraryBook = async (payload: LibraryLoanPayload) => {
  const response = await requestWithAuth('/school-library/loans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.json() as Promise<{ loan: SchoolLibraryLoan; book: SchoolLibraryBook }>;
};

export const returnSchoolLibraryLoan = async (loanId: string, returnedAt?: string) => {
  const response = await requestWithAuth(
    `/school-library/loans/${encodeURIComponent(loanId)}/return`,
    {
      method: 'POST',
      body: JSON.stringify(returnedAt ? { returnedAt } : {}),
    }
  );
  return response.json() as Promise<{ loan: SchoolLibraryLoan; returned: true }>;
};
