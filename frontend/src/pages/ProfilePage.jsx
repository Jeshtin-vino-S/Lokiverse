import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import EditProfileModal from "../components/EditProfileModal";
import SuggestedUsers from "../components/SuggestedUsers";
import Sidebar from "../components/Sidebar";
import AvengersBackground from "../components/AvengersBackground";
import SpiderWeb from "../components/SpiderWeb";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import { strikeThunder, shield, smash } from "../heroFx";
import { slash } from "../heroFx2";

const ProfilePage = ({ onLogoutSuccess, authUser: initialAuthUser }) => {
  const navigate = useNavigate();
  const { username } = useParams();

  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(initialAuthUser || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("posts");
  const [likesFilter, setLikesFilter] = useState("received"); // "received" (likes received on posts) | "given" (posts liked by user)
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Ensure we know who the logged-in user is
  useEffect(() => {
    const fetchAuthUser = async () => {
      try {
        const response = await axios.get("/auth/me");
        if (response.data && !response.data.error) {
          setCurrentUser(response.data);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      }
    };

    if (!currentUser) {
      fetchAuthUser();
    }
  }, [currentUser]);

  // Fetch profile: if username param present, use /api/users/profile/:username; else /auth/me
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const endpoint = username ? `/api/users/profile/${username}` : "/auth/me";
        const response = await axios.get(endpoint);
        if (response.data && !response.data.error) {
          setUser(response.data);
        } else {
          setError(response.data.error || "Agent dossier not found in Avengers registry");
        }
      } catch (err) {
        setError(err.response?.data?.error || "Agent dossier not found in Avengers registry");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  // Fetch posts for active profile tab
  useEffect(() => {
    if (!user?._id) return;
    const fetchTabPosts = async () => {
      setPostsLoading(true);
      try {
        let endpoint = `/api/posts/user/${user.username}`;
        if (activeTab === "replies") {
          endpoint = `/api/posts/replies/${user.username}`;
        } else if (activeTab === "likes") {
          if (likesFilter === "given") {
            endpoint = `/api/posts/likes/${user._id}`;
          } else {
            endpoint = `/api/posts/user/${user.username}`;
          }
        }
        const res = await axios.get(endpoint);
        if (Array.isArray(res.data)) {
          if (activeTab === "likes" && likesFilter === "received") {
            // Filter user posts that have at least 1 like
            setPosts(res.data.filter((p) => p.likes && p.likes.length > 0));
          } else {
            setPosts(res.data);
          }
        } else {
          setPosts([]);
        }
      } catch (err) {
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchTabPosts();
  }, [user, activeTab, likesFilter]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      const response = await axios.post("/auth/logout");
      setToastMessage(response.data.message || "Logged out from HQ");
      setTimeout(() => {
        if (onLogoutSuccess) {
          onLogoutSuccess();
        }
        navigate("/login");
      }, 800);
    } catch (err) {
      if (onLogoutSuccess) {
        onLogoutSuccess();
      }
      navigate("/login");
    } finally {
      setLogoutLoading(false);
    }
  };

  const copyHandle = () => {
    if (user?.username) {
      navigator.clipboard.writeText(`@${user.username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Search handler to look up any agent by username
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const cleanUsername = searchQuery.trim().replace(/^@/, "");
    if (cleanUsername) {
      navigate(`/profile/${cleanUsername}`);
      setSearchQuery("");
    }
  };

  // Follow / Unfollow handler with Captain America Shield bounce & Hulk smash
  const handleFollowToggle = async (e) => {
    if (!user?._id) return;
    const btn = e?.currentTarget;
    if (btn) slash(btn);
    setFollowLoading(true);

    try {
      const response = await axios.post(`/api/users/follow/${user._id}`);
      setToastMessage(response.data?.message || "Alliance updated successfully");
      if (btn) shield(btn);

      // Dynamically toggle follow state in local user
      const myId = currentUser?._id;
      setUser((prev) => {
        if (!prev) return prev;
        const followers = Array.isArray(prev.followers) ? [...prev.followers] : [];
        const isFollowing = followers.some(
          (f) => (typeof f === "string" ? f === myId : f?._id === myId || f?.toString() === myId)
        );

        let updatedFollowers;
        if (isFollowing) {
          updatedFollowers = followers.filter(
            (f) => (typeof f === "string" ? f !== myId : f?._id !== myId && f?.toString() !== myId)
          );
        } else {
          updatedFollowers = [...followers, myId];
        }

        return { ...prev, followers: updatedFollowers };
      });
    } catch (err) {
      if (btn) smash(btn);
      setToastMessage(err.response?.data?.error || "Error updating alliance");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleProfileUpdated = (updatedUser) => {
    setUser(updatedUser);
    setCurrentUser(updatedUser);
    setToastMessage("Dossier updated successfully!");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#070912] text-[#e7e9ea] relative">
        <AvengersBackground />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="fx-reactor" />
          <span className="text-sm font-bold text-cyan-300 tracking-wider animate-pulse">
            INITIALIZING STARK DOSSIER...
          </span>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#07080c] text-[#e7e9ea] p-4">
        <div className="bg-[#0e1017] border border-red-600/30 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-600/10 text-red-500 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Dossier Unavailable</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/profile")}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 text-white rounded-xl text-sm font-extrabold transition-all cursor-pointer shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-amber-400"
          >
            Return to My Dossier
          </button>
        </div>
      </div>
    );
  }

  const followersCount = user?.followers?.length || 0;
  const followingCount = user?.following?.length || 0;
  const isMyProfile = !username || username === currentUser?.username || user?._id === currentUser?._id;

  const isFollowing = user?.followers?.some((f) => {
    if (!f) return false;
    const fId = typeof f === "object" && f !== null ? f._id : f;
    const myId = currentUser?._id;
    return fId?.toString() === myId?.toString();
  });

  const initials = user?.fullname
    ? user.fullname
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() || "AV";

  return (
    <div className="min-h-screen w-full relative text-slate-900 dark:text-[#e7e9ea] flex justify-center selection:bg-emerald-600 selection:text-white transition-colors duration-200">
      {/* High-Tech Lokiverse Cosmic Atmosphere */}
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

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      <div className="w-full max-w-7xl flex relative z-10">
        {/* Left Navigation Bar with live notification count */}
        <Sidebar
          activeTab="profile"
          authUser={currentUser}
          onLogoutSuccess={onLogoutSuccess}
        />

        {/* Center Main Profile Feed */}
        <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-6 border-r border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-xl">
          {/* Top Bar with Agent Header */}
          <div className="sticky top-14 md:top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-white/90 dark:bg-black/75 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">{user?.fullname}</h1>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/30 tracking-wider">
                  AVENGER
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">@{user?.username}</p>
            </div>
          </div>

          {/* Compound Banner (Cover Image) */}
          <div className="relative w-full h-36 sm:h-48 md:h-56 bg-gradient-to-r from-emerald-100/60 via-slate-100 to-amber-50/60 dark:from-emerald-950/30 dark:via-slate-900/50 dark:to-teal-950/30 overflow-hidden border-b border-slate-200 dark:border-white/10">
            {/* Spider-Man Web in banner corners */}
            <SpiderWeb />
            <SpiderWeb side="right" />

            {user?.coverImg ? (
              <img src={user.coverImg} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full relative">
                {/* Subtle Emerald & Celestial Gold Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(16,185,129,0.18),transparent_55%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_65%,rgba(251,191,36,0.12),transparent_50%)]"></div>
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/80 to-transparent"></div>
              </div>
            )}
          </div>

          {/* Profile Header Block */}
          <div className="px-4 sm:px-5 pb-5 border-b border-slate-200 dark:border-white/10 relative">
            {/* Avatar & Action Button Row */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-end -mt-14 sm:-mt-20 mb-4 gap-3">
              {/* Floating Glowing Arc Avatar with Scarlet Witch Chaos Swirl */}
              <div className="relative">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full p-1 bg-white dark:bg-black/80 ring-2 ring-emerald-500/80 shadow-2xl shadow-emerald-600/20 overflow-hidden fx-wanda cursor-pointer" title="Scarlet Witch Chaos Magic">
                  {user?.profileImg ? (
                    <img
                      src={user.profileImg}
                      alt={user.fullname}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 flex items-center justify-center text-3xl sm:text-4xl font-black text-white">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Edit Profile OR Follow / Unfollow */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Thor Thunder effect on Transmit click */}
                <button
                  type="button"
                  onClick={(e) => {
                    strikeThunder(e.currentTarget);
                    copyHandle();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/15 dark:text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                  </svg>
                  <span>{copied ? "Copied!" : "Transmit"}</span>
                </button>

                {!isMyProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser?._id && user?._id) {
                        const ids = [currentUser._id.toString(), user._id.toString()].sort();
                        navigate(`/chat/${ids[0]}_${ids[1]}`);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/15 dark:text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Direct Message Agent"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                    </svg>
                    <span>Message</span>
                  </button>
                )}

                {isMyProfile ? (
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleFollowToggle(e)}
                    disabled={followLoading}
                    className={`px-4 py-2 rounded-xl font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer fx-claw fx-ant-hover ${
                      isFollowing
                        ? "bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 dark:bg-white/10 dark:hover:bg-rose-500/20 dark:text-slate-200 dark:hover:text-rose-300 dark:border-white/20"
                        : "bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-white shadow-emerald-600/30"
                    }`}
                  >
                    {followLoading ? "..." : isFollowing ? "Allied (Unfollow)" : "Assemble (Follow)"}
                  </button>
                )}
              </div>
            </div>

            {/* Name, Username & Avengers Crest */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{user?.fullname}</h2>
                {/* Vision Mind Stone Pulsing Badge */}
                <span className="p-0.5 bg-amber-400/20 rounded-full text-amber-500 dark:text-amber-300 fx-mind inline-flex items-center justify-center cursor-pointer" title="Vision Mind Stone Certified">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">@{user?.username}</span>
              </div>
            </div>

            {/* Real Bio from MongoDB */}
            {user?.bio ? (
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">{user.bio}</p>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-4">No bio added to this dossier yet.</p>
            )}

            {/* Metadata (Email, Joined Date, External Link) */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
              {/* Black Widow: Classified Email with Red Laser Scan */}
              {user?.email && (
                <div className="flex items-center gap-1.5 fx-widow px-2 py-0.5 rounded-lg border border-red-500/20 bg-red-500/10 dark:bg-red-950/20 text-red-600 dark:text-red-300 cursor-pointer" title="Classified Dossier Intel - Hover to Scan">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  <span>{user.email}</span>
                </div>
              )}

              {user?.createdAt && (
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-amber-500 dark:text-amber-400">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
                  </svg>
                  <span>Enlisted {formatDate(user.createdAt)}</span>
                </div>
              )}

              {user?.link && (
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-amber-500 dark:text-amber-400">
                    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                  </svg>
                  <a
                    href={user.link.startsWith("http") ? user.link : `https://${user.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 dark:text-amber-400 hover:underline truncate max-w-[200px]"
                  >
                    {user.link.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>

            {/* Real Dynamic Stats from MongoDB */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => navigate(user?.username ? `/profile/${user.username}/following` : "/profile/following")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 hover:border-amber-400/50 hover:bg-slate-200/90 dark:hover:bg-white/10 transition-all cursor-pointer group shadow-xs backdrop-blur-md"
                title="Click to view all followed allies"
              >
                <span className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">{followingCount}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-800 dark:group-hover:text-slate-200">Allies</span>
              </div>

              <div
                onClick={() => navigate(user?.username ? `/profile/${user.username}/followers` : "/profile/followers")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 hover:border-emerald-500/50 hover:bg-slate-200/90 dark:hover:bg-white/10 transition-all cursor-pointer group shadow-xs backdrop-blur-md"
                title="Click to view all followers"
              >
                <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">{followersCount}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-800 dark:group-hover:text-slate-200">Avengers</span>
              </div>
            </div>
          </div>

          {/* Segmented Tabs */}
          <div className="flex border-b border-slate-200 dark:border-white/10 px-5 pt-2 bg-slate-50/60 dark:bg-black/30 backdrop-blur-md">
            {[
              { id: "posts", label: "Posts" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 font-bold text-sm transition-all relative cursor-pointer ${
                  activeTab === tab.id
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 inset-x-2 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full shadow-sm shadow-emerald-500/40"></span>
                )}
              </button>
            ))}
          </div>

          {/* Likes Sub-filter Switcher (Likes Received on Posts vs Transmissions Liked by Agent) */}
          {activeTab === "likes" && (
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-black/25">
              <button
                type="button"
                onClick={() => setLikesFilter("received")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  likesFilter === "received"
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                ❤️ Likes Received on Posts
              </button>
              <button
                type="button"
                onClick={() => setLikesFilter("given")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  likesFilter === "given"
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                ⚡ Liked by Agent
              </button>
            </div>
          )}

          {/* Create Post on Own Profile */}
          {isMyProfile && activeTab === "posts" && (
            <CreatePost
              authUser={currentUser}
              onPostCreated={(newPost) => setPosts((prev) => [newPost, ...prev])}
            />
          )}

          {/* Dynamic Feed Content */}
          {postsLoading ? (
            <div className="p-16 text-center">
              <div className="fx-reactor mx-auto mb-4" />
              <p className="text-xs text-emerald-600 dark:text-cyan-300 font-mono tracking-wider animate-pulse">
                RETRIEVING AGENT DOSSIER INTEL...
              </p>
            </div>
          ) : activeTab === "media" ? (
            // Media Grid View
            (() => {
              const mediaPosts = posts.filter((p) => p.img || p.image);
              if (mediaPosts.length === 0) {
                return (
                  <div className="p-16 text-center flex flex-col items-center justify-center">
                    <div className="fx-stones mb-5" title="Infinity Stones Surge">
                      <i /><i /><i /><i /><i /><i />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">No Recon Media</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Agent has not transmitted any visual recon images or satellite media.
                    </p>
                  </div>
                );
              }
              return (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mediaPosts.map((mp) => (
                    <div key={mp._id} className="relative rounded-2xl overflow-hidden aspect-square border border-slate-200 dark:border-white/10 group">
                      <img
                        src={mp.img || mp.image}
                        alt="Media intel"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              );
            })()
          ) : posts.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              {/* 6 Infinity Stones: Power, Space, Reality, Time, Soul, Mind */}
              <div className="fx-stones mb-5" title="Infinity Stones Surge">
                <i /><i /><i /><i /><i /><i />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                {activeTab === "replies"
                  ? "No replies on transmissions"
                  : activeTab === "likes"
                  ? (likesFilter === "received" ? "No likes received on posts yet" : "No liked transmissions")
                  : "No transmissions in dossier"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {activeTab === "replies"
                  ? "When allies send comments or reply to this agent's intel, they will appear here with active discussion threads."
                  : activeTab === "likes"
                  ? (likesFilter === "received"
                      ? "Transmissions from this agent have not received any likes from allies yet."
                      : "Agent has not liked any multiverse transmissions yet.")
                  : "No transmissions broadcasted by this agent yet."}
              </p>
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  currentUser={currentUser}
                  defaultShowComments={activeTab === "replies"}
                  badgeContext={
                    activeTab === "replies"
                      ? "replies"
                      : activeTab === "likes" && likesFilter === "received"
                      ? "likes"
                      : null
                  }
                  onPostDeleted={(deletedId) =>
                    setPosts((prev) => prev.filter((p) => p._id !== deletedId))
                  }
                />
              ))}
            </div>
          )}
        </main>

        {/* Right Info Panel (Desktop Only) - Suggested Allies & Diagnostics */}
        <aside className="hidden lg:block w-80 shrink-0 p-5 sticky top-0 h-screen overflow-y-auto">
          {/* API 3: Suggested Users Widget */}
          <SuggestedUsers
            onFollowChange={(targetId, isNowFollowing, message) => {
              if (message) setToastMessage(message);
              // If currently viewing this target user, update their count live
              if (user?._id === targetId) {
                setUser((prev) => {
                  if (!prev) return prev;
                  const followers = Array.isArray(prev.followers) ? [...prev.followers] : [];
                  const myId = currentUser?._id;
                  const updated = isNowFollowing
                    ? [...followers, myId]
                    : followers.filter((f) => f !== myId && f?._id !== myId);
                  return { ...prev, followers: updated };
                });
              }
            }}
          />
        </aside>
      </div>
    </div>
  );
};

export default ProfilePage;
