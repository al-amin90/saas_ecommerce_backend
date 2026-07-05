import { Router } from "express";
import validateRequest from "../../../middlewares/validateRequest";
import { deliveryMethodController } from "./deliveryMethod.controller";
import { deliveryMethodValidations } from "./deliveryMethod.validation";
import auth from "../../../middlewares/auth";

const router = Router();

// ✅ CREATE
router.post(
  "/",
  auth("admin"),
  validateRequest(deliveryMethodValidations.createDeliveryMethodSchema),
  deliveryMethodController.createDeliveryMethod,
);

// ✅ GET ALL
router.get("/", auth("admin"), deliveryMethodController.getAllDeliveryMethods);

// ✅ GET SINGLE
router.get(
  "/:deliveryMethodId",
  auth("admin"),
  deliveryMethodController.getDeliveryMethodById,
);

// ✅ UPDATE/PATCH
router.patch(
  "/:deliveryMethodId",
  auth("admin"),
  validateRequest(deliveryMethodValidations.updateDeliveryMethodSchema),
  deliveryMethodController.updateDeliveryMethod,
);

// ✅ DELETE
router.delete(
  "/:deliveryMethodId",
  auth("admin"),
  deliveryMethodController.deleteDeliveryMethod,
);

export const deliveryMethodRouter = router;
