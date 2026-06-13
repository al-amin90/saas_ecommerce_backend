import { Schema } from "mongoose";
import { TBannerSystem } from "./banner.interface";

export const bannerSchema = new Schema<TBannerSystem>(
  {
    title: { type: String, required: true, trim: true },
    subTitle: { type: String, default: "" },
    colorHex: { type: String, default: "#ffffff" },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    productID: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

bannerSchema.index({ order: 1, createdAt: -1 });

export default bannerSchema;
