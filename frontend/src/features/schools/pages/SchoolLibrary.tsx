import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArchiveBoxIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../../components/layout/school-layout/NavBar';
import {
  checkoutSchoolLibraryBook,
  createSchoolLibraryBook,
  fetchSchoolLibraryOverview,
  returnSchoolLibraryLoan,
  updateSchoolLibraryBook,
  type SchoolLibraryBook,
  type SchoolLibraryLoan,
  type SchoolLibrarySummary,
} from '../utils/schoolLibraryApi';

type BookFormState = {
  title: string;
  author: string;
  category: string;
  referenceCode: string;
  totalCopies: string;
};

type LoanFormState = {
  bookId: string;
  borrowerName: string;
  borrowerRef: string;
  classGroup: string;
  borrowedAt: string;
  dueAt: string;
};

type LoanFilter = 'all' | SchoolLibraryLoan['status'];

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

const toDateInputValue = (value: Date) => value.toISOString().slice(0, 10);

const createBookForm = (): BookFormState => ({
  title: '',
  author: '',
  category: '',
  referenceCode: '',
  totalCopies: '1',
});

const createLoanForm = (bookId = ''): LoanFormState => {
  const borrowedAt = new Date();
  const dueAt = new Date(borrowedAt);
  dueAt.setDate(dueAt.getDate() + 7);

  return {
    bookId,
    borrowerName: '',
    borrowerRef: '',
    classGroup: '',
    borrowedAt: toDateInputValue(borrowedAt),
    dueAt: toDateInputValue(dueAt),
  };
};

const scrollToSection = (sectionId: string) => {
  if (typeof document === 'undefined') {
    return;
  }
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
};

const summaryCards: {
  key: keyof SchoolLibrarySummary;
  label: string;
  description: string;
  accentClassName: string;
  icon: typeof BookOpenIcon;
}[] = [
  {
    key: 'totalTitles',
    label: 'Titles tracked',
    description: 'Unique books on your shelves',
    accentClassName: 'bg-[#3D08BA]/10 text-[#3D08BA]',
    icon: BookOpenIcon,
  },
  {
    key: 'totalCopies',
    label: 'Copies logged',
    description: 'All registered copies in stock',
    accentClassName: 'bg-sky-100 text-sky-700',
    icon: ArchiveBoxIcon,
  },
  {
    key: 'availableCopies',
    label: 'Ready to lend',
    description: 'Copies that can go out now',
    accentClassName: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircleIcon,
  },
  {
    key: 'borrowedCount',
    label: 'Currently on loan',
    description: 'Copies with active borrowers',
    accentClassName: 'bg-amber-100 text-amber-700',
    icon: ClockIcon,
  },
  {
    key: 'overdueCount',
    label: 'Need follow-up',
    description: 'Loans past their due date',
    accentClassName: 'bg-rose-100 text-rose-700',
    icon: ExclamationTriangleIcon,
  },
];

