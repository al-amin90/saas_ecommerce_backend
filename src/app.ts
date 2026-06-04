import cookieParser from "cookie-parser";
import express, { Application } from "express";
import cors from "cors";
import router from "./app/routes";
import config from "./app/config";
import { extractPublicId } from "./app/utils/extractPublicId";
import GlobalErrorHandler from "./app/middlewares/GlobalErrorHandler";
import NotFound from "./app/middlewares/NotFound";

const app: Application = express();

// __) parsers
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://kidshutbd.com",
      "https://www.kidshutbd.com",
      "https://saas-ecommerce-frontend-omega.vercel.app",
      /\.localhost:\d{4}$/, // Matches alamin.localhost:3000, any.localhost:3000
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "x-tenant",
    ],
    exposedHeaders: ["Authorization"],
  }),
);

// __) all application route here
app.use("/api/v1", router);

app.get("/", (req, res) => {
  res.send(`This app listening on port ${config.port}`);
});

console.log(
  extractPublicId(
    "https://res.cloudinary.com/dd3njhjrh/image/upload/v1776008669/products/1776008664599-796384094_ccdxjo.png",
  ),
);

app.use(GlobalErrorHandler);
app.use(NotFound);

export default app;
