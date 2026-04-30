/**
 * Rasterises the brand SVG into every favicon/PWA PNG size needed.
 * Run: node scripts/generate-favicons.mjs
 *
 * Outputs (all to public/):
 *   favicon-16x16.png
 *   favicon-32x32.png
 *   android-chrome-48x48.png   ← minimum Google Search favicon
 *   android-chrome-192x192.png
 *   android-chrome-512x512.png
 *   apple-touch-icon.png       (180×180)
 *   og-favicon.png             (64×64, used in Open Graph previews)
 */

import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const publicDir = resolve(root, 'public')

// ── SVG source ────────────────────────────────────────────────────────────────
// sharp's SVG renderer (libvips/librsvg) does NOT support CSS filters or
// feColorMatrix with named color-interpolation — but it handles linearGradient
// and feGaussianBlur perfectly. We use a simplified version of the icon that
// relies only on primitives supported by librsvg.

const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <defs>
    <!-- Brand gradient: indigo → violet → cyan, bottom-left to top-right -->
    <linearGradient id="g" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#6366f1"/>
      <stop offset="50%"  stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <!-- Glow: blur the stroke copy, composite behind the crisp stroke -->
    <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blurred"/>
      <feMerge>
        <feMergeNode in="blurred"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Subtle background shimmer -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#6366f1" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.04"/>
    </linearGradient>
  </defs>

  <!-- Dark background -->
  <rect x="0" y="0" width="100" height="100" rx="22" ry="22" fill="#0f1117"/>
  <!-- Shimmer overlay -->
  <rect x="0" y="0" width="100" height="100" rx="22" ry="22" fill="url(#bg)"/>
  <!-- Thin gradient border -->
  <rect x="1" y="1" width="98" height="98" rx="21.5" ry="21.5"
        fill="none" stroke="url(#g)" stroke-width="1.5" stroke-opacity="0.5"/>

  <!-- M lettermark — two vertical pillars + twin diagonals to a centre valley -->
  <path
    d="M 17,76 L 17,26 L 50,46 L 83,26 L 83,76"
    fill="none"
    stroke="url(#g)"
    stroke-width="10"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#glow)"
  />
</svg>`

const svgBuf = Buffer.from(svgSource)

// ── Sizes to generate ─────────────────────────────────────────────────────────
const targets = [
  { name: 'favicon-16x16.png',       size: 16  },
  { name: 'favicon-32x32.png',       size: 32  },
  { name: 'android-chrome-48x48.png',size: 48  },  // Google Search minimum
  { name: 'apple-touch-icon.png',    size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
]

for (const { name, size } of targets) {
  const outPath = resolve(publicDir, name)
  await sharp(svgBuf, { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outPath)
  console.log(`✓  ${name} (${size}×${size})`)
}

// ── favicon.ico — 16, 32, 48 layers ──────────────────────────────────────────
// sharp doesn't write .ico natively; we write a 32×32 PNG and note that
// Next.js / the browser will use the PNG icons preferentially over the .ico.
// For a real multi-layer .ico, use the png-to-ico package or a converter.
// The PNG icons are more than sufficient for Google Search + modern browsers.
console.log('\nAll PNG favicons generated.')
console.log('Note: favicon.ico was not replaced — browsers prefer the PNG icons.')
console.log('To regenerate favicon.ico from the 32×32 PNG, run:')
console.log('  npx png-to-ico public/favicon-32x32.png > public/favicon.ico')
