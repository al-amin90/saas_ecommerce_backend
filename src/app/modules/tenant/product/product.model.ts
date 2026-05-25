import { Schema } from "mongoose";

import { TProduct, TVariant } from "./product.interface";

export const variantSchema = new Schema<TVariant>({
  color: { type: Schema.Types.ObjectId, ref: "Color" },
  stock: [
    {
      size: { type: Number, required: true, min: 0 },
      quantity: { type: Number, required: true, min: 0 },
    },
  ],
});

export const productSchema = new Schema<TProduct>(
  {
    name: { type: String, required: true },
    description: { type: String },
    slug: { type: String, required: true, unique: true },

    price: { type: Number, required: true },
    discountPrice: { type: Number },
    originalPrice: { type: Number },
    categoryID: { type: Schema.Types.ObjectId, ref: "Category" },

    variant: [variantSchema],

    images: [{ type: String, required: true }],

    sku: { type: String, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);
