// src/modules/order/order.service.ts

import config from "../../../config";
import { getTenantModel } from "../../../utils/getTenantModel";
import PathaoService from "../courier/pathao.service";
import { IDeliveryMethod } from "../deliveryMethod/deliveryMethod.interface";
import { IOrder } from "./order.interface";

import { Types } from "mongoose";
import stockValidationService from "./stockValidation.service";
import status from "http-status";
import AppError from "../../../errors/AppError";
import {
  VALID_ORDER_STATUSES,
  VALID_PAYMENT_STATUSES,
  VALID_STATUS_TRANSITIONS,
} from "./order.const";
import { TProduct } from "../product/product.interface";

// ✅ Combined: Create Order + Submit to Courier (Transaction)
// const createAndSubmitOrderInDB = async (
//   subdomain: string,
//   userId: string | undefined,
//   payload: IOrder,
// ) => {
//   const session = await (
//     await getTenantModel(subdomain, "Order")
//   ).startSession();
//   session.startTransaction();

//   try {
//     console.log("🔄 Starting transaction for order creation");

//     const Order = await getTenantModel<IOrder>(subdomain, "Order");
//     const DeliveryMethod = await getTenantModel<IDeliveryMethod>(
//       subdomain,
//       "DeliveryMethod",
//     );

//     // ========== STEP 0: Stock Check করি ==========
//     console.log("📌 Step 0: Validating stock availability...");

//     const stockCheckResult =
//       await stockValidationService.checkStockAvailability(
//         subdomain,
//         payload.items as any,
//       );

//     if (!stockCheckResult.isAvailable) {
//       throw new AppError(
//         status.BAD_REQUEST,
//         `Insufficient stock: ${JSON.stringify(stockCheckResult.unavailableItems)}`,
//       );
//     }

//     console.log("✅ Stock validation passed!");

//     // ========== STEP 1: Order তৈরি করি ==========
//     console.log("📝 Step 1: Creating order...");

//     const orderCount = await Order.countDocuments({}, { session });
//     const orderNumber = `${subdomain.toUpperCase()}-ORD-${Date.now()}-${orderCount + 1}`;

//     const orderData = {
//       // tenantId: subdomain,
//       userId: userId ? new Types.ObjectId(userId) : null,
//       guestCheckout: payload.guestCheckout,
//       guestEmail: payload.guestEmail,
//       guestInfo: payload.guestInfo,
//       items: payload.items,
//       totalPrice: payload.totalPrice,
//       paymentMethod: payload.paymentMethod,
//       paymentStatus: "pending",
//       orderStatus: "pending",
//       orderNumber,
//     };

//     const [createdOrder] = await Order.create([orderData], { session });

//     console.log("✅ Order created:", createdOrder._id);

//     // ========== STEP 2: Delivery Method খুঁজি ==========
//     console.log("📦 Step 2: Finding delivery method...");

//     const deliveryMethod = await DeliveryMethod.findOne(
//       {
//         isActive: true,
//       },
//       null,
//       { session },
//     );

//     if (!deliveryMethod) {
//       throw new AppError(
//         status.NOT_FOUND,
//         "Delivery method not found or inactive",
//       );
//     }

//     console.log("✅ Delivery method found");

//     // ========== STEP 3: Courier এ order পাঠাই ==========
//     console.log("🚚 Step 3: Submitting order to courier...");

//     let courierTrackingId: string;
//     let courierResponse: any;

//     if (deliveryMethod.type === "PATHAO") {
//       const environment = config.pathao_environment;
//       const pathaoService = new PathaoService(environment);

//       const guestInfo = createdOrder.guestInfo;

//       const response = await pathaoService.createOrder(
//         parseInt(deliveryMethod.clientStoreId),
//         orderNumber,
//         guestInfo.fullName,
//         guestInfo.phone,
//         guestInfo.address,
//         createdOrder.items.length,
//         0.5,
//         createdOrder.totalPrice,
//         `Order: ${orderNumber}`,
//         `Items: ${createdOrder.items
//           .map((i: any) => i.productId?.name || "Product")
//           .join(", ")}`,
//       );

