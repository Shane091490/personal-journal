import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function StatsWidget({ refreshKey }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .entryStats()
      .then(setStats)
      .catch(() => {});
  }, [refreshKey]);

  if (!stats) return null;

  return (
    <div className="stats-widget">
      <div className="stat">
        <span className="stat-value tnum">{stats.currentStreak}</span>
        <span className="stat-label">day streak</span>
      </div>
      <div className="stat">
        <span className="stat-value tnum">{stats.totalEntries}</span>
        <span className="stat-label">entries</span>
      </div>
      <div className="stat">
        <span className="stat-value tnum">{stats.entriesThisMonth}</span>
        <span className="stat-label">this month</span>
      </div>
      <div className="stat">
        <span className="stat-value tnum">{stats.longestStreak}</span>
        <span className="stat-label">best streak</span>
      </div>
    </div>
  );
}
