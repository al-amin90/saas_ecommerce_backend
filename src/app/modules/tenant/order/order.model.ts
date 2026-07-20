import { Schema } from "mongoose";
import { IOrder } from "./order.interface";
import { VALID_ORDER_STATUSES, VALID_PAYMENT_STATUSES } from "./order.const";

const orderSchema = new Schema<IOrder>(
  {
    guestCheckout: {
      type: Boolean,
      default: false,
    },
    guestEmail: {
      type: String,
      sparse: true,
    },
    guestInfo: {
      fullName: String,
      phone: String,
      address: String,
      city: String,
      postalCode: String,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: Number,
        selectedSize: String,
        image: String,
        colorId: {
          type: Schema.Types.ObjectId,
          ref: "Color",
          required: true,
        },
        price: Number,
      },
    ],
    totalPrice: Number,
    paymentMethod: {
      type: String,
      enum: ["cash", "card"],
    },
    orderStatus: {
      type: String,
      enum: VALID_ORDER_STATUSES,
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: VALID_PAYMENT_STATUSES,
      default: "pending",
    },
    orderNumber: {
      type: String,
      unique: true,
    },
    invoice_id: String,
    courier: {
      name: {
        type: Schema.Types.ObjectId,
        ref: "DeliveryMethod",
        default: null,
      },
      consignmentId: { type: String, default: null },
      trackingCode: { type: String, default: null },
      status: { type: String, default: null },
    },
  },
  { timestamps: true },
);

export default orderSchema;
