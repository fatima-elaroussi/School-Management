// ─── Payment status ───────────────────────────────────────────────────────────

export type PaymentStatus = 'payé' | 'en attente' | 'en retard' | 'annulé';

export type PaymentMethod = 'espèces' | 'virement' | 'chèque' | 'carte';

export type PaymentType = 'mensualité' | 'inscription' | 'matériel' | 'autre';

// ─── Core entity ──────────────────────────────────────────────────────────────

export interface Payment {
  /** Unique identifier (string to match json-server generated ids). */
  id: string;

  /** FK → students.id */
  studentId: string;

  /** FK → groups.id  (optional — payment can be school-wide) */
  groupId?: string;

  /** Amount in the local currency (MAD, EUR, etc.). */
  amount: number;

  /** ISO date string: YYYY-MM-DD */
  dueDate: string;

  /** ISO date string: YYYY-MM-DD — null when not yet paid */
  paidDate: string | null;

  status: PaymentStatus;
  method: PaymentMethod | null;
  type: PaymentType;

  /** Academic month this payment covers, e.g. "2026-05" */
  month: string;

  notes?: string;

  /** ISO date-time of record creation */
  createdAt: string;
}

// ─── Payload types ────────────────────────────────────────────────────────────

/** Body sent when creating a new payment (id & createdAt are server-generated). */
export type CreatePaymentPayload = Omit<Payment, 'id' | 'createdAt'>;

/** Partial update — all fields optional except id. */
export type UpdatePaymentPayload = Partial<CreatePaymentPayload>;

// ─── Query / filter helpers ───────────────────────────────────────────────────

export interface PaymentFilters {
  studentId?: string;
  groupId?: string;
  status?: PaymentStatus;
  type?: PaymentType;
  month?: string;
  /** Inclusive lower bound (ISO date) */
  fromDate?: string;
  /** Inclusive upper bound (ISO date) */
  toDate?: string;
}

// ─── Aggregate summaries (computed client-side) ───────────────────────────────

export interface PaymentSummary {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
}
