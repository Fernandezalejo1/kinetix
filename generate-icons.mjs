/**
 * KINETIX PWA Icon Generator
 * Generates icon-192.png and icon-512.png using pure Node.js (no dependencies)
 * Uses a cyan lightning bolt (⚡) on dark background matching the app theme
 */
import { writeFileSync } from 'fs';
import { deflateRawSync } from 'zlib';

// Color palette matching KINETIX theme
const BG_COLOR = [10, 10, 10];       // #0a0a0a (neutral-950)
const BOLT_COLOR = [34, 211, 238];   // #22d3ee (cyan-400)
const GLOW_COLOR = [20, 180, 200];   // Slightly darker cyan for glow effect
const BORDER_COLOR = [34, 211, 238, 60]; // Semi-transparent cyan border

function createPNG(width, height, pixels) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Build raw image data with filter bytes
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      raw[dstIdx] = pixels[srcIdx];
      raw[dstIdx + 1] = pixels[srcIdx + 1];
      raw[dstIdx + 2] = pixels[srcIdx + 2];
      raw[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  return { signature, ihdr, raw };
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function generateIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.42;
  const borderRadius = size * 0.18;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // Rounded rectangle background
      const inRoundedRect = isInsideRoundedRect(x, y, size, size, borderRadius);
      
      // Circle glow behind bolt
      const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const inGlow = distFromCenter < radius * 0.6;
      const glowIntensity = Math.max(0, 1 - distFromCenter / (radius * 0.6));
      
      // Lightning bolt shape
      const inBolt = isInsideLightningBolt(x, y, size);
      
      // Border ring
      const inBorder = isInsideBorderRing(x, y, size, borderRadius);
      
      if (inRoundedRect) {
        if (inBolt) {
          // Cyan bolt
          pixels[idx] = BOLT_COLOR[0];
          pixels[idx + 1] = BOLT_COLOR[1];
          pixels[idx + 2] = BOLT_COLOR[2];
          pixels[idx + 3] = 255;
        } else if (inGlow) {
          // Subtle glow
          const a = Math.floor(glowIntensity * 40);
          pixels[idx] = GLOW_COLOR[0];
          pixels[idx + 1] = GLOW_COLOR[1];
          pixels[idx + 2] = GLOW_COLOR[2];
          pixels[idx + 3] = a;
        } else {
          // Dark background
          pixels[idx] = BG_COLOR[0];
          pixels[idx + 1] = BG_COLOR[1];
          pixels[idx + 2] = BG_COLOR[2];
          pixels[idx + 3] = 255;
        }
      } else if (inBorder) {
        // Cyan border with anti-aliasing
        const borderDist = getRoundedRectBorderDistance(x, y, size, size, borderRadius);
        const alpha = Math.min(255, Math.floor((1 - borderDist) * 255 * 0.4));
        pixels[idx] = BOLT_COLOR[0];
        pixels[idx + 1] = BOLT_COLOR[1];
        pixels[idx + 2] = BOLT_COLOR[2];
        pixels[idx + 3] = alpha;
      } else {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }
  
  return pixels;
}

function isInsideRoundedRect(x, y, w, h, r) {
  if (x < r || x > w - r) {
    if (y < r || y > h - r) {
      // Corner regions
      const corners = [
        [r, r], [w - r, r], [r, h - r], [w - r, h - r]
      ];
      for (const [cx, cy] of corners) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= r) return true;
      }
      return false;
    }
    return false;
  }
  return y >= 0 && y <= h;
}

function isInsideBorderRing(x, y, w, h, r) {
  // A ring just outside the rounded rect
  const borderWidth = Math.max(2, w * 0.02);
  const outerR = r + borderWidth;
  
  // Check if inside the outer rounded rect but outside the inner
  return isInsideRoundedRectFull(x, y, w, h, outerR) && !isInsideRoundedRectFull(x, y, w, h, r - 1);
}

function isInsideRoundedRectFull(x, y, w, h, r) {
  // Simple rounded rect check
  if (x < 0 || x > w || y < 0 || y > h) return false;
  
  const nx = Math.max(0, Math.min(r, x < w - x ? x : w - x));
  const ny = Math.max(0, Math.min(r, y < h - y ? y : h - y));
  
  if (x >= r && x <= w - r) return true;
  if (y >= r && y <= h - r) return true;
  
  const dx = x < w / 2 ? x - r : (w - r) - x;
  const dy = y < h / 2 ? y - r : (h - r) - y;
  
  return (x >= r && x <= w - r) || (y >= r && y <= h - r) || 
    Math.sqrt(Math.max(0, dx) ** 2 + Math.max(0, dy) ** 2) <= r;
}

function getRoundedRectBorderDistance(x, y, w, h, r) {
  // Simplified distance from rounded rect edge
  const inset = 0.01;
  if (isInsideRoundedRectFull(x, y, w, h, r - inset)) return 1;
  if (isInsideRoundedRectFull(x, y, w, h, r + inset)) return 0;
  return 0.5;
}

function isInsideLightningBolt(px, py, size) {
  // Normalize coordinates to 0-1 range
  const x = px / size;
  const y = py / size;
  
  // Lightning bolt defined as a polygon
  // The bolt is centered and proportional
  const bolt = [
    [0.52, 0.15],  // top tip
    [0.32, 0.47],  // left notch  
    [0.48, 0.47],  // inner left
    [0.42, 0.55],  // middle point (waist)
    [0.38, 0.55],  // inner right waist
    [0.55, 0.85],  // bottom tip
    [0.72, 0.43],  // right side
    [0.54, 0.43],  // inner right
    [0.58, 0.35],  // middle point (upper waist)
    [0.62, 0.35],  // inner upper right
  ];
  
  return pointInPolygon(x, y, bolt);
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function savePNG(path, width, height, pixels) {
  const { signature, ihdr, raw } = createPNG(width, height, pixels);
  const compressed = deflateRawSync(raw);
  
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  writeFileSync(path, png);
  console.log(`✅ Generated ${path} (${width}x${height}, ${png.length} bytes)`);
}

// Generate both sizes
const size192 = generateIcon(192);
savePNG('public/icon-192.png', 192, 192, size192);

const size512 = generateIcon(512);
savePNG('public/icon-512.png', 512, 512, size512);

console.log('\n🎉 PWA icons generated successfully!');
console.log('Icons are referenced in public/manifest.json');
