import { Resend } from "resend";
import { logger } from "@/lib/logger";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env["RESEND_API_KEY"]);
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

export async function sendBulkEmail(recipients: BulkRecipient[]): Promise<void> {
  // Resend bulk send in batches of 100
  const BATCH = 100;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    const client = getResend();
    await Promise.allSettled(
      batch.map((r) =>
        client.emails.send({
          from: FROM,
          to: r.to,
          subject: r.subject,
          react: r.react,
        })
      )
    );
  }
}
