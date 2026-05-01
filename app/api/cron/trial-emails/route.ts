export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { WelcomeEmail } from "@/lib/email/templates/WelcomeEmail";
import { TrialDay1Email } from "@/lib/email/templates/TrialDay1Email";
import { TrialDay3Email } from "@/lib/email/templates/TrialDay3Email";
import { TrialDay5Email } from "@/lib/email/templates/TrialDay5Email";
import { TrialDay7Email } from "@/lib/email/templates/TrialDay7Email";
import { createMagicLink } from "@/lib/magic-links";
import { logger } from "@/lib/logger";
import { runCron } from "@/lib/cron/run";
import * as React from "react";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";

const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://maestring.com";

// Day windows for the cron (runs once/day at ~7am). Each entry selects
// subscriptions whose trial started N days ago (±12h window).
const TRIAL_DAYS = [1, 3, 5, 7] as const;
type TrialDay = (typeof TRIAL_DAYS)[number];

type TrialUser = {
  userId: string;
  email: string;
  firstName: string;
  examDate: string | null;
  trialDaysSinceStart: number;
};

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const outcome = await runCron("trial-emails", async () => {
    const supabase = createAdminClient();

    // Fetch all currently-trialing subscriptions created in the last 8 days.
    // We compute which "trial day" each subscription is on and send the
    // matching email. This query avoids per-day RPC complexity while staying
    // idempotent via the day-window check below.
    const { data: subs, error: subsErr } = await supabase
      .from("subscriptions")
      .select("user_id, created_at")
      .eq("status", "trialing")
      .gte("created_at", new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString());

    if (subsErr) {
      throw new Error(`subscriptions query failed: ${subsErr.message}`);
    }
    if (!subs || subs.length === 0) {
      return { status: "ok" as const, rowsAffected: 0, metadata: { total: 0 } };
    }

    // Map subscriptions to their trial day (1, 3, 5, or 7). The ±8h window
    // prevents double-sends if the cron fires slightly early/late on a given day.
    const trialUsers: (TrialUser & { trialDay: TrialDay })[] = [];

    for (const sub of subs) {
      const startedMs = new Date(sub.created_at).getTime();
      const daysSince = (Date.now() - startedMs) / (1000 * 60 * 60 * 24);

      const matchedDay = (TRIAL_DAYS as readonly number[]).find(
        (d) => Math.abs(daysSince - d) < 0.33 // within 8 hours of target day
      ) as TrialDay | undefined;

      if (!matchedDay) continue;

      // Fetch user email from auth.users (admin only).
      const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(sub.user_id);
      if (authErr || !authUser.user?.email) {
        logger.warn({ userId: sub.user_id, err: authErr }, "trial-emails: could not resolve user email, skipping");
        continue;
      }

      // Fetch profile for first name + exam date.
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, exam_date")
        .eq("id", sub.user_id)
        .maybeSingle();

      const fullName = profile?.full_name ?? "";
      const firstName = fullName.split(" ")[0]?.trim() || "there";

      trialUsers.push({
        userId: sub.user_id,
        email: authUser.user.email,
        firstName,
        examDate: profile?.exam_date ?? null,
        trialDaysSinceStart: daysSince,
        trialDay: matchedDay,
      });
    }

    if (trialUsers.length === 0) {
      return { status: "ok" as const, rowsAffected: 0, metadata: { total: subs.length, matched: 0 } };
    }

    let sent = 0;
    let failed = 0;

    for (const u of trialUsers) {
      try {
        await sendTrialEmail(supabase, u);
        sent++;
      } catch (err) {
        logger.error({ err, userId: u.userId, trialDay: u.trialDay }, "trial-emails: failed to send");
        failed++;
      }
    }

    return {
      status: "ok" as const,
      rowsAffected: sent,
      metadata: { total: subs.length, matched: trialUsers.length, sent, failed },
    };
  });

  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 500 });
  return NextResponse.json(outcome.result);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendTrialEmail(supabase: any, u: TrialUser & { trialDay: TrialDay }) {
  const { userId, email, firstName, examDate, trialDay } = u;

  if (trialDay === 1) {
    // Intent "resume" routes to /study — same as "study" but semantically a return visit.
    const dashUrl = await createMagicLink(userId, email, "resume");
    await sendEmail({
      to: email,
      subject: "Why a course that 250,000 people loved still won't get you certified.",
      react: React.createElement(TrialDay1Email, { firstName, dashboardUrl: dashUrl }),
      tags: [{ name: "type", value: "trial-day1" }],
    });
    return;
  }

  if (trialDay === 3) {
    await sendEmail({
      to: email,
      subject: "This is the feature most users discover too late.",
      react: React.createElement(TrialDay3Email, { firstName, libraryUrl: `${APP_URL}/library` }),
      tags: [{ name: "type", value: "trial-day3" }],
    });
    return;
  }

  if (trialDay === 5) {
    // Best-effort readiness score.
    let readinessScore: number | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await supabase.rpc("get_exam_readiness_v2" as any, { p_user_id: userId });
      const row = Array.isArray(data) ? data[0] : null;
      if (row?.score != null) readinessScore = Math.round(row.score);
    } catch { /* best-effort */ }

    const dashUrl = await createMagicLink(userId, email, "resume");
    await sendEmail({
      to: email,
      subject: "I'm not going to promise you'll pass. Here's what I can promise.",
      react: React.createElement(TrialDay5Email, { firstName, dashboardUrl: dashUrl, readinessScore }),
      tags: [{ name: "type", value: "trial-day5" }],
    });
    return;
  }

  if (trialDay === 7) {
    // Best-effort readiness + session count for personalization.
    let readinessScore: number | undefined;
    let sessionCount: number | undefined;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await supabase.rpc("get_exam_readiness_v2" as any, { p_user_id: userId });
      const row = Array.isArray(data) ? data[0] : null;
      if (row?.score != null) readinessScore = Math.round(row.score);
    } catch { /* best-effort */ }

    try {
      const { count } = await supabase
        .from("study_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed");
      if (count != null) sessionCount = count;
    } catch { /* best-effort */ }

    const billingUrl = `${APP_URL}/settings/billing`;
    await sendEmail({
      to: email,
      subject: "Two paths. Pick one. I'll respect either.",
      react: React.createElement(TrialDay7Email, { firstName, billingUrl, readinessScore, sessionCount }),
      tags: [{ name: "type", value: "trial-day7" }],
    });
    return;
  }
}

// Vercel Cron sends GET for scheduled invocations.
export async function GET(req: NextRequest) {
  return POST(req);
}
