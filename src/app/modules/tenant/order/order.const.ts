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

// ✅ Status transition rules (কোন status থেকে কোন status এ যেতে পারবে)
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
};

export type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

export type PaymentStatus = (typeof VALID_PAYMENT_STATUSES)[number];
