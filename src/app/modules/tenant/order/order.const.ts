// ✅ Valid order statuses
export const VALID_ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "delivery_failed",
  "exchanged",
] as const;

export const VALID_PAYMENT_STATUSES = [
  "pending",
  "completed",
  "paid",
  "refunded",
  "failed",
] as const;

export type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

export type PaymentStatus = (typeof VALID_PAYMENT_STATUSES)[number];
