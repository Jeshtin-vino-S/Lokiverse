import multer from "multer";

// Configure memory storage for direct Cloudinary upload (no ephemeral disk dependency)
const storage = multer.memoryStorage();

// File validation: allow images only
const fileFilter = (req, file, cb) => {
    if (file && file.mimetype && file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed!"), false);
    }
};

export const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter
});

/**
 * Converts a Multer file (memory buffer or file path) to a Data URI for Cloudinary upload
 * @param {object} file - Express Multer file object
 * @returns {string} - Data URI or path string
 */
export const fileToDataUrl = (file) => {
    if (!file) return "";
    if (file.buffer && file.mimetype) {
        return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    }
    if (file.path) {
        return file.path;
    }
    return "";
};