//       courierTrackingId = response.data.consignment_id;
//       courierResponse = {
//         consignment_id: response.data.consignment_id,
//         merchant_order_id: response.data.merchant_order_id,
//         order_status: response.data.order_status,
//         delivery_fee: response.data.delivery_fee,
//         environment: environment,
//         createdAt: new Date(),
//       };
//     } else {
//       throw new AppError(
//         status.BAD_REQUEST,
//         `Unsupported delivery method: ${deliveryMethod.type}`,
//       );
//     }

//     // ========== STEP 4: Stock Reduce করি ==========
//     console.log("📉 Step 4: Reducing stock...");

//     await stockValidationService.reduceStock(subdomain, payload.items as any);

//     console.log("✅ Stock reduced successfully");

//     // ========== STEP 5: Order Update করি ==========
//     console.log("✏️ Step 5: Updating order status...");

//     const updatedOrder = await Order.findByIdAndUpdate(
//       createdOrder._id,
//       {
//         $set: {
//           orderStatus: "processing",
//           deliveryMethodId: deliveryMethod._id,
//           courierTrackingId: courierTrackingId,
//           courierResponse: courierResponse,
//         },
//       },
//       { new: true, session },
//     ).populate("items.productId");

//     await session.commitTransaction();
//     console.log("✅ Transaction committed successfully!");

//     return updatedOrder;
//   } catch (error) {
//     await session.abortTransaction();
//     console.error("❌ Transaction aborted:", error);
//     throw error;
//   } finally {
//     await session.endSession();
//   }
// };

