import status from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/SendResponse";
import { productServices } from "./product.service";
import { uploadOnCloudinary } from "../../../utils/cloudinary";

const createProduct = catchAsync(async (req, res, next) => {
  const subdomain = req.headers["x-tenant"] as string;

  if (typeof req.body.variant === "string") {
    req.body.variant = JSON.parse(req.body.variant);
  }

  if (req.body.price) {
    req.body.price = parseFloat(req.body.price);
  }
  if (req.body.discountPrice) {
    req.body.discountPrice = parseFloat(req.body.discountPrice);
  }

  const files = (req.files as Express.Multer.File[]) ?? [];
  const imageUrls: string[] = [];

  if (files) {
    for (const file of files) {
      const url = await uploadOnCloudinary(file.path, "products", subdomain);
      if (url) imageUrls.push(url);
    }
  }

  const productData = {
    ...req.body,
    images: imageUrls,
  };

  const result = await productServices.createProductIntoDB(
    subdomain,
    productData,
  );

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Product created successfully",
    data: result,
  });
});

const getAllProducts = catchAsync(async (req, res, next) => {
  const subdomain = req.headers["x-tenant"] as string;

  const result = await productServices.getAllProductsFromDB(
    subdomain,
    req.query,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Products retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getSingleProduct = catchAsync(async (req, res, next) => {
  const subdomain = req.headers["x-tenant"] as string;

  const result = await productServices.getSingleProductFromDB(
    subdomain,
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Product retrieved successfully",
    data: result,
  });
});

const getProductBySlug = catchAsync(async (req, res, next) => {
  const subdomain = req.headers["x-tenant"] as string;

  const result = await productServices.getProductBySlugFromDB(
    subdomain,
    req.params.slug as string,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Product retrieved successfully",
    data: result,
  });
});

const updateProduct = catchAsync(async (req, res, next) => {
  const subdomain = req.headers["x-tenant"] as string;

  if (req.body.variant && typeof req.body.variant === "string") {
    req.body.variant = JSON.parse(req.body.variant);
  }

  if (req.body.existingImages) {
    req.body.existingImages = Array.isArray(req.body.existingImages)
      ? req.body.existingImages
      : [req.body.existingImages];
  }

  const files = req.files as Express.Multer.File[];

  const result = await productServices.updateProductInDB(
    subdomain,
    req.params.id as string,
    files,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Product updated successfully",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req, res, next) => {
  const subdomain = req.headers["x-tenant"] as string;

  await productServices.deleteProductFromDB(subdomain, req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Product deleted successfully",
    data: {},
  });
});

export const productControllers = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getProductBySlug,
  updateProduct,
  deleteProduct,
};
