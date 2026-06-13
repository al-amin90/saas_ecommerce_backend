import { Router } from "express";
import { bannerController } from "./banner.controller";
import { bannerValidations } from "./banner.validation";
import validateRequest from "../../../middlewares/validateRequest";
import auth from "../../../middlewares/auth";
import { upload } from "../../../middlewares/multer";

const router = Router();

// public
router.get("/active", bannerController.getActiveBanners);
router.get("/:bannerId", bannerController.getBannerById);

// admin only
router.post(
  "/",
  upload.single("image"),
  validateRequest(bannerValidations.createBannerSchema),
  bannerController.createBanner,
);

router.get("/", bannerController.getAllBanners);

router.patch(
  "/:bannerId",
  upload.single("image"),
  validateRequest(bannerValidations.updateBannerSchema),
  bannerController.updateBanner,
);

router.patch("/:bannerId/toggle", bannerController.toggleBannerStatus);

router.delete("/:bannerId", bannerController.deleteBanner);

export const bannerRouter = router;
