import { v2 as cloudinary } from "cloudinary";

// Ensure cloudinary is always configured with the latest environment variables
const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
};

/**
 * Upload an image to Cloudinary (supports base64 data URI or image URL)
 * @param {string} fileStr - Data URI string or URL
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string>} - Permanent HTTPS URL from Cloudinary CDN
 */
export const uploadToCloudinary = async (fileStr, folder = "lokiverse") => {
  if (!fileStr || typeof fileStr !== "string") return "";
  const client = configureCloudinary();
  try {
    const result = await client.uploader.upload(fileStr, {
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
  const client = configureCloudinary();
  try {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) return;

    // Extract complete public_id including nested folders (e.g. "lokiverse/posts/xyz")
    const afterUpload = url.substring(uploadIndex + 8);
    const withoutVersion = afterUpload.replace(/^v\d+\//, "");
    const lastDotIndex = withoutVersion.lastIndexOf(".");
    const publicId = lastDotIndex !== -1 ? withoutVersion.substring(0, lastDotIndex) : withoutVersion;

    if (!publicId) return;

    const result = await client.uploader.destroy(publicId);
    console.log(`Cloudinary destroyed [${publicId}]:`, result?.result);
    return result;
  } catch (err) {
    console.error("Cloudinary delete error:", err?.message || err);
  }
};

export default cloudinary;

