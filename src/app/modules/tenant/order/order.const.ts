// ✅ Valid order statuses
export const VALID_ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

export const VALID_PAYMENT_STATUSES = ["pending", "completed", "failed"];

// ✅ Status transition rules (কোন status থেকে কোন status এ যেতে পারবে)
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
};