const createOrderIntoDB = async (
  subdomain: string,
  userId: string | undefined,
  payload: IOrder,
) => {
  const session = await (
    await getTenantModel(subdomain, "Order")
  ).startSession();
  session.startTransaction();

  try {
    console.log("🔄 Starting transaction for order creation");

    const Order = await getTenantModel<IOrder>(subdomain, "Order");

    // ========== STEP 0: Stock Check করি ==========
    console.log("📌 Step 0: Validating stock availability...");

    const stockCheckResult =
      await stockValidationService.checkStockAvailability(
        subdomain,
        payload.items as any,
      );

    if (!stockCheckResult.isAvailable) {
      throw new AppError(
        status.BAD_REQUEST,
        `Insufficient stock: ${JSON.stringify(
          stockCheckResult.unavailableItems,
        )}`,
      );
    }

    console.log("✅ Stock validation passed!");

    // ========== STEP 1: Order তৈরি করি ==========
    console.log("📝 Step 1: Creating order...");

    const orderCount = await Order.countDocuments({}, { session });
    const orderNumber = `${subdomain.toUpperCase()}-ORD-${Date.now()}-${orderCount + 1}`;

    const orderData = {
      // tenantId: subdomain,
      userId: userId ? new Types.ObjectId(userId) : null,
      guestCheckout: payload.guestCheckout,
      guestEmail: payload.guestEmail,
      guestInfo: payload.guestInfo,
      items: payload.items,
      totalPrice: payload.totalPrice,
      paymentMethod: payload.paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending", // ✅ শুধু pending
      orderNumber,
    };

    const [createdOrder] = await Order.create([orderData], { session });

    console.log("✅ Order created:", createdOrder._id);

    // ========== STEP 2: Stock Reduce করি ==========
    console.log("📉 Step 2: Reducing stock...");

    await stockValidationService.reduceStock(subdomain, payload.items as any);

    console.log("✅ Stock reduced successfully");

    await session.commitTransaction();
    console.log("✅ Transaction committed successfully!");

    return createdOrder;
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Transaction aborted:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

// ✅ STEP 2: Single Order কে Courier এ পাঠাই
const submitSingleOrderToCourierInDB = async (
  subdomain: string,
  orderId: string,
) => {
  const session = await (
    await getTenantModel(subdomain, "Order")
  ).startSession();
  session.startTransaction();

  try {
    console.log("🔄 Submitting single order to courier...");

    const Order = await getTenantModel<IOrder>(subdomain, "Order");
    const DeliveryMethod = await getTenantModel<IDeliveryMethod>(
      subdomain,
      "DeliveryMethod",
    );

    const Product = await getTenantModel<TProduct>(subdomain, "Product");

    // ========== Order খুঁজি ==========
    const order = await Order.findOne(
      {
        _id: new Types.ObjectId(orderId),
      },
      null,
      { session },
    ).populate("items.productId");

    if (!order) {
      throw new AppError(status.NOT_FOUND, "Order not found");
    }

    if (order.orderStatus !== "pending") {
      throw new AppError(
        status.BAD_REQUEST,
        `Cannot submit order. Current status: ${order.orderStatus}`,
      );
    }

    // ========== Delivery Method খুঁজি ==========
    const deliveryMethod = await DeliveryMethod.findOne(
      {
        isActive: true,
      },
      null,
      { session },
    );

    if (!deliveryMethod) {
      throw new AppError(
        status.NOT_FOUND,
        "Delivery method not found or inactive",
      );
    }

    // ========== Courier এ পাঠাই ==========
    console.log("🚚 Submitting to courier...");

    let courierTrackingId: string;
    let courierResponse: any;

    if (deliveryMethod.type === "PATHAO") {
      const environment = config.pathao_environment;
      const pathaoService = new PathaoService(environment);

      const guestInfo = order.guestInfo;

      const response = await pathaoService.createOrder(
        parseInt(deliveryMethod.clientStoreId),
        order.orderNumber,
        guestInfo.fullName,
        guestInfo.phone,
        guestInfo.address,
        order.items.length,
        0.5,
        order.totalPrice,
        `Order: ${order.orderNumber}`,
        `Items: ${order.items
          .map((i: any) => i.productId?.name || "Product")
          .join(", ")}`,
      );

      courierTrackingId = response.data.consignment_id;
      courierResponse = {
        consignment_id: response.data.consignment_id,
        merchant_order_id: response.data.merchant_order_id,
        order_status: response.data.order_status,
        delivery_fee: response.data.delivery_fee,
        environment: environment,
        createdAt: new Date(),
      };
    } else {
      throw new AppError(
        status.BAD_REQUEST,
        `Unsupported delivery method: ${deliveryMethod.type}`,
      );
    }

    // ========== Order Update করি ==========
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          orderStatus: "processing",
          deliveryMethodId: deliveryMethod._id,
          courierTrackingId: courierTrackingId,
          courierResponse: courierResponse,
        },
      },
      { new: true, session },
    ).populate("items.productId");

    await session.commitTransaction();
    console.log("✅ Order submitted to courier successfully");

    return updatedOrder;
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Submission failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

// ✅ STEP 3: Multiple Orders কে Courier এ পাঠাই (Bulk)
const submitBulkOrdersToCourierInDB = async (
  subdomain: string,
  orderIds: string[],
) => {
  console.log(`🔄 Submitting ${orderIds.length} orders to courier...`);

  const Order = await getTenantModel<IOrder>(subdomain, "Order");
  const DeliveryMethod = await getTenantModel<IDeliveryMethod>(
    subdomain,
    "DeliveryMethod",
  );
  await getTenantModel(subdomain, "Product");

  const results = {
    successful: [] as any[],
    failed: [] as {
      orderId: string;
      orderNumber: string;
      error: string;
    }[],
  };

  // Delivery Method খুঁজি একবার
  const deliveryMethod = await DeliveryMethod.findOne({
    isActive: true,
  });

  if (!deliveryMethod) {
    throw new AppError(
      status.NOT_FOUND,
      "Delivery method not found or inactive",
    );
  }

  if (deliveryMethod.type !== "PATHAO") {
    throw new AppError(
      status.BAD_REQUEST,
      `Unsupported delivery method: ${deliveryMethod.type}`,
    );
  }

  const environment = config.pathao_environment;

  // this is for sandbox test
  // const pathaoService = new PathaoService(environment, subdomain);

  // this is for live
  const pathaoService = await new PathaoService(environment, subdomain).init();

  // প্রতিটি order এর জন্য loop করি
  for (const orderId of orderIds) {
    const session = await Order.startSession();
    session.startTransaction();

    try {
      console.log(`\n📦 Processing Order: ${orderId}`);

      // Order খুঁজি
      const order = await Order.findOne(
        {
          _id: new Types.ObjectId(orderId),
        },
        null,
        { session },
      ).populate("items.productId");

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.orderStatus !== "pending") {
        throw new Error(`Current status: ${order.orderStatus}`);
      }

      const guestInfo = order.guestInfo;

      // Courier এ পাঠাই
      console.log(`🚚 Submitting to courier...`);

      const response = await pathaoService.createOrder(
        parseInt(deliveryMethod.clientStoreId),
        deliveryMethod.merchantId,
        guestInfo.fullName,
        guestInfo.phone,
        guestInfo.address,
        order.items.length,
        0.5,
        order.totalPrice,
        `Order: ${order.orderNumber}`,
        `Items: ${order.items
          .map((i: any) => i.productId?.name || "Product")
          .join(", ")}`,
      );

      console.log("response", response);

      // Order Update করি
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            orderStatus: "processing",
            deliveryMethodId: deliveryMethod._id,
            courierTrackingId: response.data.consignment_id,
            courierResponse: {
              consignment_id: response.data.consignment_id,
              merchant_order_id: response.data.merchant_order_id,
              order_status: response.data.order_status,
              delivery_fee: response.data.delivery_fee,
              environment: environment,
              createdAt: new Date(),
            },
          },
        },
        { new: true, session },
      ).populate("items.productId");

      await session.commitTransaction();

      console.log(`✅ Order submitted: ${order.orderNumber}`);

      results.successful.push(updatedOrder);
    } catch (error: any) {
      await session.abortTransaction();

      console.error(`❌ Failed to submit order ${orderId}:`, error.message);

      const order = await Order.findById(orderId);

      results.failed.push({
        orderId,
        orderNumber: order?.orderNumber || "Unknown",
        error: error.message,
      });

      throw new AppError(
        status.BAD_REQUEST,
        `${order?.orderNumber} is ${error.message}` || `Something Went Wrong`,
      );
    } finally {
      await session.endSession();
    }
  }

  console.log(
    `\n📊 Bulk submission complete: ${results.successful.length} successful, ${results.failed.length} failed`,
  );

  return results;
};

