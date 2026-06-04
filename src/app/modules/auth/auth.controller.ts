/* eslint-disable @typescript-eslint/no-unused-vars */

import sendResponse from "../../utils/SendResponse";
import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import { authServices } from "./auth.service";
import config from "../../config";
import { ITenantRequest } from "./auth.interface";

const registerTenant = catchAsync(async (req, res, next) => {
  const result = await authServices.registerTenantRequest(req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Your Request is successful",
    data: result,
  });
});

const approveTenant = catchAsync(async (req, res, next) => {
  const result = await authServices.approveTenant(req.params.id as string);
  console.log("result", result);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: `Tenant request approved and database created`,
    data: {
      subdomain: result,
    },
  });
});

const loginUser = catchAsync(async (req, res, next) => {
  const result = await authServices.loginUser(req.body);
  const { refreshToken, accessToken } = result;

  res.cookie("accessToken", accessToken, {
    secure: config.node_env === "production",
    httpOnly: true,
  });

  res.cookie("refreshToken", refreshToken, {
    secure: config.node_env === "production",
    httpOnly: true,
  });

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User is logged in Successfully!",
    data: {
      accessToken,
      //   needsPasswordChange,
    },
  });
});

// const changePassword = catchAsync(async (req, res, next) => {
//   const result = await authServices.changePassword(req.user, req.body);

//   sendResponse(res, {
//     statusCode: status.OK,
//     success: true,
//     message: "Password change Successfully",
//     data: [],
//   });
// });

// const refreshToken = catchAsync(async (req, res, next) => {
//   const { refreshToken } = req.cookies;

//   const result = await authServices.refreshToken(refreshToken);
//   const { accessToken } = result;

//   sendResponse(res, {
//     statusCode: status.OK,
//     success: true,
//     message: "Access Token Retrieved Successfully",
//     data: {
//       accessToken,
//     },
//   });
// });

export const authControllers = {
  loginUser,
  registerTenant,
  approveTenant,
  //   changePassword,
  //   refreshToken,
};
