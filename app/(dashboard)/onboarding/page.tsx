import { createAdminClient } from '@/lib/supabase/admin'
import { OnboardingForm } from './OnboardingForm'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const supabase = createAdminClient()
  const { data: domains } = await supabase
    .from('knowledge_domains')
    .select('id, slug, name, description, exam_weight_percent')
    .eq('certification_id', 'aws-saa-c03')
    .order('sort_order', { ascending: true })

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <OnboardingForm domains={domains ?? []} />
    </div>
  )
}
