import { useState, useEffect } from "react";
import axios from "axios";
import socket from "../socket";

/**
 * SharePostModal
 * Instagram-style share sheet to send a post directly to users from
 * the current user's followers & following network via real-time Chat / DM.
 */
const SharePostModal = ({ post, currentUser, onClose }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [noteText, setNoteText] = useState("");
  const [sendingMap, setSendingMap] = useState({});
  const [sentMap, setSentMap] = useState({});
  const [copied, setCopied] = useState(false);

  // Fetch unique contacts from current user's followers & following
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/messages/contacts");
        if (Array.isArray(res.data)) {
          setContacts(res.data);
        }
      } catch (err) {
        console.error("Failed to load share contacts:", err);
        // Fallback: merge from currentUser followers/following props
        const fallbackMap = new Map();
        const myId = currentUser?._id?.toString();
        const combined = [
          ...(currentUser?.followers || []),
          ...(currentUser?.following || []),
        ];
        combined.forEach((c) => {
          if (c && typeof c === "object" && c._id && c._id.toString() !== myId) {
            fallbackMap.set(c._id.toString(), c);
          }
        });
        setContacts(Array.from(fallbackMap.values()));
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [currentUser]);

  // Send transmission directly to a selected contact
  const handleSendToUser = async (contact) => {
    const recipientId = contact._id;
    if (!recipientId || sendingMap[recipientId] || sentMap[recipientId]) return;

    setSendingMap((prev) => ({ ...prev, [recipientId]: true }));

    try {
      // 1. Send via HTTP endpoint to persist in DB
      await axios.post("/api/messages/share-post", {
        recipientId,
        postId: post._id,
        messageText: noteText.trim(),
      });

      // 2. Also emit via socket.io for instant real-time delivery
      const roomId = [currentUser?._id?.toString(), recipientId.toString()]
        .sort()
        .join("_");

      const postSnippet = post.text
        ? post.text.length > 80
          ? post.text.slice(0, 80) + "..."
          : post.text
        : post.img
        ? "[Image Intel]"
        : "[Video Transmission]";

      const text = noteText.trim()
        ? `${noteText.trim()}\n\n⚡ Shared Transmission from @${post.user?.username || "agent"}:\n"${postSnippet}"`
        : `⚡ Shared Transmission from @${post.user?.username || "agent"}:\n"${postSnippet}"`;

      if (socket && socket.connected) {
        socket.emit("send_message", {
          roomId,
          text,
        });
      }

      setSentMap((prev) => ({ ...prev, [recipientId]: true }));
    } catch (err) {
      console.error("Failed to send transmission to user:", err);
    } finally {
      setSendingMap((prev) => ({ ...prev, [recipientId]: false }));
    }
  };

  // Copy link fallback
  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/profile/${post.user?.username || ""}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = c.fullname?.toLowerCase().includes(q);
    const matchUser = c.username?.toLowerCase().includes(q);
    return matchName || matchUser;
  });

  const postAuthor = post.user || {};
  const authorInitials = postAuthor.fullname
    ? postAuthor.fullname
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : postAuthor.username?.slice(0, 2).toUpperCase() || "AV";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#0b0d14] border border-slate-200 dark:border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with Telegram Plane Icon */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-black/40">
          <div className="flex items-center gap-2.5">
            {/* Telegram Plane Icon */}
            <div className="w-8 h-8 rounded-full bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M21.68 3.32a1.5 1.5 0 0 0-1.63-.32L2.83 10.37a1.5 1.5 0 0 0 .1 2.82l5.12 1.71 1.95 6.02a1.5 1.5 0 0 0 2.45.62l3.05-2.73 4.8 3.52a1.5 1.5 0 0 0 2.38-.97l3-16.5a1.5 1.5 0 0 0-1.04-1.54zM18.5 6.78L9.95 13.9l-.35 3.12-1.13-3.48 10.03-6.76z" />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Share Transmission
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Send to followers & following allies
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Post Preview Card */}
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 p-0.5 shrink-0 overflow-hidden">
            {postAuthor.profileImg ? (
              <img
                src={postAuthor.profileImg}
                alt={postAuthor.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-200 dark:bg-black flex items-center justify-center text-[10px] font-black text-amber-500">
                {authorInitials}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <span className="truncate">{postAuthor.fullname || postAuthor.username}</span>
              <span className="text-[10px] text-slate-400 font-mono">@{postAuthor.username}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
              {post.text || (post.img ? "📷 Recon Image" : post.video ? "🎥 Video Intel" : "Transmission")}
            </p>
          </div>
          {(post.img || post.video) && (
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-300 dark:border-white/10 flex items-center justify-center">
              {post.img ? (
                <img src={post.img} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">🎥</span>
              )}
            </div>
          )}
        </div>

        {/* Search Allies Bar */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search followers and following..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/15 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
            />
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
              className="absolute left-3 top-2.5 text-slate-400"
            >
              <path d="M10.25 3.75a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm-8.5 6.5a8.5 8.5 0 1115.176 5.262l4.406 4.406a1 1 0 01-1.414 1.414l-4.406-4.406A8.5 8.5 0 011.75 10.25z" />
            </svg>
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-[200px]">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono animate-pulse">
              Loading allies network...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xs text-slate-400 font-mono">
                {search ? "No allies match your search" : "No followers or following found"}
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const cInitials = contact.fullname
                ? contact.fullname
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : contact.username?.slice(0, 2).toUpperCase() || "AV";

              const isSending = !!sendingMap[contact._id];
              const isSent = !!sentMap[contact._id];

              return (
                <div
                  key={contact._id}
                  className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shrink-0 overflow-hidden">
                      {contact.profileImg ? (
                        <img
                          src={contact.profileImg}
                          alt={contact.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-slate-200 dark:bg-black flex items-center justify-center text-xs font-black text-amber-500">
                          {cInitials}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {contact.fullname || contact.username}
                        </span>
                        {contact.isMutual && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[8px] font-black border border-amber-500/20">
                            MUTUAL
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono truncate block">
                        @{contact.username}
                      </span>
                    </div>
                  </div>

                  {/* Send Button */}
                  <button
                    type="button"
                    onClick={() => handleSendToUser(contact)}
                    disabled={isSending || isSent}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSent
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-md shadow-cyan-600/30 disabled:opacity-50"
                    }`}
                  >
                    {isSending ? "Sending..." : isSent ? "Sent ✓" : "Send"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Message Note Bar & Copy Link Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/50 space-y-2">
          <input
            type="text"
            placeholder="Write a message with intel..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full px-3.5 py-2 bg-white dark:bg-black/60 border border-slate-200 dark:border-white/15 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-cyan-500 font-mono"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-slate-200/70 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>{copied ? "Link Copied!" : "Copy Link"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePostModal;

