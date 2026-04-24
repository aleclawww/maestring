import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const supabase = createAdminClient();
  const { code } = params;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", code.toUpperCase())
    .maybeSingle();

  if (profileErr) {
    // Silent failure here collapsed a real DB error into the same "Referral
    // code not found → redirect to /signup" branch as a genuinely invalid
    // code. The user lost their referral attribution (no `?ref=...`), and
    // the referrer lost credit. Log error so growth attribution drops get
    // tied to DB/RLS incidents rather than blamed on "the link was wrong".
    logger.error(
      { err: profileErr, code },
      "Referral code lookup failed — redirecting to signup without attribution"
    );
    return NextResponse.redirect(new URL("/signup", req.url));
  }

  if (!profile) {
    logger.warn({ code }, "Referral code not found");
    return NextResponse.redirect(new URL("/signup", req.url));
  }

  // Redirect to signup with referral code pre-filled
  const url = new URL("/signup", req.url);
  url.searchParams.set("ref", code.toUpperCase());
  return NextResponse.redirect(url);
}
