import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import SuggestedUsers from "../components/SuggestedUsers";
import Sidebar from "../components/Sidebar";
import AvengersBackground from "../components/AvengersBackground";
import { smash, snapAndRemove } from "../heroFx";

const NotificationPage = ({ onLogoutSuccess, authUser }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/notifications");
        if (Array.isArray(response.data)) {
          setNotifications(response.data);
          // Notify sidebar to clear/update badge count
          window.dispatchEvent(new Event("notificationUpdated"));
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleClearAll = async (e) => {
    if (e?.currentTarget) smash(e.currentTarget);
    try {
      const response = await axios.delete("/api/notifications");
      setNotifications([]);
      setToastMessage(response.data?.message || "All transmissions cleared");
      window.dispatchEvent(new Event("notificationUpdated"));
    } catch (err) {
      if (e?.currentTarget) smash(e.currentTarget);
      setToastMessage(err.response?.data?.error || "Error clearing transmissions");
    }
  };

  const handleDeleteOne = async (id, el) => {
    // Thanos snap dust fade disintegration
    snapAndRemove(el, async () => {
      try {
        await axios.delete(`/api/notifications/${id}`);
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        setToastMessage("Transmission dissolved by Thanos Snap");
        window.dispatchEvent(new Event("notificationUpdated"));
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      const response = await axios.post("/auth/logout");
      setToastMessage(response.data.message);
      setTimeout(() => {
        if (onLogoutSuccess) onLogoutSuccess();
        navigate("/login");
      }, 800);
    } catch (err) {
      if (onLogoutSuccess) onLogoutSuccess();
      navigate("/login");
    } finally {
      setLogoutLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen w-full relative text-slate-900 dark:text-[#e7e9ea] flex justify-center selection:bg-emerald-600 selection:text-white transition-colors duration-200">
      {/* High-Tech Avengers Cinematic Wallpaper & HUD Atmosphere */}
      <AvengersBackground />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-3 rounded-full shadow-[0_10px_30px_-5px_rgba(16,185,129,0.5)] text-sm font-bold animate-in fade-in slide-in-from-top-4">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-300">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="w-full max-w-7xl flex relative z-10">
        {/* Left Navigation Bar with live notification count */}
        <Sidebar activeTab="transmissions" authUser={authUser} onLogoutSuccess={onLogoutSuccess} />

        {/* Center Main Notifications Feed */}
        <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-6 border-r border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-xl">
          {/* Top Header */}
          <div className="sticky top-14 md:top-0 z-20 flex items-center justify-between px-4 sm:px-5 py-3.5 bg-white/90 dark:bg-black/75 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Transmissions & Intel</h1>
              <span className="hidden sm:inline px-2 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                INCOMING
              </span>
            </div>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={(e) => handleClearAll(e)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-600/15 dark:hover:bg-rose-600/25 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer shadow-xs"
                title="Clear all transmissions"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="p-16 text-center">
              <div className="fx-reactor mx-auto mb-4" />
              <p className="text-xs text-emerald-600 dark:text-cyan-300 font-mono tracking-wider animate-pulse">
                DECRYPTING SATELLITE TRANSMISSIONS...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#0e1017] border border-slate-200 dark:border-[#222736] flex items-center justify-center mx-auto mb-4 text-amber-500 dark:text-amber-400/80 shadow-inner">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">No Transmissions</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                When other Avengers enlist into your alliance or interact with your intel, satellite transmissions will arrive here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-[#1e2538]">
              {notifications.map((notif) => {
                const sender = notif.from;
                const senderInitials = sender?.fullname
                  ? sender.fullname
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : sender?.username?.slice(0, 2).toUpperCase() || "AV";

                return (
                  <div
                    key={notif._id}
                    id={`notif-card-${notif._id}`}
                    className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Icon type */}
                      <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                        {notif.type === "follow" ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {sender && (
                          <div
                            onClick={() => navigate(`/profile/${sender.username}`)}
                            className="flex items-center gap-2 cursor-pointer mb-1 group/user inline-flex"
                          >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 overflow-hidden shrink-0">
                              {sender.profileImg ? (
                                <img
                                  src={sender.profileImg}
                                  alt={sender.fullname}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full rounded-full bg-slate-200 dark:bg-black flex items-center justify-center text-[9px] font-black text-amber-600 dark:text-amber-300">
                                  {senderInitials}
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover/user:text-amber-500 dark:group-hover/user:text-amber-300 transition-colors">
                              {sender.fullname}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">@{sender.username}</span>
                          </div>
                        )}

                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {notif.type === "follow"
                            ? "assembled into your Avengers coalition (Followed you)"
                            : "liked your transmission"}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 block">
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Delete single button with Thanos Snap Dust Fade */}
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteOne(notif._id, document.getElementById(`notif-card-${notif._id}`))
                      }
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Thanos Snap Delete"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Right Panel - Suggested Allies */}
        <aside className="hidden lg:block w-80 shrink-0 p-5 sticky top-0 h-screen overflow-y-auto">
          <SuggestedUsers />
        </aside>
      </div>
    </div>
  );
};

export default NotificationPage;
