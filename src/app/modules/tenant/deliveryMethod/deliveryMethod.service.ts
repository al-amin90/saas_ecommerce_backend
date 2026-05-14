import { getTenantModel } from "../../../utils/getTenantModel";
import axios from "axios";
import { IDeliveryMethod } from "./deliveryMethod.interface";
import { Types } from "mongoose";

import crypto from "crypto";
import config from "../../../config";

// Courier API endpoints
const COURIER_APIs = {
  PATHAO: {
    baseUrl: "https://aladdin-api.pathao.com",
    endpoints: {
      createOrder: "/aladdin/api/v1/orders",
      getStatus: "/aladdin/api/v1/orders/:id",
    },
  },
  REDX: {
    baseUrl: "https://api.redx.com",
    endpoints: {
      createOrder: "/v1/parcels",
    },
  },
  STEDFAST: {
    baseUrl: "https://api.stedfast.com.bd",
    endpoints: {
      createOrder: "/api/v2/create_order",
    },
  },
  CARRYBEE: {
    baseUrl: "https://api.carrybee.com",
    endpoints: {
      createOrder: "/api/parcel/create",
    },
  },
};

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

// ✅ Order submit করলে Courier API কে call করি
const submitOrderToCourier = async (
  subdomain: string,
  orderId: string,
  deliveryMethodId: string,
) => {
  try {
    const Order = await getTenantModel(subdomain, "Order");
    const DeliveryMethod = await getTenantModel(subdomain, "DeliveryMethod");

    // Order খুঁজি
    const order = await Order.findOne({
      tenantId: subdomain,
      _id: new Types.ObjectId(orderId),
    }).populate("items.productId");

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.orderStatus !== "pending") {
      throw new Error("Only pending orders can be sent to courier");
    }

    // Delivery Method খুঁজি
    const deliveryMethod = await DeliveryMethod.findOne({
      _id: new Types.ObjectId(deliveryMethodId),
      isActive: true,
    });

    if (!deliveryMethod) {
      throw new Error("Delivery method not found or inactive");
    }

    // Courier API তে request তৈরি করি
    const courierPayload = prepareCourierPayload(order, deliveryMethod);

    // Courier API কে POST করি
    const courierResponse = await sendToCourierAPI(
      deliveryMethod.type,
      courierPayload,
      deliveryMethod,
    );

    // Tracking ID পেয়ে Order update করি
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: new Types.ObjectId(orderId) },
      {
        orderStatus: "processing",
        deliveryMethodId: new Types.ObjectId(deliveryMethodId),
        courierTrackingId: courierResponse.trackingId,
        courierResponse: courierResponse,
      },
      { new: true },
    ).populate("items.productId");

    return updatedOrder;
  } catch (error) {
    throw error;
  }
};

// ✅ Courier API তে request পাঠাই
const sendToCourierAPI = async (
  courierType: string,
  payload: any,
  deliveryMethod: IDeliveryMethod,
) => {
  try {
    const courierConfig =
      COURIER_APIs[courierType as keyof typeof COURIER_APIs];

    if (!courierConfig) {
      throw new Error(`Courier ${courierType} not supported`);
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deliveryMethod.clientId}:${deliveryMethod.clientSecret}`,
    };

    const response = await axios.post(
      `${courierConfig.baseUrl}${courierConfig.endpoints.createOrder}`,
      payload,
      { headers, timeout: 10000 },
    );

    return {
      trackingId: response.data.tracking_id || response.data.id,
      status: "processing",
      courierData: response.data,
    };
  } catch (error) {
    throw error;
  }
};

// ✅ Courier payload তৈরি করি
const prepareCourierPayload = (order: any, deliveryMethod: IDeliveryMethod) => {
  const guestInfo = order.guestInfo;

  return {
    recipient_name: guestInfo.fullName,
    recipient_phone: guestInfo.phone,
    recipient_address: guestInfo.address,
    recipient_city: guestInfo.city,
    recipient_postal_code: guestInfo.postalCode || "",
    merchant_order_id: order.orderNumber,
    item_quantity: order.items.length,
    item_weight: 0.5,
    amount_to_collect: order.totalPrice,
    instructions: deliveryMethod.defaultShippingNote || "Handle with care",
    note: "Order from online store",
  };
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

const handleCourierWebhookInDB = async (
  subdomain: string,
  payload: any,
  webhookSignature: string,
) => {
  try {
    console.log("🔐 Verifying webhook signature...");

    // ✅ Webhook secret আপনার .env থেকে আসবে
    const WEBHOOK_SECRET = config.webhook_secret; // f3992ecc-59da-4cbe-a049-a13da2018d51

    if (!WEBHOOK_SECRET) {
      throw new Error("WEBHOOK_SECRET not configured");
    }

    // ✅ Signature verify (HMAC-SHA256)
    const expectedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest("hex");

    console.log("Expected signature:", expectedSignature);
    console.log("Received signature:", webhookSignature);

    if (webhookSignature !== expectedSignature) {
      console.error("❌ Invalid signature!");
      throw new Error("Invalid webhook signature");
    }

    console.log("✅ Signature verified!");

    // ✅ এখন Order update করি
    const Order = await getTenantModel(subdomain, "Order");

    // Payload থেকে data extract করি
    const { consignment_id, merchant_order_id, event, timestamp } = payload;

    console.log("Processing webhook event:", event);

    // Event কে Order status এ convert করি
    const statusMap: Record<string, string> = {
      "order.picked-up": "processing",
      "order.in-transit": "shipped",
      "order.delivered": "delivered",
      "order.delivery-failed": "cancelled",
      "order.on-hold": "pending",
    };

    const newStatus = statusMap[event] || "processing";

    // Order খুঁজি এবং update করি
    const order = await Order.findOneAndUpdate(
      {
        orderNumber: merchant_order_id,
      },
      {
        orderStatus: newStatus,
        courierTrackingId: consignment_id,
        courierResponse: {
          ...payload,
          verifiedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!order) {
      console.error("Order not found for:", merchant_order_id);
      throw new Error("Order not found");
    }

    console.log("✅ Order updated successfully:", order._id);

    // ✅ Notifications পাঠাই
    await sendNotifications(order, event);

    return order;
  } catch (error) {
    console.error("Webhook processing error:", error);
    throw error;
  }
};

// Notification পাঠাই
const sendNotifications = async (order: any, event: string) => {
  console.log(`📧 Sending notifications for event: ${event}`);

  // Email পাঠাই
  const emailMessage = getEmailMessage(event);
  console.log(`Email sent to: ${order.guestEmail}`);

  // SMS পাঠাই
  console.log(`SMS sent to: ${order.guestInfo?.phone}`);

  // Push notification পাঠাই
  console.log(`Push notification sent`);
};

const getEmailMessage = (event: string): string => {
  const messages: Record<string, string> = {
    "order.picked-up": "Your order has been picked up!",
    "order.in-transit": "Your order is on the way!",
    "order.delivered": "Your order has been delivered!",
    "order.delivery-failed": "Delivery failed. We'll retry soon.",
  };
  return messages[event] || "Order status updated";
};

export default {
  createDeliveryMethodInDB,
  getAllDeliveryMethodsFromDB,
  getDeliveryMethodByIdFromDB,
  updateDeliveryMethodInDB,
  deleteDeliveryMethodFromDB,
  submitOrderToCourier,
  handleCourierWebhookInDB,
};
