// src/modules/order/order.controller.ts

import { Request, Response, NextFunction } from "express";
import status from "http-status";

import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/SendResponse";
import orderService from "./order.service";

const createOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const userId = req.user?._id; // if authenticated

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

    console.log("req.body", req.body);

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

export const orderController = {
  createOrder,
  getAllOrders,
  getOrderById,
  getGuestOrder,
  updateOrderStatus,
  cancelOrder,
  getDashboardStats,
};
