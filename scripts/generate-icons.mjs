import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const PRIMARY = '#6366f1'
const BG = '#0f1117'
const FG = '#ffffff'

const root = process.cwd()
const publicDir = resolve(root, 'public')

function squareSvg(size, rounded = true) {
  const r = rounded ? Math.round(size * 0.22) : 0
  const fontSize = Math.round(size * 0.62)
  const cy = Math.round(size * 0.5 + fontSize * 0.34)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${PRIMARY}"/>
  <text x="50%" y="${cy}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" font-weight="800" font-size="${fontSize}" fill="${FG}">M</text>
</svg>`
}

function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="#1a1e2e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="520" y="155" width="160" height="160" rx="36" ry="36" fill="${PRIMARY}"/>
  <text x="600" y="278" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" font-weight="800" font-size="110" fill="${FG}">M</text>
  <text x="600" y="400" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" font-weight="800" font-size="64" fill="${FG}">Maestring</text>
  <text x="600" y="460" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" font-weight="500" font-size="28" fill="#a5adcb">Master AWS with AI and Spaced Repetition</text>
</svg>`
}

async function writePng(size, filename) {
  const buf = await sharp(Buffer.from(squareSvg(size))).png().toBuffer()
  await writeFile(resolve(publicDir, filename), buf)
  console.log('wrote', filename)
}

await writePng(16, 'favicon-16x16.png')
await writePng(32, 'favicon-32x32.png')
await writePng(180, 'apple-touch-icon.png')
await writePng(192, 'android-chrome-192x192.png')
await writePng(512, 'android-chrome-512x512.png')

// favicon.ico (just 32x32 PNG renamed — modern browsers accept this)
const icoBuf = await sharp(Buffer.from(squareSvg(32))).png().toBuffer()
await writeFile(resolve(publicDir, 'favicon.ico'), icoBuf)
console.log('wrote favicon.ico')

// Raw SVG logo (useful for Google OAuth consent)
await writeFile(resolve(publicDir, 'logo.svg'), squareSvg(512))
console.log('wrote logo.svg')

// OG image
const ogBuf = await sharp(Buffer.from(ogSvg())).png().toBuffer()
await writeFile(resolve(publicDir, 'og-image.png'), ogBuf)
console.log('wrote og-image.png')

// web manifest
const manifest = {
  name: 'Maestring',
  short_name: 'Maestring',
  description: 'Master AWS with AI and Spaced Repetition',
  icons: [
    { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
  ],
  theme_color: '#0f1117',
  background_color: '#0f1117',
  display: 'standalone',
  start_url: '/dashboard',
}
await writeFile(resolve(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2))
console.log('wrote site.webmanifest')

console.log('done')
