import type { Request, Response } from "express";
import sendResponse from "../../../utils/SendResponse";
import { userServices } from "./user.service";

const createUser = async (req: Request, res: Response) => {
  const subdomain = req.headers["x-tenant"] as string;

  const { accessToken, refreshToken, user } =
    await userServices.registerUserIntoDB(subdomain, req.body);

  res.cookie("refreshToken", refreshToken, {
    secure: false,
    httpOnly: true,
    sameSite: "lax",
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User Created Successfully",
    data: { accessToken, user },
  });
};

const getUsers = async (req: Request, res: Response) => {
  try {
    console.log("userConte", req.user);

    const result = await userService.getAllUsersFromDB();

    res.status(200).json({
      success: true,
      message: "User Get All Successfully",
      data: result.rows,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: error,
    });
  }
};

// const getSingleUser = async (req: Request, res: Response) => {
//   try {
//     const result = await userService.getSingleUserFromDB(
//       req.params.id as string,
//     );

//     if (result.rows.length === 0) {
//       res.status(404).json({
//         success: false,
//         message: "User Not Found",
//         data: {},
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "User Get Single Successfully",
//       data: result.rows[0],
//     });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//       data: error,
//     });
//   }
// };

// const updateUser = async (req: Request, res: Response) => {
//   try {
//     const result = await userService.updateUserIntoDB(
//       req.body,
//       req.params.id as string,
//     );

//     if (result.rows.length === 0) {
//       res.status(404).json({
//         success: false,
//         message: "User Not Found",
//         data: {},
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "User Update Successfully",
//       data: result.rows[0],
//     });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//       data: error,
//     });
//   }
// };

// const deleteUser = async (req: Request, res: Response) => {
//   try {
//     const result = await userService.deleteUserFromDB(req.params.id as string);

//     if (result.rowCount === 0) {
//       res.status(404).json({
//         success: false,
//         message: "User Not Found",
//         data: {},
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "User Delete Successfully",
//       data: null,
//     });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//       data: error,
//     });
//   }
// };

export const userController = {
  createUser,
  getUsers,
  //   getSingleUser,
};
