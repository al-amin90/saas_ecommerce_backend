import { Schema } from "mongoose";
import { IDeliveryMethod } from "./deliveryMethod.interface";

const deliveryMethodSchema = new Schema<IDeliveryMethod>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["PATHAO", "REDX", "STEDFAST", "CARRYBEE", "OTHERS"],
      unique: true,
      required: true,
      index: true,
    },
    accountPhone: {
      type: String,
      trim: true,
    },
    clientId: {
      type: String,
      trim: true,
    },
    clientSecret: {
      type: String,
      trim: true,
    },
    clientEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    clientPassword: {
      type: String,
    },
    clientStoreId: {
      type: String,
      trim: true,
    },
    merchantId: {
      type: String,
      trim: true,
    },
    defaultShippingNote: {
      type: String,
      default: "",
    },
    webhookUrl: {
      type: String,
      sparse: true,
    },
    webhookSecret: {
      type: String,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default deliveryMethodSchema;
