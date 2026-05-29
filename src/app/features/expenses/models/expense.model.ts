// ─── Domain literals ──────────────────────────────────────────────────────────

/**
 * Operational categories for school expenses.
 * Extend this union as the institution's chart of accounts grows.
 */
export type ExpenseCategory =
  | 'salaires'        // staff salaries
  | 'loyer'           // rent / premises
  | 'fournitures'     // office & classroom supplies
  | 'équipement'      // hardware, furniture, lab gear
  | 'maintenance'     // repairs & upkeep
  | 'services'        // utilities, internet, subscriptions
  | 'marketing'       // advertising & communication
  | 'formation'       // staff training & development
  | 'impôts'          // taxes & government fees
  | 'autre';          // catch-all

export type ExpenseStatus =
  | 'payé'            // settled
  | 'en attente'      // approved, not yet paid
  | 'rejeté';         // denied / cancelled

export type ExpensePaymentMethod =
  | 'espèces'
  | 'virement'
  | 'chèque'
  | 'carte'
  | 'prélèvement';    // direct debit

export type RecurrenceFrequency =
  | 'unique'          // one-time
  | 'mensuel'         // monthly
  | 'trimestriel'     // quarterly
  | 'annuel';         // annual

// ─── Core entity ──────────────────────────────────────────────────────────────

export interface Expense {
  /** Unique identifier — json-server generates a nanoid string. */
  id: string;

  /** Human-readable title, e.g. "Loyer — Juin 2026" */
  title: string;

  category: ExpenseCategory;

  /** Amount in the school's operating currency (e.g. MAD). Always positive. */
  amount: number;

  /** ISO date string YYYY-MM-DD: when the expense is / was due. */
  date: string;

  /** ISO date string YYYY-MM-DD: when the payment was actually made. Null if unpaid. */
  paidDate: string | null;

  status: ExpenseStatus;

  method: ExpensePaymentMethod | null;

  /** How often this expense recurs. "unique" means a one-off. */
  recurrence: RecurrenceFrequency;

  /**
   * Optional FK → teachers.id or staff member responsible for / who submitted
   * this expense (useful for reimbursements).
   */
  submittedById?: string;

  /** Free-text vendor or payee name. */
  vendor?: string;

  /** Invoice / receipt reference number for accounting. */
  reference?: string;

  /** Budget line or cost-centre tag for reporting. */
  budgetLine?: string;

  /** Accounting month this expense is attributed to, e.g. "2026-06". */
  month: string;

  notes?: string;

  /** ISO date-time — set automatically on creation. */
  createdAt: string;

  /** ISO date-time — set automatically on every update. */
  updatedAt: string;
}

// ─── Payload types ────────────────────────────────────────────────────────────

/** Fields the caller must supply when creating an expense.
 *  `id`, `createdAt`, and `updatedAt` are managed by the service. */
export type CreateExpensePayload = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;

/** Any subset of mutable fields for a partial update (PATCH). */
export type UpdateExpensePayload = Partial<CreateExpensePayload>;

// ─── Filtering ────────────────────────────────────────────────────────────────

export interface ExpenseFilters {
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  month?: string;
  recurrence?: RecurrenceFrequency;
  submittedById?: string;
  budgetLine?: string;
  /** Inclusive lower bound on `date` (YYYY-MM-DD). */
  fromDate?: string;
  /** Inclusive upper bound on `date` (YYYY-MM-DD). */
  toDate?: string;
}

// ─── Reporting aggregates (computed client-side) ──────────────────────────────

export interface ExpenseSummary {
  /** Total number of expense records in the set. */
  total: number;
  /** Number of paid expenses. */
  paid: number;
  /** Number of pending expenses. */
  pending: number;
  /** Number of rejected expenses. */
  rejected: number;
  /** Sum of ALL expense amounts regardless of status. */
  totalAmount: number;
  /** Sum of paid expense amounts. */
  paidAmount: number;
  /** Sum of pending expense amounts. */
  pendingAmount: number;
}

/** Per-category breakdown returned by `getBreakdownByCategory`. */
export interface ExpenseCategoryBreakdown {
  category: ExpenseCategory;
  count: number;
  totalAmount: number;
  percentage: number;
}
