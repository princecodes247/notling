import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Crisp dark SVG for standard & maskable icons with modern aesthetic
// Dark background (#121214) with sharp white 'N' glyph
function createSvg({ size, padding = 0, bg = null }: { size: number; padding?: number; bg?: string | null }) {
  const innerSize = size - padding * 2;
  const scale = innerSize / 222;
  const tx = padding + (innerSize - 205 * scale) / 2;
  const ty = padding;

  const bgRect = bg ? `<rect width="${size}" height="${size}" rx="${bg === '#18181b' ? size * 0.22 : 0}" fill="${bg}" />` : '';

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${bgRect}
  <g transform="translate(${tx}, ${ty}) scale(${scale})">
    <path fill="#ffffff" d="M95 0C131.251 0 167.501 0 204.851 0C204.851 73.6703 204.851 145.341 204.851 221.243C159.341 221.243 161.259 221.243 161.259 221.243C161.259 221.243 133.085 201.821 109 184.409V136.591L161.259 172.409C161.259 128.552 161.259 84.6951 161.259 39.5093C139.394 39.5093 117.528 39.5093 95 39.5093C95 25.8112 95 14.1132 95 0Z" />
    <path fill="#ffffff" d="M109.851 221.243C73.6 221.243 37.3492 221.243 -1.52588e-05 221.243C-1.52588e-05 147.573 -1.52588e-05 75.9027 -1.52588e-05 -1.52588e-05C45.5096 -1.52588e-05 43.5915 -1.52588e-05 43.5915 -1.52588e-05C43.5915 -1.52588e-05 71.7655 19.4222 95.8507 36.8344V84.6518L43.5915 48.8344C43.5915 92.6913 43.5915 136.548 43.5915 181.734C65.4571 181.734 87.3226 181.734 109.851 181.734C109.851 195.432 109.851 207.13 109.851 221.243Z" />
  </g>
</svg>
  `.trim();
}

async function generate() {
  console.log('Generating PWA icons...');

  // 1. icon-192.png (App icon with sleek dark rounded container)
  const svg192 = Buffer.from(createSvg({ size: 192, padding: 36, bg: '#18181b' }));
  await sharp(svg192).png().toFile(path.join(iconsDir, 'icon-192.png'));

  // 2. icon-512.png (Standard 512)
  const svg512 = Buffer.from(createSvg({ size: 512, padding: 96, bg: '#18181b' }));
  await sharp(svg512).png().toFile(path.join(iconsDir, 'icon-512.png'));

  // 3. icon-maskable-192.png (Maskable icon with safe zone safe margin >= 15% on each side)
  const svgMaskable192 = Buffer.from(createSvg({ size: 192, padding: 48, bg: '#121214' }));
  await sharp(svgMaskable192).png().toFile(path.join(iconsDir, 'icon-maskable-192.png'));

  // 4. icon-maskable-512.png (Maskable 512 with safe zone safe margin >= 15% on each side)
  const svgMaskable512 = Buffer.from(createSvg({ size: 512, padding: 128, bg: '#121214' }));
  await sharp(svgMaskable512).png().toFile(path.join(iconsDir, 'icon-maskable-512.png'));

  // 5. apple-touch-icon.png (180x180)
  const svgApple = Buffer.from(createSvg({ size: 180, padding: 34, bg: '#18181b' }));
  await sharp(svgApple).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 6. Favicons
  const svg32 = Buffer.from(createSvg({ size: 32, padding: 5, bg: '#18181b' }));
  await sharp(svg32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));

  const svg16 = Buffer.from(createSvg({ size: 16, padding: 2, bg: '#18181b' }));
  await sharp(svg16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));

  console.log('Successfully generated all PWA icons!');
}

generate().catch(console.error);
