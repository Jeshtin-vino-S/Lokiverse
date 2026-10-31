import { useNavigate } from "react-router-dom";

const UserListModal = ({ title, users = [], onClose, currentUserId }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#0c0e14] border border-[#222736] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2230] bg-[#07080c]/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <h2 className="text-base font-black text-white tracking-wide">{title}</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
              {users.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto p-4 divide-y divide-[#1e2230]">
          {users.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No agents enlisted in this coalition yet.
            </div>
          ) : (
            users.map((agent) => {
              // Agent may be populated object or fallback ID string
              const isObj = typeof agent === "object" && agent !== null;
              const agentId = isObj ? agent._id : agent;
              const username = isObj ? agent.username : "agent";
              const fullname = isObj ? agent.fullname : "Agent";
              const profileImg = isObj ? agent.profileImg : "";
              const bio = isObj ? agent.bio : "";

              const initials = fullname
                ? fullname
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : username.slice(0, 2).toUpperCase();

              return (
                <div
                  key={agentId}
                  onClick={() => {
                    navigate(`/profile/${username}`);
                    onClose();
                  }}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-white/[0.03] rounded-2xl cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 p-0.5 shrink-0 overflow-hidden shadow-sm">
                      {profileImg ? (
                        <img
                          src={profileImg}
                          alt={fullname}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-[#07080c] flex items-center justify-center font-bold text-xs text-amber-300">
                          {initials}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                        {fullname}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono truncate">
                        @{username}
                      </span>
                      {bio && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-[220px]">
                          {bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                    View &rarr;
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default UserListModal;

