import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { NudgeEmail } from "@/lib/email/templates/NudgeEmail";
import { createMagicLink } from "@/lib/magic-links";
import { logger } from "@/lib/logger";
import { runCron } from "@/lib/cron/run";
import * as React from "react";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env["CRON_SECRET"]}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const outcome = await runCron("nudges", async () => {
    const supabase = createAdminClient();
    // Previously `const { data: users } = ...` swallowed `error`, so a broken
    // RPC (signature drift, permission regression, etc.) silently produced a
    // cron run with `rowsAffected: 0` — indistinguishable from "no users due".
    // Throw so runCron flips the row to status='failed' with the real error
    // and any "zero-sends for N days" alert actually fires.
    const { data: users, error: listErr } = await supabase.rpc("get_users_needing_nudge");
    if (listErr) {
      throw new Error(`get_users_needing_nudge failed: ${listErr.message ?? "unknown error"}`);
    }

    if (!users || users.length === 0) {
      return { status: "ok" as const, rowsAffected: 0, metadata: { total: 0 } };
    }

    let sent = 0;
    let failed = 0;

    for (const u of users) {
      try {
        const magicUrl = await createMagicLink(u.user_id, u.email, "study");

        const [readinessRes, profileRes] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase.rpc("get_exam_readiness" as any, { p_user_id: u.user_id }),
          supabase
            .from("profiles")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .select("last_readiness_score" as any)
            .eq("id", u.user_id)
            .maybeSingle(),
        ]);

        // `get_exam_readiness` is best-effort: the email should still go out
        // even if the readiness snapshot RPC drops (old cert id, stale view,
        // etc.). But don't eat the error — log it so operators can spot a
        // systemic breakage showing up as "nudges with no delta" in prod.
        if (readinessRes.error) {
          logger.warn(
            { err: readinessRes.error, userId: u.user_id },
            "get_exam_readiness failed during nudge — sending without readiness delta"
          );
        }
        const readinessRow = Array.isArray(readinessRes.data) ? readinessRes.data[0] : null;
        const readinessNow = readinessRow?.score ?? null;
        const readinessPrev = (profileRes.data as { last_readiness_score?: number } | null)
          ?.last_readiness_score ?? null;
        const weakestDomain = readinessRow?.weakest_domain ?? undefined;

        await sendEmail({
          to: u.email,
          subject:
            u.streak_days > 0
              ? `🔥 Keep your ${u.streak_days}-day streak — ${u.due_count} cards waiting`
              : `📚 ${u.due_count} cards ready for review`,
          react: React.createElement(NudgeEmail, {
            firstName: u.first_name ?? "there",
            dueCount: u.due_count,
            streakDays: u.streak_days ?? 0,
            studyUrl: magicUrl,
            daysUntilExam: u.days_until_exam ?? undefined,
            readinessNow: readinessNow ?? undefined,
            readinessPrev: readinessPrev ?? undefined,
            weakestDomain,
          }),
          tags: [{ name: "type", value: "nudge" }],
        });

        // snapshot_readiness stamps today's score onto `profiles.last_readiness_score`
        // so tomorrow's nudge can compute a delta. A silent drop here means
        // tomorrow's email compares against yesterday's stale snapshot — the
        // email still sends but the "your score moved X pts" copy is wrong.
        // Log as a warn so the next-day-weird-delta has a log trail; don't
        // throw because the user-visible email already went out.
        const { error: snapErr } = await supabase.rpc(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "snapshot_readiness" as any,
          { p_user_id: u.user_id }
        );
        if (snapErr) {
          logger.warn(
            { err: snapErr, userId: u.user_id },
            "snapshot_readiness failed after nudge sent — next-day delta will be stale"
          );
        }

        sent++;
      } catch (err) {
        logger.error({ err, userId: u.user_id }, "Failed to send nudge email");
        failed++;
      }
    }

    return {
      status: "ok" as const,
      rowsAffected: sent,
      metadata: { total: users.length, sent, failed },
    };
  });

  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 500 });
  return NextResponse.json(outcome.result);
}
