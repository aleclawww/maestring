import { z } from 'zod'

// Mirrors the DB CHECKs in migration 051. Shared between POST (create) and
// PATCH (update). Lives in `_schema.ts` rather than `route.ts` because
// Next.js App Router route files only accept HTTP method exports and a
// fixed set of config exports — exporting arbitrary symbols from a
// route.ts breaks the build with "is not a valid Route export field".
export const BriefBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  bodyMd: z.string().min(50).max(10000),
  gotchas: z.array(z.string().trim().min(1)).optional().nullable(),
  relatedConceptIds: z.array(z.string().uuid()).optional().nullable(),
  diagramUrl: z
    .string()
    .url()
    .regex(/^https?:\/\//, 'must start with http(s)://')
    .optional()
    .nullable(),
})
