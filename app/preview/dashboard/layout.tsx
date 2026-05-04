import { Shell } from '@/components/v2/dashboard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Shell>{children}</Shell>
}
