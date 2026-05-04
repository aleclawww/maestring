/**
 * Exam layout — focused full-bleed mode.
 *
 * Matches the official AWS exam UI feel. No nav, no sidebar, no footer
 * chrome from anywhere else; the exam interface is the page. The /preview
 * theme-v2 wrapper is inherited from the parent /preview/layout.tsx.
 */
export default function ExamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="bg-v2-background">{children}</div>
}
