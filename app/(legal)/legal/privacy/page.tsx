import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — Maestring",
  description: "Cómo Maestring trata tus datos personales (RGPD).",
};

const LAST_UPDATED = "19 de abril de 2026";

export default function PrivacyPage() {
  return (
    <article>
      <h1>Política de Privacidad</h1>
      <p className="text-sm text-zinc-500">Última actualización: {LAST_UPDATED}</p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        Responsable: Maestring (autónomo, España). Contacto:{" "}
        <a href="mailto:privacy@maestring.com">privacy@maestring.com</a>.
      </p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li><strong>Cuenta:</strong> email, nombre, avatar (vía Google OAuth o magic link).</li>
        <li><strong>Estudio:</strong> respuestas a preguntas, tiempos, métricas FSRS, PDFs que subes.</li>
        <li><strong>Pago:</strong> ID de cliente Stripe (no almacenamos datos de tarjeta).</li>
        <li><strong>Técnicos:</strong> dirección IP, user-agent, logs de errores (Sentry).</li>
        <li><strong>Analítica (con consentimiento):</strong> eventos de producto vía PostHog.</li>
      </ul>

      <h2>3. Finalidades y base jurídica</h2>
      <ul>
        <li><strong>Prestación del servicio</strong> (ejecución de contrato, art. 6.1.b RGPD).</li>
        <li><strong>Cobro</strong> (ejecución de contrato).</li>
        <li><strong>Emails transaccionales</strong> (interés legítimo, art. 6.1.f).</li>
        <li><strong>Analítica de producto</strong> (consentimiento, art. 6.1.a — banner de cookies).</li>
      </ul>

      <h2>4. Encargados de tratamiento</h2>
      <ul>
        <li><strong>Supabase</strong> (hosting de DB, auth) — UE.</li>
        <li><strong>Vercel</strong> (hosting app) — global.</li>
        <li><strong>Stripe</strong> (pagos) — Irlanda/EEUU (cláusulas tipo).</li>
        <li><strong>Anthropic</strong> y <strong>OpenAI</strong> (generación IA, embeddings) — EEUU. No se les envían datos personales identificables, sólo IDs anónimos y texto de PDFs que tú subes.</li>
        <li><strong>Resend</strong> (email transaccional) — EEUU.</li>
        <li><strong>Sentry</strong> (errores) — EEUU.</li>
        <li><strong>PostHog</strong> (analítica, opcional) — UE.</li>
        <li><strong>Upstash</strong> (rate limit) — UE.</li>
      </ul>

      <h2>5. Conservación</h2>
      <p>
        Datos de cuenta y estudio: mientras tengas cuenta activa. Tras cancelar,
        eliminamos en 30 días salvo obligación legal (facturación: 6 años).
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Acceso, rectificación, supresión, oposición, limitación y portabilidad.
        Puedes <strong>eliminar tu cuenta</strong> directamente desde
        <em> Ajustes → Eliminar cuenta</em>, o escribir a{" "}
        <a href="mailto:privacy@maestring.com">privacy@maestring.com</a>.
        Reclamación ante la AEPD: <a href="https://www.aepd.es" target="_blank" rel="noreferrer">aepd.es</a>.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Usamos cookies estrictamente necesarias (sesión, CSRF). La analítica
        (PostHog) sólo se activa si aceptas el banner. No usamos publicidad.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Cifrado en tránsito (TLS) y en reposo (Supabase/Postgres). RLS por
        usuario en todas las tablas. Sentry para detección de incidentes.
      </p>

      <h2>9. Cambios</h2>
      <p>
        Cambios materiales se notifican por email con 30 días de antelación.
      </p>
    </article>
  );
}
