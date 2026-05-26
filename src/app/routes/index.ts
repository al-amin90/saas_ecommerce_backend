import { Router } from "express";
import { authRouter } from "../modules/auth/auth.route";
import { categoryRouter } from "../modules/tenant/category/category.route";
import { colorRouter } from "../modules/tenant/color/color.route";
import { productRouter } from "../modules/tenant/product/product.route";
import { orderRouter } from "../modules/tenant/order/order.route";
import { deliveryMethodRouter } from "../modules/tenant/deliveryMethod/deliveryMethod.route";
import userRouter from "../modules/tenant/user/user.route";

const router = Router();

const moduleRouters = [
  {
    path: "/auth",
    route: authRouter,
  },
  {
    path: "/user",
    route: userRouter,
  },
  {
    path: "/category",
    route: categoryRouter,
  },
  {
    path: "/color",
    route: colorRouter,
  },
  {
    path: "/product",
    route: productRouter,
  },
  {
    path: "/order",
    route: orderRouter,
  },
  {
    path: "/delivery-method",
    route: deliveryMethodRouter,
  },
];

moduleRouters.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
