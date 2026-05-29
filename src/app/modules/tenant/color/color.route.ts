import { Router } from "express";

import auth from "../../../middlewares/auth";
import validateRequest from "../../../middlewares/validateRequest";
import { colorValidations } from "./color.validation";
import { colorControllers } from "./color.controller";

const router = Router();

router.post(
  "/",
  auth("admin"),
  validateRequest(colorValidations.createColorSchema),
  colorControllers.createColor,
);
router.get("/", colorControllers.getAllColor);
router.get("/:id", colorControllers.getSingleColor);
router.patch(
  "/:id",
  auth("admin"),
  validateRequest(colorValidations.updateCategorySchema),
  colorControllers.updateColor,
);
router.delete("/:id", colorControllers.deleteColor);

export const colorRouter = router;
