import { CalibrationFlow } from './CalibrationFlow'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Calibration — Learning Engine' }

export default function CalibrationPage() {
  return <CalibrationFlow />
}
