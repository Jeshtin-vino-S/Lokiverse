import { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import SuggestedUsers from "../components/SuggestedUsers";
import Sidebar from "../components/Sidebar";
import AvengersBackground from "../components/AvengersBackground";
import { shield, smash } from "../heroFx";
import { slash } from "../heroFx2";

const FollowersFollowingPage = ({ authUser: initialAuthUser, onLogoutSuccess }) => {
  const navigate = useNavigate();
  const { username } = useParams();
  const location = useLocation();

  // Detect active tab from URL path
  const isFollowingRoute = location.pathname.endsWith("/following");
  const [activeTab, setActiveTab] = useState(isFollowingRoute ? "following" : "followers");

  const [profileUser, setProfileUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(initialAuthUser || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [actionLoadingMap, setActionLoadingMap] = useState({});

  // Ensure current logged-in user is known
  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const response = await axios.get("/auth/me");
        if (response.data && !response.data.error) {
          setCurrentUser(response.data);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    if (!currentUser) fetchAuth();
  }, [currentUser]);

  // Keep activeTab synced with URL route
  useEffect(() => {
    setActiveTab(location.pathname.endsWith("/following") ? "following" : "followers");
  }, [location.pathname]);

  // Fetch the target user's profile with populated followers & following
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const endpoint = username ? `/api/users/profile/${username}` : "/auth/me";
        const response = await axios.get(endpoint);
        if (response.data && !response.data.error) {
          setProfileUser(response.data);
        } else {
          setError(response.data.error);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Could not load coalition dossier");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    const basePath = username ? `/profile/${username}` : "/profile";
    navigate(`${basePath}/${tab}`);
  };

  const handleFollowToggle = async (targetUser, e) => {
    const btn = e?.currentTarget;
    const targetId = targetUser._id;
    if (btn) slash(btn);
    setActionLoadingMap((prev) => ({ ...prev, [targetId]: true }));

    try {
      const response = await axios.post(`/api/users/follow/${targetId}`);
      setToastMessage(response.data?.message);
      if (btn) shield(btn);

      // Update following array in current user state
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const following = Array.isArray(prev.following) ? [...prev.following] : [];
        const isFollowing = following.some(
          (f) => (typeof f === "object" ? f._id === targetId : f === targetId)
        );

        const updated = isFollowing
          ? following.filter((f) => (typeof f === "object" ? f._id !== targetId : f !== targetId))
          : [...following, targetUser];

        return { ...prev, following: updated };
      });
    } catch (err) {
      if (btn) smash(btn);
      setToastMessage(err.response?.data?.error);
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [targetId]: false }));
    }
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

  const followersList = profileUser?.followers || [];
  const followingList = profileUser?.following || [];
  const currentList = activeTab === "following" ? followingList : followersList;

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
        <Sidebar activeTab="profile" authUser={currentUser} onLogoutSuccess={onLogoutSuccess} />

        {/* Center Main Content Feed */}
        <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-6 border-r border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-xl">
          {/* Header Bar with Back Button */}
          <div className="sticky top-14 md:top-0 z-20 flex items-center gap-4 sm:gap-6 px-4 py-3 bg-white/90 dark:bg-black/75 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => navigate(username ? `/profile/${username}` : "/profile")}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
              title="Return to Profile"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </button>

            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {profileUser?.fullname || "Agent Dossier"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">@{profileUser?.username}</p>
            </div>
          </div>

          {/* Followers / Following Segmented Tabs */}
          <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/40 backdrop-blur-md">
            {/* Followers Tab */}
            <button
              type="button"
              onClick={() => handleTabSwitch("followers")}
              className={`flex-1 py-3.5 text-center font-bold text-sm transition-all relative cursor-pointer ${
                activeTab === "followers"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span>Avengers (Followers)</span>
              <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white">
                {followersList.length}
              </span>
              {activeTab === "followers" && (
                <span className="absolute bottom-0 inset-x-8 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full shadow-sm shadow-emerald-500/40"></span>
              )}
            </button>

            {/* Following Tab */}
            <button
              type="button"
              onClick={() => handleTabSwitch("following")}
              className={`flex-1 py-3.5 text-center font-bold text-sm transition-all relative cursor-pointer ${
                activeTab === "following"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span>Allies (Following)</span>
              <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white">
                {followingList.length}
              </span>
              {activeTab === "following" && (
                <span className="absolute bottom-0 inset-x-8 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full shadow-sm shadow-emerald-500/40"></span>
              )}
            </button>
          </div>

          {/* List Area */}
          {loading ? (
            <div className="p-16 text-center">
              <div className="fx-reactor mx-auto mb-4" />
              <p className="text-xs text-emerald-600 dark:text-cyan-300 font-mono tracking-wider animate-pulse">
                LOADING COALITION REGISTRY...
              </p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-500 text-sm">{error}</div>
          ) : currentList.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#0e1017] border border-slate-200 dark:border-[#222736] flex items-center justify-center mx-auto mb-4 text-amber-500 dark:text-amber-400/80 shadow-inner">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                {activeTab === "following" ? "Not following any allies yet" : "No Avengers in this coalition yet"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {activeTab === "following"
                  ? "When this agent enlists or follows other Avengers, they will be listed here."
                  : "When other Avengers join and follow this agent, they will be listed here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {currentList.map((agent) => {
                const isObj = typeof agent === "object" && agent !== null;
                const agentId = isObj ? agent._id : agent;
                const agentUsername = isObj ? agent.username : "agent";
                const agentFullname = isObj ? agent.fullname : "Avenger Agent";
                const profileImg = isObj ? agent.profileImg : "";
                const bio = isObj ? agent.bio : "";

                const isMe = currentUser?._id?.toString() === agentId?.toString();

                const isFollowing = currentUser?.following?.some((f) => {
                  const fId = typeof f === "object" ? f._id : f;
                  return fId?.toString() === agentId?.toString();
                });

                const isActionLoading = actionLoadingMap[agentId];

                const initials = agentFullname
                  ? agentFullname
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : agentUsername.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={agentId}
                    className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* User Info - Clickable */}
                    <div
                      onClick={() => navigate(`/profile/${agentUsername}`)}
                      className="flex items-start gap-3.5 flex-1 min-w-0 cursor-pointer group"
                    >
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 p-0.5 shrink-0 overflow-hidden shadow-sm">
                        {profileImg ? (
                          <img
                            src={profileImg}
                            alt={agentFullname}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-slate-100 dark:bg-[#07080c] flex items-center justify-center font-black text-sm text-amber-600 dark:text-amber-300">
                            {initials}
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors truncate">
                            {agentFullname}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono block mb-1">
                          @{agentUsername}
                        </span>
                        {bio && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Follow Action Button */}
                    {!isMe && (
                      <button
                        type="button"
                        onClick={(e) => handleFollowToggle(agent, e)}
                        disabled={isActionLoading}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 fx-claw fx-ant-hover ${
                          isFollowing
                            ? "bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 dark:bg-white/10 dark:hover:bg-rose-500/20 dark:text-slate-200 dark:hover:text-rose-300 dark:border-white/20"
                            : "bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-white shadow-md shadow-emerald-600/30"
                        }`}
                      >
                        {isActionLoading ? "..." : isFollowing ? "Allied" : "Assemble"}
                      </button>
                    )}
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

export default FollowersFollowingPage;