const getAllOrdersFromDB = async (subdomain: string) => {
  try {
    const Order = await getTenantModel(subdomain, "Order");
    await getTenantModel(subdomain, "Product");

    // যদি authenticated user থাকে, তার orders দেখাবে
    // যদি admin থাকে, সব orders দেখাবে (তার permission থাকলে)

    const orders = await Order.find()
      .populate("items.productId", "name price images")
      .sort({ createdAt: -1 });
    // .populate("userId", "name email")

    return orders;
  } catch (error) {
    throw error;
  }
};

const getOrderByIdFromDB = async (subdomain: string, orderId: string) => {
  try {
    const Order = await getTenantModel(subdomain, "Order");

    const order = await Order.findOne({
      tenantId: subdomain,
      _id: new Types.ObjectId(orderId),
    })
      .populate("userId", "name email phone")
      .populate("items.productId", "name price images sku");

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  } catch (error) {
    throw error;
  }
};

const getGuestOrderFromDB = async (
  subdomain: string,
  email: string,
  orderId: string,
) => {
  try {
    const Order = await getTenantModel(subdomain, "Order");

    // Guest order retrieve (email + orderId verify)
    const order = await Order.findOne({
      tenantId: subdomain,
      _id: new Types.ObjectId(orderId),
      guestCheckout: true,
      guestEmail: email,
    }).populate("items.productId", "name price images sku");

    if (!order) {
      throw new Error("Order not found. Please check your email and order ID");
    }

    return order;
  } catch (error) {
    throw error;
  }
};

