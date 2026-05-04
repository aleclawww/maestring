/**
 * /preview/landing/certifications — index of all AWS certifications.
 *
 * Reuses the CertGrid section from the landing but wraps it in a slimmer
 * page-specific hero. The grid is the page; we don't pile on extras.
 */
import { CertGrid } from '@/components/v2/marketing/sections'
import { Eyebrow, BlurBlob, Pill } from '@/components/v2'

export default function CertificationsPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <BlurBlob className="-left-32 -top-24" size={460} opacity={0.22} animated />
        <BlurBlob
          className="-right-40 top-32"
          background="var(--v2-gradient-brand-soft)"
          size={400}
          opacity={0.5}
        />

        <div className="relative z-10 mx-auto max-w-[1080px] px-6 py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-[700px] text-center">
            <Eyebrow align="center">Catalog</Eyebrow>
            <h1 className="v2-display mt-3 text-[40px] sm:text-[52px] lg:text-[60px]">
              Every AWS certification{' '}
              <span className="v2-text-gradient">we cover.</span>
            </h1>
            <p className="mt-5 text-[17px] leading-[1.7] text-v2-foreground-muted sm:text-[18px]">
              Pick the cert your next role asks for. Each course is built from
              the official 2026 exam guide and refreshed when AWS updates the
              blueprint.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              {['All certs', 'Associate', 'Professional', 'Specialty'].map(
                (level, i) => (
                  <Pill
                    key={level}
                    tone={i === 0 ? 'gradient' : 'neutral'}
                    size="md"
                    className="cursor-pointer"
                  >
                    {level}
                  </Pill>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <CertGrid />
    </>
  )
}
