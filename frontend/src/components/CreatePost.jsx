import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { strikeThunder, smash } from "../heroFx";

const CreatePost = ({ authUser, onPostCreated }) => {
  const [text, setText] = useState("");
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const attachMenuRef = useRef(null);

  // Close attachment dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAttachMenu]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed!");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError("Image size must be under 15MB");
        return;
      }
      setError("");
      // Clear any attached video
      removeVideo();
      setImgFile(file);
      setImgPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImgFile(null);
    setImgPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        setError("Only video files are allowed!");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError("Video size must be under 50MB");
        return;
      }

      // Check video duration (maximum 60 seconds / 1 minute)
      const videoElement = document.createElement("video");
      videoElement.preload = "metadata";
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        const dur = videoElement.duration;
        if (dur > 60.9) {
          setError(
            `Video is ${Math.round(dur)}s long. Video clips are strictly limited to 1 minute (60s max)!`
          );
          if (videoInputRef.current) videoInputRef.current.value = "";
          return;
        }
        setError("");
        // Clear any attached image
        removeImage();
        setVideoFile(file);
        setVideoDuration(Math.round(dur));
        setVideoPreview(URL.createObjectURL(file));
      };
      videoElement.onerror = () => {
        setError("Could not load video metadata. Please select a valid MP4 or WebM video.");
      };
      videoElement.src = URL.createObjectURL(file);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview("");
    setVideoDuration(0);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imgFile && !videoFile) {
      setError("Please add text, an image, or a video clip to transmit intel.");
      return;
    }

    const btn = document.getElementById("transmit-post-btn");
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      if (text.trim()) formData.append("text", text.trim());
      if (imgFile) formData.append("img", imgFile);
      if (videoFile) formData.append("video", videoFile);

      const response = await axios.post("/api/posts/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (btn) strikeThunder(btn);

      // Reset form
      setText("");
      removeImage();
      removeVideo();

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
            rows={imgPreview || videoPreview ? 2 : 3}
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

          {/* Video Preview Box (up to 1 minute) */}
          {videoPreview && (
            <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/15 bg-black group max-h-80 flex items-center justify-center">
              <video
                src={videoPreview}
                controls
                playsInline
                className="w-full max-h-80 rounded-2xl bg-black"
              />
              {/* Duration badge */}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/80 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1.5 backdrop-blur-md shadow-md">
                <span>⏱️ {videoDuration}s / 60s max</span>
              </div>
              <button
                type="button"
                onClick={removeVideo}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/75 hover:bg-rose-600 text-white transition-all shadow-lg cursor-pointer"
                title="Remove video"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-white/10">
            {/* Single Upload Media Button with Dropdown (Image / Video) */}
            <div className="relative" ref={attachMenuRef}>
              {/* Hidden File Inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="post-image-file-input"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
                id="post-video-file-input"
              />

              {/* Single Upload Trigger Button */}
              <button
                type="button"
                onClick={() => setShowAttachMenu((prev) => !prev)}
                className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  showAttachMenu
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 hover:bg-emerald-500/10"
                }`}
                title="Upload Media (Image or Video)"
              >
                {/* Media paperclip / upload icon */}
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V6H9v9.5a3 3 0 0 0 6 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
                </svg>
                <span className="hidden sm:inline">Upload Media</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showAttachMenu ? "rotate-180" : ""
                  }`}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Upload Dropdown Menu */}
              {showAttachMenu && (
                <div className="absolute bottom-full mb-2 left-0 z-40 w-52 bg-white dark:bg-[#0e1017] border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl p-1.5 animate-in fade-in slide-in-from-bottom-2">
                  {/* Option 1: Image */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span>Image</span>
                      <span className="text-[10px] text-slate-400 font-normal">Photo / Artwork</span>
                    </div>
                  </button>

                  {/* Option 2: Video (Up to 1 min) */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      videoInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span>Video</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">Max 1 min (≤60s)</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Transmit Button with Thor Thunder & Ant-Man hover */}
            <button
              id="transmit-post-btn"
              type="submit"
              disabled={loading || (!text.trim() && !imgFile && !videoFile)}
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

