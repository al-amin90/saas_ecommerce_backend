import { getTenantModel } from "../../../utils/getTenantModel";
import axios from "axios";
import { IDeliveryMethod } from "./deliveryMethod.interface";
import { Types } from "mongoose";

// ✅ CREATE - নতুন Delivery Method যোগ করি
const createDeliveryMethodInDB = async (
  subdomain: string,
  payload: IDeliveryMethod,
) => {
  try {
    const DeliveryMethod = await getTenantModel(subdomain, "DeliveryMethod");

    // Check if delivery method type already exists
    const existingMethod = await DeliveryMethod.findOne({
      type: payload.type,
    });

    if (existingMethod) {
      throw new Error(
        `Delivery method ${payload.type} already exists for this tenant`,
      );
    }

    const deliveryMethod = await DeliveryMethod.create(payload);

    return deliveryMethod;
  } catch (error) {
    throw error;
  }
};

// ✅ GET ALL - সব Delivery Methods পাই
const getAllDeliveryMethodsFromDB = async (subdomain: string) => {
  try {
    const DeliveryMethod = await getTenantModel(subdomain, "DeliveryMethod");

    const deliveryMethods = await DeliveryMethod.find().sort({
      createdAt: -1,
    });

    return deliveryMethods;
  } catch (error) {
    throw error;
  }
};

// ✅ GET SINGLE - একটি Delivery Method পাই
const getDeliveryMethodByIdFromDB = async (
  subdomain: string,
  deliveryMethodId: string,
) => {
  try {
    const DeliveryMethod = await getTenantModel(subdomain, "DeliveryMethod");

    const deliveryMethod = await DeliveryMethod.findById(deliveryMethodId);

    if (!deliveryMethod) {
      throw new Error("Delivery method not found");
    }

    return deliveryMethod;
  } catch (error) {
    throw error;
  }
};

// ✅ UPDATE/PATCH - Delivery Method আপডেট করি
const updateDeliveryMethodInDB = async (
  subdomain: string,
  deliveryMethodId: string,
  payload: Partial<IDeliveryMethod>,
) => {
  try {
    const DeliveryMethod = await getTenantModel(subdomain, "DeliveryMethod");

    // Check if delivery method exists
    const existingMethod: IDeliveryMethod | null =
      await DeliveryMethod.findById(deliveryMethodId);

    if (!existingMethod) {
      throw new Error("Delivery method not found");
    }

    // If updating type, check for duplicates
    if (payload.type && payload.type !== existingMethod.type) {
      const duplicateType = await DeliveryMethod.findOne({
        type: payload.type,
        _id: { $ne: new Types.ObjectId(deliveryMethodId) },
      });

      if (duplicateType) {
        throw new Error(
          `Delivery method ${payload.type} already exists for this tenant`,
        );
      }
    }

    const updatedMethod = await DeliveryMethod.findByIdAndUpdate(
      deliveryMethodId,
      { $set: payload },
      { new: true, runValidators: true },
    );

    return updatedMethod;
  } catch (error) {
    throw error;
  }
};

// ✅ DELETE - Delivery Method ডিলিট করি
const deleteDeliveryMethodFromDB = async (
  subdomain: string,
  deliveryMethodId: string,
) => {
  try {
    const DeliveryMethod = await getTenantModel(subdomain, "DeliveryMethod");
    const Order = await getTenantModel(subdomain, "Order");

    // Check if this delivery method is used in any active orders
    const activeOrders = await Order.findOne({
      deliveryMethodId: new Types.ObjectId(deliveryMethodId),
      orderStatus: { $in: ["pending", "processing", "shipped"] },
    });

    if (activeOrders) {
      throw new Error("Cannot delete delivery method that has active orders");
    }

    const deletedMethod =
      await DeliveryMethod.findByIdAndDelete(deliveryMethodId);

    if (!deletedMethod) {
      throw new Error("Delivery method not found");
    }

    return null;
  } catch (error) {
    throw error;
  }
};

// ✅ Webhook থেকে Status Update পাবো
// const handleCourierWebhookInDB = async (subdomain: string, payload: any) => {
//   try {
//     const Order = await getTenantModel(subdomain, "Order");
//     const DeliveryMethod = await getTenantModel(subdomain, "DeliveryMethod");

//     console.log("payload", payload);

//     // Delivery Method খুঁজে webhook secret verify করি
//     const deliveryMethod = await DeliveryMethod.findOne({
//       tenantId: subdomain,
//       type: payload.courierType,
//     });

//     if (!deliveryMethod?.webhookSecret) {
//       throw new Error("Delivery method not configured for webhooks");
//     }

//     // Webhook secret verify করি
//     if (payload.webhookSecret !== deliveryMethod.webhookSecret) {
//       throw new Error("Invalid webhook secret");
//     }

//     // Courier এর tracking ID দিয়ে Order খুঁজি
//     const order = await Order.findOne({
//       tenantId: subdomain,
//       courierTrackingId: payload.trackingId,
//     });

//     if (!order) {
//       throw new Error("Order not found for tracking ID");
//     }

//     // Courier status কে Order status এ map করি
//     const orderStatusMap: Record<string, string> = {
//       in_transit: "shipped",
//       delivered: "delivered",
//       cancelled: "cancelled",
//       failed: "cancelled",
//       pending: "processing",
//     };

//     const newOrderStatus =
//       orderStatusMap[payload.courierStatus] || order.orderStatus;

//     // Order update করি
//     const updatedOrder = await Order.findOneAndUpdate(
//       { _id: order._id },
//       {
//         orderStatus: newOrderStatus,
//         courierResponse: payload,
//       },
//       { new: true },
//     ).populate("items.productId");

//     return updatedOrder;
//   } catch (error) {
//     throw error;
//   }
// };

export default {
  createDeliveryMethodInDB,
  getAllDeliveryMethodsFromDB,
  getDeliveryMethodByIdFromDB,
  updateDeliveryMethodInDB,
  deleteDeliveryMethodFromDB,
};
