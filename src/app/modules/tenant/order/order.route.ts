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

router.get("/stats", orderController.getDashboardStats);
router.get("/", orderController.getAllOrders);
router.get("/guest", orderController.getGuestOrder);
router.get("/:orderId", orderController.getOrderById);

router.patch(
  "/:orderId/status",

  orderController.updateOrderStatus,
);
router.patch(
  "/:orderId/cancel",

  orderController.cancelOrder,
);

export const orderRouter = router;
