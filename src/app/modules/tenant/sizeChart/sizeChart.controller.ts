import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/SendResponse";
import { sizeChartService } from "./sizeChart.service";

const createSizeChart = catchAsync(async (req, res) => {
  const subdomain = req.headers["x-tenant"] as string;
  const result = await sizeChartService.createSizeChartIntoDB(
    subdomain,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Size chart created successfully",
    data: result,
  });
});

const getAllSizeCharts = catchAsync(async (req, res) => {
  const subdomain = req.headers["x-tenant"] as string;
  const result = await sizeChartService.getAllSizeChartsFromDB(subdomain);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Size charts retrieved successfully",
    data: result,
  });
});

const getSizeChartById = catchAsync(async (req, res) => {
  const subdomain = req.headers["x-tenant"] as string;
  const result = await sizeChartService.getSizeChartByIdFromDB(
    subdomain,
    req.params.chartId as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Size chart retrieved successfully",
    data: result,
  });
});

const updateSizeChart = catchAsync(async (req, res) => {
  const subdomain = req.headers["x-tenant"] as string;
  const result = await sizeChartService.updateSizeChartIntoDB(
    subdomain,
    req.params.chartId as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Size chart updated successfully",
    data: result,
  });
});

const deleteSizeChart = catchAsync(async (req, res) => {
  const subdomain = req.headers["x-tenant"] as string;
  await sizeChartService.deleteSizeChartFromDB(
    subdomain,
    req.params.chartId as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Size chart deleted successfully",
    data: null,
  });
});

export const sizeChartController = {
  createSizeChart,
  getAllSizeCharts,
  getSizeChartById,
  updateSizeChart,
  deleteSizeChart,
};
