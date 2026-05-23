# Part 2 — Verificación de paneles externos

**Branch:** `claude/fixes-broken-basic-flows` (mismo que Part 1).
**Honesto desde el principio:** **no tengo acceso a Vercel / Resend / Supabase paneles desde este entorno.** No tengo credenciales, no tengo sesiones de Chrome con esos servicios abiertos, y aunque pudiera usar Chrome MCP (los tools `mcp__Claude_in_Chrome__*` están deferred y operan sobre la sesión real del founder), navegar paneles llenos de secretos no es una operación que deba automatizar sin supervisión directa.

Lo que SÍ pude hacer es **derivar evidencia indirecta** del propio repo. Lo que NO pude hacer es **confirmar el valor de los env vars en Vercel** — eso lo necesitas hacer tú.

---

## 1. Lo que SÍ pude verificar desde el repo

### 1.1 Hipótesis de naming mismatch — **confirmada por evidencia indirecta**

Encontré en el working tree dos ficheros que tú generaste con `vercel env pull`: `.env.local.prod` (token OIDC de development, irrelevante) y `.env.prod`. Los untracked, no se commitearon — pero los leí en disco.

El `.env.prod` lista **qué env vars están definidos en Vercel Production** (los valores aparecen vacíos `""` — es el comportamiento de `vercel env pull` cuando los pulla a fichero, los nombres son lo informativo).

**Vars que SÍ aparecen en `.env.prod` (definidos en Vercel prod):**

```
ADMIN_EMAILS, CRON_SECRET, MAGIC_LINK_SECRET,
NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_POSTHOG_HOST, NEXT_PUBLIC_SITE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL,
OPENAI_CHAT_MODEL, OPENAI_EMBEDDING_MODEL,
RESEND_FROM_EMAIL, RESEND_FROM_NAME,
SUPABASE_SERVICE_ROLE_KEY
```

**Vars que NO aparecen:**

- **`EMAIL_FROM`** ← la que el código realmente lee ([lib/email/index.ts:15](lib/email/index.ts:15), [lib/env.ts:60](lib/env.ts:60))
- **`RESEND_API_KEY`** ← crítico para envío
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `UPSTASH_*`, `LEMONSQUEEZY_*` y `STRIPE_*`

### 1.2 Caveat crítico de interpretación

**Pero el dashboard de tu app funciona** (eso me dijiste — login a parte, el resto funciona). Eso solo puede pasar si `EMAIL_FROM`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, etc., **están definidos en Vercel** — porque [instrumentation.ts](instrumentation.ts) llama a `validateEnv()` al boot del servidor Node, que dispara `required('EMAIL_FROM')` en [lib/env.ts:60](lib/env.ts:60) y abortaría la app entera con un error claro si la var no existe.

Entonces hay dos explicaciones posibles:

**Explicación A (más probable):** `vercel env pull` aquí está incompleto. Algunos planes / roles de Vercel filtran ciertas vars al hacer pull. En esos casos `EMAIL_FROM` SÍ está en Vercel pero no salió en el fichero. La ÚNICA forma de saberlo es abriendo Vercel UI y mirando la lista de env vars Production directamente.

**Explicación B (también plausible — y peor):** `EMAIL_FROM` realmente no está, y la app está bootando porque algo silencioso bypassa la validación (`NEXT_RUNTIME` no es `'nodejs'` en algún path, hot-reload skip, etc.). Si esto fuera cierto, el código caería al fallback hardcoded `Maestring <noreply@maestring.app>` cuando se llama a `sendEmail()`, y Resend rechazaría porque `.app` no está en su dominio verificado. Eso explicaría el síntoma "no llega email" sin romper otras features.

**Las dos explicaciones predicen el mismo resultado para el founder:** mirar Vercel UI y comprobar si `EMAIL_FROM` existe.

### 1.3 Lo que SÍ aparece confirma el otro problema

`RESEND_FROM_EMAIL` y `RESEND_FROM_NAME` están **explícitamente listados en Vercel prod**. **El código no las lee.** Son las vars del `.env.production.template` original (que el founder seguramente siguió al aprovisionar Vercel). Esto es **deuda muerta de templates**: el código se refactorizó para leer `EMAIL_FROM` (formato `"Name <addr>"`) pero los templates no se actualizaron. **Estas dos vars deben borrarse de Vercel** (o renombrarse, según lo que decidas).

### 1.4 Bootstrap de usuarios — `handle_new_user` y `ensure_user_bootstrapped`

Verifiqué que **ambas funciones existen como definiciones en migraciones del repo**:

- [supabase/migrations/002_base_schema.sql:66](supabase/migrations/002_base_schema.sql) — primera versión de `handle_new_user`.
- [supabase/migrations/033_harden_handle_new_user.sql:27](supabase/migrations/033_harden_handle_new_user.sql) — versión endurecida + introduce `ensure_user_bootstrapped`.
- [supabase/migrations/034_fix_trigger_search_path.sql:31](supabase/migrations/034_fix_trigger_search_path.sql) — fix de `search_path` para ambas.
- [supabase/migrations/047_security_and_xp.sql:38](supabase/migrations/047_security_and_xp.sql) — revoke execute de `ensure_user_bootstrapped` de `authenticated` (mantiene service_role).

