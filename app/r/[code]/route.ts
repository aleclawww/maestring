import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const supabase = createAdminClient();
  const { code } = params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", code.toUpperCase())
    .maybeSingle();

  if (!profile) {
    logger.warn({ code }, "Referral code not found");
    return NextResponse.redirect(new URL("/signup", req.url));
  }

  // Redirect to signup with referral code pre-filled
  const url = new URL("/signup", req.url);
  url.searchParams.set("ref", code.toUpperCase());
  return NextResponse.redirect(url);
}
