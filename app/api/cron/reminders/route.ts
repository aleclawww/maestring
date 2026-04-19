import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { StreakBrokenEmail } from "@/lib/email/templates/StreakBrokenEmail";
import { createMagicLink } from "@/lib/magic-links";
import { logger } from "@/lib/logger";
import * as React from "react";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env["CRON_SECRET"]}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find users whose streaks broke today (yesterday they had a streak, today they didn't study)
  const { data: brokenStreaks } = await supabase.rpc("get_broken_streaks_today");

  if (!brokenStreaks || brokenStreaks.length === 0) {
    return NextResponse.json({ sent: 0, message: "No broken streaks today" });
  }

  let sent = 0;
  let failed = 0;

  for (const u of brokenStreaks) {
    try {
      const magicUrl = await createMagicLink(u.user_id, u.email, "streak");
      await sendEmail({
        to: u.email,
        subject: `Your ${u.previous_streak}-day streak ended — bounce back today`,
        react: React.createElement(StreakBrokenEmail, {
          firstName: u.first_name ?? "there",
          previousStreak: u.previous_streak,
          studyUrl: magicUrl,
        }),
        tags: [{ name: "type", value: "streak-broken" }],
      });
      sent++;
    } catch (err) {
      logger.error({ err, userId: u.user_id }, "Failed to send streak broken email");
      failed++;
    }
  }

  logger.info({ sent, failed }, "Reminders cron completed");
  return NextResponse.json({ sent, failed });
}