// ✅ Improved updateOrderStatusInDB
const updateOrderStatusInDB = async (
  subdomain: string,
  orderId: string,
  orderStatus?: string,
  paymentStatus?: string,
) => {
  const session = await (
    await getTenantModel(subdomain, "Order")
  ).startSession();
  session.startTransaction();

  try {
    console.log("🔄 Updating order status...");
    console.log("Order ID:", orderId);
    console.log("New Order Status:", orderStatus);
    console.log("New Payment Status:", paymentStatus);

    const Order = await getTenantModel<IOrder>(subdomain, "Order");

    // ✅ Step 1: Validate orderId format
    if (!Types.ObjectId.isValid(orderId)) {
      throw new AppError(status.BAD_REQUEST, "Invalid order ID format");
    }

    // ✅ Step 2: Find order with tenantId verification
    const order = await Order.findOne(
      {
        _id: new Types.ObjectId(orderId),
      },
      null,
      { session },
    ).populate("items.productId");

    if (!order) {
      throw new AppError(status.NOT_FOUND, "Order not found");
    }

    console.log(`✅ Order found: ${order.orderNumber}`);
    console.log(`Current status: ${order.orderStatus}`);

    // ✅ Step 3: Validate and apply status updates
    const updateData: any = {};

    if (orderStatus) {
      // Validate status value
      if (!VALID_ORDER_STATUSES.includes(orderStatus)) {
        throw new AppError(
          status.BAD_REQUEST,
          `Invalid order status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}`,
        );
      }

      // Validate status transition
      const allowedTransitions =
        VALID_STATUS_TRANSITIONS[order.orderStatus] || [];

      if (!allowedTransitions.includes(orderStatus)) {
        throw new AppError(
          status.BAD_REQUEST,
          `Cannot transition from "${order.orderStatus}" to "${orderStatus}". Allowed transitions: ${allowedTransitions.join(", ")}`,
        );
      }

      console.log(`✅ Valid transition: ${order.orderStatus} → ${orderStatus}`);

      updateData.orderStatus = orderStatus;

      // ✅ If cancelling, restore stock
      if (orderStatus === "cancelled") {
        console.log("📈 Restoring stock for cancelled order...");

        await stockValidationService.restoreStock(
          subdomain,
          order.items as any,
        );

        console.log("✅ Stock restored");

        updateData.paymentStatus = "failed";
      }
    }

    if (paymentStatus) {
      // Validate payment status
      if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
        throw new AppError(
          status.BAD_REQUEST,
          `Invalid payment status. Must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}`,
        );
      }

      console.log(
        `✅ Payment status: ${order.paymentStatus} → ${paymentStatus}`,
      );

      updateData.paymentStatus = paymentStatus;
    }

    // ✅ Step 4: Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      throw new AppError(status.BAD_REQUEST, "No valid fields to update");
    }

    // ✅ Step 5: Update order with timestamp
    updateData.updatedAt = new Date();

    const updatedOrder = await Order.findOneAndUpdate(
      {
        tenantId: subdomain,
        _id: new Types.ObjectId(orderId),
      },
      { $set: updateData },
      { new: true, session, runValidators: true },
    )
      .populate("items.productId")
      .populate("deliveryMethodId");

    await session.commitTransaction();
    console.log("✅ Order status updated successfully");

    return updatedOrder;
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Error updating order status:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

