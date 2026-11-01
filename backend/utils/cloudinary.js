import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary (supports base64 data URI or image URL)
 * @param {string} fileStr - Data URI string or URL
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string>} - Permanent HTTPS URL from Cloudinary CDN
 */
export const uploadToCloudinary = async (fileStr, folder = "lokiverse") => {
  if (!fileStr || typeof fileStr !== "string") return "";
  try {
    const result = await cloudinary.uploader.upload(fileStr, {
      folder,
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (err) {
    console.error("Cloudinary upload failed:", err?.message || err);
    throw new Error(err?.message || "Cloudinary upload failed");
  }
};

/**
 * Delete an image from Cloudinary using its secure URL
 * @param {string} url - Cloudinary secure URL
 */
export const deleteFromCloudinary = async (url) => {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) return;
  try {
    const parts = url.split("/");
    const filenameWithExt = parts[parts.length - 1];
    const filename = filenameWithExt.split(".")[0];
    const folder = parts[parts.length - 2];
    const publicId = `${folder}/${filename}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete error:", err);
  }
};

export default cloudinary;

