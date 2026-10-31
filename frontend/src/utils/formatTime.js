/**
 * Formats a lastSeen timestamp into Instagram-style active status
 * e.g. "Active just now", "Active 5m ago", "Active 2h ago", "Active yesterday", "Active 3d ago"
 */
export const formatLastActive = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Active just now";

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Active just now";
  if (diffMin < 60) return `Active ${diffMin}m ago`;
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  if (diffDays === 1) return "Active yesterday";
  if (diffDays < 7) return `Active ${diffDays}d ago`;

  return "";
};