const getLoanStatusClassName = (status: SchoolLibraryLoan['status']) => {
  switch (status) {
    case 'returned':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'overdue':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
};

const getBorrowingPressureClassName = (book: SchoolLibraryBook) => {
  if (book.totalCopies <= 0) {
    return 'bg-gray-200';
  }
  const ratio = book.borrowedCopies / book.totalCopies;
  if (ratio >= 0.8) {
    return 'bg-rose-500';
  }
  if (ratio >= 0.45) {
    return 'bg-amber-500';
  }
  return 'bg-emerald-500';
};

const matchesSearch = (value: string, searchTerm: string) =>
  value.toLowerCase().includes(searchTerm.toLowerCase().trim());

const SchoolLibrary = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SchoolLibrarySummary>({
    totalTitles: 0,
    totalCopies: 0,
    availableCopies: 0,
    borrowedCount: 0,
    overdueCount: 0,
    returnedCount: 0,
  });
  const [books, setBooks] = useState<SchoolLibraryBook[]>([]);
  const [loans, setLoans] = useState<SchoolLibraryLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [bookForm, setBookForm] = useState<BookFormState>(createBookForm());
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState<LoanFormState>(createLoanForm());
  const [savingBook, setSavingBook] = useState(false);
  const [savingLoan, setSavingLoan] = useState(false);
  const [activeLoanActionId, setActiveLoanActionId] = useState<string | null>(null);
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [loanQuery, setLoanQuery] = useState('');
  const [loanFilter, setLoanFilter] = useState<LoanFilter>('all');

  const loadOverview = async (nextNotice?: string) => {
    setLoading(true);
    try {
      const payload = await fetchSchoolLibraryOverview();
      setSummary(payload.summary);
      setBooks(Array.isArray(payload.books) ? payload.books : []);
      setLoans(Array.isArray(payload.loans) ? payload.loans : []);
      setNotice(nextNotice || '');
    } catch (error) {
      setSummary({
        totalTitles: 0,
        totalCopies: 0,
        availableCopies: 0,
        borrowedCount: 0,
        overdueCount: 0,
        returnedCount: 0,
      });
      setBooks([]);
      setLoans([]);
      setNotice(error instanceof Error ? error.message : 'Could not load library records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const availableBooks = useMemo(
    () => books.filter((book) => book.availableCopies > 0),
    [books]
  );

  useEffect(() => {
    if (availableBooks.length === 0) {
      setLoanForm((current) => ({ ...current, bookId: '' }));
      return;
    }

    const selectedStillAvailable = availableBooks.some((book) => book.id === loanForm.bookId);
    if (!selectedStillAvailable) {
      setLoanForm((current) => ({
        ...current,
        bookId: availableBooks[0]?.id || '',
      }));
    }
  }, [availableBooks, loanForm.bookId]);

  const activeLoans = useMemo(
    () => loans.filter((loan) => loan.status !== 'returned'),
    [loans]
  );

  const recentReturns = useMemo(
    () => loans.filter((loan) => loan.status === 'returned').slice(0, 4),
    [loans]
  );

  const filteredBooks = useMemo(() => {
    const searchTerm = inventoryQuery.trim().toLowerCase();
    if (!searchTerm) {
      return books;
    }
    return books.filter((book) =>
      [book.title, book.author, book.category, book.referenceCode || ''].some((value) =>
        matchesSearch(value, searchTerm)
      )
    );
  }, [books, inventoryQuery]);

  const filteredLoans = useMemo(() => {
    const searchTerm = loanQuery.trim().toLowerCase();
    return loans.filter((loan) => {
      if (loanFilter !== 'all' && loan.status !== loanFilter) {
        return false;
      }
      if (!searchTerm) {
        return true;
      }
      return [loan.borrowerName, loan.bookTitle, loan.borrowerRef || '', loan.classGroup || ''].some(
        (value) => matchesSearch(value, searchTerm)
      );
    });
  }, [loans, loanFilter, loanQuery]);

  const handleRefresh = async () => {
    await loadOverview('Library records refreshed.');
  };

  const resetBookForm = () => {
    setEditingBookId(null);
    setBookForm(createBookForm());
  };

  const handleBookSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingBook) {
      return;
    }

    setSavingBook(true);
    setNotice('');
    try {
      const payload = {
        title: bookForm.title.trim(),
        author: bookForm.author.trim(),
        category: bookForm.category.trim(),
        referenceCode: bookForm.referenceCode.trim(),
        totalCopies: Math.max(1, Number(bookForm.totalCopies) || 1),
      };

      if (editingBookId) {
        await updateSchoolLibraryBook(editingBookId, payload);
        resetBookForm();
        await loadOverview('Book record updated.');
      } else {
        await createSchoolLibraryBook(payload);
        resetBookForm();
        await loadOverview('Book added to the library.');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save this book.');
    } finally {
      setSavingBook(false);
    }
  };

  const handleEditBook = (book: SchoolLibraryBook) => {
    setEditingBookId(book.id);
    setBookForm({
      title: book.title,
      author: book.author,
      category: book.category,
      referenceCode: book.referenceCode || '',
      totalCopies: String(book.totalCopies),
    });
    setNotice(`Editing ${book.title}.`);
    scrollToSection('register-book-section');
  };

  const handleLoanSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingLoan) {
      return;
    }

    const borrowedTimestamp = new Date(loanForm.borrowedAt).getTime();
    const dueTimestamp = new Date(loanForm.dueAt).getTime();
    if (!Number.isFinite(borrowedTimestamp) || !Number.isFinite(dueTimestamp)) {
      setNotice('Borrow date and due date must be valid.');
      return;
    }
    if (dueTimestamp <= borrowedTimestamp) {
      setNotice('Due date must be after the borrow date.');
      return;
    }

    setSavingLoan(true);
    setNotice('');
    try {
      await checkoutSchoolLibraryBook({
        bookId: loanForm.bookId,
        borrowerName: loanForm.borrowerName.trim(),
        borrowerRef: loanForm.borrowerRef.trim(),
        classGroup: loanForm.classGroup.trim(),
        borrowedAt: loanForm.borrowedAt,
        dueAt: loanForm.dueAt,
      });
      setLoanForm(createLoanForm(loanForm.bookId));
      await loadOverview('Book checked out successfully.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not complete the check-out.');
    } finally {
      setSavingLoan(false);
    }
  };

  const handleReturnLoan = async (loanId: string) => {
    if (activeLoanActionId) {
      return;
    }

    setActiveLoanActionId(loanId);
    setNotice('');
    try {
      await returnSchoolLibraryLoan(loanId);
      await loadOverview('Book return recorded.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark this book as returned.');
    } finally {
      setActiveLoanActionId(null);
    }
  };

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.10),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#f4f7ff_48%,_#f8fafc_100%)] pb-24'>
      <main className='mx-auto max-w-7xl px-4 py-6'>
        <section className='relative overflow-hidden rounded-[32px] border border-[#d8e1ff] bg-white px-5 py-6 shadow-[0_24px_80px_rgba(61,8,186,0.10)]'>
          <div className='pointer-events-none absolute -right-16 top-0 h-52 w-52 rounded-full bg-[#3D08BA]/10 blur-3xl' />
          <div className='pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl' />

          <div className='relative flex flex-col gap-5'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
              <div className='flex items-start gap-3'>
                <button
                  type='button'
                  onClick={() => navigate('/school-dashboard')}
                  className='inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50'
                  aria-label='Back to school dashboard'
                  title='Back to school dashboard'
                >
                  <ArrowLeftIcon className='h-5 w-5' />
                </button>

                <div>
                  <div className='inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3D08BA]'>
                    <BookOpenIcon className='h-4 w-4' />
                    School Library
                  </div>
                  <h1 className='mt-3 max-w-3xl text-3xl font-bold tracking-tight text-gray-950'>
                    Keep borrowing, due dates, and returns easy to manage
                  </h1>
                  <p className='mt-3 max-w-3xl text-sm leading-6 text-gray-600'>
                    This page is built for day-to-day school library work: register books, lend
                    them out quickly, and follow up before copies disappear.
                  </p>
                </div>
              </div>

              <div className='flex flex-wrap items-center gap-3'>
                <button
                  type='button'
                  onClick={() => scrollToSection('register-book-section')}
                  className='inline-flex items-center gap-2 rounded-2xl bg-[#3D08BA] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2c0691]'
                >
                  <PlusIcon className='h-4 w-4' />
                  Register books
                </button>
                <button
                  type='button'
                  onClick={() => scrollToSection('checkout-book-section')}
                  className='inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50'
                >
                  <BookOpenIcon className='h-4 w-4' />
                  Check out books
                </button>
                <button
                  type='button'
                  onClick={() => void handleRefresh()}
                  className='inline-flex items-center gap-2 rounded-2xl border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-4 py-2.5 text-sm font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                >
                  <ArrowPathIcon className='h-4 w-4' />
                  Refresh
                </button>
              </div>
            </div>

            <div className='grid gap-3 md:grid-cols-3'>
              <div className='rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur'>
                <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                  Lending focus
                </p>
                <p className='mt-2 text-base font-semibold text-gray-900'>
                  {summary.availableCopies} copies are ready to leave the shelf
                </p>
                <p className='mt-1 text-sm text-gray-600'>
                  Use the right-side form to assign them without losing track.
                </p>
              </div>
              <div className='rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur'>
                <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                  Follow-up
                </p>
                <p className='mt-2 text-base font-semibold text-gray-900'>
                  {summary.overdueCount} loans need attention
                </p>
                <p className='mt-1 text-sm text-gray-600'>
                  Overdue loans stay visible until they are marked as returned.
                </p>
              </div>
              <div className='rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur'>
                <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                  Current activity
                </p>
                <p className='mt-2 text-base font-semibold text-gray-900'>
                  {activeLoans.length} active borrowers, {summary.returnedCount} returns logged
                </p>
                <p className='mt-1 text-sm text-gray-600'>
                  Everything stays in one place instead of scattered paper records.
                </p>
              </div>
            </div>
          </div>
        </section>

        {notice && (
          <div className='mt-4 rounded-2xl border border-blue-200 bg-blue-50/90 px-4 py-3 text-sm text-blue-700 shadow-sm'>
            {notice}
          </div>
        )}

        <section className='mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                className='rounded-[26px] border border-gray-200/80 bg-white/95 p-4 shadow-sm backdrop-blur'
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${card.accentClassName}`}
                >
                  <Icon className='h-5 w-5' />
                </div>
                <p className='mt-4 text-2xl font-bold text-gray-950'>
                  {loading ? '--' : summary[card.key]}
                </p>
                <p className='mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500'>
                  {card.label}
                </p>
                <p className='mt-2 text-sm leading-5 text-gray-600'>{card.description}</p>
              </div>
            );
          })}
        </section>

        <section className='mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_390px]'>
          <div className='space-y-6'>
            <div
              id='inventory-section'
              className='rounded-[28px] border border-gray-200/80 bg-white/95 p-5 shadow-sm backdrop-blur'
            >
              <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
                <div>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]'>
                    Inventory
                  </p>
                  <h2 className='mt-1 text-xl font-semibold text-gray-950'>
                    Scan the shelf at a glance
                  </h2>
                  <p className='mt-1 text-sm text-gray-600'>
                    Search titles, watch copy pressure, and jump into edits without leaving the page.
                  </p>
                </div>

                <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                  <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700'>
                    <CheckCircleIcon className='h-4 w-4' />
                    {summary.availableCopies} copies ready to lend
                  </div>
                  <div className='relative min-w-[250px]'>
                    <MagnifyingGlassIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                    <input
                      value={inventoryQuery}
                      onChange={(event) => setInventoryQuery(event.target.value)}
                      placeholder='Search by title, author, category, or code'
                      className='w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                    />
                  </div>
                </div>
              </div>

              <div className='mt-5 space-y-4'>
                {filteredBooks.length === 0 ? (
                  <div className='rounded-3xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-10 text-center'>
                    <BookOpenIcon className='mx-auto h-10 w-10 text-gray-300' />
                    <p className='mt-3 text-base font-semibold text-gray-900'>
                      {books.length === 0 ? 'No books registered yet' : 'No books match this search'}
                    </p>
                    <p className='mt-2 text-sm text-gray-600'>
                      {books.length === 0
                        ? 'Use the register panel to add the first title to your library.'
                        : 'Try a shorter search or clear the filter to see the full inventory.'}
                    </p>
                  </div>
                ) : (
                  filteredBooks.map((book) => {
                    const borrowingRatio =
                      book.totalCopies > 0 ? (book.borrowedCopies / book.totalCopies) * 100 : 0;
                    return (
                      <article
                        key={book.id}
                        className='rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md'
                      >
                        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                          <div className='min-w-0'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <h3 className='text-base font-semibold text-gray-950'>{book.title}</h3>
                              <span className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600'>
                                {book.category}
                              </span>
                              {book.referenceCode && (
                                <span className='rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700'>
                                  {book.referenceCode}
                                </span>
                              )}
                            </div>
                            <p className='mt-2 text-sm text-gray-600'>{book.author}</p>
                          </div>

                          <button
                            type='button'
                            onClick={() => handleEditBook(book)}
                            className='inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50'
                          >
                            <PencilSquareIcon className='h-4 w-4' />
                            Edit book
                          </button>
                        </div>

                        <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                          <div className='rounded-2xl bg-gray-50 p-3'>
                            <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                              Available now
                            </p>
                            <p className='mt-1 text-lg font-semibold text-gray-950'>
                              {book.availableCopies}
                            </p>
                          </div>
                          <div className='rounded-2xl bg-gray-50 p-3'>
                            <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                              Currently borrowed
                            </p>
                            <p className='mt-1 text-lg font-semibold text-gray-950'>
                              {book.borrowedCopies}
                            </p>
                          </div>
                          <div className='rounded-2xl bg-gray-50 p-3'>
                            <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                              Total copies
                            </p>
                            <p className='mt-1 text-lg font-semibold text-gray-950'>
                              {book.totalCopies}
                            </p>
                          </div>
                        </div>

                        <div className='mt-4'>
                          <div className='flex items-center justify-between text-xs font-medium text-gray-500'>
                            <span>Borrowing pressure</span>
                            <span>{Math.round(borrowingRatio)}%</span>
                          </div>
                          <div className='mt-2 h-2 overflow-hidden rounded-full bg-gray-100'>
                            <div
                              className={`h-full rounded-full ${getBorrowingPressureClassName(book)}`}
                              style={{ width: `${Math.max(6, Math.min(100, borrowingRatio || 0))}%` }}
                            />
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>

            <div className='rounded-[28px] border border-gray-200/80 bg-white/95 p-5 shadow-sm backdrop-blur'>
              <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
                <div>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]'>
                    Borrowing activity
                  </p>
                  <h2 className='mt-1 text-xl font-semibold text-gray-950'>
                    Follow active borrowers before books disappear
                  </h2>
                  <p className='mt-1 text-sm text-gray-600'>
                    Filter by status and search borrowers or titles from one stream.
                  </p>
                </div>

                <div className='relative min-w-[250px]'>
                  <MagnifyingGlassIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                  <input
                    value={loanQuery}
                    onChange={(event) => setLoanQuery(event.target.value)}
                    placeholder='Search borrower, class, or book title'
                    className='w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                  />
                </div>
              </div>

              <div className='mt-4 flex flex-wrap gap-2'>
                {(['all', 'borrowed', 'overdue', 'returned'] as LoanFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type='button'
                    onClick={() => setLoanFilter(filter)}
                    className={`rounded-full px-3.5 py-2 text-xs font-semibold capitalize transition-colors ${
                      loanFilter === filter
                        ? 'bg-[#3D08BA] text-white'
                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {filter === 'all' ? 'All activity' : filter}
                  </button>
                ))}
              </div>

              <div className='mt-5 space-y-3'>
                {filteredLoans.length === 0 ? (
                  <div className='rounded-3xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-10 text-center'>
                    <ClockIcon className='mx-auto h-10 w-10 text-gray-300' />
                    <p className='mt-3 text-base font-semibold text-gray-900'>
                      {loans.length === 0 ? 'No borrowing activity yet' : 'No loans match this filter'}
                    </p>
                    <p className='mt-2 text-sm text-gray-600'>
                      {loans.length === 0
                        ? 'Once books are checked out, the borrowing timeline will appear here.'
                        : 'Clear the search or switch filters to see other loan records.'}
                    </p>
                  </div>
                ) : (
                  filteredLoans.map((loan) => (
                    <article
                      key={loan.id}
                      className='rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md'
                    >
                      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                        <div className='min-w-0'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <h3 className='text-base font-semibold text-gray-950'>{loan.borrowerName}</h3>
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${getLoanStatusClassName(loan.status)}`}
                            >
                              {loan.status}
                            </span>
                          </div>
                          <p className='mt-2 text-sm text-gray-700'>{loan.bookTitle}</p>
                          <p className='mt-1 text-xs text-gray-500'>
                            {[loan.borrowerRef, loan.classGroup].filter(Boolean).join(' • ') || 'No extra borrower details'}
                          </p>
                        </div>

                        {loan.status === 'returned' ? (
                          <div className='rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700'>
                            Returned {formatDate(loan.returnedAt)}
                          </div>
                        ) : (
                          <button
                            type='button'
                            onClick={() => void handleReturnLoan(loan.id)}
                            disabled={activeLoanActionId === loan.id}
                            className='inline-flex shrink-0 items-center justify-center rounded-2xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60'
                          >
                            {activeLoanActionId === loan.id ? 'Saving...' : 'Mark returned'}
                          </button>
                        )}
                      </div>

                      <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                        <div className='rounded-2xl bg-gray-50 p-3'>
                          <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                            Borrowed on
                          </p>
                          <p className='mt-1 text-sm font-semibold text-gray-900'>
                            {formatDate(loan.borrowedAt)}
                          </p>
                        </div>
                        <div className='rounded-2xl bg-gray-50 p-3'>
                          <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                            Due back
                          </p>
                          <p className='mt-1 text-sm font-semibold text-gray-900'>
                            {formatDate(loan.dueAt)}
                          </p>
                        </div>
                        <div className='rounded-2xl bg-gray-50 p-3'>
                          <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                            Return state
                          </p>
                          <p className='mt-1 text-sm font-semibold text-gray-900 capitalize'>
                            {loan.status}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {recentReturns.length > 0 && (
                <div className='mt-5 rounded-3xl border border-gray-200 bg-gray-50 p-4'>
                  <h3 className='text-sm font-semibold text-gray-900'>Recent returns</h3>
                  <div className='mt-3 flex flex-wrap gap-2'>
                    {recentReturns.map((loan) => (
                      <span
                        key={loan.id}
                        className='rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600'
                      >
                        {loan.bookTitle} returned by {loan.borrowerName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='space-y-6 xl:sticky xl:top-24 xl:self-start'>
            <div
              id='register-book-section'
              className='overflow-hidden rounded-[28px] border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur'
            >
              <div className='border-b border-gray-100 bg-[linear-gradient(135deg,rgba(61,8,186,0.07),rgba(14,165,233,0.06))] px-5 py-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]'>
                      {editingBookId ? 'Editing mode' : 'Register books'}
                    </p>
                    <h2 className='mt-1 text-lg font-semibold text-gray-950'>
                      {editingBookId ? 'Update this book record' : 'Add a new title to the shelf'}
                    </h2>
                    <p className='mt-1 text-sm text-gray-600'>
                      Keep copy counts and shelf references accurate from the start.
                    </p>
                  </div>
                  {editingBookId && (
                    <button
                      type='button'
                      onClick={resetBookForm}
                      className='rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50'
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </div>

              <form className='space-y-4 p-5' onSubmit={handleBookSubmit}>
                <div className='space-y-2'>
                  <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Book title
                  </label>
                  <input
                    value={bookForm.title}
                    onChange={(event) =>
                      setBookForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder='For example: New General Mathematics'
                    className='w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Author
                  </label>
                  <input
                    value={bookForm.author}
                    onChange={(event) =>
                      setBookForm((current) => ({ ...current, author: event.target.value }))
                    }
                    placeholder='Author name'
                    className='w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                    required
                  />
                </div>

                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Category
                    </label>
                    <input
                      value={bookForm.category}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, category: event.target.value }))
                      }
                      placeholder='Textbook, storybook, science...'
                      className='w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Shelf code
                    </label>
                    <input
                      value={bookForm.referenceCode}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, referenceCode: event.target.value }))
                      }
                      placeholder='Optional shelf or rack code'
                      className='w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Total copies
                  </label>
                  <input
                    type='number'
                    min='1'
                    value={bookForm.totalCopies}
                    onChange={(event) =>
                      setBookForm((current) => ({ ...current, totalCopies: event.target.value }))
                    }
                    placeholder='Total copies'
                    className='w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                    required
                  />
                </div>

                <button
                  type='submit'
                  disabled={savingBook}
                  className='inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3D08BA] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2c0691] disabled:cursor-wait disabled:opacity-60'
                >
                  <PlusIcon className='h-4 w-4' />
                  {savingBook
                    ? editingBookId
                      ? 'Saving changes...'
                      : 'Adding book...'
                    : editingBookId
                      ? 'Save book changes'
                      : 'Add book to library'}
                </button>
              </form>
            </div>

            <div
              id='checkout-book-section'
              className='overflow-hidden rounded-[28px] border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur'
            >
              <div className='border-b border-gray-100 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(16,185,129,0.07))] px-5 py-4'>
                <h2 className='text-lg font-semibold text-gray-950'>Check out a book</h2>
                <p className='mt-1 text-sm text-gray-600'>
                  Assign one available copy to a student and capture the return date immediately.
                </p>
              </div>

              <form className='space-y-4 p-5' onSubmit={handleLoanSubmit}>
                <div className='space-y-2'>
                  <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Choose a book
                  </label>
                  <select
                    value={loanForm.bookId}
                    onChange={(event) =>
                      setLoanForm((current) => ({ ...current, bookId: event.target.value }))
                    }
                    className='w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                    disabled={availableBooks.length === 0}
                    required
                  >
                    <option value=''>
                      {availableBooks.length === 0 ? 'No available books to lend' : 'Select a book'}
                    </option>
                    {availableBooks.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title} ({book.availableCopies} available)
                      </option>
                    ))}
                  </select>
                </div>

                <div className='space-y-2'>
                  <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Borrower name
                  </label>
                  <input
                    value={loanForm.borrowerName}
                    onChange={(event) =>
                      setLoanForm((current) => ({ ...current, borrowerName: event.target.value }))
                    }
                    placeholder='Student or staff name'
                    className='w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                    required
                  />
                </div>

                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Student ID or ref
                    </label>
                    <input
                      value={loanForm.borrowerRef}
                      onChange={(event) =>
                        setLoanForm((current) => ({ ...current, borrowerRef: event.target.value }))
                      }
                      placeholder='Optional reference'
                      className='w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Class group
                    </label>
                    <input
                      value={loanForm.classGroup}
                      onChange={(event) =>
                        setLoanForm((current) => ({ ...current, classGroup: event.target.value }))
                      }
                      placeholder='For example: JSS2 Gold'
                      className='w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                    />
                  </div>
                </div>

                <div className='grid gap-4 sm:grid-cols-2'>
                  <label className='block text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Borrow date
                    <input
                      type='date'
                      value={loanForm.borrowedAt}
                      onChange={(event) =>
                        setLoanForm((current) => ({ ...current, borrowedAt: event.target.value }))
                      }
                      className='mt-2 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm font-normal text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                      required
                    />
                  </label>
                  <label className='block text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Due date
                    <input
                      type='date'
                      value={loanForm.dueAt}
                      onChange={(event) =>
                        setLoanForm((current) => ({ ...current, dueAt: event.target.value }))
                      }
                      className='mt-2 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm font-normal text-gray-900 outline-none focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10'
                      required
                    />
                  </label>
                </div>

                <button
                  type='submit'
                  disabled={savingLoan || availableBooks.length === 0}
                  className='inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <BookOpenIcon className='h-4 w-4' />
                  {savingLoan ? 'Recording check-out...' : 'Check out book'}
                </button>
              </form>

              <div className='border-t border-gray-100 bg-gray-50/80 px-5 py-4 text-sm text-gray-600'>
                <p className='font-semibold text-gray-900'>Loan snapshot</p>
                <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                  <div className='rounded-2xl bg-white px-3 py-3 shadow-sm'>
                    <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                      Active loans
                    </p>
                    <p className='mt-1 text-base font-semibold text-gray-950'>{activeLoans.length}</p>
                  </div>
                  <div className='rounded-2xl bg-white px-3 py-3 shadow-sm'>
                    <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                      Returns logged
                    </p>
                    <p className='mt-1 text-base font-semibold text-gray-950'>{summary.returnedCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <NavBar />
    </div>
  );
};

export default SchoolLibrary;
