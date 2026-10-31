import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { fireArrow } from "../heroFx2";
import { useTheme } from "../context/ThemeContext";
import socket from "../socket";

const Sidebar = ({ activeTab = "profile", authUser: initialAuthUser, onLogoutSuccess, onSearchClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState(initialAuthUser || null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  // Determine if on mobile chat screen with active room (so bottom nav doesn't cover input)
  const isInsideActiveChat =
    location.pathname.startsWith("/chat/") && location.pathname !== "/chat";

  const handleSearchClick = () => {
    if (onSearchClick) {
      onSearchClick();
      return;
    }
    const homeInput = document.getElementById("avenger-search-input");
    if (homeInput && window.location.pathname === "/") {
      homeInput.focus();
      return;
    }
    setShowSearchModal(true);
  };

  const handleModalSearchSubmit = (e) => {
    e.preventDefault();
    const clean = modalSearchQuery.trim().replace(/^@/, "");
    if (clean) {
      navigate(`/profile/${clean}`);
      setShowSearchModal(false);
      setModalSearchQuery("");
    }
  };

  // Fetch current user if not provided
  useEffect(() => {
    if (initialAuthUser) {
      setCurrentUser(initialAuthUser);
      return;
    }
    const fetchUser = async () => {
      try {
        const res = await axios.get("/auth/me");
        if (res.data && !res.data.error) {
          setCurrentUser(res.data);
        }
      } catch {
        // silent
      }
    };
    fetchUser();
  }, [initialAuthUser]);

  // Fetch unread notification count
  const fetchNotificationCount = async () => {
    try {
      const res = await axios.get("/api/notifications/unread");
      if (res.data && typeof res.data.unreadCount === "number") {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchNotificationCount();
    const handleUpdate = () => {
      fetchNotificationCount();
    };
    window.addEventListener("notificationUpdated", handleUpdate);
    return () => {
      window.removeEventListener("notificationUpdated", handleUpdate);
    };
  }, []);

  // Hawkeye arrow effect on unread notification
  useEffect(() => {
    if (unreadCount > 0) {
      const bell = document.getElementById("hawkeye-transmission-link");
      if (bell) {
        setTimeout(() => fireArrow(bell), 400);
      }
    }
  }, [unreadCount]);

  // Fetch unread messages count (distinct users who messaged)
  const fetchUnreadMessageCount = async () => {
    try {
      const res = await axios.get("/api/messages/unread-count");
      if (res.data && typeof res.data.unreadUserCount === "number") {
        setUnreadMessageCount(res.data.unreadUserCount);
      } else if (res.data && typeof res.data.unreadCount === "number") {
        setUnreadMessageCount(res.data.unreadCount);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchUnreadMessageCount();

    const handleNewMessageAlert = (data) => {
      // Re-fetch to get accurate distinct user count
      fetchUnreadMessageCount();
    };

    const handleGeneralReceiveMessage = (savedMessage) => {
      if (savedMessage && currentUser?.username && savedMessage.sender !== currentUser.username) {
        fetchUnreadMessageCount();
      }
    };

    const handleMessagesRead = () => {
      fetchUnreadMessageCount();
    };

    socket.on("connect", fetchUnreadMessageCount);
    socket.on("new_message_notification", handleNewMessageAlert);
    socket.on("receive_message", handleGeneralReceiveMessage);
    socket.on("messages_read_confirmed", handleMessagesRead);
    window.addEventListener("messageCountUpdated", handleMessagesRead);

    return () => {
      socket.off("connect", fetchUnreadMessageCount);
      socket.off("new_message_notification", handleNewMessageAlert);
      socket.off("receive_message", handleGeneralReceiveMessage);
      socket.off("messages_read_confirmed", handleMessagesRead);
      window.removeEventListener("messageCountUpdated", handleMessagesRead);
    };
  }, [currentUser]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await axios.post("/auth/logout");
      setTimeout(() => {
        if (onLogoutSuccess) onLogoutSuccess();
        navigate("/login");
      }, 500);
    } catch {
      if (onLogoutSuccess) onLogoutSuccess();
      navigate("/login");
    } finally {
      setLogoutLoading(false);
    }
  };

  const initials = currentUser?.fullname
    ? currentUser.fullname
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : currentUser?.username?.slice(0, 2).toUpperCase() || "AV";

  return (
    <>
      {/* ======================================================== */}
      {/* 1. MOBILE TOP HEADER (Hidden on tablet & desktop: md:hidden) */}
      {/* ======================================================== */}
      {!isInsideActiveChat && (
        <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 px-4 bg-white/95 dark:bg-black/90 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
              <path d="M7 6C8 13 11 18 16 23C21 18 24 13 25 6C23 10 20 14 16 16C12 14 9 10 7 6Z" fill="#fbbf24" />
              <path d="M5 4C7 14 11 20 16 27C21 20 25 14 27 4C23.5 10 19 14.5 16 16C13 14.5 8.5 10 5 4Z" fill="#10b981" opacity="0.85" />
              <circle cx="16" cy="15" r="2.5" fill="#fbbf24" />
            </svg>
            <span className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400">
              LOKIVERSE
            </span>
          </Link>

          {/* Quick Actions: Theme Switcher & Leave HQ */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              {isDark ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-amber-400">
                  <path d="M12.3 2a10 10 0 00-1.9 19.8 10 10 0 0011.6-11.6A10 10 0 0012.3 2z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-emerald-600">
                  <path d="M12 18a6 6 0 100-12 6 6 0 000 12zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.5 4.9l1.4-1.4 2.1 2.1-1.4 1.4-2.1-2.1zm14.1 14.1l1.4-1.4 2.1 2.1-1.4 1.4-2.1-2.1zM1 11h3v2H1v-2zm19 0h3v2h-3v-2zM4.9 20.5l-1.4-1.4 2.1-2.1 1.4 1.4-2.1 2.1zm14.1-14.1l-1.4-1.4 2.1-2.1 1.4 1.4-2.1 2.1z" />
                </svg>
              )}
            </button>

            {/* Leave HQ Logout Icon */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Leave HQ"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zM20 3h-9c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H9v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* ======================================================== */}
      {/* 2. MOBILE BOTTOM NAVIGATION BAR (md:hidden) */}
      {/* ======================================================== */}
      {!isInsideActiveChat && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white/95 dark:bg-black/90 backdrop-blur-2xl border-t border-slate-200 dark:border-white/10 flex items-center justify-around px-2 shadow-lg safe-bottom">
          {/* Home */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "home"
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1zm0 2.69l6 5.4V19h-2v-6H8v6H6v-8.81l6-5.4z" />
            </svg>
            <span className="text-[10px] mt-0.5">Home</span>
          </Link>

          {/* Search */}
          <button
            type="button"
            onClick={handleSearchClick}
            className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M10.25 3.75a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm-8.5 6.5a8.5 8.5 0 1115.176 5.262l4.406 4.406a1 1 0 01-1.414 1.414l-4.406-4.406A8.5 8.5 0 011.75 10.25z" />
            </svg>
            <span className="text-[10px] mt-0.5">Search</span>
          </button>

          {/* Live Chat */}
          <Link
            to="/chat"
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer relative ${
              activeTab === "chat"
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <div className="relative">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
              </svg>
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[9px] font-black text-white flex items-center justify-center animate-pulse shadow-sm">
                  {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">Chat</span>
          </Link>

          {/* Transmissions (Notifications) */}
          <Link
            to="/notifications"
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer relative ${
              activeTab === "transmissions"
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <div className="relative">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-emerald-500 text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">Alerts</span>
          </Link>

          {/* Profile Dossier */}
          <Link
            to="/profile"
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "profile"
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-white text-[10px] font-bold">
              {currentUser?.profileImg ? (
                <img src={currentUser.profileImg} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <span className="text-[10px] mt-0.5">Profile</span>
          </Link>
        </nav>
      )}

      {/* ======================================================== */}
      {/* 3. TABLET & DESKTOP SIDEBAR (hidden on mobile: hidden md:flex) */}
      {/* ======================================================== */}
      <aside className="hidden md:flex w-18 xl:w-64 shrink-0 flex-col justify-between p-3 xl:p-4 border-r border-slate-200 dark:border-white/10 sticky top-0 h-screen bg-white/95 dark:bg-black/60 backdrop-blur-2xl z-30 selection:bg-emerald-600 selection:text-white transition-colors duration-200">
        <div className="flex flex-col items-center xl:items-start gap-4">
          {/* Lokiverse Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer mb-2"
          >
            <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8 shrink-0">
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
            <div className="hidden xl:flex flex-col">
              <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400">
                LOKIVERSE
              </span>
              <span className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400/80 font-bold -mt-0.5">
                Multiverse Initiative
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1.5 w-full">
            {/* HQ Home */}
            <Link
              to="/"
              className={`flex items-center gap-4 p-3 rounded-xl transition-all text-left cursor-pointer fx-ant-hover ${
                activeTab === "home"
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1zm0 2.69l6 5.4V19h-2v-6H8v6H6v-8.81l6-5.4z" />
              </svg>
              <span className="hidden xl:inline font-semibold text-base">HQ Home</span>
            </Link>

            {/* Search Agents */}
            <button
              type="button"
              onClick={handleSearchClick}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all text-left cursor-pointer fx-ant-hover ${
                showSearchModal
                  ? "text-amber-500 dark:text-amber-400 bg-amber-400/15 border border-amber-400/30 font-bold shadow-sm shadow-amber-400/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
              }`}
              title="Search Avengers by @username"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M10.25 3.75a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm-8.5 6.5a8.5 8.5 0 1115.176 5.262l4.406 4.406a1 1 0 01-1.414 1.414l-4.406-4.406A8.5 8.5 0 011.75 10.25z" />
              </svg>
              <span className="hidden xl:inline font-semibold text-base">Search Agents</span>
            </button>

            {/* Live Chat with Dynamic Badge Count */}
            <Link
              to="/chat"
              className={`flex items-center gap-4 p-3 rounded-xl transition-all text-left cursor-pointer relative group fx-ant-hover ${
                activeTab === "chat"
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                </svg>
                {unreadMessageCount > 0 && (
                  <span className="xl:hidden absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[10px] font-black text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-pulse border border-white dark:border-[#07080c]">
                    {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                  </span>
                )}
              </div>

              <div className="hidden xl:flex items-center justify-between flex-1">
                <span className="font-semibold text-base">Live Chat</span>
                {unreadMessageCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-500/40 animate-pulse border border-emerald-400/30">
                    {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                  </span>
                )}
              </div>
            </Link>

            {/* Transmissions (Notifications) with Dynamic Badge Count & Hawkeye Arrow */}
            <Link
              id="hawkeye-transmission-link"
              to="/notifications"
              onClick={(e) => fireArrow(e.currentTarget)}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all text-left cursor-pointer relative group fx-ant-hover ${
                activeTab === "transmissions"
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="xl:hidden absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[10px] font-black text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-pulse border border-white dark:border-[#07080c]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>

              <div className="hidden xl:flex items-center justify-between flex-1">
                <span className="font-semibold text-base">Transmissions</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-500/40 animate-pulse border border-emerald-400/30">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </Link>

            {/* Profile Dossier */}
            <Link
              to="/profile"
              className={`flex items-center gap-4 p-3 rounded-xl transition-all text-left cursor-pointer fx-ant-hover ${
                activeTab === "profile"
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <span className="hidden xl:inline font-bold text-base">Profile Dossier</span>
            </Link>
          </nav>
        </div>

        {/* Theme Toggle, User Mini-Card & Logout (Desktop / Tablet) */}
        <div className="flex flex-col gap-2.5 w-full pt-3 border-t border-slate-200 dark:border-white/10">
          {/* Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-between w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-100/80 dark:bg-black/50 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-xs"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  isDark ? "bg-amber-400/20 text-amber-300" : "bg-emerald-500/15 text-emerald-700"
                }`}
              >
                {isDark ? (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12.3 2a10 10 0 00-1.9 19.8 10 10 0 0011.6-11.6A10 10 0 0012.3 2z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 18a6 6 0 100-12 6 6 0 000 12zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.5 4.9l1.4-1.4 2.1 2.1-1.4 1.4-2.1-2.1zm14.1 14.1l1.4-1.4 2.1 2.1-1.4 1.4-2.1-2.1zM1 11h3v2H1v-2zm19 0h3v2h-3v-2zM4.9 20.5l-1.4-1.4 2.1-2.1 1.4 1.4-2.1 2.1zm14.1-14.1l-1.4-1.4 2.1-2.1 1.4 1.4-2.1 2.1z" />
                  </svg>
                )}
              </div>
              <div className="hidden xl:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isDark ? "Dark Theme" : "Light Theme"}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {isDark ? "Cosmic Obsidian" : "Clean White"}
                </span>
              </div>
            </div>

            <div
              className={`hidden xl:flex w-9 h-5 rounded-full p-0.5 transition-colors items-center ${
                isDark ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs transition-transform" />
            </div>
          </button>

          {currentUser && (
            <div
              onClick={() => navigate("/profile")}
              className="hidden xl:flex items-center gap-3 p-2 rounded-xl bg-slate-100/80 dark:bg-black/40 border border-slate-200 dark:border-white/15 backdrop-blur-md cursor-pointer hover:border-emerald-500/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 flex items-center justify-center font-black text-sm text-white shrink-0 shadow-md shadow-emerald-600/30 overflow-hidden">
                {currentUser.profileImg ? (
                  <img src={currentUser.profileImg} alt={currentUser.fullname} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{currentUser.fullname}</span>
                <span className="text-xs text-amber-600 dark:text-amber-400 truncate font-mono">@{currentUser.username}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="flex items-center justify-center xl:justify-start gap-2.5 p-2.5 text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-500/15 border border-rose-200 dark:border-rose-500/20 hover:border-rose-500 rounded-xl text-sm font-semibold transition-all cursor-pointer w-full"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zM20 3h-9c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H9v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
            </svg>
            <span className="hidden xl:inline">
              {logoutLoading ? "Leaving HQ..." : "Leave HQ"}
            </span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 4. DOCTOR STRANGE MYSTIC SEARCH PORTAL MODAL */}
      {/* ======================================================== */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-black/90 border border-slate-200 dark:border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center fx-ant">
            <button
              type="button"
              onClick={() => setShowSearchModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="fx-portal" />
              <div className="absolute inset-0 flex items-center justify-center text-amber-500 dark:text-amber-400">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                  <path d="M10.25 3.75a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm-8.5 6.5a8.5 8.5 0 1115.176 5.262l4.406 4.406a1 1 0 01-1.414 1.414l-4.406-4.406A8.5 8.5 0 011.75 10.25z" />
                </svg>
              </div>
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 tracking-wide">
              Mystic Agent Registry
            </h3>
            <p className="text-xs text-amber-600 dark:text-amber-300/80 mb-5 text-center font-mono">
              Search any Avenger dossier across the Multiverse
            </p>

            <form onSubmit={handleModalSearchSubmit} className="w-full space-y-3">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="Enter username (e.g. vimal, karthi)..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-black/70 border border-slate-300 dark:border-amber-500/40 focus:border-amber-500 dark:focus:border-amber-400 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none font-mono transition-all shadow-inner"
                />
                <span className="absolute left-3.5 top-2.5 text-amber-600 dark:text-amber-400 font-mono text-sm">@</span>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSearchModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalSearchQuery.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-40"
                >
                  Open Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
