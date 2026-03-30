import { MatchEventType } from "@/types";

export function formatMatchTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getIntervalLabel(interval: number, total: number): string {
  if (total === 2) {
    return interval === 1 ? "1st Half" : "2nd Half";
  }
  if (total === 4) {
    return `Q${interval}`;
  }
  return `Interval ${interval}`;
}

export function getEventLabel(type: MatchEventType): string {
  const labels: Record<MatchEventType, string> = {
    goal: "Goal",
    green_card: "Green Card",
    yellow_card: "Yellow Card",
    red_card: "Red Card",
    penalty_corner: "Penalty Corner",
    penalty_stroke: "Penalty Stroke",
    substitution: "Substitution",
    stoppage_start: "Stoppage Started",
    stoppage_end: "Stoppage Ended",
    interval_end: "Interval End",
    match_end: "Match End",
    shot_on_goal: "Shot on Goal",
    shot_off_goal: "Shot off Goal",
    free_hit: "Free Hit",
    long_corner: "Long Corner",
    turnover: "Turnover",
    aerial: "Aerial",
    tackle: "Tackle",
    interception: "Interception",
    circle_entry: "Circle Entry",
  };
  return labels[type] ?? type;
}

export function getEventIcon(type: MatchEventType): string {
  const icons: Record<MatchEventType, string> = {
    goal: "⚽",
    green_card: "🟩",
    yellow_card: "🟨",
    red_card: "🟥",
    penalty_corner: "🚩",
    penalty_stroke: "⚡",
    substitution: "🔄",
    stoppage_start: "⏸️",
    stoppage_end: "▶️",
    interval_end: "🔔",
    match_end: "✅",
    shot_on_goal: "🎯",
    shot_off_goal: "↗️",
    free_hit: "🏑",
    long_corner: "📐",
    turnover: "↩️",
    aerial: "🪁",
    tackle: "🤺",
    interception: "🙌",
    circle_entry: "⭕",
  };
  return icons[type] ?? "•";
}

export function getEventColorClass(type: MatchEventType): string {
  if (type === "goal") return "text-green-700 bg-green-50 border-green-200";
  if (type === "red_card") return "text-red-700 bg-red-50 border-red-200";
  if (type === "yellow_card") return "text-yellow-700 bg-yellow-50 border-yellow-200";
  if (type === "green_card") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (type === "stoppage_start" || type === "stoppage_end") return "text-orange-700 bg-orange-50 border-orange-200";
  if (type === "penalty_corner" || type === "penalty_stroke") return "text-blue-700 bg-blue-50 border-blue-200";
  if (
    type === "shot_on_goal" ||
    type === "shot_off_goal" ||
    type === "circle_entry" ||
    type === "free_hit" ||
    type === "long_corner"
  )
    return "text-purple-700 bg-purple-50 border-purple-200";
  return "text-gray-700 bg-gray-50 border-gray-200";
}
