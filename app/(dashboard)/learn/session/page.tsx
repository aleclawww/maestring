import { SessionRouter } from './SessionRouter'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Learning Session' }

export default function LearningSessionPage() {
  return <SessionRouter />
}
