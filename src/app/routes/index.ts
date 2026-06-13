import { Router } from "express";
import { authRouter } from "../modules/auth/auth.route";
import { categoryRouter } from "../modules/tenant/category/category.route";
import { colorRouter } from "../modules/tenant/color/color.route";
import { productRouter } from "../modules/tenant/product/product.route";
import { orderRouter } from "../modules/tenant/order/order.route";
import { deliveryMethodRouter } from "../modules/tenant/deliveryMethod/deliveryMethod.route";
import userRouter from "../modules/tenant/user/user.route";
import { sizeChartRouter } from "../modules/tenant/sizeChart/sizeChart.route";
import { bannerRouter } from "../modules/tenant/banner/banner.route";

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
    path: "/size-chart",
    route: sizeChartRouter,
  },

  {
    path: "/order",
    route: orderRouter,
  },
  {
    path: "/delivery-method",
    route: deliveryMethodRouter,
  },
  {
    path: "/banner",
    route: bannerRouter,
  },
];

moduleRouters.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
