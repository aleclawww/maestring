import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { WeeklyDigestEmail } from "@/lib/email/templates/WeeklyDigestEmail";
import { createMagicLink } from "@/lib/magic-links";
import { logger } from "@/lib/logger";
import { runCron } from "@/lib/cron/run";
import * as React from "react";

type DigestRow = {
  user_id: string;
  email: string;
  first_name: string;
  sessions_week: number;
  questions_week: number;
  correct_week: number;
  accuracy_week: number;
  minutes_week: number;
  current_streak: number;
  days_until_exam: number | null;
  readiness_now: number | null;
  readiness_7d_ago: number | null;
  readiness_delta: number | null;
  pass_probability: number | null;
  weakest_domain_slug: string | null;
  weakest_domain_name: string | null;
  weakest_domain_accuracy: number | null;
  weakest_task_id: string | null;
  weakest_task_label: string | null;
  due_next_7d: number;
  best_exam_scaled: number | null;
  best_exam_passed: boolean | null;
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env["CRON_SECRET"]}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  const outcome = await runCron("weekly-digest", async () => {
    // Vercel Hobby tier only allows daily crons; gate to Mondays here.
    if (!force && new Date().getUTCDay() !== 1) {
      return { status: "skipped", metadata: { reason: "not_monday" } };
    }

    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("get_users_for_weekly_digest");
    if (error) throw new Error(`RPC failed: ${error.message}`);

    const rows = (data ?? []) as DigestRow[];
    if (rows.length === 0) return { status: "ok", rowsAffected: 0, metadata: { total: 0 } };

    let sent = 0;
    let failed = 0;
    for (const r of rows) {
      try {
        const magicUrl = await createMagicLink(r.user_id, r.email, "study");
        await sendEmail({
          to: r.email,
          subject:
            r.sessions_week === 0
              ? `${r.first_name}, tu semana de estudio está vacía`
              : `Tu semana en Maestring — ${r.questions_week} preguntas, ${Math.round((r.accuracy_week ?? 0) * 100)}% aciertos`,
          react: React.createElement(WeeklyDigestEmail, {
            firstName: r.first_name,
            studyUrl: magicUrl,
            sessionsWeek: r.sessions_week,
            questionsWeek: r.questions_week,
            accuracyWeek: Number(r.accuracy_week ?? 0),
            minutesWeek: r.minutes_week,
            currentStreak: r.current_streak ?? 0,
            daysUntilExam: r.days_until_exam,
            readinessNow: r.readiness_now,
            readinessDelta: r.readiness_delta,
            passProbability: r.pass_probability != null ? Number(r.pass_probability) : null,
            weakestDomainName: r.weakest_domain_name,
            weakestDomainAccuracy: r.weakest_domain_accuracy != null ? Number(r.weakest_domain_accuracy) : null,
            weakestTaskId: r.weakest_task_id,
            weakestTaskLabel: r.weakest_task_label,
            dueNext7d: r.due_next_7d,
            bestExamScaled: r.best_exam_scaled,
            bestExamPassed: r.best_exam_passed,
          }),
          tags: [{ name: "type", value: "weekly_digest" }],
        });
        sent++;
      } catch (err) {
        logger.error({ err, userId: r.user_id }, "Failed to send weekly digest");
        failed++;
      }
    }

    return { status: "ok", rowsAffected: sent, metadata: { total: rows.length, failed } };
  });

  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 500 });
  return NextResponse.json(outcome.result);
}

// Vercel Cron uses GET (vercel.json schedules this path). Without a GET
// export the handler 405s the scheduled invocation and the Monday morning
// weekly digest is never sent. Matches app/api/cron/snapshot-readiness/route.ts.
export async function GET(req: NextRequest) {
  return POST(req);
}
