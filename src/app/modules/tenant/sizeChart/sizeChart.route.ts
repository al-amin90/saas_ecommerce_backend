import { Router } from "express";
import { sizeChartController } from "./sizeChart.controller";
import auth from "../../../middlewares/auth";

const router = Router();

router.post("/", auth("admin"), sizeChartController.createSizeChart);
router.get("/", auth("admin"), sizeChartController.getAllSizeCharts);
router.get("/:chartId", auth("admin"), sizeChartController.getSizeChartById);
router.patch("/:chartId", auth("admin"), sizeChartController.updateSizeChart);
router.delete("/:chartId", auth("admin"), sizeChartController.deleteSizeChart);

export const sizeChartRouter = router;