**Lo crítico:** [CLAUDE.md] ya documenta que hay drift entre migraciones del repo y producción ("9 tables in prod with no `CREATE TABLE` in repo"). No puedo confirmar desde aquí que estas dos funciones están **realmente desplegadas en la DB de prod**. Si por alguna razón las migraciones 033/034 no se llegaron a aplicar en prod (o se borraron por un revert / db reset), el signup parece OK desde el cliente pero el row de `profiles` nunca se crea → todo lo downstream sufre (incluido lo que el dashboard fix de Part 1 ya tolera).

Verificación que **solo tú puedes hacer** corriendo SQL en el Supabase prod:

```sql
-- Las dos funciones existen?
SELECT proname, prosrc IS NOT NULL AS has_body
FROM pg_proc
WHERE proname IN ('handle_new_user', 'ensure_user_bootstrapped')
ORDER BY proname;

-- El trigger en auth.users está activo?
SELECT t.tgname, t.tgenabled, p.proname
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgname LIKE '%new_user%' OR p.proname = 'handle_new_user';

-- Cuántos auth.users tienen profile? Si hay drift es señal de bootstrap roto:
SELECT
  (SELECT COUNT(*) FROM auth.users) AS auth_users,
  (SELECT COUNT(*) FROM public.profiles) AS profiles_rows,
  (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM public.profiles) AS missing_profiles;
```

Resultado esperado si todo bien: `handle_new_user` y `ensure_user_bootstrapped` ambas listadas con `has_body=t`, trigger activo, y `missing_profiles=0`. Si `missing_profiles > 0`, **ESE es el bug grave**.

---

## 2. Lo que NO pude verificar — checklist manual para ti

Esto es lo que necesito que ejecutes tú. Estimado: 10–15 minutos, todo en navegador.

### Vercel — Settings → Environment Variables → Production

