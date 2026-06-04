import { Router } from "express";
import { sizeChartController } from "./sizeChart.controller";

const router = Router();

router.post("/", sizeChartController.createSizeChart);
router.get("/", sizeChartController.getAllSizeCharts);
router.get("/:chartId", sizeChartController.getSizeChartById);
router.patch("/:chartId", sizeChartController.updateSizeChart);
router.delete("/:chartId", sizeChartController.deleteSizeChart);

export const sizeChartRouter = router;
