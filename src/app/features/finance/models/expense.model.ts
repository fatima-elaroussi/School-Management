// ─── Expense domain literals ──────────────────────────────────────────────────

export type ExpenseCategory =
  | 'salaires'     // staff salaries
  | 'loyer'        // rent / premises
  | 'fournitures'  // classroom & office supplies
  | 'équipement'   // hardware, furniture, lab gear
  | 'maintenance'  // repairs & upkeep
  | 'services'     // utilities, internet, subscriptions
  | 'marketing'    // advertising & communication
  | 'formation'    // staff training & development
  | 'impôts'       // taxes & government fees
  | 'autre';

export type ExpenseStatus  = 'payé' | 'en attente' | 'rejeté';

export type ExpensePaymentMethod =
  | 'espèces'
  | 'virement'
  | 'chèque'
  | 'carte'
  | 'prélèvement'; // direct debit

export type RecurrenceFrequency = 'unique' | 'mensuel' | 'trimestriel' | 'annuel';

// ─── Core entity ──────────────────────────────────────────────────────────────

export interface Expense {
  /** Unique identifier — json-server nanoid string. */
  id: string;

  /** Human-readable title, e.g. "Loyer — Juin 2026". */
  title: string;

  category:   ExpenseCategory;

  /** Amount in operating currency (MAD). Always positive. */
  amount:     number;

  /** ISO date YYYY-MM-DD: when the expense is / was due. */
  date:       string;

  /** ISO date YYYY-MM-DD: actual payment date. Null if unpaid. */
  paidDate:   string | null;

  status:     ExpenseStatus;
  method:     ExpensePaymentMethod | null;
  recurrence: RecurrenceFrequency;

  /** FK → teachers.id — who submitted this expense (reimbursements). */
  submittedById?: string;

  /** Vendor / payee name for accounting. */
  vendor?:     string;

  /** Invoice or receipt reference number. */
  reference?:  string;

  /** Cost-centre / budget line tag for reporting. */
  budgetLine?: string;

  /** Accounting month this expense is attributed to, e.g. "2026-06". */
  month: string;

  notes?: string;

  /** ISO date-time — set automatically on creation. */
  createdAt: string;

  /** ISO date-time — refreshed on every update. */
  updatedAt: string;
}

// ─── Payload types ────────────────────────────────────────────────────────────

/** Fields the caller supplies when creating an expense.
 *  id, createdAt, updatedAt are managed by the service. */
export type CreateExpensePayload = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;

/** Any subset of mutable fields for a partial update (PATCH). */
export type UpdateExpensePayload = Partial<CreateExpensePayload>;

// ─── Filtering ────────────────────────────────────────────────────────────────

export interface ExpenseFilters {
  category?:      ExpenseCategory;
  status?:        ExpenseStatus;
  month?:         string;
  recurrence?:    RecurrenceFrequency;
  submittedById?: string;
  budgetLine?:    string;
  /** Inclusive lower bound on date (YYYY-MM-DD). */
  fromDate?:      string;
  /** Inclusive upper bound on date (YYYY-MM-DD). */
  toDate?:        string;
}

// ─── Reporting aggregates ─────────────────────────────────────────────────────

export interface ExpenseSummary {
  total:         number;
  paid:          number;
  pending:       number;
  rejected:      number;
  totalAmount:   number;
  paidAmount:    number;
  pendingAmount: number;
}

export interface ExpenseCategoryBreakdown {
  category:    ExpenseCategory;
  count:       number;
  totalAmount: number;
  /** 0-100, one decimal place. */
  percentage:  number;
}
