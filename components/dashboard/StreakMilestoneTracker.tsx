"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

const MILESTONES = [3, 7, 14, 21, 30, 60, 90, 180, 365];

export function StreakMilestoneTracker({ streakDays }: { streakDays: number }) {
  useEffect(() => {
    if (streakDays <= 0) return;

    // Only fire if this exact milestone hasn't been tracked before.
    const key = `maestring_streak_milestone_${streakDays}`;
    try {
      if (MILESTONES.includes(streakDays) && !localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        track({ name: "streak_milestone", properties: { streak_days: streakDays } });
      }
    } catch { /* ignore storage errors */ }
  }, [streakDays]);

  return null;
}
