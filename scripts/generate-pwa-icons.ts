import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function generatePng(size: number, isMaskable = false): Buffer {
  const width = size;
  const height = size;
  const rawBytes = Buffer.alloc(height * (1 + width * 4));

  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width * 0.35 : width * 0.42;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background gradient (Dark futuristic carbon `#07070a` to `#160a12`)
      const grad = (y / height) * 0.5 + (x / width) * 0.5;
      let r = Math.round(7 + grad * 15);
      let g = Math.round(7 + grad * 6);
      let b = Math.round(10 + grad * 12);
      let a = 255;

      // Outer glowing ring
      if (dist < radius + 8 && dist > radius - 16) {
        const ringDist = Math.abs(dist - (radius - 4));
        const glow = Math.max(0, 1 - ringDist / 12);
        r = Math.min(255, Math.round(r + glow * 230));
        g = Math.min(255, Math.round(g + glow * 40));
        b = Math.min(255, Math.round(b + glow * 60));
      }

      // Disc surface
      if (dist <= radius) {
        // Grooves
        const groove = Math.sin(dist * 0.6) * 0.5 + 0.5;
        r = Math.min(255, Math.round(r + 15 + groove * 25));
        g = Math.min(255, Math.round(g + 5 + groove * 10));
        b = Math.min(255, Math.round(b + 10 + groove * 15));
      }

      // Inner Red Neon Record Label
      const labelRadius = radius * 0.42;
      if (dist <= labelRadius) {
        // Vibrant Crimson Gradient
        r = 225;
        g = 29;
        b = 72;
      }

      // Center Spindle Hole
      const holeRadius = radius * 0.12;
      if (dist <= holeRadius) {
        r = 7;
        g = 7;
        b = 10;
      }

      // Music note / Play triangle in the middle ring
      if (dist > holeRadius + 2 && dist < labelRadius - 4) {
        // Play triangle centered
        const tx = dx + 3;
        const ty = dy;
        const inTriangle = tx >= -labelRadius * 0.3 && tx <= labelRadius * 0.35 && Math.abs(ty) <= (labelRadius * 0.35 - tx * 0.6);
        if (inTriangle) {
          r = 255;
          g = 255;
          b = 255;
        }
      }

      rawBytes[offset++] = r;
      rawBytes[offset++] = g;
      rawBytes[offset++] = b;
      rawBytes[offset++] = a;
    }
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawBytes, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
console.log('Generating PWA Icons...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(32));

// SVG Icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e0a14"/>
      <stop offset="100%" stop-color="#08080a"/>
    </radialGradient>
    <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff1744"/>
      <stop offset="100%" stop-color="#e11d48"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="190" fill="#0f0f14" stroke="#252530" stroke-width="4"/>
  <circle cx="256" cy="256" r="160" fill="none" stroke="#1c1c24" stroke-width="2"/>
  <circle cx="256" cy="256" r="130" fill="none" stroke="#1c1c24" stroke-width="2"/>
  <circle cx="256" cy="256" r="100" fill="none" stroke="#1c1c24" stroke-width="2"/>
  <circle cx="256" cy="256" r="80" fill="url(#neon)" filter="url(#glow)"/>
  <circle cx="256" cy="256" r="22" fill="#08080a"/>
  <polygon points="244,232 278,256 244,280" fill="#ffffff"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg, 'utf-8');

console.log('PWA icons created successfully in public/');
