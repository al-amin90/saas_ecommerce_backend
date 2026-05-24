import status from "http-status";
import AppError from "../../../errors/AppError";
import { getTenantModel } from "../../../utils/getTenantModel";
import { TProduct, TVariant } from "../product/product.interface";
import { Types } from "mongoose";
import { TColor } from "../color/color.interface";

interface StockCheckItem {
  productId: string;
  quantity: number;
  selectedSize: string;
  colorId: Types.ObjectId;
}

interface StockCheckResult {
  isAvailable: boolean;
  message?: string;
  unavailableItems?: {
    productName: string;
    requestedQuantity: number;
    availableQuantity: number;
  }[];
}

const checkStockAvailability = async (
  subdomain: string,
  items: StockCheckItem[],
): Promise<StockCheckResult> => {
  const Product = await getTenantModel<TProduct>(subdomain, "Product");

  const unavailableItems = [];

  for (const item of items) {
    if (!Types.ObjectId.isValid(item.productId)) {
      throw new AppError(
        status.BAD_REQUEST,
        `Invalid product ID: ${item.productId}`,
      );
    }

    if (!Types.ObjectId.isValid(item.colorId)) {
      throw new AppError(
        status.BAD_REQUEST,
        `Invalid color ID: ${item.colorId}`,
      );
    }

    const product = await Product.findOne({
      _id: new Types.ObjectId(item.productId),
      isDeleted: false,
      isActive: true,
    });

    if (!product) {
      throw new AppError(
        status.NOT_FOUND,
        `Product not found: ${item.productId}`,
      );
    }

    // ── সরাসরি _id দিয়ে variant খোঁজো ──
    const variantIndex = product.variant.findIndex(
      (v: TVariant) =>
        v.color && v.color.toString() === item.colorId.toString(),
    );

    if (variantIndex === -1) {
      throw new AppError(
        status.BAD_REQUEST,
        `Color not available for product: ${product.name}`,
      );
    }

    const variant = product.variant[variantIndex];
    const sizeNum = parseInt(item.selectedSize);

    if (isNaN(sizeNum)) {
      throw new AppError(
        status.BAD_REQUEST,
        `Invalid size format: ${item.selectedSize}`,
      );
    }

    const sizeStock = variant.stock.find((s) => s.size === sizeNum);

    if (!sizeStock) {
      throw new AppError(
        status.BAD_REQUEST,
        `Size ${item.selectedSize} not available for ${product.name}. Available sizes: ${variant.stock.map((s) => s.size).join(", ")}`,
      );
    }

    if (sizeStock.quantity < item.quantity) {
      unavailableItems.push({
        productName: product.name,
        requestedQuantity: item.quantity,
        availableQuantity: sizeStock.quantity,
      });
    }
  }

  if (unavailableItems.length > 0) {
    return {
      isAvailable: false,
      message: "Insufficient stock for some items",
      unavailableItems,
    };
  }

  return {
    isAvailable: true,
    message: "All items are available",
  };
};

// ✅ Stock reduce করি
const reduceStock = async (
  subdomain: string,
  items: StockCheckItem[],
): Promise<void> => {
  const Product = await getTenantModel<TProduct>(subdomain, "Product");

  for (const item of items) {
    const product = await Product.findOne({
      _id: new Types.ObjectId(item.productId),
    });

    if (!product) {
      throw new AppError(
        status.NOT_FOUND,
        `Product not found: ${item.productId}`,
      );
    }

    // ── সরাসরি _id দিয়ে variant খোঁজো ──
    const variantIndex = product.variant.findIndex(
      (v: TVariant) =>
        v.color && v.color.toString() === item.colorId.toString(),
    );

    if (variantIndex === -1) {
      throw new AppError(
        status.BAD_REQUEST,
        `Color not found for product: ${item.productId}`,
      );
    }

    const variant = product.variant[variantIndex];
    const sizeNum = parseInt(item.selectedSize);
    const sizeStockIndex = variant.stock.findIndex((s) => s.size === sizeNum);

    if (sizeStockIndex === -1) {
      throw new AppError(
        status.BAD_REQUEST,
        `Size not found for product: ${item.productId}`,
      );
    }

    variant.stock[sizeStockIndex].quantity -= item.quantity;

    await Product.findByIdAndUpdate(
      product._id,
      { variant: product.variant },
      { new: true },
    );
  }
};

// ✅ Stock restore করি
const restoreStock = async (
  subdomain: string,
  items: StockCheckItem[],
): Promise<void> => {
  const Product = await getTenantModel<TProduct>(subdomain, "Product");

  for (const item of items) {
    const product = await Product.findOne({
      _id: new Types.ObjectId(item.productId),
    });

    if (!product) {
      console.warn(`Product not found: ${item.productId}`);
      continue;
    }

    // ── সরাসরি _id দিয়ে variant খোঁজো ──
    const variantIndex = product.variant.findIndex(
      (v: TVariant) =>
        v.color && v.color.toString() === item.colorId.toString(),
    );

    if (variantIndex === -1) {
      console.warn(`Variant not found for color: ${item.colorId}`);
      continue;
    }

    const variant = product.variant[variantIndex];
    const sizeNum = parseInt(item.selectedSize);
    const sizeStockIndex = variant.stock.findIndex((s) => s.size === sizeNum);

    if (sizeStockIndex === -1) {
      console.warn(`Size not found: ${item.selectedSize}`);
      continue;
    }

    variant.stock[sizeStockIndex].quantity += item.quantity;

    await Product.findByIdAndUpdate(
      product._id,
      { variant: product.variant },
      { new: true },
    );
  }
};

export default {
  checkStockAvailability,
  reduceStock,
  restoreStock,
};
