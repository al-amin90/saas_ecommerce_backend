import { Types } from "mongoose";
import { Document } from "mongoose";

export interface IChartRow {
  size: number;
  innerLength?: number;
  feetLength?: number;
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
