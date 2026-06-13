import { getTenantModel } from "../../../utils/getTenantModel";
import { TBannerSystem } from "./banner.interface";
import { Types } from "mongoose";

const createBannerIntoDB = async (
  subdomain: string,
  payload: Partial<TBannerSystem>,
  imageUrl?: string,
) => {
  const Banner = await getTenantModel(subdomain, "Banner");

  const data = {
    ...payload,
    ...(imageUrl && { image: imageUrl }),
    ...(payload.productID && {
      productID: new Types.ObjectId(payload.productID as unknown as string),
    }),
  };

  return await Banner.create(data);
};

const getAllBannersFromDB = async (subdomain: string) => {
  const Banner = await getTenantModel(subdomain, "Banner");
  await getTenantModel(subdomain, "Product");

  return await Banner.find({ isDeleted: false })
    .populate("productID", "name slug images discountPrice price")
    .sort({ createdAt: -1 });
};

const getActiveBannersFromDB = async (subdomain: string) => {
  const Banner = await getTenantModel(subdomain, "Banner");
  await getTenantModel(subdomain, "Product");

  return await Banner.find({ isDeleted: false, isActive: true })
    .populate("productID", "name slug images discountPrice price")
    .sort({ createdAt: -1 });
};

const getBannerByIdFromDB = async (subdomain: string, bannerId: string) => {
  const Banner = await getTenantModel(subdomain, "Banner");
  await getTenantModel(subdomain, "Product");

  const banner = await Banner.findOne({
    _id: new Types.ObjectId(bannerId),
    isDeleted: false,
  }).populate("productID", "name slug images discountPrice price");

  if (!banner) throw new Error("Banner not found");
  return banner;
};

const updateBannerIntoDB = async (
  subdomain: string,
  bannerId: string,
  payload: Partial<TBannerSystem>,
  imageUrl?: string,
) => {
  const Banner = await getTenantModel(subdomain, "Banner");

  const updateData: any = { ...payload };

  if (imageUrl) updateData.image = imageUrl;

  if (payload.productID) {
    updateData.productID = new Types.ObjectId(
      payload.productID as unknown as string,
    );
  }

  const banner = await Banner.findOneAndUpdate(
    { _id: new Types.ObjectId(bannerId), isDeleted: false },
    updateData,
    { new: true },
  ).populate("productID", "name slug images discountPrice price");

  if (!banner) throw new Error("Banner not found");
  return banner;
};

const toggleBannerStatusIntoDB = async (
  subdomain: string,
  bannerId: string,
) => {
  const Banner = await getTenantModel(subdomain, "Banner");

  const banner = await Banner.findOne({
    _id: new Types.ObjectId(bannerId),
    isDeleted: false,
  });

  if (!banner) throw new Error("Banner not found");

  banner.isActive = !banner.isActive;
  await banner.save();
  return banner;
};

const deleteBannerFromDB = async (subdomain: string, bannerId: string) => {
  const Banner = await getTenantModel(subdomain, "Banner");

  const banner = await Banner.findOneAndUpdate(
    { _id: new Types.ObjectId(bannerId) },
    { isDeleted: true, isActive: false },
    { new: true },
  );

  if (!banner) throw new Error("Banner not found");
  return banner;
};

export const bannerService = {
  createBannerIntoDB,
  getAllBannersFromDB,
  getActiveBannersFromDB,
  getBannerByIdFromDB,
  updateBannerIntoDB,
  toggleBannerStatusIntoDB,
  deleteBannerFromDB,
};
