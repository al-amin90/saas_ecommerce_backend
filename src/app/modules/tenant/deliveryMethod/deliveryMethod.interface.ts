import { Document, Types } from "mongoose";

export interface IDeliveryMethod extends Document {
  _id: Types.ObjectId;
  tenantId: string;

  // Basic info
  name: string;
  type: "PATHAO" | "REDX" | "STEDFAST" | "CARRYBEE" | "OTHERS";

  // Account credentials
  accountPhone: string;
  clientId: string;
  clientSecret: string;
  clientEmail: string;
  clientPassword: string;
  clientStoreId: string;

  // Default shipping note
  defaultShippingNote?: string;

  // Webhook configuration
  webhookUrl?: string;
  webhookSecret?: string;

  // Status
  isActive: boolean;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}
