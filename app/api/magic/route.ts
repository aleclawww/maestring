export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLink } from "@/lib/magic-links";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { checkAuthRateLimit } from "@/lib/redis/rate-limit";
import { getRequestIp } from "@/lib/utils/request-ip";

// Removed `runtime = "edge"` deliberately: we now call `verifyOtp` through
// the cookie-aware server client (`lib/supabase/server.ts`), which leans on
// `next/headers` cookie writes. That's stable under the node runtime and
// avoids the edge-runtime cookie quirks that masked this exact bug in
// manual QA. The handler runs at most once per email click, so latency is
// not a concern.

// Allowed post-login destinations. Kept in sync with the intents accepted by
// createMagicLink (lib/magic-links.ts). New intents MUST be added here or
// they silently fall back to /dashboard.
const REDIRECT_MAP: Record<string, string> = {
  study: "/study",
  resume: "/study",
  streak: "/study",
  report: "/dashboard",
};

export async function GET(req: NextRequest) {
  // Throttle token-bruteforce attempts per IP. Fails open if Redis is unreachable.
  const rl = await checkAuthRateLimit(getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.redirect(new URL("/login?error=rate_limited", req.url));
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", req.url));
  }

  try {
    // 1) Verify OUR JOSE-signed JWT. This also burns the JTI via the
    //    magic_link_uses unique constraint, so the link is single-use
    //    regardless of whether the Supabase session step below succeeds.
    //    A link that fails mid-flow cannot be retried — the user would need
    //    a fresh email. That's intentional: single-use is a stronger
    //    property than partial retryability.
    const { userId, email, intent } = await verifyMagicLink(token);

    // 2) Generate a Supabase-owned magic link for this user via the admin
    //    API. We intentionally do NOT redirect the browser to
    //    `data.properties.action_link` — that URL is on Supabase's own
    //    subdomain and would set session cookies there, not on our apex
    //    domain. Our middleware reads cookies scoped to the app's domain,
    //    so the session would be invisible and middleware would bounce the
    //    user to /login anyway.
    //
    //    Instead we extract `hashed_token` and consume it server-side with
    //    the cookie-aware Supabase client below. That path writes the
    //    auth cookies directly onto THIS response — which is what actually
    //    logs the user in as far as the rest of the app is concerned.
    //
    //    REGRESSION CONTEXT: before this fix, the handler called
    //    generateLink, checked only that hashed_token existed, then
    //    redirected to `dest` without ever establishing a session. Every
    //    user clicking a nudge/streak/weekly-digest email link went
    //    through: email → /api/magic?token=<jwt> → 302 /study →
    //    middleware sees no Supabase session → 302 /login?next=/study.
    //    The magic link "worked" (no error shown) but silently did
    //    nothing — users assumed the email flow was broken and stopped
    //    clicking. `tests/e2e/magic-link.spec.ts` now asserts the
    //    redirect chain ends at `dest` with auth cookies set.
    const admin = createAdminClient();
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !linkData.properties?.hashed_token) {
      logger.error(
        { err: linkErr, userId, hasProps: !!linkData?.properties },
        "admin.generateLink returned no hashed_token — cannot establish session"
      );
      return NextResponse.redirect(new URL("/login?error=session_link_failed", req.url));
    }

    // 3) Consume the hashed_token. The server client (createClient from
    //    lib/supabase/server) writes auth cookies via next/headers'
    //    cookieStore.set, which Next.js attaches to the outgoing
    //    NextResponse automatically. Using `type: "email"` here matches
    //    Supabase's current recommendation for magiclink token_hash
    //    verification (the older `type: "magiclink"` string is still
    //    accepted but deprecated in @supabase/supabase-js v2).
    const supabase = createClient();
    const { error: otpErr } = await supabase.auth.verifyOtp({
      type: "email",
      token_hash: linkData.properties.hashed_token,
    });
    if (otpErr) {
      logger.error(
        { err: otpErr, userId },
        "verifyOtp failed consuming admin-generated magic link token — session not established"
      );
      return NextResponse.redirect(new URL("/login?error=session_verify_failed", req.url));
    }

    const dest = REDIRECT_MAP[intent] ?? "/dashboard";
    logger.info({ userId, intent, dest }, "Magic link used successfully");
    return NextResponse.redirect(new URL(dest, req.url));
  } catch (err) {
    // Most likely paths here: JWT malformed/expired, JTI already used
    // (23505 surfaces as "Token already used"), or DB unreachable.
    // All three are user-actionable via "request a new link".
    logger.error({ err }, "Magic link verification failed");
    return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));
  }
}
