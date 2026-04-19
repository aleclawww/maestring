import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@maestring.app";
const FROM_NAME = process.env.RESEND_FROM_NAME ?? "Maestring";

// ─── Tipos de email ───────────────────────────────────────────────────────────

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ─── Funciones de envío ───────────────────────────────────────────────────────

/**
 * Email de bienvenida tras registro.
 */
export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject: "¡Bienvenido a Maestring! 🚀",
      // TODO: Usar React Email template desde /emails/WelcomeEmail.tsx
      html: `
        <h1>¡Hola ${name}!</h1>
        <p>Bienvenido a Maestring, la plataforma inteligente para prepararte para tu certificación AWS.</p>
        <p>Empieza tu preparación hoy:</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/onboarding" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
          Comenzar mi preparación →
        </a>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("Email send failed:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Email de recordatorio de estudio (streak en riesgo).
 */
export async function sendStreakReminderEmail(
  to: string,
  name: string,
  streakDays: number,
  dueQuestions: number
): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `⚠️ Tu racha de ${streakDays} días está en riesgo`,
      html: `
        <h1>¡Hola ${name}!</h1>
        <p>Tienes <strong>${streakDays} días de racha</strong> y ${dueQuestions} preguntas pendientes para hoy.</p>
        <p>Estudia 10 minutos ahora para mantener tu racha.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/study" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
          Estudiar ahora →
        </a>
      `,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Email de confirmación de suscripción.
 */
export async function sendSubscriptionConfirmEmail(
  to: string,
  name: string,
  plan: string,
  amount: number
): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject: "✅ Tu suscripción a Maestring está activa",
      html: `
        <h1>¡Gracias ${name}!</h1>
        <p>Tu suscripción al plan <strong>${plan}</strong> está activa.</p>
        <p>Importe: <strong>$${(amount / 100).toFixed(2)}</strong></p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#10b981;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
          Ir al dashboard →
        </a>
      `,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Email de reporte semanal de progreso.
 */
export async function sendWeeklyReportEmail(
  to: string,
  name: string,
  stats: {
    questionsAnswered: number;
    correctRate: number;
    studyMinutes: number;
    streakDays: number;
    topDomain: string;
    weakDomain: string;
  }
): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `📊 Tu reporte semanal — ${stats.questionsAnswered} preguntas respondidas`,
      html: `
        <h1>Tu semana en Maestring</h1>
        <p>Hola ${name}, aquí está tu resumen de esta semana:</p>
        <ul>
          <li>✅ Preguntas respondidas: <strong>${stats.questionsAnswered}</strong></li>
          <li>🎯 Tasa de acierto: <strong>${Math.round(stats.correctRate * 100)}%</strong></li>
          <li>⏱️ Tiempo estudiado: <strong>${stats.studyMinutes} minutos</strong></li>
          <li>🔥 Racha actual: <strong>${stats.streakDays} días</strong></li>
          <li>💪 Tu mejor dominio: <strong>${stats.topDomain}</strong></li>
          <li>📚 Necesita trabajo: <strong>${stats.weakDomain}</strong></li>
        </ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
          Ver mi progreso completo →
        </a>
      `,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
