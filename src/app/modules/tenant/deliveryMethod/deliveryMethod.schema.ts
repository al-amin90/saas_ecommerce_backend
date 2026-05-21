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
      required: true,
      trim: true,
    },
    clientId: {
      type: String,
      required: true,
      trim: true,
    },
    clientSecret: {
      type: String,
      required: true,
      trim: true,
    },
    clientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    clientPassword: {
      type: String,
      required: true,
    },
    clientStoreId: {
      type: String,
      required: true,
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
      default: true,
    },
  },
  { timestamps: true },
);

export default deliveryMethodSchema;
