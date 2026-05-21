import { Router } from "express";
import validateRequest from "../../../middlewares/validateRequest";
import { deliveryMethodController } from "./deliveryMethod.controller";
import { deliveryMethodValidations } from "./deliveryMethod.validation";

const router = Router();

// ✅ CREATE
router.post(
  "/",
  validateRequest(deliveryMethodValidations.createDeliveryMethodSchema),
  deliveryMethodController.createDeliveryMethod,
);

// ✅ GET ALL
router.get("/", deliveryMethodController.getAllDeliveryMethods);

// ✅ GET SINGLE
router.get(
  "/:deliveryMethodId",
  deliveryMethodController.getDeliveryMethodById,
);

// ✅ UPDATE/PATCH
router.patch(
  "/:deliveryMethodId",
  validateRequest(deliveryMethodValidations.updateDeliveryMethodSchema),
  deliveryMethodController.updateDeliveryMethod,
);

// ✅ DELETE
router.delete(
  "/:deliveryMethodId",
  deliveryMethodController.deleteDeliveryMethod,
);

export const deliveryMethodRouter = router;
