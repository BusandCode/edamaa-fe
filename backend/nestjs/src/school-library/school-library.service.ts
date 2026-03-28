import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';

type AuthUserContext = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  name?: string | null;
};

type LibraryBookRecord = {
  id: string;
  schoolUserId: string;
  title: string;
  author: string;
  category: string;
  referenceCode?: string | null;
  totalCopies: number;
  createdAt: string;
  updatedAt: string;
};

type LibraryLoanRecord = {
  id: string;
  schoolUserId: string;
  bookId: string;
  borrowerName: string;
  borrowerRef?: string | null;
  classGroup?: string | null;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string | null;
};

type SchoolLibraryState = {
  books: LibraryBookRecord[];
  loans: LibraryLoanRecord[];
};

@Injectable()
export class SchoolLibraryService {
  private readonly storagePath = '/tmp/edamaa-school-library.json';

  listLibraryOverview(authUser: AuthUserContext) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const state = this.loadState();
    const books = state.books
      .filter((book) => book.schoolUserId === schoolUserId)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
    const loans = state.loans
      .filter((loan) => loan.schoolUserId === schoolUserId)
      .sort((left, right) => {
        const leftTimestamp = new Date(left.returnedAt || left.borrowedAt).getTime();
        const rightTimestamp = new Date(right.returnedAt || right.borrowedAt).getTime();
        return rightTimestamp - leftTimestamp;
      });

