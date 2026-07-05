import { z } from "zod";

const createDeliveryMethodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Delivery method name is required"),
    type: z.enum(["PATHAO", "REDX", "STEDFAST", "CARRYBEE", "OTHERS"], {
      errorMap: () => ({ message: "Please select a valid delivery type" }),
    }),
    accountPhone: z.string().min(10, "Valid phone number required"),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    clientEmail: z.string().optional(),
    clientPassword: z.string().optional(),
    clientStoreId: z.string().optional(),
    merchantId: z.string().optional(),
    defaultShippingNote: z.string().optional(),
    webhookUrl: z.string().url("Valid URL required").optional(),
    webhookSecret: z.string().optional(),
    isActive: z.boolean().default(true),
  }),
});

const updateDeliveryMethodSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    type: z
      .enum(["PATHAO", "REDX", "STEDFAST", "CARRYBEE", "OTHERS"])
      .optional(),
    accountPhone: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    clientEmail: z.string().optional(),
    clientPassword: z.string().optional(),
    clientStoreId: z.string().optional(),
    merchantId: z.string().optional(),
    defaultShippingNote: z.string().optional(),
    webhookUrl: z.string().url().optional(),
    webhookSecret: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const deliveryMethodValidations = {
  createDeliveryMethodSchema,
  updateDeliveryMethodSchema,
};
