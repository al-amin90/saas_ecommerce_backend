// src/modules/order/order.service.ts

import config from "../../../config";
import { getTenantModel } from "../../../utils/getTenantModel";
import PathaoService from "../courier/pathao.service";
import { IDeliveryMethod } from "../deliveryMethod/deliveryMethod.interface";
import { DateRange, IOrder } from "./order.interface";

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
import {
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  subYears,
  startOfYear,
  startOfMonth,
} from "date-fns";

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
      const pathaoService = new PathaoService(environment, subdomain);

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
const getAllOrdersFromDB = async (
  subdomain: string,
  query: {
    page?: number;
    limit?: number;
    orderStatus?: string;
    paymentStatus?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  },
) => {
  try {
    const Order = await getTenantModel(subdomain, "Order");
    await getTenantModel(subdomain, "Product");
    await getTenantModel(subdomain, "Color");

    const {
      page = 1,
      limit = 10,
      orderStatus = "pending",
      paymentStatus,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const skip = (page - 1) * limit;

    // ── Filter ──────────────────────────────────────────────────────────────
    const filter: any = {};
    if (orderStatus && orderStatus !== "all") filter.orderStatus = orderStatus;
    if (paymentStatus && paymentStatus !== "all")
      filter.paymentStatus = paymentStatus;

    // ── Sort ─────────────────────────────────────────────────────────────────
    const sort: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // ── Queries parallel ─────────────────────────────────────────────────────
    const [orders, total, statusCounts] = await Promise.all([
      Order.find(filter)
        .populate([
          { path: "items.productId", select: "name price images" },
          { path: "items.colorId", select: "name color" },
        ])
        .sort(sort)
        .skip(skip)
        .limit(limit),

      Order.countDocuments(filter),

      // meta — সব status count (filter ছাড়া)
      Order.aggregate([
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ]),
    ]);

    // aggregate result কে flat object এ convert
    const statusMap: Record<string, number> = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    statusCounts.forEach((s: any) => {
      if (statusMap[s._id] !== undefined) statusMap[s._id] = s.count;
    });

    return {
      orders,
      meta: {
        total,
        page,
        limit,
        totalPage: Math.ceil(total / limit),
        ...statusMap,
      },
    };
  } catch (error) {
    throw error;
  }
};

const getOrderByIdFromDB = async (subdomain: string, orderId: string) => {
  try {
    const Order = await getTenantModel(subdomain, "Order");
    await getTenantModel(subdomain, "User");
    await getTenantModel(subdomain, "Product");

    const order = await Order.findOne({
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
        _id: new Types.ObjectId(orderId),
      },
      { $set: updateData },
      { new: true, session, runValidators: true },
    ).populate("items.productId");

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

const getDateRangeFilter = (range: DateRange) => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date();

  switch (range) {
    case "today":
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;

    case "yesterday":
      startDate = startOfDay(subDays(now, 1));
      endDate = endOfDay(subDays(now, 1));
      break;

    case "last7days":
      startDate = subDays(now, 6);
      startDate = startOfDay(startDate);
      endDate = endOfDay(now);
      break;

    case "last15days":
      startDate = subDays(now, 14);
      startDate = startOfDay(startDate);
      endDate = endOfDay(now);
      break;

    case "last30days":
      startDate = subDays(now, 29);
      startDate = startOfDay(startDate);
      endDate = endOfDay(now);
      break;

    case "lastMonth":
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfDay(subMonths(now, 1));
      break;

    case "thisYear":
      startDate = startOfYear(now);
      endDate = endOfDay(now);
      break;

    case "lastYear":
      startDate = startOfYear(subYears(now, 1));
      endDate = endOfDay(subYears(now, 1));
      break;

    case "lifetime":
    default:
      startDate = new Date(0); // Beginning of time
      endDate = endOfDay(now);
      break;
  }

  return { startDate, endDate };
};

const getDashboardStatsFromDB = async (
  subdomain: string,
  dateRange: DateRange = "lifetime",
) => {
  try {
    const Order = await getTenantModel(subdomain, "Order");
    await getTenantModel(subdomain, "Product");

    const { startDate, endDate } = getDateRangeFilter(dateRange);

    // Build query filter
    const dateFilter =
      dateRange === "lifetime"
        ? {}
        : {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          };

    // Get all orders within date range
    const allOrders = await Order.find(dateFilter);

    // Calculate totals
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce(
      (sum: number, o: any) => sum + (o.totalPrice || 0),
      0,
    );

    // Unique customers
    const uniqueEmails = new Set(
      allOrders.map((o: any) => o.guestEmail).filter(Boolean),
    );
    const uniqueUserIds = new Set(
      allOrders.map((o: any) => o.userId?.toString()).filter(Boolean),
    );
    const totalCustomers = uniqueEmails.size + uniqueUserIds.size;

    // Average order value
    const avgOrderValue =
      totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Order status breakdown
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

    // Generate date range for daily orders chart
    let dailyOrders: any[] = [];

    if (dateRange === "last7days") {
      // Last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(endDate, 6 - i);
        return d.toISOString().split("T")[0];
      });

      dailyOrders = last7Days.map((date) => {
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
    } else if (dateRange === "last30days" || dateRange === "last15days") {
      // For 15 or 30 days, group by day
      const daysCount = dateRange === "last30days" ? 30 : 15;
      const daysArray = Array.from({ length: daysCount }, (_, i) => {
        const d = subDays(endDate, daysCount - 1 - i);
        return d.toISOString().split("T")[0];
      });

      dailyOrders = daysArray.map((date) => {
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
    } else if (dateRange === "thisYear" || dateRange === "lastYear") {
      // For years, group by month
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      dailyOrders = months.map((month, index) => {
        const monthOrders = allOrders.filter((o: any) => {
          const orderDate = new Date(o.createdAt);
          return orderDate.getMonth() === index;
        });
        return {
          date: month,
          orders: monthOrders.length,
          revenue: monthOrders.reduce(
            (sum: number, o: any) => sum + (o.totalPrice || 0),
            0,
          ),
        };
      });
    } else if (dateRange === "lastMonth") {
      // For single month, group by day
      const daysInMonth = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        0,
      ).getDate();
      const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      dailyOrders = daysArray.map((day) => {
        const dayOrders = allOrders.filter((o: any) => {
          const orderDate = new Date(o.createdAt);
          return (
            orderDate.getDate() === day &&
            orderDate.getMonth() === startDate.getMonth()
          );
        });
        return {
          date: `${startDate.toLocaleString("default", { month: "short" })} ${day}`,
          orders: dayOrders.length,
          revenue: dayOrders.reduce(
            (sum: number, o: any) => sum + (o.totalPrice || 0),
            0,
          ),
        };
      });
    } else {
      // For lifetime or other ranges, show last 30 days summary
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = subDays(endDate, 29 - i);
        return d.toISOString().split("T")[0];
      });

      dailyOrders = last30Days.map((date) => {
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
    }

    // Recent 5 orders within date range
    const recentOrders = await Order.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("items.productId", "name images");

    // Additional insights
    const topProducts = await getTopProducts(allOrders, 5);
    const paymentMethodBreakdown = getPaymentMethodBreakdown(allOrders);

    return {
      dateRange,
      dateRangeDisplay: getDateRangeDisplay(dateRange, startDate, endDate),
      summary: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        avgOrderValue,
      },
      breakdown: {
        status: statusBreakdown,
        paymentMethod: paymentMethodBreakdown,
        topProducts,
      },
      charts: {
        dailyOrders,
      },
      recentOrders,
    };
  } catch (error) {
    throw error;
  }
};

// Helper: Get top products
const getTopProducts = async (orders: any[], limit: number) => {
  const productMap = new Map();

  orders.forEach((order) => {
    order.items?.forEach((item: any) => {
      const productId =
        item.productId?._id?.toString() || item.productId?.toString();
      if (productId) {
        const existing = productMap.get(productId) || {
          productId,
          name: item.productId?.name || "Unknown Product",
          image: item.productId?.images?.[0] || null,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += (item.price || 0) * item.quantity;
        productMap.set(productId, existing);
      }
    });
  });

  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
};

// Helper: Get payment method breakdown
const getPaymentMethodBreakdown = (orders: any[]) => {
  const breakdown: any = {};

  orders.forEach((order) => {
    const method = order.paymentMethod || "unknown";
    breakdown[method] = (breakdown[method] || 0) + 1;
  });

  return breakdown;
};

// Helper: Get human readable date range display
const getDateRangeDisplay = (
  range: DateRange,
  startDate: Date,
  endDate: Date,
) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  switch (range) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "last7days":
      return "Last 7 Days";
    case "last15days":
      return "Last 15 Days";
    case "last30days":
      return "Last 30 Days";
    case "lastMonth":
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    case "thisYear":
      return `This Year (${startDate.getFullYear()})`;
    case "lastYear":
      return `Last Year (${startDate.getFullYear()})`;
    case "lifetime":
      return "Lifetime";
    default:
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
};

const getRevenueReportFromDB = async (
  subdomain: string,
  type: "monthly" | "yearly" | "daily",
  years?: number[],
  months?: number[],
  startDate?: string,
  endDate?: string,
) => {
  try {
    const Order = await getTenantModel(subdomain, "Order");
    await getTenantModel(subdomain, "Product");

    const matchQuery: any = {
      orderStatus: { $in: ["delivered", "processing", "shipped"] },
    };

    // date range filter
    if (startDate && endDate) {
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const orders = await Order.find(matchQuery).populate(
      "items.productId",
      "price discountPrice originalPrice name",
    );

    console.log("orders", orders);

    const calcProfit = (item: any) => {
      const product = item.productId;
      if (!product) return 0;
      return (item.price - (product.originalPrice ?? 0)) * item.quantity;
    };

    const calcRevenue = (item: any) => item.price * item.quantity;

    // ── Daily ────────────────────────────────────────────────────────────────
    if (type === "daily" && startDate && endDate) {
      const dailyData: Record<
        string,
        { revenue: number; profit: number; orders: number }
      > = {};

      // start থেকে end পর্যন্ত সব date initialize করো
      const start = new Date(startDate);
      const end = new Date(endDate);
      const current = new Date(start);

      while (current <= end) {
        const key = current.toISOString().split("T")[0];
        dailyData[key] = { revenue: 0, profit: 0, orders: 0 };
        current.setDate(current.getDate() + 1);
      }

      orders.forEach((order: any) => {
        const key = new Date(order.createdAt).toISOString().split("T")[0];
        if (!dailyData[key]) return;

        order.items.forEach((item: any) => {
          dailyData[key].revenue += calcRevenue(item);
          dailyData[key].profit += calcProfit(item);
        });
        dailyData[key].orders += 1;
      });

      const result = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, val]) => ({
          label: date,
          displayLabel: new Date(date).toLocaleDateString("en-BD", {
            month: "short",
            day: "numeric",
          }),
          revenue: Math.round(val.revenue),
          profit: Math.round(val.profit),
          orders: val.orders,
        }));

      const totalRevenue = result.reduce((s, r) => s + r.revenue, 0);
      const totalProfit = result.reduce((s, r) => s + r.profit, 0);
      const totalOrders = result.reduce((s, r) => s + r.orders, 0);

      return {
        type: "daily",
        startDate,
        endDate,
        data: result,
        totalRevenue,
        totalProfit,
        totalOrders,
      };
    }

    // ── Monthly ───────────────────────────────────────────────────────────────
    if (type === "monthly") {
      const targetYear = years?.[0] ?? new Date().getFullYear();
      const MONTHS = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const monthlyData: Record<
        string,
        { revenue: number; profit: number; orders: number }
      > = {};
      MONTHS.forEach((m) => {
        monthlyData[m] = { revenue: 0, profit: 0, orders: 0 };
      });

      orders.forEach((order: any) => {
        const orderDate = new Date(order.createdAt);
        if (orderDate.getFullYear() !== targetYear) return;
        const orderMonth = orderDate.getMonth();
        if (months && months.length > 0 && !months.includes(orderMonth + 1))
          return;

        const key = MONTHS[orderMonth];
        order.items.forEach((item: any) => {
          monthlyData[key].revenue += calcRevenue(item);
          monthlyData[key].profit += calcProfit(item);
        });
        monthlyData[key].orders += 1;
      });

      const result = MONTHS.filter(
        (m) => !months?.length || months.includes(MONTHS.indexOf(m) + 1),
      ).map((month) => ({
        label: month,
        displayLabel: month,
        revenue: Math.round(monthlyData[month].revenue),
        profit: Math.round(monthlyData[month].profit),
        orders: monthlyData[month].orders,
      }));

      const totalRevenue = result.reduce((s, r) => s + r.revenue, 0);
      const totalProfit = result.reduce((s, r) => s + r.profit, 0);
      const totalOrders = result.reduce((s, r) => s + r.orders, 0);

      return {
        type: "monthly",
        year: targetYear,
        data: result,
        totalRevenue,
        totalProfit,
        totalOrders,
      };
    }

    // ── Yearly ────────────────────────────────────────────────────────────────
    if (type === "yearly") {
      const yearlyData: Record<
        number,
        { revenue: number; profit: number; orders: number }
      > = {};
      years?.forEach((y) => {
        yearlyData[y] = { revenue: 0, profit: 0, orders: 0 };
      });

      orders.forEach((order: any) => {
        const orderYear = new Date(order.createdAt).getFullYear();
        if (years?.length && !years.includes(orderYear)) return;
        if (!yearlyData[orderYear])
          yearlyData[orderYear] = { revenue: 0, profit: 0, orders: 0 };

        order.items.forEach((item: any) => {
          yearlyData[orderYear].revenue += calcRevenue(item);
          yearlyData[orderYear].profit += calcProfit(item);
        });
        yearlyData[orderYear].orders += 1;
      });

      const result = Object.entries(yearlyData)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([year, val]) => ({
          label: year,
          displayLabel: String(year),
          revenue: Math.round(val.revenue),
          profit: Math.round(val.profit),
          orders: val.orders,
        }));

      const totalRevenue = result.reduce((s, r) => s + r.revenue, 0);
      const totalProfit = result.reduce((s, r) => s + r.profit, 0);
      const totalOrders = result.reduce((s, r) => s + r.orders, 0);

      return {
        type: "yearly",
        data: result,
        totalRevenue,
        totalProfit,
        totalOrders,
      };
    }
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

    console.log("📨 Webhook received:", {
      event: payload.event,
      merchant_order_id: payload.merchant_order_id,
      consignment_id: payload.consignment_id,
    });

    // 1. Verify webhook signature
    const isValid = PathaoService.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      console.error("❌ Invalid webhook signature");
      throw new Error("Invalid webhook signature");
    }

    console.log("✅ Signature verified!");
    // 2. Find order by orderNumber (which you sent as merchant_order_id)
    const Order = await getTenantModel<IOrder>(subdomain, "Order");
    const order = await Order.findOne({
      orderNumber: payload.merchant_order_id,
    });

    // if (!order) {
    //   console.error(`❌ Order not found: ${payload.merchant_order_id}`);

    //   throw new AppError(404, "Order not found");
    // }

    console.log(
      `✅ Order found: ${order.orderNumber} (Current status: ${order.orderStatus})`,
    );

    // 3. Update order status based on webhook event
    let newStatus = order.orderStatus;
    let updateData: any = {};

    switch (payload.event) {
      case "order.created":
        newStatus = "processing";
        updateData = {
          "courierResponse.consignment_id": payload.consignment_id,
          "courierResponse.updated_at": payload.updated_at,
          "courierResponse.delivery_fee": payload.delivery_fee,
        };
        console.log(`📦 Order ${order.orderNumber} created in courier system`);
        break;

      case "order.accepted":
        newStatus = "processing";
        updateData = {
          "courierResponse.accepted_at": payload.updated_at,
        };
        console.log(`✅ Order ${order.orderNumber} accepted by courier`);
        break;

      case "order.picked":
        newStatus = "shipped";
        updateData = {
          "courierResponse.picked_at": payload.updated_at,
        };
        console.log(`🚚 Order ${order.orderNumber} picked up for delivery`);
        break;

      case "order.delivered":
        newStatus = "delivered";
        updateData = {
          "courierResponse.delivered_at": payload.updated_at,
        };
        console.log(`✅ Order ${order.orderNumber} delivered successfully!`);
        break;

      case "order.cancelled":
        newStatus = "cancelled";
        updateData = {
          "courierResponse.cancelled_at": payload.updated_at,
        };
        console.log(`❌ Order ${order.orderNumber} cancelled by courier`);
        break;

      case "order.returned":
        newStatus = "returned";
        updateData = {
          "courierResponse.returned_at": payload.updated_at,
        };
        console.log(`🔄 Order ${order.orderNumber} returned`);
        break;

      case "order.paid":
        newStatus = "returned";
        updateData = {
          "courierResponse.returned_at": payload.updated_at,
        };
        console.log(`🔄 Order ${order.orderNumber} returned`);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${payload.event}`);
        return;
    }

    // 4. Update order in database
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          orderStatus: newStatus,
          ...updateData,
          "courierResponse.last_event": payload.event,
          "courierResponse.last_update": new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    console.log(`✅ Order updated to ${newStatus}`);

    // 5. (Optional) Send notification to user
    // await sendOrderStatusNotification(updatedOrder, newStatus);

    console.log("✅ Order updated successfully");

    return updatedOrder;
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
  getRevenueReportFromDB,
};
