import { getTenantModel } from "../../../utils/getTenantModel";
import { ISizeChart } from "./sizeChart.interface";

const createSizeChartIntoDB = async (
  subdomain: string,
  payload: Partial<ISizeChart>,
) => {
  const SizeChart = await getTenantModel(subdomain, "SizeChart");
  return await SizeChart.create(payload);
};

const getAllSizeChartsFromDB = async (subdomain: string) => {
  const SizeChart = await getTenantModel(subdomain, "SizeChart");
  return await SizeChart.find({ isDeleted: false }).sort({ createdAt: -1 });
};

const getSizeChartByIdFromDB = async (subdomain: string, chartId: string) => {
  const SizeChart = await getTenantModel(subdomain, "SizeChart");
  const chart = await SizeChart.findOne({ _id: chartId, isDeleted: false });
  if (!chart) throw new Error("Size chart not found");
  return chart;
};

const updateSizeChartIntoDB = async (
  subdomain: string,
  chartId: string,
  payload: Partial<ISizeChart>,
) => {
  const SizeChart = await getTenantModel(subdomain, "SizeChart");
  const chart = await SizeChart.findOneAndUpdate(
    { _id: chartId, isDeleted: false },
    payload,
    { new: true },
  );
  if (!chart) throw new Error("Size chart not found");
  return chart;
};

const deleteSizeChartFromDB = async (subdomain: string, chartId: string) => {
  const SizeChart = await getTenantModel(subdomain, "SizeChart");
  const chart = await SizeChart.findOneAndUpdate(
    { _id: chartId },
    { isDeleted: true },
    { new: true },
  );
  if (!chart) throw new Error("Size chart not found");
  return chart;
};

export const sizeChartService = {
  createSizeChartIntoDB,
  getAllSizeChartsFromDB,
  getSizeChartByIdFromDB,
  updateSizeChartIntoDB,
  deleteSizeChartFromDB,
};
