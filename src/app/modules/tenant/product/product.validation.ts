import { z } from "zod";

const stockSchema = z.object({
  size: z.number({ message: "Size is required" }).min(0),
  quantity: z.number(),
});

const variantSchema = z.object({
  color: z.string({ message: "Color is required" }).min(1),
  stock: z
    .array(stockSchema)
    .min(1, { message: "At least one stock entry is required" })
    .refine(
      (stocks) => {
        const sizes = stocks.map((s) => s.size);
        return sizes.length === new Set(sizes).size;
      },
      { message: "Duplicate sizes are not allowed in a variant" },
    ),
});

const baseProductSchema = z.object({
  name: z.string({ message: "Name is required" }).min(1),
  description: z.string().optional(),
  price: z.preprocess(
    Number,
    z.number({ message: "Price is required" }).min(1),
  ),
  discountPrice: z.preprocess(Number, z.number()),
  originalPrice: z.preprocess(Number, z.number()),
  categoryID: z.string({ message: "Category ID is required" }).min(1),
  variant: z
    .string()
    .transform((val) => {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    })
    .pipe(z.array(variantSchema)),
  images: z.array(z.any()).default([]),
  sku: z.string({ message: "SKU is required" }).min(1),
  isActive: z.boolean().default(true),
});

export const createProductSchema = z.object({
  body: baseProductSchema,
});

export const updateProductSchema = z.object({
  body: baseProductSchema.partial(),
});

export const productValidations = {
  createProductSchema,
  updateProductSchema,
};
