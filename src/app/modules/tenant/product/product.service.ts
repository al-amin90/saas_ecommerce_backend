import AppError from "../../../errors/AppError";
import { getTenantModel } from "../../../utils/getTenantModel";
import QueryBuilder from "../../../builder/QueryBuilder";
import { TProduct, TVariant } from "./product.interface";
import slugify from "slugify";
import status from "http-status";
import { extractPublicId } from "../../../utils/extractPublicId";
import {
  deleteManyFromCloudinary,
  uploadOnCloudinary,
} from "../../../utils/cloudinary";
import { getRemovedImages } from "../../../utils/getRemovedImages";

const createProductIntoDB = async (subdomain: string, payload: TProduct) => {
  const Product = await getTenantModel(subdomain, "Product");

  payload.slug = slugify(payload.name, { lower: true, strict: true });

  const result = await Product.create(payload);
  return result;
};

const getAllProductsFromDB = async (
  subdomain: string,
  query: Record<string, unknown>,
) => {
  const Product = await getTenantModel(subdomain, "Product");
  await getTenantModel(subdomain, "Category");
  await getTenantModel(subdomain, "Color");

  const searchFields = ["name", "description", "sku"];

  const builder = new QueryBuilder(
    Product.find({ isDeleted: false }).populate([
      { path: "categoryID", select: "name slug" },
      { path: "variant.color", select: "name color" },
    ]),
    query,
  )
    .search(searchFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const [data, meta] = await Promise.all([
    builder.modelQuery,
    builder.countTotal(),
  ]);

  return { data, meta };
};

const getSingleProductFromDB = async (subdomain: string, id: string) => {
  const Product = await getTenantModel(subdomain, "Product");
  await getTenantModel(subdomain, "Category");
  await getTenantModel(subdomain, "Color");
  await getTenantModel(subdomain, "SizeChart");

  const result = await Product.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate([
      { path: "categoryID", select: "name slug" },
      { path: "variant.color", select: "name color" },
      { path: "sizeChartId" },
    ])
    .lean<TProduct>();

  if (!result) throw new AppError(status.NOT_FOUND, "Product not found");
  const formate = { ...result, existingImages: result.images, images: [] };
  return formate;
};

const getProductBySlugFromDB = async (subdomain: string, slug: string) => {
  const Product = await getTenantModel(subdomain, "Product");
  await getTenantModel(subdomain, "Category");

  const result = await Product.findOne({
    slug,
    isDeleted: false,
  }).populate("categoryID", "name slug");

  if (!result) throw new AppError(status.NOT_FOUND, "Product not found");
  return result;
};

const updateProductInDB = async (
  subdomain: string,
  id: string,
  files: Express.Multer.File[],
  payload: Partial<TProduct>,
) => {
  const Product = await getTenantModel(subdomain, "Product");

  if (payload.name) {
    payload.slug = slugify(payload.name, { lower: true, strict: true });
  }

  const product: Partial<TProduct> | null = await Product.findById(id)
    .select("images")
    .lean();
  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");

  let keptImg = payload.existingImages ?? [];
  delete payload.existingImages;

  const newImageUrl: string[] = [];

  if (files) {
    for (const file of files) {
      const url = await uploadOnCloudinary(file.path, "products", subdomain);
      if (url) newImageUrl.push(url);
    }
  }

  const dbImg = product.images ?? [];

  const removedImg = getRemovedImages(dbImg, keptImg);
  if (removedImg.length) {
    await deleteManyFromCloudinary(removedImg);
  }

  payload.images = [...keptImg, ...newImageUrl];

  console.log("payload", payload.images);
  const result = await Product.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteProductFromDB = async (subdomain: string, id: string) => {
  const Product = await getTenantModel(subdomain, "Product");

  // -----------> use it when you want delete doc permanently
  // const product: Partial<TProduct> | null = await Product.findById(id)
  //   .select("images")
  //   .lean();
  // if (!product) throw new AppError(status.NOT_FOUND, "Product not found");

  // if (product.images?.length) {
  //   await deleteManyFromCloudinary(product.images);
  // }

  const result = await Product.findByIdAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
  );

  if (!result) throw new AppError(status.NOT_FOUND, "Product not found");
  return result;
};

export const productServices = {
  createProductIntoDB,
  getAllProductsFromDB,
  getSingleProductFromDB,
  getProductBySlugFromDB,
  updateProductInDB,
  deleteProductFromDB,
};
