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
  auth("admin"),
  validateRequest(orderValidations.submitSingleOrderSchema),
  orderController.submitSingleOrderToCourier,
);

router.post(
  "/submit-bulk",
  auth("admin"),
  validateRequest(orderValidations.submitBulkOrderSchema),
  orderController.submitBulkOrdersToCourier,
);

router.get("/stats", auth("admin"), orderController.getDashboardStats);
router.get("/", auth("admin"), orderController.getAllOrders);
router.get("/guest", orderController.getGuestOrder);
router.get("/:orderId", orderController.getOrderById);

router.patch(
  "/:orderId/status",
  auth("admin"),
  orderController.updateOrderStatus,
);
router.patch("/:orderId/cancel", auth("admin"), orderController.cancelOrder);

router.get("/report/revenue", auth("admin"), orderController.getRevenueReport);

// webhook here
router.post("/webhook/pathao/:subdomain", orderController.receivePathaoWebhook);
router.post(
  "/webhook/steadfast/:subdomain",
  orderController.receiveSteadfastWebhook,
);
export const orderRouter = router;
