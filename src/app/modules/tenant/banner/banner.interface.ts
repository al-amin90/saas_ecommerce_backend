import { Types, Document } from "mongoose";

export type TBannerSystem = {
  title: string;
  subTitle?: string;
  colorHex?: string;
  image?: string;
  description?: string;
  productID?: Types.ObjectId;
  isActive?: boolean;
  isDeleted?: boolean;
} & Document;
