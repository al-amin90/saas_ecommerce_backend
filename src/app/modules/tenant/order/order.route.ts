import { Router } from "express";

import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";

import { orderController } from "./order.controller";
import { orderValidations } from "./order.validation";

const router = Router();

router.post(
  "/",
  validateRequest(orderValidations.createOrderSchema),
  orderController.createOrder,
);

router.post(
  "/submit-single",
  validateRequest(orderValidations.submitSingleOrderSchema),
  orderController.submitSingleOrderToCourier,
);

router.post(
  "/submit-bulk",
  validateRequest(orderValidations.submitBulkOrderSchema),
  orderController.submitBulkOrdersToCourier,
);

router.get("/stats", orderController.getDashboardStats);
router.get("/", orderController.getAllOrders);
router.get("/guest", orderController.getGuestOrder);
router.get("/:orderId", orderController.getOrderById);

router.patch("/:orderId/status", orderController.updateOrderStatus);
router.patch("/:orderId/cancel", orderController.cancelOrder);

router.post("/webhook/pathao/:subdomain", orderController.receivePathaoWebhook);
router.get("/report/revenue", orderController.getRevenueReport);

export const orderRouter = router;
