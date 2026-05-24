/**
 * Render all icon raster variants + the OG share image from the v2 SVG
 * source. Run with:
 *
 *   npx tsx scripts/render-icons.ts
 *
 * Reads:    app/icon.svg            (single source of truth for the mark)
 * Writes:   public/favicon-16x16.png
 *           public/favicon-32x32.png
 *           public/favicon.ico       (PNG bytes — modern browsers accept this)
 *           public/apple-touch-icon.png         (180×180)
 *           public/android-chrome-48x48.png
 *           public/android-chrome-192x192.png
 *           public/android-chrome-512x512.png
 *           public/og-image.png      (1200×630 — Reddit/Twitter/WhatsApp card)
 *
 * If the SVG source changes, re-run this script and commit the resulting
 * PNGs alongside. This keeps a single design surface (the SVG) and
 * prevents drift between favicon and OG card.
 */
import { promises as fs } from 'fs'
import * as path from 'path'
import sharp from 'sharp'

const APP_ICON = path.resolve(process.cwd(), 'app/icon.svg')
const PUBLIC = path.resolve(process.cwd(), 'public')

const RASTER_TARGETS: Array<{ name: string; size: number }> = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon.ico', size: 32 }, // PNG-in-ICO; modern browsers accept it
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-48x48.png', size: 48 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
]

/**
 * OG card composition. Light bg matching v2-background (#F8FAFC), the
 * brand mark large on the left, wordmark + tagline on the right. Tagline
 * is the cross-surface lema that ships in StatsBand + footer ("AWS SAA-
 * C03 prep, covered properly.") so the OG echoes the page voice.
 *
 * Text is rendered via SVG <text>. Font is system-ui / Helvetica fallback
 * — sharp/librsvg picks whatever sans-serif is available on the build
 * host. Not the brand Plus Jakarta Sans, but acceptable for v1; bundling
 * the actual font file into the render pipeline is a follow-up if the
 * difference reads off.
 */
const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
    <radialGradient id="blob" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#E0E7FF" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#E0E7FF" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Light bg matching v2-background -->
  <rect width="1200" height="630" fill="#F8FAFC"/>

  <!-- Subtle gradient blob top-right corner (echoes the BlurBlob aesthetic on the Hero) -->
  <circle cx="1050" cy="100" r="400" fill="url(#blob)"/>
  <circle cx="-50" cy="600" r="350" fill="url(#blob)"/>

  <!-- Wordmark centered: same black "maestring" + gradient dot pattern that ships in the live Logo component. No gradient tile mark; the wordmark IS the brand mark. -->
  <g transform="translate(600, 295)" text-anchor="middle">
    <text
      x="0" y="0"
      font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
      font-size="140"
      font-weight="800"
      fill="#0F172A"
      letter-spacing="-3"
    >maestring</text>
  </g>
  <!-- Gradient dot at the end of the wordmark, baseline-aligned -->
  <circle cx="895" cy="295" r="22" fill="url(#brand)"/>

  <!-- Tagline below: cross-surface lema (StatsBand + Footer voice) -->
  <g transform="translate(600, 395)" text-anchor="middle">
    <text
      x="0" y="0"
      font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
      font-size="36"
      font-weight="500"
      fill="#475569"
      letter-spacing="-0.5"
    >AWS SAA-C03 prep, <tspan font-weight="700" fill="#4F46E5">covered properly.</tspan></text>
  </g>

  <!-- URL chip bottom-center for credibility cue -->
  <g transform="translate(600, 560)" text-anchor="middle">
    <text
      x="0" y="0"
      font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
      font-size="18"
      font-weight="600"
      fill="#94A3B8"
      letter-spacing="3"
    >MAESTRING.COM</text>
  </g>
</svg>`

async function renderRaster(name: string, size: number) {
  const buf = await fs.readFile(APP_ICON)
  const out = await sharp(buf, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  await fs.writeFile(path.join(PUBLIC, name), out)
  console.log(`✓ ${name} (${size}×${size}, ${out.length} bytes)`)
}

async function renderOg() {
  const out = await sharp(Buffer.from(OG_SVG), { density: 150 })
    .resize(1200, 630)
    .png({ quality: 92 })
    .toBuffer()
  await fs.writeFile(path.join(PUBLIC, 'og-image.png'), out)
  console.log(`✓ og-image.png (1200×630, ${out.length} bytes)`)
}

async function main() {
  console.log('Rendering icons from app/icon.svg ...')
  for (const t of RASTER_TARGETS) await renderRaster(t.name, t.size)
  await renderOg()
  console.log('\nDone. All files written to public/.')
  console.log('Source of truth: app/icon.svg. Re-run this script if it changes.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
