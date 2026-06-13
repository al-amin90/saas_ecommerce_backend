import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/SendResponse";
import { bannerService } from "./banner.service";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../../utils/cloudinary";
import { TBannerSystem } from "./banner.interface";

const createBanner = catchAsync(async (req: Request, res: Response) => {
  const subdomain = req.headers["x-tenant"] as string;

  let imageUrl: string | undefined;

  if (req.file) {
    const url = await uploadOnCloudinary(req.file.path, "banners", subdomain);
    if (url) imageUrl = url;
  }

  const result = await bannerService.createBannerIntoDB(
    subdomain,
    req.body,
    imageUrl,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Banner created successfully",
    data: result,
  });
});

const getAllBanners = catchAsync(async (req: Request, res: Response) => {
  const subdomain = req.headers["x-tenant"] as string;
  const result = await bannerService.getAllBannersFromDB(subdomain);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banners retrieved successfully",
    data: result,
  });
});

const getActiveBanners = catchAsync(async (req: Request, res: Response) => {
  const subdomain = req.headers["x-tenant"] as string;
  const result = await bannerService.getActiveBannersFromDB(subdomain);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Active banners retrieved successfully",
    data: result,
  });
});

const getBannerById = catchAsync(async (req: Request, res: Response) => {
  const subdomain = req.headers["x-tenant"] as string;
  const result = await bannerService.getBannerByIdFromDB(
    subdomain,
    req.params.bannerId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banner retrieved successfully",
    data: result,
  });
});

const updateBanner = catchAsync(async (req: Request, res: Response) => {
  const subdomain = req.headers["x-tenant"] as string;

  let imageUrl: string | undefined;

  if (req.file) {
    // পুরনো image delete করো
    const existing = await bannerService.getBannerByIdFromDB(
      subdomain,
      req.params.bannerId as string,
    );
    if (existing?.image) {
      await deleteFromCloudinary(existing.image);
    }

    const url = await uploadOnCloudinary(req.file.path, "banners", subdomain);
    if (url) imageUrl = url;
  }

  const result = await bannerService.updateBannerIntoDB(
    subdomain,
    req.params.bannerId as string,
    req.body,
    imageUrl,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banner updated successfully",
    data: result,
  });
});

const toggleBannerStatus = catchAsync(async (req: Request, res: Response) => {
  const subdomain = req.headers["x-tenant"] as string;
  const result = await bannerService.toggleBannerStatusIntoDB(
    subdomain,
    req.params.bannerId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Banner ${result.isActive ? "activated" : "deactivated"} successfully`,
    data: result,
  });
});

const deleteBanner = catchAsync(async (req: Request, res: Response) => {
  const subdomain = req.headers["x-tenant"] as string;

  // image delete করো cloudinary থেকে
  const existing = await bannerService.getBannerByIdFromDB(
    subdomain,
    req.params.bannerId as string,
  );
  if (existing?.image) {
    await deleteFromCloudinary(existing.image);
  }

  await bannerService.deleteBannerFromDB(
    subdomain,
    req.params.bannerId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banner deleted successfully",
    data: null,
  });
});

export const bannerController = {
  createBanner,
  getAllBanners,
  getActiveBanners,
  getBannerById,
  updateBanner,
  toggleBannerStatus,
  deleteBanner,
};
