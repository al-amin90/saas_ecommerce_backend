// src/modules/order/order.controller.ts

import { Request, Response, NextFunction } from "express";
import status from "http-status";

import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/SendResponse";
import orderService from "./order.service";
import deliveryMethodService from "../deliveryMethod/deliveryMethod.service";
import config from "../../../config";
import AppError from "../../../errors/AppError";
import { DateRange } from "./order.interface";

const createOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const userId = req.user?._id; // if authenticated

    // const result = await orderService.createOrderIntoDB(
    //   subdomain,
    //   userId,
    //   req.body,
    // );
    const result = await orderService.createOrderIntoDB(
      subdomain,
      userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: "Order created successfully",
      data: result,
    });
  },
);

// ✅ Submit Single Order to Courier
const submitSingleOrderToCourier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const { orderId } = req.body;

    console.log("🚚 Submitting single order to courier...");

    const result = await orderService.submitSingleOrderToCourierInDB(
      subdomain,
      orderId,
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Order submitted to courier successfully",
      data: result,
    });
  },
);

// ✅ Submit Bulk Orders to Courier
const submitBulkOrdersToCourier = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const { orderIds } = req.body;

    console.log(`🚚 Submitting ${orderIds.length} orders to courier...`);

    const result = await orderService.submitBulkOrdersToCourierInDB(
      subdomain,
      orderIds,
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Bulk orders submitted",
      data: result,
    });
  },
);

const getAllOrders = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const userId = req.user?._id; // if authenticated

    const { page, limit, orderStatus, paymentStatus, sortBy, sortOrder } =
      req.query;

    const result = await orderService.getAllOrdersFromDB(subdomain, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      orderStatus: orderStatus as string,
      paymentStatus: paymentStatus as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    });

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "All orders retrieved successfully",
      data: result.orders,
      meta: result.meta,
    });
  },
);

const getOrderById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const { orderId } = req.params;

    const result = await orderService.getOrderByIdFromDB(
      subdomain,
      orderId as string,
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Order retrieved successfully",
      data: result,
    });
  },
);

const getGuestOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const { email, orderId } = req.query;

    const result = await orderService.getGuestOrderFromDB(
      subdomain,
      email as string,
      orderId as string,
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Guest order retrieved successfully",
      data: result,
    });
  },
);

const updateOrderStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const orderId = req.params?.orderId as string;
    const { orderStatus, paymentStatus } = req.body;

    const result = await orderService.updateOrderStatusInDB(
      subdomain,
      orderId,
      orderStatus,
      paymentStatus,
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Order status updated successfully",
      data: result,
    });
  },
);

const cancelOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const orderId = req.params?.orderId as string;

    const result = await orderService.cancelOrderInDB(subdomain, orderId);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Order cancelled successfully",
      data: result,
    });
  },
);

const getDashboardStats = catchAsync(async (req, res) => {
  const subdomain = req.headers["x-tenant"] as string;

  const { dateRange = "lifetime" } = req.query;

  // Validate dateRange parameter
  const validRanges = [
    "today",
    "yesterday",
    "last7days",
    "last15days",
    "last30days",
    "lastMonth",
    "thisYear",
    "lastYear",
    "lifetime",
  ];

  if (!validRanges.includes(dateRange as string)) {
    throw new AppError(400, "Invalid date range parameter");
  }

  const result = await orderService.getDashboardStatsFromDB(
    subdomain,
    dateRange as DateRange,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Dashboard stats retrieved successfully",
    data: result,
  });
});

const receivePathaoWebhook = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain =
      (req.headers["x-tenant"] as string) || (req.params.subdomain as string);

    // ✅ Log করি যে webhook আসছে
    console.log("🔔 Webhook Received:");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    console.log("subdomain:", subdomain);

    const payload = req.body;

    // ✅ Webhook signature verify করি
    const webhookSignature = req.headers["x-pathao-signature"] as string;
    console.log("Signature received:", webhookSignature);

    try {
      const result = await orderService.handleCourierWebhookInDB(
        subdomain,
        payload,
        webhookSignature,
      );

      res.setHeader(
        "X-Pathao-Merchant-Webhook-Integration-Secret",
        config.webhook_secret as string,
      );

      // ✅ 202 respond করি (Webhook requirement)
      res.status(202).json({
        success: true,
        message: "Webhook received and processing",
        // data: result,
        // ✅ Required header (Pathao requirement)
        headers: {
          "X-Pathao-Merchant-Webhook-Integration-Secret": config.webhook_secret,
        },
      });
    } catch (error) {
      console.error("❌ Webhook error:", error);
      res.setHeader(
        "X-Pathao-Merchant-Webhook-Integration-Secret",
        config.webhook_secret as string,
      );

      // ✅ Even on error, return 202 (Courier requirement)
      res.status(202).json({
        success: false,
        message: "Webhook processing failed",
        error: (error as Error).message,
      });
    }
  },
);

const getRevenueReport = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const { type, years, months, startDate, endDate } = req.query;

    const parsedYears = years
      ? String(years).split(",").map(Number)
      : undefined;
    const parsedMonths = months
      ? String(months).split(",").map(Number)
      : undefined;

    console.log("parsedMonths", parsedMonths);

    const result = await orderService.getRevenueReportFromDB(
      subdomain,
      (type as "monthly" | "yearly" | "daily") ?? "monthly",
      parsedYears,
      parsedMonths,
      startDate as string | undefined,
      endDate as string | undefined,
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Revenue report retrieved successfully",
      data: result,
    });
  },
);

export const orderController = {
  createOrder,
  submitSingleOrderToCourier,
  submitBulkOrdersToCourier,
  getAllOrders,
  getOrderById,
  getGuestOrder,
  updateOrderStatus,
  cancelOrder,
  getDashboardStats,
  receivePathaoWebhook,
  getRevenueReport,
};
