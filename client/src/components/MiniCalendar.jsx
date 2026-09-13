import { useEffect, useState } from "react";
import { api } from "../api.js";

function toDateKey(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isNarrowViewport() {
  return typeof window !== "undefined" && window.innerWidth < 760;
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MiniCalendar({ selectedDate, onSelectDate, refreshKey }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [daysWithEntries, setDaysWithEntries] = useState(new Set());
  const [expanded, setExpanded] = useState(() => !isNarrowViewport());

  useEffect(() => {
    api
      .calendarDays(viewYear, viewMonth)
      .then((res) => setDaysWithEntries(new Set(res.days)))
      .catch(() => setDaysWithEntries(new Set()));
  }, [viewYear, viewMonth, refreshKey]);

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  const firstOfMonth = new Date(viewYear, viewMonth - 1, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const todayKey = toDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  let visibleWeeks = weeks;
  if (!expanded) {
    let targetDay = null;
    if (selectedDate) {
      const [sy, sm, sd] = selectedDate.split("-").map(Number);
      if (sy === viewYear && sm === viewMonth) targetDay = sd;
    }
    if (targetDay === null && viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1) {
      targetDay = today.getDate();
    }
    let rowIndex = targetDay === null ? 0 : weeks.findIndex((week) => week.includes(targetDay));
    if (rowIndex === -1) rowIndex = 0;
    visibleWeeks = [weeks[rowIndex]];
  }

  return (
    <div className="calendar">
      <div className="calendar-header">
        <span className="label">
          {MONTH_NAMES[viewMonth - 1]} {viewYear}
        </span>
        <div className="calendar-nav">
          <button onClick={() => changeMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <button onClick={() => changeMonth(1)} aria-label="Next month">
            ›
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {DOW.map((d, i) => (
          <div className="dow" key={i}>
            {d}
          </div>
        ))}
        {visibleWeeks.flatMap((week, wi) =>
          week.map((d, i) => {
            if (d === null) return <div className="calendar-day empty" key={`${wi}-${i}`} />;
            const key = toDateKey(viewYear, viewMonth, d);
            const classes = ["calendar-day"];
            if (daysWithEntries.has(key)) classes.push("has-entry");
            if (key === todayKey) classes.push("today");
            if (key === selectedDate) classes.push("selected");
            return (
              <div key={`${wi}-${i}`} className={classes.join(" ")} onClick={() => onSelectDate(key)}>
                {d}
              </div>
            );
          })
        )}
      </div>
      <button className="calendar-toggle" onClick={() => setExpanded((e) => !e)}>
        {expanded ? "Show less ⌃" : "Show full month ⌄"}
      </button>
    </div>
  );
}
