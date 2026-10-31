import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import SuggestedUsers from "../components/SuggestedUsers";
import AvengersBackground from "../components/AvengersBackground";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";

const HomePage = ({ authUser: initialAuthUser, onLogoutSuccess }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(initialAuthUser || null);
  const [feedType, setFeedType] = useState("forYou"); // "forYou" or "following"
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const cleanUsername = searchQuery.trim().replace(/^@/, "");
    if (cleanUsername) {
      navigate(`/profile/${cleanUsername}`);
      setSearchQuery("");
    }
  };

  // Sync current user
  useEffect(() => {
    if (initialAuthUser) {
      setCurrentUser(initialAuthUser);
      return;
    }
    const fetchUser = async () => {
      try {
        const res = await axios.get("/auth/me");
        if (res.data && !res.data.error) setCurrentUser(res.data);
      } catch (err) {
        // silent
      }
    };
    fetchUser();
  }, [initialAuthUser]);

  // Fetch feed posts based on active tab
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const endpoint = feedType === "following" ? "/api/posts/following" : "/api/posts/all";
      const res = await axios.get(endpoint);
      if (Array.isArray(res.data)) {
        setPosts(res.data);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Failed to load feed:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [feedType]);

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
  };

  return (
    <div className="min-h-screen w-full relative text-slate-900 dark:text-[#e7e9ea] flex justify-center selection:bg-emerald-600 selection:text-white transition-colors duration-200">
      {/* Cinematic Lokiverse Wallpaper & Atmospheric Lighting */}
      <AvengersBackground />

      <div className="w-full max-w-7xl flex relative z-10">
        {/* Left Navigation Bar */}
        <Sidebar activeTab="home" authUser={currentUser} onLogoutSuccess={onLogoutSuccess} />

        {/* Center Main Feed */}
        <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-6 border-r border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-xl">
          {/* Sticky Top Feed Switcher Header */}
          <div className="sticky top-14 md:top-0 z-20 bg-white/90 dark:bg-black/75 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10">
            <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">HQ Home</h1>
                <span className="hidden sm:inline px-2 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/30 tracking-wider">
                  SACRED TIMELINE
                </span>
              </div>

              {/* Search Avengers Bar */}
              <form onSubmit={handleSearchSubmit} className="relative w-36 sm:w-56 md:w-64">
                <input
                  id="avenger-search-input"
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-black/60 text-slate-900 dark:text-white placeholder-slate-400 border border-slate-300 dark:border-white/20 rounded-full text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono shadow-inner backdrop-blur-md"
                />
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" className="absolute left-2.5 top-2.5 text-slate-400">
                  <path d="M10.25 3.75a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm-8.5 6.5a8.5 8.5 0 1115.176 5.262l4.406 4.406a1 1 0 01-1.414 1.414l-4.406-4.406A8.5 8.5 0 011.75 10.25z" />
                </svg>
              </form>
            </div>

            {/* Feed Tabs: Multiverse (For You) & Alliance (Following) */}
            <div className="flex border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setFeedType("forYou")}
                className={`flex-1 py-3 text-center text-xs sm:text-sm font-bold transition-colors relative cursor-pointer ${
                  feedType === "forYou" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <span>Multiverse Feed (All)</span>
                {feedType === "forYou" && (
                  <span className="absolute bottom-0 inset-x-8 sm:inset-x-16 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full shadow-md shadow-emerald-500/40" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setFeedType("following")}
                className={`flex-1 py-3 text-center text-xs sm:text-sm font-bold transition-colors relative cursor-pointer ${
                  feedType === "following" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <span>Alliance Feed (Following)</span>
                {feedType === "following" && (
                  <span className="absolute bottom-0 inset-x-8 sm:inset-x-16 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full shadow-md shadow-emerald-500/40" />
                )}
              </button>
            </div>
          </div>

          {/* Broadcast New Transmission Intel */}
          <CreatePost authUser={currentUser} onPostCreated={handlePostCreated} />

          {/* Posts Feed Area */}
          {loading ? (
            <div className="p-16 text-center">
              <div className="fx-reactor mx-auto mb-4" />
              <p className="text-xs text-emerald-600 dark:text-cyan-300 font-mono tracking-wider animate-pulse">
                SCANNING MULTIVERSE TRANSMISSIONS...
              </p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              {/* 6 Infinity Stones glowing */}
              <div className="fx-stones mb-5" title="Infinity Stones Surge">
                <i /><i /><i /><i /><i /><i />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">No Intel Broadcasts Yet</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {feedType === "following"
                  ? "None of the Avengers in your coalition have transmitted intel yet. Recruit more allies or switch to Multiverse Feed!"
                  : "The multiverse feed is quiet. Be the first Avenger to broadcast intel to the coalition!"}
              </p>
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  currentUser={currentUser}
                  onPostDeleted={handlePostDeleted}
                />
              ))}
            </div>
          )}
        </main>

        {/* Right Info Panel - Suggested Allies */}
        <aside className="hidden lg:block w-80 shrink-0 p-5 sticky top-0 h-screen overflow-y-auto">
          <SuggestedUsers />
        </aside>
      </div>
    </div>
  );
};

export default HomePage;
