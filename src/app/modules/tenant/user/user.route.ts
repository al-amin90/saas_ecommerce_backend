import { Router } from "express";
import validateRequest from "../../../middlewares/validateRequest";
import { registerValidator } from "./user.validate";
import { userController } from "./user.controller";

const router = Router();

router.post(
  "/register",
  //   auth(USER_ROLE.admin, USER_ROLE.faculty),
  validateRequest(registerValidator),
  userController.createUser,
);

const userRouter = router;
export default userRouter;
