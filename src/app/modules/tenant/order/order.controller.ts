// src/modules/order/order.controller.ts

import { Request, Response, NextFunction } from "express";
import status from "http-status";

import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/SendResponse";
import orderService from "./order.service";
import deliveryMethodService from "../deliveryMethod/deliveryMethod.service";
import config from "../../../config";

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
    const { orderIds, deliveryMethodId } = req.body;

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

    const result = await orderService.getAllOrdersFromDB(subdomain, userId);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "All orders retrieved successfully",
      data: result,
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

const getDashboardStats = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const result = await orderService.getDashboardStatsFromDB(subdomain);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Dashboard stats retrieved successfully",
      data: result,
    });
  },
);

const receivePathaoWebhook = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;

    // ✅ Log করি যে webhook আসছে
    console.log("🔔 Webhook Received:");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);

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

      // ✅ 202 respond করি (Webhook requirement)
      res.status(202).json({
        success: true,
        message: "Webhook received and processing",
        data: result,
        // ✅ Required header (Pathao requirement)
        headers: {
          "X-Pathao-Merchant-Webhook-Integration-Secret": config.webhook_secret,
        },
      });
    } catch (error) {
      console.error("❌ Webhook error:", error);

      // ✅ Even on error, return 202 (Courier requirement)
      res.status(202).json({
        success: false,
        message: "Webhook processing failed",
        error: (error as Error).message,
      });
    }
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
};
