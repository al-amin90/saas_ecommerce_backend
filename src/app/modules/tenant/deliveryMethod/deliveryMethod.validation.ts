import { z } from "zod";

const createDeliveryMethodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Delivery method name is required"),
    type: z.enum(["PATHAO", "REDX", "STEDFAST", "CARRYBEE", "OTHERS"], {
      errorMap: () => ({ message: "Please select a valid delivery type" }),
    }),
    accountPhone: z.string().min(10, "Valid phone number required"),
    clientId: z.string().min(1, "Client ID is required"),
    clientSecret: z.string().min(1, "Client secret is required"),
    clientEmail: z.string().email("Valid email required"),
    clientPassword: z.string().min(1, "Client password is required"),
    clientStoreId: z.string().min(1, "Client store ID is required"),
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
    accountPhone: z.string().min(10).optional(),
    clientId: z.string().min(1).optional(),
    clientSecret: z.string().min(1).optional(),
    clientEmail: z.string().email().optional(),
    clientPassword: z.string().min(1).optional(),
    clientStoreId: z.string().min(1).optional(),
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
