import status from "http-status";
import AppError from "../../errors/AppError";
import {
  ITenantRequest,
  LoginBody,
  TChangePassword,
  TRegisterTenant,
} from "./auth.interface";

import config from "../../config";
import bcrypt from "bcrypt";
import { createToken } from "./auth.utils";
import { dbManager } from "../../config/db";
import ModelFactory from "../../utils/modelFactory";
import { IUser, IUserModel } from "../tenant/user/user.interface";
import { JwtPayload } from "jsonwebtoken";

const registerTenantRequest = async (payload: TRegisterTenant) => {
  const { subdomain } = payload;

  const centralConn = dbManager.getCentralConnection();

  if (!centralConn)
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Central DB not available",
    );

  const TenantRequest = ModelFactory.getModel(centralConn, "TenantRequest");

  const existing = await TenantRequest.findOne({
    subdomain: subdomain,
  });

  if (existing) {
    throw new AppError(status.CONFLICT, `This subdomain is already registered`);
  }

  const request = await TenantRequest.create(payload);

  return request;
};

const approveTenant = async (subdomain: string) => {
  const centralConn = dbManager.getCentralConnection();
  if (!centralConn)
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Central DB not available",
    );

  const TenantRequest = ModelFactory.getModel(centralConn, "TenantRequest");

  const tenantRequest: ITenantRequest | null = await TenantRequest.findOne({
    subdomain,
  });

  if (!tenantRequest)
    throw new AppError(status.NOT_FOUND, "Tenant request not found");

  if (tenantRequest.status === "approved")
    throw new AppError(status.NOT_FOUND, "Already approved");

  const tenantConn = await dbManager.getConnection(tenantRequest.subdomain);

  const User = ModelFactory.getModel(tenantConn, "User");

  const alreadyExists = await User.findOne({ email: tenantRequest.adminEmail });

  if (!alreadyExists) {
    await User.create({
      email: tenantRequest.adminEmail,
      password: tenantRequest.adminPassword,
      role: "super_admin",
    });
  }

  const result = await TenantRequest.findByIdAndUpdate(tenantRequest._id, {
    status: "approved",
    approvedAt: new Date(),
  });

  return result;
};

const loginUser = async (payload: LoginBody) => {
  const { email, password, subdomain } = payload;

  if (dbManager.tenancyType === "single") {
    return handleSingleTenantLogin(email, password);
  } else if (dbManager.tenancyType === "multi") {
    return await handleMultiTenantLoginAutoDetect(email, password, subdomain);
  } else {
    throw new AppError(status.NOT_FOUND, "Unknown tenancy");
  }
};