Abrir [https://vercel.com](https://vercel.com) → tu project → Settings → Environment Variables. Filtrar por **Production**.

Comprobar la presencia (sí/no) de:

| Var | Esperado | Verificación |
|---|---|---|
| `EMAIL_FROM` | Existe, valor `Maestring <no-reply@maestring.com>` (o similar con dominio `.com` no `.app`) | **CRÍTICO** — si NO existe, ese es el bug. Añadirla con el valor correcto. |
| `RESEND_API_KEY` | Existe, valor empieza por `re_` | Si no existe → añadir. Si existe pero hace tiempo que no se rota, verificar que sigue válida en Resend. |
| `NEXT_PUBLIC_APP_URL` | Existe, valor `https://maestring.com` | Si vacío → magic link send falla con 400 antes de llegar a Resend. |
| `RESEND_FROM_EMAIL` / `RESEND_FROM_NAME` | **El código NO las usa. Estorbo.** | **Borrarlas** para evitar confusión futura. |

### Resend — [https://resend.com/domains](https://resend.com/domains)

| Comprobar | Esperado |
|---|---|
| Lista de Domains | Solo `maestring.com`, status **Verified**. Si hay `maestring.app` o `maestring.io` por error, identificar qué dominio realmente apunta tu DNS y qué pone `EMAIL_FROM`. |
| DKIM + SPF records | Ambos green en el panel de Resend (significa que Resend ha confirmado vía DNS que el dominio es tuyo). |
| API Keys | Tu API key activa coincide con la que está en Vercel. |
| Recent emails | Resend → Emails. Probar enviar uno y mirar si aparece, con qué estado (delivered / bounced / hard_bounce). Si nunca llega ni siquiera con status `sent`, es probable que `RESEND_API_KEY` esté invalidada o que `EMAIL_FROM` apunte a dominio no-verificado. |

### Supabase — Authentication

| Pantalla | Comprobar |
|---|---|
| URL Configuration → **Redirect URLs** | Debe contener `https://maestring.com/auth/callback` (y probablemente `https://*.vercel.app/auth/callback` para previews). Si falta, el click del magic link aterriza en pantalla genérica de Supabase, no en tu callback. |
| URL Configuration → **Site URL** | `https://maestring.com` |
| Providers → **Email** | Habilitado (necesario aunque uses magic link branded vía Resend — Supabase `admin.generateLink` lo requiere). |
| Providers → **Google** | Habilitado, con OAuth Client ID + Secret de Google Cloud. **Esta es tu vía de escape mientras se arregla el email.** Si está apagada, encenderla AHORA mismo. |

### Supabase — Database → SQL Editor

Correr el SQL del bloque §1.4 arriba. Reportar los tres resultados:
1. ¿Listadas ambas funciones?
2. ¿Trigger activo?
3. ¿`missing_profiles` es 0 o > 0?

### Supabase — Database → Functions UI

Buscar que aparezcan en la lista: `handle_new_user`, `ensure_user_bootstrapped`, `pick_pool_question`, `bump_question_shown`, `get_user_stats`, `get_study_heatmap`, `get_exam_readiness_v2`, `get_blueprint_task_accuracy`, `seed_concept_states_from_self_rating`, `increment_session_counters`, `update_cognitive_fingerprint`.

Si **falta cualquiera de las primeras dos** (bootstrap), es más grave que el email. Hay que rerunear las migraciones 033/034 (o las que aplican) contra prod inmediatamente.

### Vercel Logs — el botón que ya tienes

Vercel → tu project → Logs. Filtrar últimas 24h por `/api/auth/send-otp` o `send-otp` y mirar el error real. Posibles mensajes que confirman cuál es el bug:

| Mensaje en logs | Lo que significa |
|---|---|
| `send-otp: branded email delivery failed` con `from`-not-verified en el error de Resend | `EMAIL_FROM` apunta a dominio no-verificado. Confirma hipótesis A. |
| `invalid_body` 400 | `NEXT_PUBLIC_APP_URL` vacío → allowlist vacía → rechaza todo redirectTo. |
| `[env] Required environment variable "EMAIL_FROM" is missing` | La app **no debería bootear** si esto sale — querría decir que la validación está bypassed. |
| Ningún log del endpoint | El request nunca llega — problema de routing, no de email. |

---

## 3. Resumen del estado de cada item de Part 2

| Pregunta | Respuesta posible desde aquí | Acción para ti |
|---|---|---|
| ¿Existe `RESEND_API_KEY` en Vercel prod? | Probablemente sí (la app bootea) pero no listado en `.env.prod` pulled — confirmar | Vercel UI |
| ¿Existe `EMAIL_FROM`? Y con dominio `.com` o `.app`? | No listado en `.env.prod`. Posiblemente ausente (peor caso) o presente con typo (mejor caso) | **Vercel UI — prioritario** |
| ¿`NEXT_PUBLIC_APP_URL` con valor real? | Listado pero pulled como `""`. Ambiguo — confirmar en UI | Vercel UI |
| ¿`RESEND_FROM_EMAIL` / `RESEND_FROM_NAME` por error? | **Sí, confirmado.** El código no las lee. | **Borrarlas de Vercel** |
| ¿`maestring.com` Verified en Resend? | No verificable desde aquí | Resend UI |
| ¿Hay `maestring.app` errante? | No verificable desde aquí | Resend UI |
| ¿`/auth/callback` en Redirect URLs de Supabase? | No verificable desde aquí | Supabase UI |
| ¿Google / Email providers habilitados en Supabase? | No verificable desde aquí | Supabase UI |
| ¿`handle_new_user` y `ensure_user_bootstrapped` existen en prod DB? | Definidas en migraciones, drift es posible. **El bootstrap potencialmente roto es más grave que el email.** | **SQL editor en Supabase — prioritario** |

---

## 4. Orden recomendado de ejecución para ti

1. **Supabase SQL del §1.4** — si `missing_profiles > 0`, ese es el bug a arreglar primero (más grave que email). Esperable: 5 minutos.
2. **Vercel UI Production env vars** — confirmar `EMAIL_FROM`, borrar `RESEND_FROM_*` muertas. 5 minutos.
3. **Resend Domains** — confirmar `maestring.com` verified. 2 minutos.
4. **Supabase Auth Redirect URLs + Providers** — confirmar. 3 minutos.
5. **Vercel Logs últimas 24h /api/auth/send-otp** — mirar el error real. 2 minutos.

Después de eso me reportas lo que veas y yo aplico el fix exacto a la rama. **No toco config de email hasta que tengamos respuesta de Vercel UI.** Si la causa raíz resulta ser bootstrap roto (missing_profiles > 0), eso bloquea todo lo demás y subiría a P0 por encima del email.

---

## 5. Estado de Part 1 (recordatorio)

5 fixes commiteados en esta misma rama (`c135a8d`):

- Hero / Nav (×2) / FinalCTA CTAs envueltos en `<Link href="/signup">`. El embudo del landing → signup ya conecta.
- `SignOutButton` creado y montado en el Sidebar entre Settings y el avatar.
- `.single()` → `.maybeSingle()` en `dashboard/page.tsx` y en `(dashboard)/layout.tsx` (×2). Con log de error si falta el profile, para detectar bootstraps rotos.
- Readiness fallback gateado por `studied_concepts > 0` en `dashboard/page.tsx` y `progress/page.tsx`. Usuario nuevo verá el mensaje de calibración.

Typecheck local solo arroja errores de "node_modules no instalados" (lucide-react, react-markdown, next), nada del diff que apliqué. Cuando merges esta rama y deploys, los 5 fixes son live.

`.env.local.prod` y `.env.prod` quedaron en el working tree pero **no commitea-dos** (los unstageé tras un `git add -A`). `.gitignore` actual NO los protege — solo cubre `.env`, `.env.local`, `.env.production`, `.env.*.local`. Recomendación: añadir `.env.*.prod` y `.env.prod*` al `.gitignore` para evitar futuros sustos. No lo toqué por estar fuera de scope.
