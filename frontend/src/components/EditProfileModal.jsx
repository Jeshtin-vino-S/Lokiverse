import { useState, useRef } from "react";
import axios from "axios";
import ImageCropperModal from "./ImageCropperModal";

const EditProfileModal = ({ user, onClose, onProfileUpdated }) => {
  const [formData, setFormData] = useState({
    fullname: user?.fullname || "",
    bio: user?.bio || "",
    link: user?.link || "",
    currentPassword: "",
    newPassword: "",
  });

  const [profileImgFile, setProfileImgFile] = useState(null);
  const [coverImgFile, setCoverImgFile] = useState(null);
  const [profileImgPreview, setProfileImgPreview] = useState(user?.profileImg || "");
  const [coverImgPreview, setCoverImgPreview] = useState(user?.coverImg || "");
  const [removeProfileImg, setRemoveProfileImg] = useState(false);
  const [removeCoverImg, setRemoveCoverImg] = useState(false);

  // Active crop session: { imageSrc, aspectType: "avatar" | "cover", originalFile }
  const [cropModalData, setCropModalData] = useState(null);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Cover Image selection -> Opens Interactive Cropper
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const tempUrl = URL.createObjectURL(file);
      setCropModalData({
        imageSrc: tempUrl,
        aspectType: "cover",
        originalFile: file,
      });
      e.target.value = "";
    }
  };

  // Handle Profile Avatar selection -> Opens Interactive Cropper
  const handleProfileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const tempUrl = URL.createObjectURL(file);
      setCropModalData({
        imageSrc: tempUrl,
        aspectType: "avatar",
        originalFile: file,
      });
      e.target.value = "";
    }
  };

  // Handle Cover removal
  const handleRemoveCover = () => {
    setCoverImgFile(null);
    setCoverImgPreview("");
    setRemoveCoverImg(true);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  // Handle Profile removal
  const handleRemoveProfile = () => {
    setProfileImgFile(null);
    setProfileImgPreview("");
    setRemoveProfileImg(true);
    if (profileInputRef.current) profileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = new FormData();
      data.append("fullname", formData.fullname);
      data.append("bio", formData.bio);
      data.append("link", formData.link);

      if (formData.currentPassword && formData.newPassword) {
        data.append("currentPassword", formData.currentPassword);
        data.append("newPassword", formData.newPassword);
      }

      // Handle profile image file or removal
      if (profileImgFile) {
        data.append("profileImg", profileImgFile);
      } else if (removeProfileImg) {
        data.append("removeProfileImg", "true");
      }

      // Handle cover image file or removal
      if (coverImgFile) {
        data.append("coverImg", coverImgFile);
      } else if (removeCoverImg) {
        data.append("removeCoverImg", "true");
      }

      const response = await axios.post("/api/users/update", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && !response.data.error) {
        onProfileUpdated(response.data);
        onClose();
      } else {
        setError(response.data.error || "Failed to update profile");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-black/85 border border-slate-200 dark:border-white/20 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] fx-ant">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-wide">Edit Dossier</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/80 text-red-200 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Cover Image Upload Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Compound Banner (Cover Image)
            </label>
            <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-[#222736] bg-slate-100 dark:bg-[#141824] group">
              {coverImgPreview ? (
                <img src={coverImgPreview} alt="Cover preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                  No cover banner uploaded
                </div>
              )}
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md cursor-pointer transition-all"
                >
                  Upload New
                </button>
                {coverImgPreview && (
                  <button
                    type="button"
                    onClick={() =>
                      setCropModalData({
                        imageSrc: coverImgPreview,
                        aspectType: "cover",
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold backdrop-blur-md cursor-pointer transition-all flex items-center gap-1"
                    title="Adjust and crop cover banner"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                      <path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z" />
                    </svg>
                    Crop / Frame
                  </button>
                )}
                {coverImgPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold backdrop-blur-md cursor-pointer transition-all"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              type="file"
              ref={coverInputRef}
              onChange={handleCoverChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Profile Avatar Upload Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Avenger Avatar (Profile Image)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full border-2 border-emerald-500/60 overflow-hidden bg-slate-100 dark:bg-[#141824] shrink-0 group">
                {profileImgPreview ? (
                  <img src={profileImgPreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-xl text-amber-500 bg-emerald-500/10 dark:bg-emerald-950/40">
                    {user?.fullname?.[0]?.toUpperCase() || "A"}
                  </div>
                )}
                <div
                  onClick={() => profileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-[10px] font-bold text-white text-center"
                >
                  Change
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => profileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border border-slate-300 dark:border-[#222736]"
                  >
                    Choose Picture
                  </button>
                  {profileImgPreview && (
                    <button
                      type="button"
                      onClick={() =>
                        setCropModalData({
                          imageSrc: profileImgPreview,
                          aspectType: "avatar",
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold cursor-pointer border border-emerald-500/30 flex items-center gap-1"
                      title="Adjust and crop avatar circle"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z" />
                      </svg>
                      Crop / Frame
                    </button>
                  )}
                </div>
                {profileImgPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveProfile}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer border border-rose-300 dark:border-rose-500/30 w-fit"
                  >
                    Remove Avatar
                  </button>
                )}
              </div>
            </div>
            <input
              type="file"
              ref={profileInputRef}
              onChange={handleProfileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Agent Full Name</label>
            <input
              type="text"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
              placeholder="Your full name"
              className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#141824] text-slate-900 dark:text-white border border-slate-300 dark:border-[#222736] rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dossier Bio</label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell the Avengers about your powers and mission..."
              className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#141824] text-slate-900 dark:text-white border border-slate-300 dark:border-[#222736] rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Link */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">External Relay Link</label>
            <input
              type="text"
              name="link"
              value={formData.link}
              onChange={handleChange}
              placeholder="https://starkindustries.com"
              className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#141824] text-slate-900 dark:text-white border border-slate-300 dark:border-[#222736] rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Collapsible Password Change Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#1e2230]">
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 flex items-center gap-1.5 cursor-pointer mb-3"
            >
              <span>{showPasswordSection ? "Hide Security Clearance Update" : "Update Password / Clearance"}</span>
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-4 h-4 transition-transform ${showPasswordSection ? "rotate-180" : ""}`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {showPasswordSection && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-100/90 dark:bg-[#141824]/60 border border-slate-200 dark:border-[#222736]">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 bg-white dark:bg-[#0c0e14] text-slate-900 dark:text-white border border-slate-300 dark:border-[#222736] rounded-xl text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Password (min 8 chars)</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 bg-white dark:bg-[#0c0e14] text-slate-900 dark:text-white border border-slate-300 dark:border-[#222736] rounded-xl text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-all border border-slate-300 dark:border-[#222736]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50 transition-all"
            >
              {loading ? "Saving..." : "Save Dossier"}
            </button>
          </div>
        </form>
      </div>

      {/* Interactive Image Cropper (Instagram/Twitter X style) */}
      {cropModalData && (
        <ImageCropperModal
          imageSrc={cropModalData.imageSrc}
          aspectType={cropModalData.aspectType}
          onCropComplete={({ file, previewUrl }) => {
            if (cropModalData.aspectType === "avatar") {
              setProfileImgFile(file);
              setProfileImgPreview(previewUrl);
              setRemoveProfileImg(false);
            } else {
              setCoverImgFile(file);
              setCoverImgPreview(previewUrl);
              setRemoveCoverImg(false);
            }
            setCropModalData(null);
          }}
          onCancel={() => setCropModalData(null)}
        />
      )}
    </div>
  );
};

export default EditProfileModal;