const handleSingleTenantLogin = async (email: string, password: string) => {
  const envEmail = config.single_admin_email || config.super_admin_email;
  const envPassword =
    config.single_admin_password || config.super_admin_password;

  if (!envEmail || !envPassword) {
    throw new AppError(status.NOT_FOUND, "No Admin Credential");
  }

  if (email === envEmail && password === envPassword) {
    const jwtPayload = {
      id: null,
      email: envEmail as string,
      role: "super_admin",
      subdomain: "bazar",
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

    return {
      accessToken,
      refreshToken,
      // needsPasswordChange: user.needsPasswordChange,
    };
  }

  const tenantConn = await dbManager.getConnection();
  if (!tenantConn)
    throw new AppError(status.INTERNAL_SERVER_ERROR, "Single DB not available");

  const UserModel = ModelFactory.getModel<IUser>(
    tenantConn,
    "User",
  ) as IUserModel;

  const user = await UserModel.findOne({ email }).select("+password");

  if (!user) {
    throw new AppError(status.FORBIDDEN, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new AppError(status.FORBIDDEN, "Your account has been deactivated.");
  }

  if (!(await UserModel.isPasswordMatch(password, user.password))) {
    throw new AppError(401, "Invalid credentials");
  }

  const jwtPayload = {
    id: user._id,
    email: user.email,
    role: user?.role || null,
    subdomain: "bazar",
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

  return {
    accessToken,
    refreshToken,
    // needsPasswordChange: user.needsPasswordChange,
  };
};

const handleMultiTenantLoginAutoDetect = async (
  email: string,
  password: string,
  subdomain: string,
) => {
  const envEmail = config.super_admin_email;
  const envPassword = config.super_admin_password;

  if (!envEmail || !envPassword) {
    throw new AppError(status.NOT_FOUND, "Admin credentials not configured");
  }

  if (email === envEmail && password === envPassword) {
    const jwtPayload = {
      id: null,
      email: envEmail,
      role: "super_admin",
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

    return {
      accessToken,
      refreshToken,
    };
  }

  if (!subdomain) {
    throw new AppError(
      status.NOT_FOUND,
      "Tenant identifier is required for multi-tenant login",
    );
  }

  const centralConn = dbManager.getCentralConnection();
  if (!centralConn)
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Central DB not available",
    );

  const TenantRequest = ModelFactory.getModel(centralConn, "TenantRequest");

  const isTenantExist: ITenantRequest | null = await TenantRequest.findOne({
    subdomain,
  });

  if (!isTenantExist) {
    throw new AppError(status.UNAUTHORIZED, "This Shop is Not Exist");
  }

  if (!isTenantExist?.isActive) {
    throw new AppError(status.NOT_FOUND, "This Shop is Not Active");
  }

  const tenantConn = await dbManager.getConnection(subdomain);

  const UserModel = (await ModelFactory.getModel<IUser>(
    tenantConn,
    "User",
  )) as IUserModel;

  const user = await UserModel.findOne({
    email,
  }).select("+password");

  if (!user) {
    throw new AppError(status.FORBIDDEN, "You are not authorized!");
  }

  if (!user.isActive) {
    throw new AppError(status.FORBIDDEN, "Your account has been deactivated.");
  }

  if (!(await UserModel.isPasswordMatch(password, user.password))) {
    throw new AppError(401, "Invalid Credential");
  }

  const jwtPayload = {
    id: user._id,
    email: user.email,
    role: user?.role,
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

  return {
    accessToken,
    refreshToken,
    needsPasswordChange: user.needsPasswordChange,
  };
};

const changePassword = async (
  userData: JwtPayload,
  payload: TChangePassword,
) => {
  // const UserModel = ModelFactory.getModel<IUser>(
  //   tenantConn,
  //   "User",
  // ) as IUserModel;

  // const user = await UserModel.isUserExistByCustomId(userData.id);

  // if (!user) {
  //   throw new AppError(status.NOT_FOUND, "The User Does't exists");
  // }

  // const isDeleted = user.isDeleted;
  // if (isDeleted) {
  //   throw new AppError(status.FORBIDDEN, "The User is Deleted");
  // }

  // if (user.status === "blocked") {
  //   throw new AppError(status.FORBIDDEN, "The User is Blocked");
  // }

  // if (!(await UserModel.isPasswordMatch(payload.oldPassword, user.password))) {
  //   throw new AppError(status.FORBIDDEN, "Password do not match");
  // }

  // const newPassword = await bcrypt.hash(
  //   payload.newPassword,
  //   Number(config.bcrypt_salt_rounds),
  // );

  // const result = await UserModel.findOneAndUpdate(
  //   {
  //     id: user.id,
  //     role: user.role,
  //   },
  //   {
  //     password: newPassword,
  //     needsPasswordChange: false,
  //     passwordChangeAt: new Date(),
  //   },
  // );

  return null;
};

const refreshToken = async (token: string) => {
  // const decoded = jwt.verify(token, config.jwt_refresh_token as string);
  // const { id, iat } = decoded as JwtPayload;

  // const user = await UserModel.isUserExistByCustomId(id);

  // if (!user) {
  //   throw new AppError(status.NOT_FOUND, "The User Does't exists");
  // }

  // const isDeleted = user.isDeleted;
  // if (isDeleted) {
  //   throw new AppError(status.FORBIDDEN, "The User is Deleted");
  // }

  // if (user.status === "blocked") {
  //   throw new AppError(status.FORBIDDEN, "The User is Blocked");
  // }

  // if (
  //   user.passwordChangeAt &&
  //   (await UserModel.isJWTIssuedBeforePassword(
  //     user.passwordChangeAt,
  //     iat as number,
  //   ))
  // ) {
  //   throw new AppError(status.UNAUTHORIZED, "You are not authorized. by!");
  // }

  // const jwtPayload = {
  //   id: user._id,
  //   role: user.role,
  // };

  // const accessToken = createToken(
  //   jwtPayload,
  //   config.jwt_access_token as string,
  //   config.jwt_access_expires_in as string,
  // );

  const accessToken = "asdf";

  return {
    accessToken,
  };
};

export const authServices = {
  registerTenantRequest,
  loginUser,
  changePassword,
  refreshToken,
  approveTenant,
};
