import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLink } from "@/lib/magic-links";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", req.url));
  }

  try {
    const { userId, intent } = await verifyMagicLink(token);

    // Create a Supabase session for the user using admin sign-in
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: (await supabase.auth.admin.getUserById(userId)).data.user?.email ?? "",
    });

    if (error || !data.properties?.hashed_token) {
      throw new Error("Failed to generate session link");
    }

    const redirectMap: Record<string, string> = {
      study: "/study",
      resume: "/study",
      streak: "/study",
      report: "/dashboard",
    };

    const dest = redirectMap[intent] ?? "/dashboard";

    logger.info({ userId, intent }, "Magic link used successfully");

    return NextResponse.redirect(new URL(dest, req.url));
  } catch (err) {
    logger.error({ err }, "Magic link verification failed");
    return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));
  }
}
