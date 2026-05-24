// src/interface/order.interface.ts

import { Document, Types } from "mongoose";

export interface IOrderItem {
  productId: Types.ObjectId;
  quantity: number;
  selectedSize: string;
  colorId: Types.ObjectId;
  price: number;
}

export interface IOrderItemWithVariant extends IOrderItem {
  variantIndex: number; // Product এর variant array index
  colorId: Types.ObjectId; // Color ID
}

export interface IGuestInfo {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;

  // Guest checkout
  guestCheckout: boolean;
  guestEmail: string;
  guestInfo: IGuestInfo;
  // guestEmail?: string;
  // guestInfo?: IGuestInfo;

  // Auth user
  userId?: Types.ObjectId;

  // Order details
  items: IOrderItem[];
  totalPrice: number;

  paymentMethod: "cod" | "card";
  paymentStatus: "pending" | "completed" | "failed";

  orderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";

  // ✅ নতুন: Delivery Information
  deliveryMethodId?: Types.ObjectId; // কোন courier ব্যবহার করছি
  courierTrackingId?: string; // Courier এর tracking ID
  courierResponse?: any;

  // Tracking
  orderNumber: string;
}
