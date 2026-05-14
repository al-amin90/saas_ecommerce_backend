import { Request, Response, NextFunction } from "express";
import status from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/SendResponse";
import deliveryMethodService from "./deliveryMethod.service";
import config from "../../../config";

// ✅ CREATE - নতুন Delivery Method তৈরি
const createDeliveryMethod = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;

    const result = await deliveryMethodService.createDeliveryMethodInDB(
      subdomain,
      req.body,
    );

    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: "Delivery method created successfully",
      data: result,
    });
  },
);

// ✅ GET ALL - সব Delivery Methods পাই
const getAllDeliveryMethods = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const { isActive, type } = req.query;

    const filters = {
      isActive: isActive ? isActive === "true" : undefined,
      type: type as string | undefined,
    };

    const result = await deliveryMethodService.getAllDeliveryMethodsFromDB(
      subdomain,
      filters,
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "All delivery methods retrieved successfully",
      data: result,
    });
  },
);

// ✅ GET SINGLE - একটি Delivery Method পাই
const getDeliveryMethodById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const { deliveryMethodId } = req.params;

    const result = await deliveryMethodService.getDeliveryMethodByIdFromDB(
      subdomain,
      deliveryMethodId as string,
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Delivery method retrieved successfully",
      data: result,
    });
  },
);

// ✅ UPDATE/PATCH - Delivery Method আপডেট করি
const updateDeliveryMethod = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const { deliveryMethodId } = req.params;

    const result = await deliveryMethodService.updateDeliveryMethodInDB(
      subdomain,
      deliveryMethodId as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Delivery method updated successfully",
      data: result,
    });
  },
);

// ✅ DELETE - Delivery Method ডিলিট করি
const deleteDeliveryMethod = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const subdomain = req.headers["x-tenant"] as string;
    const { deliveryMethodId } = req.params;

    const result = await deliveryMethodService.deleteDeliveryMethodFromDB(
      subdomain,
      deliveryMethodId as string,
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Delivery method deleted successfully",
      data: null,
    });
  },
);

const receiveCourierWebhook = catchAsync(
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
      const result = await deliveryMethodService.handleCourierWebhookInDB(
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

export const deliveryMethodController = {
  createDeliveryMethod,
  getAllDeliveryMethods,
  getDeliveryMethodById,
  updateDeliveryMethod,
  deleteDeliveryMethod,
  receiveCourierWebhook,
};
