import { SignJWT, jwtVerify } from "jose";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// Lazy-init: reading at module load time crashes the Next.js build-time
// page-data pass when MAGIC_LINK_getSecret() is absent from the build env.
let _secret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (_secret) return _secret;
  const raw = process.env["MAGIC_LINK_SECRET"];
  if (!raw) throw new Error("MAGIC_LINK_SECRET environment variable is required but not set");
  _secret = new TextEncoder().encode(raw);
  return _secret;
}

// 20-minute expiry. Magic link tokens embedded in emails are single-factor
// auth credentials — a 24-hour window gives a stolen/forwarded email a full
// day to be replayed. 20 minutes is long enough to survive slow email
// delivery while tight enough to limit exposure of an intercepted token.
const EXPIRY_SECONDS = 60 * 20; // 20 minutes

export type MagicLinkPayload = {
  userId: string;
  email: string;
  jti: string;
  intent: "study" | "resume" | "streak" | "report";
};

export async function createMagicLink(
  userId: string,
  email: string,
  intent: MagicLinkPayload["intent"] = "study"
): Promise<string> {
  const jti = crypto.randomUUID();
  const iat = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({ userId, email, intent, jti } as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(iat + EXPIRY_SECONDS)
    .setJti(jti)
    .sign(getSecret());

  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  return `${baseUrl}/api/magic?token=${token}`;
}

export async function verifyMagicLink(token: string): Promise<MagicLinkPayload> {
  const { payload } = await jwtVerify(token, getSecret());

  const userId = payload["userId"] as string;
  const email = payload["email"] as string;
  const jti = payload["jti"] as string;
  const intent = payload["intent"] as MagicLinkPayload["intent"];

  if (!userId || !email || !jti) {
    throw new Error("Invalid token payload");
  }

  // Deduplicate via insert-first against the DB unique constraint on jti
  // (migration 005). The previous check-then-insert had a narrow race where
  // two concurrent verifies of the same token both passed the pre-select
  // and then one of them saw a 23505 unique-violation — which surfaced as
  // the generic "Failed to validate token" rather than "already used".
  //
  // Now we skip the pre-select entirely: the DB is the source of truth, and
  // the race loser gets translated to the correct "Token already used".
  const supabase = createAdminClient();
  const { error } = await supabase.from("magic_link_uses").insert({ jti, user_id: userId });
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      // Unique-violation → JTI was already consumed by a prior call.
      throw new Error("Token already used");
    }
    logger.error({ error, jti }, "Failed to record magic link use");
    throw new Error("Failed to validate token");
  }

  return { userId, email, jti, intent };
}
