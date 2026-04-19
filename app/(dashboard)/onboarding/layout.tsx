import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Configuración inicial' }

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 mb-4">
            <span className="text-2xl">🎓</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary">Configuremos tu plan de estudio</h1>
          <p className="text-sm text-text-secondary mt-1">Solo tarda 2 minutos</p>
        </div>
        {children}
      </div>
    </div>
  )
}
