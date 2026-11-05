import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { strikeThunder, snapAndRemove, smash } from "../heroFx";
import PostLikesModal from "./PostLikesModal";
import SharePostModal from "./SharePostModal";

const PostCard = ({
  post,
  currentUser,
  onPostDeleted,
  defaultShowComments = false,
  badgeContext = null,
}) => {
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const [likes, setLikes] = useState(post.likes || []);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(() => {
    if (post.isSaved !== undefined) return Boolean(post.isSaved);
    if (!currentUser?.savedPosts) return false;
    return currentUser.savedPosts.some(
      (id) =>
        (typeof id === "object" ? id._id?.toString() : id?.toString()) ===
        post._id?.toString()
    );
  });

  useEffect(() => {
    const handleSaveToggle = (e) => {
      if (e.detail?.postId && e.detail.postId.toString() === post._id?.toString()) {
        setIsSaved(e.detail.isSaved);
      }
    };
    window.addEventListener("postSaveToggled", handleSaveToggle);
    return () => window.removeEventListener("postSaveToggled", handleSaveToggle);
  }, [post._id]);

  useEffect(() => {
    if (currentUser?.savedPosts) {
      const saved = currentUser.savedPosts.some(
        (id) =>
          (typeof id === "object" ? id._id?.toString() : id?.toString()) ===
          post._id?.toString()
      );
      setIsSaved(saved);
    }
  }, [currentUser?.savedPosts, post._id]);

  useEffect(() => {
    if (defaultShowComments) {
      setShowComments(true);
    }
  }, [defaultShowComments]);

  useEffect(() => {
    setLikes(post.likes || []);
    setComments(post.comments || []);
  }, [post]);

  const isMyPost =
    currentUser?._id && post.user?._id?.toString() === currentUser._id.toString();
  const isLiked =
    currentUser?._id &&
    likes.some(
      (id) =>
        (typeof id === "object" ? id._id?.toString() : id?.toString()) ===
        currentUser._id.toString()
    );

  const postAuthor = post.user || {};
  const authorInitials = postAuthor.fullname
    ? postAuthor.fullname
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : postAuthor.username?.slice(0, 2).toUpperCase() || "AV";

  const formatRelativeTime = (dateString) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Maps for mutual follower identification
  const myFollowingMap = {};
  if (currentUser?.following) {
    currentUser.following.forEach((f) => {
      const id = typeof f === "object" ? f._id : f;
      if (id) myFollowingMap[id.toString()] = true;
    });
  }

  const myFollowersMap = {};
  if (currentUser?.followers) {
    currentUser.followers.forEach((f) => {
      const id = typeof f === "object" ? f._id : f;
      if (id) myFollowersMap[id.toString()] = true;
    });
  }

  // Filter valid populated user objects from likes
  const validLikers = likes.filter((l) => typeof l === "object" && l?._id);

  // Sort likers: Mutuals first, then followed users, then others
  const sortedLikers = [...validLikers].sort((a, b) => {
    const aMutual = myFollowingMap[a._id] && myFollowersMap[a._id];
    const bMutual = myFollowingMap[b._id] && myFollowersMap[b._id];
    if (aMutual && !bMutual) return -1;
    if (!aMutual && bMutual) return 1;

    const aFollowed = myFollowingMap[a._id];
    const bFollowed = myFollowingMap[b._id];
    if (aFollowed && !bFollowed) return -1;
    if (!aFollowed && bFollowed) return 1;

    return 0;
  });

  const mutualLikers = sortedLikers.filter(
    (l) => myFollowingMap[l._id] && myFollowersMap[l._id]
  );
  const followedLikers = sortedLikers.filter((l) => myFollowingMap[l._id]);

  // Format Instagram-style like caption
  const renderLikeCaption = () => {
    if (likes.length === 0) return null;

    // 1. If mutual followers liked
    if (mutualLikers.length > 0) {
      const firstMutual = mutualLikers[0];
      if (likes.length === 1) {
        return (
          <span>
            Liked by <strong className="font-bold">@{firstMutual.username}</strong>
          </span>
        );
      }
      if (mutualLikers.length >= 2 && likes.length === 2) {
        return (
          <span>
            Liked by <strong className="font-bold">@{firstMutual.username}</strong> and{" "}
            <strong className="font-bold">@{mutualLikers[1].username}</strong>
          </span>
        );
      }
      return (
        <span>
          Liked by <strong className="font-bold">@{firstMutual.username}</strong> and{" "}
          <strong className="font-bold">{likes.length - 1} other allies</strong>
        </span>
      );
    }

    // 2. If followed users liked
    if (followedLikers.length > 0) {
      const firstFollowed = followedLikers[0];
      if (likes.length === 1) {
        return (
          <span>
            Liked by <strong className="font-bold">@{firstFollowed.username}</strong>
          </span>
        );
      }
      return (
        <span>
          Liked by <strong className="font-bold">@{firstFollowed.username}</strong> and{" "}
          <strong className="font-bold">{likes.length - 1} others</strong>
        </span>
      );
    }

    // 3. Fallback to first liker
    if (sortedLikers.length > 0) {
      const firstLiker = sortedLikers[0];
      if (likes.length === 1) {
        return (
          <span>
            Liked by <strong className="font-bold">@{firstLiker.username}</strong>
          </span>
        );
      }
      return (
        <span>
          Liked by <strong className="font-bold">@{firstLiker.username}</strong> and{" "}
          <strong className="font-bold">{likes.length - 1} others</strong>
        </span>
      );
    }

    return (
      <span>
        <strong className="font-bold">{likes.length}</strong> {likes.length === 1 ? "ally" : "allies"} liked
      </span>
    );
  };

  // Like / Unlike with Thor Thunder Bolt & screen flash
  const handleLike = async (e) => {
    if (isLiking || !currentUser?._id) return;
    const btn = e.currentTarget;
    if (btn) strikeThunder(btn);

    setIsLiking(true);

    const myId = currentUser._id;
    const alreadyLiked = likes.some(
      (id) => (typeof id === "object" ? id._id?.toString() : id?.toString()) === myId.toString()
    );

    let updatedLikes;
    if (alreadyLiked) {
      updatedLikes = likes.filter(
        (id) => (typeof id === "object" ? id._id?.toString() : id?.toString()) !== myId.toString()
      );
    } else {
      updatedLikes = [...likes, currentUser];
    }
    setLikes(updatedLikes);

    try {
      const res = await axios.post(`/api/posts/like/${post._id}`);
      if (res.data?.likes) {
        setLikes(res.data.likes);
      }
    } catch (err) {
      setLikes(likes);
      if (btn) smash(btn);
    } finally {
      setIsLiking(false);
    }
  };

  // Share Transmission (Web Share API or Clipboard)
  const handleShare = async (e) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/profile/${postAuthor.username || ""}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Lokiverse - Transmission from @${postAuthor.username || "agent"}`,
          text: post.text || "Check out this intel on Lokiverse!",
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or unsupported
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  // Save / Bookmark Transmission against Authenticated User in DB
  const handleSave = async (e) => {
    e.stopPropagation();
    if (isSaving || !currentUser?._id) return;

    setIsSaving(true);
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      const res = await axios.post(`/api/posts/save/${post._id}`);
      if (typeof res.data?.isSaved === "boolean") {
        setIsSaved(res.data.isSaved);
        if (currentUser.savedPosts) {
          if (res.data.isSaved) {
            if (!currentUser.savedPosts.some(id => (typeof id === "object" ? id._id?.toString() : id?.toString()) === post._id.toString())) {
              currentUser.savedPosts.push(post._id);
            }
          } else {
            currentUser.savedPosts = currentUser.savedPosts.filter(
              id => (typeof id === "object" ? id._id?.toString() : id?.toString()) !== post._id.toString()
            );
          }
        }
        window.dispatchEvent(
          new CustomEvent("postSaveToggled", {
            detail: { postId: post._id, isSaved: res.data.isSaved },
          })
        );
      }
    } catch (err) {
      setIsSaved(!nextSaved);
    } finally {
      setIsSaving(false);
    }
  };

  // Add Comment (Intel Transmission)
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || commentLoading) return;

    setCommentLoading(true);
    try {
      const res = await axios.post(`/api/posts/comment/${post._id}`, {
        text: commentText.trim(),
      });
      if (res.data && res.data.comments) {
        setComments(res.data.comments);
        setCommentText("");
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setCommentLoading(false);
    }
  };

  // Delete Post with Thanos Snap Dust Dissolve FX
  const handleDelete = async () => {
    if (isDeleting || !isMyPost) return;

    if (window.confirm("Thanos Snap: Erase this transmission from the Multiverse timeline?")) {
      setIsDeleting(true);
      snapAndRemove(cardRef.current, async () => {
        try {
          await axios.delete(`/api/posts/${post._id}`);
          if (onPostDeleted) onPostDeleted(post._id);
        } catch (err) {
          console.error("Failed to delete post:", err);
        }
      });
    }
  };

  const postImage = post.img || post.image;

  return (
    <>
      <article
        ref={cardRef}
        className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors relative"
      >
        {/* Context Badge for Replies / Likes in ProfilePage */}
        {badgeContext === "replies" && (
          <div className="mb-3 -mt-1 py-1.5 px-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-1.602.88 1.13 1.95a1 1 0 01-1.733 1l-2.074-3.58-.938.16c-.722.12-1.46.18-2.204.18-4.421 0-8.005-3.58-8.005-8z" />
              </svg>
              <span>{comments.length} {comments.length === 1 ? "Reply" : "Replies"} on this transmission</span>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">Intel Thread</span>
          </div>
        )}
        {badgeContext === "likes" && (
          <div className="mb-3 -mt-1 py-1.5 px-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span>{likes.length} {likes.length === 1 ? "Like" : "Likes"} Received from Allies</span>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">Endorsed</span>
          </div>
        )}

        <div className="flex gap-3.5 items-start">
          {/* Author Avatar with Scarlet Witch Chaos Swirl on hover */}
          <div
            onClick={() => navigate(`/profile/${postAuthor.username}`)}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 p-0.5 shrink-0 overflow-hidden shadow-sm cursor-pointer fx-wanda"
            title="View Agent Dossier"
          >
            {postAuthor.profileImg ? (
              <img
                src={postAuthor.profileImg}
                alt={postAuthor.fullname || postAuthor.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-100 dark:bg-[#070912] flex items-center justify-center font-black text-xs text-amber-500 dark:text-amber-300">
                {authorInitials}
              </div>
            )}
          </div>

          {/* Post Content */}
          <div className="flex-1 min-w-0">
            {/* Header info */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  onClick={() => navigate(`/profile/${postAuthor.username}`)}
                  className="font-bold text-sm text-slate-900 dark:text-white hover:text-amber-500 dark:hover:text-amber-300 cursor-pointer transition-colors truncate"
                >
                  {postAuthor.fullname || postAuthor.username}
                </span>
                <span
                  onClick={() => navigate(`/profile/${postAuthor.username}`)}
                  className="text-xs text-slate-500 dark:text-slate-400 font-mono cursor-pointer truncate"
                >
                  @{postAuthor.username}
                </span>
                <span className="text-slate-400 dark:text-slate-600 text-xs">·</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {formatRelativeTime(post.createdAt)}
                </span>
              </div>

              {/* Thanos Snap Delete Button for Own Post */}
              {isMyPost && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Thanos Snap Delete"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Post Text */}
            {post.text && (
              <p className="text-sm sm:text-[15px] text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed mb-3 break-words">
                {post.text}
              </p>
            )}

            {/* Post Attachment (Image) */}
            {postImage && (
              <div className="mb-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-96 flex items-center justify-center bg-slate-100 dark:bg-black/40">
                <img
                  src={postImage}
                  alt="Transmitted intel"
                  className="w-full max-h-96 object-cover hover:scale-[1.01] transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Post Attachment (Video - up to 1 min) */}
            {post.video && (
              <div className="mb-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-96 flex items-center justify-center bg-black">
                <video
                  src={post.video}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-96 rounded-2xl bg-black object-contain"
                />
              </div>
            )}

            {/* Post Action Toolbar */}
            <div className="flex items-center justify-between pt-1 text-slate-500 dark:text-slate-400 text-xs max-w-md">
              {/* Comment Drawer Trigger */}
              <button
                type="button"
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-cyan-300 transition-colors cursor-pointer group fx-ant-hover"
                title="Comments & Intel Thread"
              >
                <div className="p-1.5 rounded-full group-hover:bg-teal-500/10 dark:group-hover:bg-cyan-500/10 transition-colors">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                    <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-1.602.88 1.13 1.95a1 1 0 01-1.733 1l-2.074-3.58-.938.16c-.722.12-1.46.18-2.204.18-4.421 0-8.005-3.58-8.005-8z" />
                  </svg>
                </div>
                <span className="font-semibold">{comments.length}</span>
              </button>

              {/* Thor Thunder Bolt Like Button */}
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer group fx-ant-hover ${
                  isLiked ? "text-red-500" : "hover:text-red-400"
                }`}
                title="Thor Thunder Like"
              >
                <div className="p-1.5 rounded-full group-hover:bg-red-500/10 transition-colors">
                  {isLiked ? (
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  )}
                </div>
                <span className="font-semibold">{likes.length}</span>
              </button>

              {/* Share Transmission Button (Telegram Paper Plane Icon) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareModal(true);
                }}
                className="flex items-center gap-1.5 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors cursor-pointer group fx-ant-hover relative"
                title="Share to Allies (Instagram Style)"
              >
                <div className="p-1.5 rounded-full group-hover:bg-cyan-500/10 dark:group-hover:bg-cyan-500/10 transition-colors">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M21.68 3.32a1.5 1.5 0 0 0-1.63-.32L2.83 10.37a1.5 1.5 0 0 0 .1 2.82l5.12 1.71 1.95 6.02a1.5 1.5 0 0 0 2.45.62l3.05-2.73 4.8 3.52a1.5 1.5 0 0 0 2.38-.97l3-16.5a1.5 1.5 0 0 0-1.04-1.54zM18.5 6.78L9.95 13.9l-.35 3.12-1.13-3.48 10.03-6.76z" />
                  </svg>
                </div>
              </button>

              {/* Save / Bookmark Transmission Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer group fx-ant-hover ${
                  isSaved ? "text-amber-500 dark:text-amber-400" : "hover:text-amber-500 dark:hover:text-amber-400"
                }`}
                title={isSaved ? "Remove from Saved Intel" : "Save Transmission to Dossier"}
              >
                <div className="p-1.5 rounded-full group-hover:bg-amber-500/10 transition-colors">
                  {isSaved ? (
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                      <path d="M19 21l-7-5-7 5V5c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v16z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v16z" />
                    </svg>
                  )}
                </div>
              </button>
            </div>

            {/* Instagram-Style Liked Preview (Mutual Followers Priority + Avatars Stack) */}
            {likes.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                <div
                  onClick={() => setShowLikesModal(true)}
                  className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 cursor-pointer transition-colors group/likes"
                  title="Click to view all allies who liked this transmission (Instagram Style)"
                >
                  {/* Mini Overlapping Circular Avatars (Mutual Likers shown first!) */}
                  <div className="flex -space-x-2 overflow-hidden shrink-0">
                    {sortedLikers.slice(0, 3).map((l, idx) => {
                      const lInitials = l.fullname
                        ? l.fullname.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                        : l.username?.slice(0, 2).toUpperCase() || "AV";
                      const isMutual = myFollowingMap[l._id] && myFollowersMap[l._id];

                      return (
                        <div
                          key={l._id || idx}
                          className={`w-6 h-6 rounded-full ring-2 ring-white dark:ring-[#070912] overflow-hidden bg-gradient-to-tr from-emerald-600 to-teal-500 shrink-0 shadow-xs ${
                            isMutual ? "ring-amber-400 dark:ring-amber-400" : ""
                          }`}
                          title={isMutual ? `Mutual Ally: @${l.username}` : `@${l.username}`}
                        >
                          {l.profileImg ? (
                            <img src={l.profileImg} alt={l.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-800 text-[8px] font-black text-amber-300 flex items-center justify-center">
                              {lInitials}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Instagram Text (e.g. "Liked by @mutual and 14 others") */}
                  <div className="text-[12px] group-hover/likes:underline flex items-center gap-1.5">
                    {renderLikeCaption()}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      (view all)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Comments Thread */}
            {showComments && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 space-y-3 animate-in fade-in">
                {/* Add Comment Input */}
                <form onSubmit={handleAddComment} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Transmit reply intel..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || commentLoading}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 disabled:opacity-40 cursor-pointer transition-all fx-ant-hover"
                  >
                    {commentLoading ? "..." : "Reply"}
                  </button>
                </form>

                {/* Comments List */}
                {comments.length > 0 && (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {comments.map((c) => {
                      const cUser = c.user || {};
                      const cInitials = cUser.fullname
                        ? cUser.fullname.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                        : cUser.username?.slice(0, 2).toUpperCase() || "AV";
                      const isMutual =
                        cUser._id &&
                        myFollowingMap[cUser._id] &&
                        myFollowersMap[cUser._id];

                      return (
                        <div
                          key={c._id || Math.random()}
                          className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/50 dark:border-transparent"
                        >
                          <div
                            onClick={() => navigate(`/profile/${cUser.username}`)}
                            className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shrink-0 overflow-hidden cursor-pointer"
                          >
                            {cUser.profileImg ? (
                              <img
                                src={cUser.profileImg}
                                alt={cUser.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full bg-slate-200 dark:bg-black flex items-center justify-center text-[10px] font-black text-amber-600 dark:text-amber-300">
                                {cInitials}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span
                                onClick={() => navigate(`/profile/${cUser.username}`)}
                                className="font-bold text-xs text-slate-900 dark:text-white hover:text-amber-500 dark:hover:text-amber-300 cursor-pointer truncate"
                              >
                                {cUser.fullname || cUser.username}
                              </span>
                              {isMutual && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[8px] font-black border border-amber-500/20">
                                  MUTUAL
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                @{cUser.username}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                              {c.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Instagram-Style Likes Dialog / Modal */}
      {showLikesModal && (
        <PostLikesModal
          users={likes}
          currentUser={currentUser}
          onClose={() => setShowLikesModal(false)}
          onFollowToggleSuccess={(targetId, isNowFollowing) => {
            // Update currentUser following state live
            if (currentUser && currentUser.following) {
              if (isNowFollowing) {
                currentUser.following.push(targetId);
              } else {
                currentUser.following = currentUser.following.filter(
                  (f) => (typeof f === "object" ? f._id : f) !== targetId
                );
              }
            }
          }}
        />
      )}

      {/* Instagram-Style Share Modal */}
      {showShareModal && (
        <SharePostModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
};

export default PostCard;