    return {
      summary: this.buildSummary(books, loans),
      books: books.map((book) => this.buildBookResponse(book, loans)),
      loans: loans.map((loan) => this.buildLoanResponse(loan, books)),
    };
  }

  createBook(authUser: AuthUserContext, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const now = new Date().toISOString();
    const book: LibraryBookRecord = {
      id: `LIB-${randomBytes(4).toString('hex').toUpperCase()}`,
      schoolUserId,
      title: this.normalizeRequiredText(input.title, 'Book title'),
      author: this.normalizeRequiredText(input.author, 'Author'),
      category: this.normalizeRequiredText(input.category, 'Category'),
      referenceCode: this.normalizeOptionalText(input.referenceCode),
      totalCopies: this.normalizePositiveInteger(input.totalCopies, 'Total copies'),
      createdAt: now,
      updatedAt: now,
    };

    const state = this.loadState();
    state.books.unshift(book);
    this.saveState(state);

    return {
      book: this.buildBookResponse(book, state.loans.filter((loan) => loan.schoolUserId === schoolUserId)),
    };
  }

  updateBook(authUser: AuthUserContext, bookId: string, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedBookId = this.normalizeRequiredText(bookId, 'Book ID');
    const state = this.loadState();
    const bookIndex = state.books.findIndex(
      (book) => book.id === normalizedBookId && book.schoolUserId === schoolUserId
    );

    if (bookIndex === -1) {
      throw new NotFoundException('Book was not found for this school.');
    }

    const existing = state.books[bookIndex];
    const activeLoanCount = state.loans.filter(
      (loan) =>
        loan.schoolUserId === schoolUserId &&
        loan.bookId === existing.id &&
        !this.isReturned(loan)
    ).length;

    const nextTotalCopies = Object.prototype.hasOwnProperty.call(input, 'totalCopies')
      ? this.normalizePositiveInteger(input.totalCopies, 'Total copies')
      : existing.totalCopies;

    if (nextTotalCopies < activeLoanCount) {
      throw new BadRequestException(
        `Total copies cannot be lower than the ${activeLoanCount} copies currently on loan.`
      );
    }

    state.books[bookIndex] = {
      ...existing,
      title: Object.prototype.hasOwnProperty.call(input, 'title')
        ? this.normalizeRequiredText(input.title, 'Book title')
        : existing.title,
      author: Object.prototype.hasOwnProperty.call(input, 'author')
        ? this.normalizeRequiredText(input.author, 'Author')
        : existing.author,
      category: Object.prototype.hasOwnProperty.call(input, 'category')
        ? this.normalizeRequiredText(input.category, 'Category')
        : existing.category,
      referenceCode: Object.prototype.hasOwnProperty.call(input, 'referenceCode')
        ? this.normalizeOptionalText(input.referenceCode)
        : existing.referenceCode || null,
      totalCopies: nextTotalCopies,
      updatedAt: new Date().toISOString(),
    };

    this.saveState(state);
    return {
      book: this.buildBookResponse(state.books[bookIndex], state.loans),
    };
  }

  checkoutBook(authUser: AuthUserContext, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const bookId = this.normalizeRequiredText(input.bookId, 'Book');
    const borrowerName = this.normalizeRequiredText(input.borrowerName, 'Borrower name');
    const dueAt = this.parseRequiredDate(input.dueAt, 'Due date');
    const borrowedAt = this.parseOptionalDate(input.borrowedAt) || new Date();
    if (dueAt.getTime() < borrowedAt.getTime()) {
      throw new BadRequestException('Due date must be after the borrow date.');
    }

    const state = this.loadState();
    const book = state.books.find((item) => item.id === bookId && item.schoolUserId === schoolUserId);
    if (!book) {
      throw new NotFoundException('Book was not found for this school.');
    }

    const availableCopies = this.resolveAvailableCopies(book, state.loans);
    if (availableCopies <= 0) {
      throw new BadRequestException('No copies are currently available for this book.');
    }

    const loan: LibraryLoanRecord = {
      id: `LOAN-${randomBytes(4).toString('hex').toUpperCase()}`,
      schoolUserId,
      bookId: book.id,
      borrowerName,
      borrowerRef: this.normalizeOptionalText(input.borrowerRef),
      classGroup: this.normalizeOptionalText(input.classGroup),
      borrowedAt: borrowedAt.toISOString(),
      dueAt: dueAt.toISOString(),
      returnedAt: null,
    };

    state.loans.unshift(loan);
    state.books = state.books.map((item) =>
      item.id === book.id ? { ...item, updatedAt: new Date().toISOString() } : item
    );
    this.saveState(state);

    return {
      loan: this.buildLoanResponse(loan, state.books),
      book: this.buildBookResponse(book, state.loans),
    };
  }

  returnLoan(authUser: AuthUserContext, loanId: string, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedLoanId = this.normalizeRequiredText(loanId, 'Loan ID');
    const state = this.loadState();
    const loanIndex = state.loans.findIndex(
      (loan) => loan.id === normalizedLoanId && loan.schoolUserId === schoolUserId
    );

    if (loanIndex === -1) {
      throw new NotFoundException('Loan record was not found for this school.');
    }

    const existing = state.loans[loanIndex];
    if (this.isReturned(existing)) {
      return {
        loan: this.buildLoanResponse(existing, state.books),
        returned: true as const,
      };
    }

    const returnedAt = this.parseOptionalDate(input.returnedAt) || new Date();
    state.loans[loanIndex] = {
      ...existing,
      returnedAt: returnedAt.toISOString(),
    };
    state.books = state.books.map((book) =>
      book.id === existing.bookId ? { ...book, updatedAt: returnedAt.toISOString() } : book
    );
    this.saveState(state);

    return {
      loan: this.buildLoanResponse(state.loans[loanIndex], state.books),
      returned: true as const,
    };
  }

  private loadState(): SchoolLibraryState {
    if (!existsSync(this.storagePath)) {
      return {
        books: [],
        loans: [],
      };
    }

    try {
      const raw = readFileSync(this.storagePath, 'utf8');
      if (!raw.trim()) {
        return { books: [], loans: [] };
      }
      const parsed = JSON.parse(raw) as Partial<SchoolLibraryState>;
      return {
        books: Array.isArray(parsed.books) ? parsed.books : [],
        loans: Array.isArray(parsed.loans) ? parsed.loans : [],
      };
    } catch {
      return {
        books: [],
        loans: [],
      };
    }
  }

  private saveState(state: SchoolLibraryState) {
    writeFileSync(this.storagePath, JSON.stringify(state, null, 2));
  }

  private resolveSchoolUserId(authUser: AuthUserContext) {
    const role = this.normalizeRole(authUser.role);
    if (!this.isSchoolManagerRole(role)) {
      throw new ForbiddenException('Only school or admin accounts can manage the library.');
    }

    const identifier = authUser.id || authUser.email;
    if (!identifier) {
      throw new ForbiddenException('School account identity could not be verified.');
    }

    return identifier;
  }

  private normalizeRole(role: string | null | undefined) {
    return String(role || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
  }

  private isSchoolManagerRole(role: string) {
    return role === 'school' || role === 'admin' || role === 'school-admin' || role === 'school-owner';
  }

  private normalizeRequiredText(value: unknown, label: string) {
    const text = String(value || '').trim();
    if (!text) {
      throw new BadRequestException(`${label} is required.`);
    }

    return text;
  }

  private normalizeOptionalText(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }

    const text = value.trim();
    return text || null;
  }

  private normalizePositiveInteger(value: unknown, label: string) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      throw new BadRequestException(`${label} must be a positive number.`);
    }

    return Math.min(5000, Math.max(1, Math.floor(numberValue)));
  }

  private parseRequiredDate(value: unknown, label: string) {
    const raw = this.normalizeRequiredText(value, label);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} is not a valid date.`);
    }
    return parsed;
  }

  private parseOptionalDate(value: unknown) {
    if (value === undefined || value === null || String(value).trim() === '') {
      return null;
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private isReturned(loan: LibraryLoanRecord) {
    return Boolean(loan.returnedAt && String(loan.returnedAt).trim());
  }

  private isOverdue(loan: LibraryLoanRecord) {
    if (this.isReturned(loan)) {
      return false;
    }

    return new Date(loan.dueAt).getTime() < Date.now();
  }

  private resolveAvailableCopies(book: LibraryBookRecord, loans: LibraryLoanRecord[]) {
    const borrowedCopies = loans.filter(
      (loan) => loan.schoolUserId === book.schoolUserId && loan.bookId === book.id && !this.isReturned(loan)
    ).length;
    return Math.max(0, book.totalCopies - borrowedCopies);
  }

  private buildBookResponse(book: LibraryBookRecord, loans: LibraryLoanRecord[]) {
    const availableCopies = this.resolveAvailableCopies(book, loans);
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      referenceCode: book.referenceCode || null,
      totalCopies: book.totalCopies,
      availableCopies,
      borrowedCopies: Math.max(0, book.totalCopies - availableCopies),
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }

  private buildLoanResponse(loan: LibraryLoanRecord, books: LibraryBookRecord[]) {
    const book = books.find((item) => item.id === loan.bookId);
    return {
      id: loan.id,
      bookId: loan.bookId,
      bookTitle: book?.title || 'Unknown book',
      borrowerName: loan.borrowerName,
      borrowerRef: loan.borrowerRef || null,
      classGroup: loan.classGroup || null,
      borrowedAt: loan.borrowedAt,
      dueAt: loan.dueAt,
      returnedAt: loan.returnedAt || null,
      status: this.isReturned(loan) ? 'returned' : this.isOverdue(loan) ? 'overdue' : 'borrowed',
    };
  }

  private buildSummary(books: LibraryBookRecord[], loans: LibraryLoanRecord[]) {
    const totalCopies = books.reduce((sum, book) => sum + book.totalCopies, 0);
    const availableCopies = books.reduce((sum, book) => sum + this.resolveAvailableCopies(book, loans), 0);
    const activeLoans = loans.filter((loan) => !this.isReturned(loan));
    const overdueCount = activeLoans.filter((loan) => this.isOverdue(loan)).length;

    return {
      totalTitles: books.length,
      totalCopies,
      availableCopies,
      borrowedCount: activeLoans.length,
      overdueCount,
      returnedCount: loans.filter((loan) => this.isReturned(loan)).length,
    };
  }
}
