import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Servicio — Maestring",
  description: "Términos y condiciones de uso de Maestring.",
};

const LAST_UPDATED = "19 de abril de 2026";

export default function TermsPage() {
  return (
    <article>
      <h1>Términos de Servicio</h1>
      <p className="text-sm text-zinc-500">Última actualización: {LAST_UPDATED}</p>

      <h2>1. Quiénes somos</h2>
      <p>
        Maestring es un servicio operado por un autónomo en España que ofrece
        herramientas de preparación adaptativa para certificaciones técnicas
        (actualmente AWS Certified Solutions Architect — Associate).
      </p>

      <h2>2. Aceptación</h2>
      <p>
        Al crear una cuenta o utilizar el servicio aceptas estos términos. Si no
        estás de acuerdo, no utilices Maestring.
      </p>

      <h2>3. Cuenta y elegibilidad</h2>
      <p>
        Debes tener al menos 16 años. Eres responsable de la confidencialidad de
        tus credenciales. Notifícanos inmediatamente cualquier uso no autorizado
        en <a href="mailto:soporte@maestring.com">soporte@maestring.com</a>.
      </p>

      <h2>4. Planes y pago</h2>
      <ul>
        <li><strong>Free:</strong> 20 preguntas IA al día, sin coste.</li>
        <li><strong>Pro:</strong> suscripción mensual de pago, preguntas ilimitadas. Cancelable en cualquier momento desde la sección Ajustes.</li>
      </ul>
      <p>
        Los pagos los procesa Stripe. Maestring no almacena datos de tarjetas.
        El periodo de prueba (cuando aplica) se convierte en suscripción de pago
        salvo cancelación previa.
      </p>

      <h2>5. Reembolsos</h2>
      <p>
        Devolución íntegra dentro de los <strong>14 días</strong> posteriores a
        la primera compra (derecho de desistimiento, art. 102 RDL 1/2007).
        Solicita el reembolso por email.
      </p>

      <h2>6. Uso aceptable</h2>
      <p>
        No está permitido: hacer scraping del contenido generado, revender el
        acceso, o utilizar el servicio para entrenar modelos de terceros.
      </p>

      <h2>7. Propiedad intelectual</h2>
      <p>
        El contenido generado por la IA durante tus sesiones es para tu uso
        personal de estudio. Maestring conserva los derechos sobre la
        plataforma, prompts, y grafo de conocimiento.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        Maestring es una herramienta de estudio. No garantizamos aprobar el
        examen. Las preguntas generadas por IA pueden contener errores; no
        sustituyen la documentación oficial de AWS.
      </p>

      <h2>9. Modificaciones</h2>
      <p>
        Podemos actualizar estos términos. Cambios materiales se notifican por
        email con al menos 30 días de antelación.
      </p>

      <h2>10. Ley aplicable</h2>
      <p>
        Legislación española. Tribunales competentes: los del domicilio del
        consumidor cuando este sea persona física en la UE.
      </p>

      <h2>11. Contacto</h2>
      <p>
        <a href="mailto:soporte@maestring.com">soporte@maestring.com</a>
      </p>
    </article>
  );
}
