const ONE_MINUTE = 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;

export function formatTimeAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < ONE_MINUTE) return "Just now";
  if (seconds < ONE_HOUR) return `${Math.floor(seconds / ONE_MINUTE)} minutes ago`;
  if (seconds < ONE_DAY) return `${Math.floor(seconds / ONE_HOUR)} hours ago`;
  if (seconds < ONE_WEEK) return `${Math.floor(seconds / ONE_DAY)} days ago`;

  return date.toLocaleDateString();
}

export function notificationGroupLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Older";

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) return "Today";

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < ONE_WEEK * 1000) return "This Week";

  return "Older";
}

export function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
