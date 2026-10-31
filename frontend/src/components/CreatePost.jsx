import { useState, useRef } from "react";
import axios from "axios";
import { strikeThunder, smash } from "../heroFx";

const CreatePost = ({ authUser, onPostCreated }) => {
  const [text, setText] = useState("");
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed!");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be under 5MB");
        return;
      }
      setError("");
      setImgFile(file);
      setImgPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImgFile(null);
    setImgPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imgFile) {
      setError("Please add text or an image to transmit intel.");
      return;
    }

    const btn = document.getElementById("transmit-post-btn");
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      if (text.trim()) formData.append("text", text.trim());
      if (imgFile) formData.append("img", imgFile);

      const response = await axios.post("/api/posts/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (btn) strikeThunder(btn);

      // Reset form
      setText("");
      removeImage();

      if (onPostCreated && response.data) {
        onPostCreated(response.data);
      }
    } catch (err) {
      if (btn) smash(btn);
      setError(err.response?.data?.error || "Error broadcasting transmission");
    } finally {
      setLoading(false);
    }
  };

  const initials = authUser?.fullname
    ? authUser.fullname
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : authUser?.username?.slice(0, 2).toUpperCase() || "AV";

  return (
    <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl transition-colors duration-200">
      {error && (
        <div className="mb-3 p-2.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-white ml-2 text-sm">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-3.5">
        {/* Current User Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 p-0.5 shrink-0 overflow-hidden shadow-sm">
          {authUser?.profileImg ? (
            <img
              src={authUser.profileImg}
              alt={authUser.fullname || authUser.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-100 dark:bg-[#07080c] flex items-center justify-center font-black text-xs text-amber-500 dark:text-amber-300">
              {initials}
            </div>
          )}
        </div>

        {/* Input & Actions */}
        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Broadcast intel to the Sacred Timeline..."
            rows={imgPreview ? 2 : 3}
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm sm:text-base outline-none resize-none leading-relaxed"
          />

          {/* Image Preview Box */}
          {imgPreview && (
            <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-black/50 group max-h-80 flex items-center justify-center">
              <img
                src={imgPreview}
                alt="Selected attachment"
                className="w-full max-h-80 object-cover rounded-2xl"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/75 hover:bg-rose-600 text-white transition-all shadow-lg cursor-pointer"
                title="Remove image"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-white/10">
            {/* Attachment Button */}
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="post-image-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-400/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Attach Recon Image"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
                <span className="hidden sm:inline">Attach Intel</span>
              </button>
            </div>

            {/* Transmit Button with Thor Thunder & Ant-Man hover */}
            <button
              id="transmit-post-btn"
              type="submit"
              disabled={loading || (!text.trim() && !imgFile)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 fx-ant-hover"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                  <span>Transmit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;

