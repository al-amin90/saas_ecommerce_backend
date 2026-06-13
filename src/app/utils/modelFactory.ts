import { Connection, Model, Schema } from "mongoose";
import status from "http-status";
import AppError from "../errors/AppError";
import tenantSchema from "../modules/central/tenant.model";
import userSchema from "../modules/tenant/user/user.model";
import categorySchema from "../modules/tenant/category/category.model";
import colorSchema from "../modules/tenant/color/color.model";
import {
  productSchema,
  variantSchema,
} from "../modules/tenant/product/product.model";
import orderSchema from "../modules/tenant/order/order.model";
import bannerSchema from "../modules/tenant/banner/banner.model";
import deliveryMethodSchema from "../modules/tenant/deliveryMethod/deliveryMethod.schema";
import { sizeChartSchema } from "../modules/tenant/sizeChart/sizeChart.model";

export type CentralModelName =
  | "TenantRequest"
  | "Invoice"
  | "Coupon"
  | "CentralPayment"
  | "Subscription";

export type TenantModelName =
  | "User"
  | "Category"
  | "Color"
  | "Product"
  | "Variant"
  | "Order"
  | "DeliveryMethod"
  | "SizeChart"
  | "Banner";

export type ModelName = CentralModelName | TenantModelName;

const schemaRegistry: Record<ModelName, Schema> = {
  // Central
  TenantRequest: tenantSchema,

  // Tenant
  User: userSchema,
  Category: categorySchema,
  Color: colorSchema,
  Product: productSchema,
  Variant: variantSchema,
  Order: orderSchema,
  DeliveryMethod: deliveryMethodSchema,
  SizeChart: sizeChartSchema,
  Banner: bannerSchema,
};

const centralModelNames: CentralModelName[] = [
  "TenantRequest",
  "Invoice",
  "Coupon",
  "CentralPayment",
  "Subscription",
];
const tenantModelNames: TenantModelName[] = [
  "User",
  "Category",
  "Color",
  "Product",
  "Variant",
  "Order",
  "DeliveryMethod",
  "SizeChart",
  "Banner",
];

class ModelFactory {
  static getModel<T = unknown>(
    connection: Connection,
    modelName: ModelName,
  ): Model<T> {
    if (connection.models[modelName]) {
      return connection.models[modelName] as Model<T>;
    }

    const schema = schemaRegistry[modelName];

    if (!schema) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        `Unknown model: "${modelName}"`,
      );
    }
    return connection.model<T>(modelName, schema);
  }
}

export default ModelFactory;
