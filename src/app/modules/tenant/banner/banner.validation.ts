import { z } from "zod";

const createBannerSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    subTitle: z.string().optional(),
    colorHex: z
      .string()
      .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color")
      .optional(),
    description: z.string().optional(),
    productID: z.string().optional(),
  }),
});

const updateBannerSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    subTitle: z.string().optional(),
    colorHex: z
      .string()
      .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color")
      .optional(),
    description: z.string().optional(),
    productID: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const bannerValidations = {
  createBannerSchema,
  updateBannerSchema,
};
