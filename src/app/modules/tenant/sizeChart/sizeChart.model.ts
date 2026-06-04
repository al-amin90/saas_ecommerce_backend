import { Schema, model } from "mongoose";
import { ISizeChart } from "./sizeChart.interface";

const chartRowSchema = new Schema(
  {
    size: { type: Number, required: true },
    innerLength: { type: Number },
    feetLength: { type: Number },
    ageRange: { type: String },
    note: { type: String },
  },
  { _id: false },
);

export const sizeChartSchema = new Schema<ISizeChart>(
  {
    chartName: { type: String, required: true },
    brand: { type: String },
    targetGroup: {
      type: String,
      enum: ["kids", "men", "women", "unisex"],
      default: "unisex",
    },
    rows: [chartRowSchema],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);
