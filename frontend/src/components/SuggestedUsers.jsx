import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { shield, smash } from "../heroFx";
import { slash } from "../heroFx2";

const SuggestedUsers = ({ onFollowChange }) => {
  const navigate = useNavigate();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({});
  const [actionLoadingMap, setActionLoadingMap] = useState({});

  useEffect(() => {
    const fetchSuggested = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/users/suggested");
        if (Array.isArray(response.data)) {
          setSuggestedUsers(response.data);
        }
      } catch (err) {
        console.error("Failed to load suggested users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggested();
  }, []);

  const handleFollowToggle = async (targetUser, e) => {
    const btn = e?.currentTarget;
    const targetId = targetUser._id;
    if (btn) slash(btn);
    setActionLoadingMap((prev) => ({ ...prev, [targetId]: true }));

    try {
      const response = await axios.post(`/api/users/follow/${targetId}`);
      if (btn) shield(btn);
      const isNowFollowing = !followingMap[targetId];
      setFollowingMap((prev) => ({ ...prev, [targetId]: isNowFollowing }));

      if (onFollowChange) {
        onFollowChange(targetId, isNowFollowing, response.data?.message);
      }
    } catch (err) {
      if (btn) smash(btn);
      console.error("Follow error:", err);
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-[#0e1017]/90 border border-[#222736] mb-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          Recruit Allies
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-white/10 shrink-0"></div>
              <div className="flex-1 space-y-1">
                <div className="h-3 w-20 bg-white/10 rounded"></div>
                <div className="h-2.5 w-14 bg-white/5 rounded"></div>
              </div>
              <div className="h-7 w-16 bg-white/10 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestedUsers.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 backdrop-blur-2xl mb-5 shadow-sm dark:shadow-2xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          Recruit Allies
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">All available Avengers are already in your coalition.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-white/95 dark:bg-black/60 border border-slate-200 dark:border-purple-500/30 fx-vibranium backdrop-blur-2xl mb-5 shadow-sm dark:shadow-2xl transition-colors duration-200">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse"></span>
          <span>Recruit Allies</span>
        </div>
        <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider">Wakanda Intel</span>
      </h3>

      <div className="space-y-3.5">
        {suggestedUsers.map((su) => {
          const isFollowing = followingMap[su._id];
          const isActionLoading = actionLoadingMap[su._id];
          const initials = su.fullname
            ? su.fullname
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            : su.username?.slice(0, 2).toUpperCase() || "AV";

          return (
            <div key={su._id} className="flex items-center justify-between gap-2.5">
              {/* User Identity Clickable to profile */}
              <div
                onClick={() => navigate(`/profile/${su.username}`)}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 p-0.5 shrink-0 overflow-hidden shadow-sm">
                  {su.profileImg ? (
                    <img src={su.profileImg} alt={su.fullname} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-100 dark:bg-[#07080c] flex items-center justify-center font-bold text-xs text-amber-600 dark:text-amber-300">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors truncate">
                    {su.fullname}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">@{su.username}</span>
                </div>
              </div>

              {/* Follow Button with Black Panther claw & Ant-Man hover */}
              <button
                type="button"
                onClick={(e) => handleFollowToggle(su, e)}
                disabled={isActionLoading}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 fx-claw fx-ant-hover ${
                  isFollowing
                    ? "bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 dark:bg-white/10 dark:hover:bg-rose-500/20 dark:text-slate-200 dark:hover:text-rose-300 dark:border-white/20"
                    : "bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-white shadow-md shadow-emerald-600/30"
                }`}
              >
                {isActionLoading ? "..." : isFollowing ? "Allied" : "Assemble"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedUsers;

