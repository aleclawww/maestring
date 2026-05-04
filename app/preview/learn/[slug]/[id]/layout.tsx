/**
 * Lesson view layout — focused reading mode.
 *
 * The lesson lives outside the dashboard Shell on purpose: the directive
 * gives the lesson its own 3-column structure (module tree / reading
 * column / on-this-page rail). Stacking it under the dashboard sidebar
 * would mean two sidebars competing for the same job.
 *
 * In production this route would live at /app/courses/[slug]/lesson/[id]
 * and use a parallel-route override on the dashboard layout.
 */
export default function LessonLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="bg-v2-background">{children}</div>
}
