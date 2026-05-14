import { HydratedDocument, Model } from "mongoose";
import { dbManager } from "../config/db";
import ModelFactory, { ModelName } from "./modelFactory";

export const getTenantModel = async <T>(
  subdomain: string,
  modelName: ModelName,
) => {
  const tenantConn = await dbManager.getConnection(subdomain);
  return ModelFactory.getModel<T>(tenantConn, modelName);
};
