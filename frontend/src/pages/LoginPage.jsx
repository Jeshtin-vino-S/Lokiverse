import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { smash } from "../heroFx";

const LoginPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Auto-dismiss top popup notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const response = await axios.post("/auth/login", formData);
      const data = response.data;

      // Backend error check
      if (data.error) {
        setErrorMessage(data.error);
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      setSuccessMessage(data.message);

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(data.user || formData.username);
        }
        navigate("/profile");
      }, 900);
    } catch (err) {
      smash(document.getElementById("login-submit-btn"));
      // Dynamic backend error response
      if (err.response?.data?.error) {
        setErrorMessage(err.response.data.error);
      } else {
        setErrorMessage("Could not connect to the server. Please check your backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 md:px-8 py-6 relative overflow-x-hidden selection:bg-emerald-600 selection:text-white">
      {/* Full-Width High-Resolution Loki Wallpaper - Spans 100% full width and height across screen */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-0 pointer-events-none"
        style={{ backgroundImage: `url('/LOKI.jpg')` }}
      />

      {/* Deep Lokiverse cinematic vignette to keep form & text crisp and readable */}
      <div className="fixed inset-0 bg-black/40 z-0 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/45 z-0 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center w-full max-w-5xl gap-8 lg:gap-16">
        {/* Left side brand hero (Desktop) */}
        <div className="hidden md:flex flex-1 flex-col items-center text-center p-4">
          {/* Lokiverse Logo */}
          <svg
            viewBox="0 0 32 32"
            fill="none"
            className="w-32 h-32 lg:w-40 lg:h-40 drop-shadow-[0_0_40px_rgba(16,185,129,0.5)] mb-4"
            aria-hidden="true"
          >
            <path
              d="M7 6C8 13 11 18 16 23C21 18 24 13 25 6C23 10 20 14 16 16C12 14 9 10 7 6Z"
              fill="#fbbf24"
            />
            <path
              d="M5 4C7 14 11 20 16 27C21 20 25 14 27 4C23.5 10 19 14.5 16 16C13 14.5 8.5 10 5 4Z"
              fill="#10b981"
              opacity="0.85"
            />
            <circle cx="16" cy="15" r="2.5" fill="#fbbf24" />
          </svg>

          <span className="text-4xl lg:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
            LOKIVERSE
          </span>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-extrabold mt-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            The Multiverse of Conversations
          </p>
        </div>

        {/* Right side form in High-Contrast Frosted Glass Card */}
        <div className="w-full max-w-[420px] backdrop-blur-2xl bg-black/80 border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.95)] rounded-3xl p-6 sm:p-8">
          {/* Mobile brand logo */}
          <div className="flex md:hidden items-center gap-2.5 mb-4">
            <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8 drop-shadow" aria-hidden="true">
              <path
                d="M7 6C8 13 11 18 16 23C21 18 24 13 25 6C23 10 20 14 16 16C12 14 9 10 7 6Z"
                fill="#fbbf24"
              />
              <path
                d="M5 4C7 14 11 20 16 27C21 20 25 14 27 4C23.5 10 19 14.5 16 16C13 14.5 8.5 10 5 4Z"
                fill="#10b981"
                opacity="0.85"
              />
              <circle cx="16" cy="15" r="2.5" fill="#fbbf24" />
            </svg>
            <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 drop-shadow">
              LOKIVERSE
            </span>
          </div>

          <h1 className="text-3xl sm:text-[34px] font-black tracking-tight leading-none mb-1.5 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            Avengers, Assemble.
          </h1>
          <h2 className="text-sm sm:text-base font-bold mb-4 text-amber-400 drop-shadow">
            Sign in to Lokiverse.
          </h2>

          {/* Dynamic Backend Error Alert */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl mb-3 text-xs md:text-sm bg-red-950/90 border border-red-500 text-red-200 backdrop-blur-md shadow-md" role="alert">
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 mt-0.5 text-red-400" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 w-full" noValidate>
            {/* Username */}
            <div className="flex flex-col gap-1">
              <label htmlFor="login-username" className="text-xs font-semibold text-slate-200 tracking-wide">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                className="w-full px-3.5 py-2.5 bg-black/70 text-white border border-white/25 rounded-xl text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 placeholder-slate-400 backdrop-blur-sm transition-all shadow-inner"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label htmlFor="login-password" className="text-xs font-semibold text-slate-200 tracking-wide">
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-black/70 text-white border border-white/25 rounded-xl text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 placeholder-slate-400 backdrop-blur-sm transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 text-slate-300 hover:text-white p-1 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Lokiverse Emerald & Gold Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-white font-black rounded-full text-sm shadow-[0_4px_25px_rgba(16,185,129,0.5)] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer tracking-wider uppercase"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Verifying clearance...</span>
                </span>
              ) : (
                "Enter Lokiverse"
              )}
            </button>
          </form>

          {/* Prompt to navigate to /signup */}
          <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-white/15">
            <span className="text-xs sm:text-sm font-semibold text-slate-200">New Variant?</span>
            <Link
              to="/signup"
              className="w-full text-center py-2.5 px-4 bg-black/50 hover:bg-emerald-500/20 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-400 rounded-full text-sm font-bold transition-all cursor-pointer backdrop-blur-sm shadow-sm inline-block"
            >
              Enlist in Timeline
            </Link>
          </div>
        </div>
      </div>

      {/* Floating Top-Center Success Toast Popup */}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-amber-600 text-white px-5 py-3 rounded-full shadow-[0_10px_35px_rgba(16,185,129,0.6)] max-w-[90vw] min-w-[280px] font-bold text-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-300">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            aria-label="Close notification"
            className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
