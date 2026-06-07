import { Types } from "mongoose";

export type TStock = {
  size: number;
  quantity: number;
};

export type TVariant = {
  color: Types.ObjectId;
  imageIndex: number;
  stock: TStock[];
};

export type TProduct = {
  _id?: Types.ObjectId;
  name: string;
  slug: string;

  description?: string;

  price: number;
  discountPrice?: number;
  originalPrice?: number;
  categoryID: Types.ObjectId;

  variant: TVariant[];

  images: string[];
  existingImages?: string[];
  sizeChartId: Types.ObjectId;

  sku: string;

  isActive: boolean;
  isDeleted: boolean;
};
