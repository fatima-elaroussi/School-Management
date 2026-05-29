// ─── Payment domain literals ──────────────────────────────────────────────────

export type PaymentStatus   = 'payé' | 'en attente' | 'en retard' | 'annulé';
export type PaymentMethod   = 'espèces' | 'virement' | 'chèque' | 'carte';
export type PaymentType     = 'mensualité' | 'inscription' | 'matériel' | 'autre';

// ─── Core entity ──────────────────────────────────────────────────────────────

export interface Payment {
  /** Unique identifier — json-server nanoid string. */
  id: string;

  /** FK → students.id */
  studentId: string;

  /** FK → groups.id  (optional — school-wide payment has no group) */
  groupId?: string;

  /** Amount in the school's operating currency (e.g. MAD). Always positive. */
  amount: number;

  /** ISO date YYYY-MM-DD: when the payment is / was due. */
  dueDate: string;

  /** ISO date YYYY-MM-DD: when the payment was actually made. Null if unpaid. */
  paidDate: string | null;

  status: PaymentStatus;
  method: PaymentMethod | null;
  type: PaymentType;

  /** Academic month this payment covers, e.g. "2026-05". */
  month: string;

  notes?: string;

  /** ISO date-time — set automatically on creation. */
  createdAt: string;
}

// ─── Payload types ────────────────────────────────────────────────────────────

/** Body sent when creating a new payment — id & createdAt are service-managed. */
export type CreatePaymentPayload = Omit<Payment, 'id' | 'createdAt'>;

/** Partial update — any subset of mutable fields. */
export type UpdatePaymentPayload = Partial<CreatePaymentPayload>;

// ─── Filtering ────────────────────────────────────────────────────────────────

export interface PaymentFilters {
  studentId?:  string;
  groupId?:    string;
  status?:     PaymentStatus;
  type?:       PaymentType;
  month?:      string;
  /** Inclusive lower bound on dueDate (YYYY-MM-DD). */
  fromDate?:   string;
  /** Inclusive upper bound on dueDate (YYYY-MM-DD). */
  toDate?:     string;
}

// ─── Reporting aggregates ─────────────────────────────────────────────────────

export interface PaymentSummary {
  total:           number;
  paid:            number;
  pending:         number;
  overdue:         number;
  totalAmount:     number;
  collectedAmount: number;
  pendingAmount:   number;
}
