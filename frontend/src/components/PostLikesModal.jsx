import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * PostLikesModal
 * Instagram-style "Liked By" Modal showing list of all allies who liked a transmission,
 * highlighting mutual followers and providing one-click Assemble (Follow/Unfollow) buttons.
 */
const PostLikesModal = ({
  users = [],
  currentUser,
  onClose,
  onFollowToggleSuccess,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [followingMap, setFollowingMap] = useState(() => {
    // Initialize map of who the current user follows
    const map = {};
    if (currentUser?.following) {
      currentUser.following.forEach((f) => {
        const id = typeof f === "object" ? f._id : f;
        if (id) map[id.toString()] = true;
      });
    }
    return map;
  });
  const [loadingMap, setLoadingMap] = useState({});

  const myFollowersMap = {};
  if (currentUser?.followers) {
    currentUser.followers.forEach((f) => {
      const id = typeof f === "object" ? f._id : f;
      if (id) myFollowersMap[id.toString()] = true;
    });
  }

  // Handle live follow/unfollow toggle
  const handleFollowToggle = async (targetUser, e) => {
    e.stopPropagation();
    const targetId = targetUser._id;
    if (!targetId || loadingMap[targetId]) return;

    setLoadingMap((prev) => ({ ...prev, [targetId]: true }));
    const wasFollowing = !!followingMap[targetId];

    // Optimistic UI
    setFollowingMap((prev) => ({ ...prev, [targetId]: !wasFollowing }));

    try {
      await axios.post(`/api/users/follow/${targetId}`);
      if (onFollowToggleSuccess) {
        onFollowToggleSuccess(targetId, !wasFollowing);
      }
    } catch (err) {
      // Revert on error
      setFollowingMap((prev) => ({ ...prev, [targetId]: wasFollowing }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  // Filter and sort users: mutuals first, then followed, then others
  const validUsers = users.filter((u) => typeof u === "object" && u._id);

  const sortedUsers = [...validUsers].sort((a, b) => {
    const aIsMe = a._id?.toString() === currentUser?._id?.toString();
    const bIsMe = b._id?.toString() === currentUser?._id?.toString();
    if (aIsMe) return -1;
    if (bIsMe) return 1;

    const aMutual = followingMap[a._id] && myFollowersMap[a._id];
    const bMutual = followingMap[b._id] && myFollowersMap[b._id];
    if (aMutual && !bMutual) return -1;
    if (!aMutual && bMutual) return 1;

    const aFollowed = followingMap[a._id];
    const bFollowed = followingMap[b._id];
    if (aFollowed && !bFollowed) return -1;
    if (!aFollowed && bFollowed) return 1;

    return 0;
  });

  const filteredUsers = sortedUsers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.fullname?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-colors duration-200"
      >
        {/* Header (Instagram Style) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-black/40">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-sm">❤️</span>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Likes
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold">
              {validUsers.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Search Bar (if more than 5 users) */}
        {validUsers.length > 5 && (
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1017]">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-white/15 text-xs">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-slate-400">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                placeholder="Search allies who liked..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none"
              />
            </div>
          </div>
        )}

        {/* Scrollable Users List */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-white/5 flex-1">
          {filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-slate-500 dark:text-slate-400 text-xs">
              {search ? "No matching allies found." : "No likes on this transmission yet."}
            </div>
          ) : (
            filteredUsers.map((agent) => {
              const isMe = agent._id?.toString() === currentUser?._id?.toString();
              const isFollowing = !!followingMap[agent._id];
              const isFollower = !!myFollowersMap[agent._id];
              const isMutual = isFollowing && isFollower;
              const isLoading = !!loadingMap[agent._id];

              const initials = agent.fullname
                ? agent.fullname
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : agent.username?.slice(0, 2).toUpperCase() || "AV";

              return (
                <div
                  key={agent._id}
                  onClick={() => {
                    navigate(`/profile/${agent.username}`);
                    onClose();
                  }}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/[0.04] rounded-2xl cursor-pointer transition-colors group"
                >
                  {/* Left: Avatar + Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 p-0.5 shrink-0 overflow-hidden shadow-xs">
                      {agent.profileImg ? (
                        <img
                          src={agent.profileImg}
                          alt={agent.fullname}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-slate-200 dark:bg-black flex items-center justify-center font-bold text-xs text-amber-600 dark:text-amber-300">
                          {initials}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors truncate">
                          {agent.fullname || agent.username}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9px] font-black">
                            YOU
                          </span>
                        )}
                        {isMutual && !isMe && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] font-black border border-amber-500/20">
                            MUTUAL
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        @{agent.username}
                      </span>
                    </div>
                  </div>

                  {/* Right: Instagram-Style Follow Button */}
                  {!isMe && (
                    <button
                      type="button"
                      onClick={(e) => handleFollowToggle(agent, e)}
                      disabled={isLoading}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        isFollowing
                          ? "bg-slate-100 hover:bg-rose-50 dark:bg-white/10 dark:hover:bg-rose-500/20 text-slate-700 hover:text-rose-600 dark:text-slate-200 dark:hover:text-rose-300 border border-slate-300 dark:border-white/15"
                          : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-sm shadow-emerald-600/30"
                      }`}
                    >
                      {isLoading ? "..." : isFollowing ? "Allied" : "Assemble"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PostLikesModal;

