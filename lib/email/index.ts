import { Resend } from "resend";
import { logger } from "@/lib/logger";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) throw new Error("RESEND_API_KEY environment variable is required but not set");
    resend = new Resend(apiKey);
  }
  return resend;
}

const FROM = process.env["EMAIL_FROM"] ?? "Maestring <noreply@maestring.app>";

type SendEmailOptions = {
  to: string;
  subject: string;
  react: React.ReactElement;
  tags?: Array<{ name: string; value: string }>;
};

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const client = getResend();
  const { error } = await client.emails.send({
    from: FROM,
    to: options.to,
    subject: options.subject,
    react: options.react,
    tags: options.tags,
  });
  if (error) {
    logger.error({ error, to: options.to, subject: options.subject }, "Failed to send email");
    throw new Error(`Email send failed: ${error.message}`);
  }
}

type BulkRecipient = { to: string; subject: string; react: React.ReactElement };

// Returns the number of sends that failed (0 = all succeeded).
// Uses Promise.allSettled so a single failed send never blocks the remaining
// batch — but results are inspected and every failure is logged so "10k
// nudges sent, 42 failed" surfaces in the logs rather than silently
// disappearing into the settled-reject bucket.
export async function sendBulkEmail(recipients: BulkRecipient[]): Promise<number> {
  const BATCH = 100;
  let totalFailed = 0;
  const client = getResend();

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((r) =>
        client.emails.send({
          from: FROM,
          to: r.to,
          subject: r.subject,
          react: r.react,
        })
      )
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j]!;
      const r = batch[j]!;
      if (result.status === 'rejected') {
        logger.error(
          { err: result.reason, to: r.to, subject: r.subject },
          'sendBulkEmail: individual send rejected'
        );
        totalFailed++;
      } else if (result.value.error) {
        logger.error(
          { error: result.value.error, to: r.to, subject: r.subject },
          'sendBulkEmail: individual send returned error'
        );
        totalFailed++;
      }
    }
  }

  return totalFailed;
}
