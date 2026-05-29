import { NextFunction, Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../errors/AppError";
import status from "http-status";
import config from "../config";
import jwt, { JwtPayload } from "jsonwebtoken";
import {
  IUser,
  IUserModel,
  TUserRole,
} from "../modules/tenant/user/user.interface";

import ModelFactory from "../utils/modelFactory";
import { dbManager } from "../config/db";

const auth = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      throw new AppError(status.UNAUTHORIZED, "Access token required");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.access_token as string);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Session expired, please login again",
        );
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(status.UNAUTHORIZED, "Invalid token");
      }
      throw error;
    }

    const { id, iat, email, role, subdomain } = decoded as JwtPayload;

    if (role === "super_admin") {
      req.user = decoded as JwtPayload;
      return next();
    }

    const tenantID = req?.headers["x-tenant"] || req.body.subdomain;

    if (!tenantID) {
      throw new AppError(status.NOT_FOUND, "Subdomain is missing");
    }

    const tenantConnection = await dbManager.getConnection(tenantID);
    const UserModel = ModelFactory.getModel<IUser>(
      tenantConnection,
      "User",
    ) as IUserModel;
    console.log("df decoded", decoded);

    const user = await UserModel.isUserExistByCustomId(id);
    console.log("user", user);

    if (!user) {
      throw new AppError(status.UNAUTHORIZED, "The User doesn't exist");
    }

    if (!user.isActive) {
      throw new AppError(status.FORBIDDEN, "User is deactivated");
    }

    if (
      user.passwordChangeAt &&
      UserModel.isJWTIssuedBeforePassword(user.passwordChangeAt, iat as number)
    ) {
      throw new AppError(status.UNAUTHORIZED, "You are not authorized. by!");
    }

    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new AppError(status.FORBIDDEN, "You are not authorized. hi!");
    }

    req.user = decoded as JwtPayload;
    next();
  });
};

export default auth;
