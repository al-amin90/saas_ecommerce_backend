import { z } from "zod";

// Order Item Validation
export const orderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  selectedSize: z.string().min(1, "Size is required"),
  colorId: z.string().min(1, "color Id is required"),
  price: z.number().min(0, "Price must be positive"),
});

// Guest Info Validation
export const guestInfoSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().optional(),
  postalCode: z.string().optional(),
});

// Create Order Validation
const createOrderSchema = z.object({
  body: z.object({
    guestCheckout: z.boolean(),
    guestEmail: z.union([z.string().email(), z.literal("")]).optional(),
    guestInfo: guestInfoSchema.optional(),
    items: z.array(orderItemSchema).min(1, "At least one item is required"),
    totalPrice: z.number().min(0, "Total price must be positive"),
    paymentMethod: z.enum(["cash", "card"]),
  }),
});

const submitSingleOrderSchema = z.object({
  body: z.object({
    orderId: z.string().min(1, "Order ID is required"),
    deliveryMethodId: z.string().min(1, "Delivery method ID is required"),
  }),
});

const submitBulkOrderSchema = z.object({
  body: z.object({
    orderIds: z.array(z.string()).min(1, "At least one order ID is required"),
  }),
});

export const orderValidations = {
  createOrderSchema,
  submitSingleOrderSchema,
  submitBulkOrderSchema,
};
