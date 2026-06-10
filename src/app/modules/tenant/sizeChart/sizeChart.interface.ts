import { Types } from "mongoose";
import { Document } from "mongoose";

export interface IChartRow {
  size: string;
  innerLength?: string;
  feetLength?: string;
  ageRange?: string;
  note?: string;
}

export interface ISizeChart extends Document {
  _id: Types.ObjectId;
  chartName: string;
  brand?: string;
  targetGroup?: "kids" | "men" | "women" | "unisex";
  rows: IChartRow[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
