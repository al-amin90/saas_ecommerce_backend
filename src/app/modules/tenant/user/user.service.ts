import config from "../../../config";
import AppError from "../../../errors/AppError";
import { getTenantModel } from "../../../utils/getTenantModel";
import { createToken } from "../../auth/auth.utils";
import { IUser } from "./user.interface";
import jwt from "jsonwebtoken";

const registerUserIntoDB = async (subdomain: string, payload: IUser) => {
  const UserModel = await getTenantModel<IUser>(subdomain, "User");

  const user = await UserModel.create(payload);

  const jwtPayload = {
    id: user._id,
    email: user.email,
    role: user.role,
    subdomain,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.access_token as string,
    config.jwt.access_expires_in as string,
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt.refresh_token as string,
    config.jwt.refresh_expires_in as string,
  );

  return { accessToken, refreshToken, user };
};

export const userServices = {
  registerUserIntoDB,
};
