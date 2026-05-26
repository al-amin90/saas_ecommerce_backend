import AppError from "../../../errors/AppError";
import { getTenantModel } from "../../../utils/getTenantModel";
import { IUser } from "./user.interface";

const registerUserIntoDB = async (subdomain: string, payload: IUser) => {
  const UserModel = await getTenantModel(subdomain, "User");

  const result = await UserModel.create(payload);

  console.log("result", result);

  return result;
};

export const userServices = {
  registerUserIntoDB,
};