const cancelOrderInDB = async (subdomain: string, orderId: string) => {
  try {
    const Order = await getTenantModel(subdomain, "Order");

    // Order cancel করার আগে check করুন যে order পাঠানো হয়নি
    const order: IOrder | null = await Order.findOne({
      tenantId: subdomain,
      _id: new Types.ObjectId(orderId),
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.orderStatus === "shipped" || order.orderStatus === "delivered") {
      throw new Error("Cannot cancel shipped or delivered orders");
    }

    // Cancel করুন
    const cancelledOrder = await Order.findOneAndUpdate(
      {
        tenantId: subdomain,
        _id: new Types.ObjectId(orderId),
      },
      {
        orderStatus: "cancelled",
        paymentStatus: "failed",
      },
      { new: true },
    );

    return cancelledOrder;
  } catch (error) {
    throw error;
  }
};

const getDashboardStatsFromDB = async (subdomain: string) => {
  try {
    const Order = await getTenantModel(subdomain, "Order");
    await getTenantModel(subdomain, "Product");

    const allOrders = await Order.find();

    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce(
      (sum: number, o: any) => sum + (o.totalPrice || 0),
      0,
    );

    // unique customers
    const uniqueEmails = new Set(
      allOrders.map((o: any) => o.guestEmail).filter(Boolean),
    );
    const uniqueUserIds = new Set(
      allOrders.map((o: any) => o.userId?.toString()).filter(Boolean),
    );
    const totalCustomers = uniqueEmails.size + uniqueUserIds.size;

    const avgOrderValue =
      totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // order status breakdown
    const statusBreakdown = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    allOrders.forEach((o: any) => {
      if (
        statusBreakdown[o.orderStatus as keyof typeof statusBreakdown] !==
        undefined
      ) {
        statusBreakdown[o.orderStatus as keyof typeof statusBreakdown]++;
      }
    });

    // last 7 days daily orders
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const dailyOrders = last7Days.map((date) => {
      const dayOrders = allOrders.filter((o: any) => {
        const orderDate = new Date(o.createdAt).toISOString().split("T")[0];
        return orderDate === date;
      });
      return {
        date,
        orders: dayOrders.length,
        revenue: dayOrders.reduce(
          (sum: number, o: any) => sum + (o.totalPrice || 0),
          0,
        ),
      };
    });

    // recent 5 orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("items.productId", "name images");

    return {
      totalOrders,
      totalRevenue,
      totalCustomers,
      avgOrderValue,
      statusBreakdown,
      dailyOrders,
      recentOrders,
    };
  } catch (error) {
    throw error;
  }
};

// ✅ Webhook handler
const handleCourierWebhookInDB = async (
  subdomain: string,
  payload: any,
  signature: string,
) => {
  try {
    console.log("🔔 Webhook received");

    // ✅ Signature verify করি
    if (!PathaoService.verifyWebhookSignature(payload, signature)) {
      throw new Error("Invalid webhook signature");
    }

    console.log("✅ Signature verified!");

    const Order = await getTenantModel(subdomain, "Order");

    const { consignment_id, merchant_order_id, event, timestamp } = payload;

    console.log("Processing event:", event);

    // Event map করি
    const statusMap: Record<string, string> = {
      "order.picked-up": "processing",
      "order.in-transit": "shipped",
      "order.delivered": "delivered",
      "order.delivery-failed": "cancelled",
      "order.on-hold": "pending",
    };

    const newStatus = statusMap[event] || "processing";

    // Order update করি
    const order = await Order.findOneAndUpdate(
      {
        tenantId: subdomain,
        orderNumber: merchant_order_id,
      },
      {
        orderStatus: newStatus,
        courierTrackingId: consignment_id,
        courierResponse: {
          event,
          timestamp,
          verifiedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!order) {
      throw new Error("Order not found");
    }

    console.log("✅ Order updated successfully");

    return order;
  } catch (error) {
    console.error("Webhook error:", error);
    throw error;
  }
};

export default {
  // createAndSubmitOrderInDB,
  createOrderIntoDB,
  submitSingleOrderToCourierInDB,
  submitBulkOrdersToCourierInDB,
  getAllOrdersFromDB,
  getOrderByIdFromDB,
  getGuestOrderFromDB,
  updateOrderStatusInDB,
  cancelOrderInDB,
  getDashboardStatsFromDB,
  handleCourierWebhookInDB,
};
