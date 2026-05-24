import { Schema } from "mongoose";
import { IOrder } from "./order.interface";

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
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    orderNumber: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true },
);

export default orderSchema;
