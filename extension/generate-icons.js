/**
 * Generate PNG icons for ResumeATS-X extension.
 * Creates minimal valid PNG files with a document+checkmark design.
 *
 * Run: node generate-icons.js
 */
const fs = require('fs');
const path = require('path');

// --- Minimal PNG encoder (no dependencies) ---

function createPNG(width, height, pixels) {
  // pixels is a Uint8Array of RGBA data (width * height * 4 bytes)

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT chunk — raw pixel data with filter byte per row
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      rawData[dstIdx]     = pixels[srcIdx];
      rawData[dstIdx + 1] = pixels[srcIdx + 1];
      rawData[dstIdx + 2] = pixels[srcIdx + 2];
      rawData[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuffer, data, crcBuffer]);
}

// CRC32 for PNG
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// --- Drawing helpers ---

function setPixel(pixels, width, x, y, r, g, b, a = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const idx = (y * width + x) * 4;
  // Alpha blending
  const srcA = a / 255;
  const dstA = pixels[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;
  pixels[idx]     = Math.round((r * srcA + pixels[idx] * dstA * (1 - srcA)) / outA);
  pixels[idx + 1] = Math.round((g * srcA + pixels[idx + 1] * dstA * (1 - srcA)) / outA);
  pixels[idx + 2] = Math.round((b * srcA + pixels[idx + 2] * dstA * (1 - srcA)) / outA);
  pixels[idx + 3] = Math.round(outA * 255);
}

function fillRect(pixels, width, x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(pixels, width, x + dx, y + dy, r, g, b, a);
    }
  }
}

function fillCircle(pixels, width, cx, cy, radius, r, g, b, a = 255) {
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= r2) {
        setPixel(pixels, width, cx + dx, cy + dy, r, g, b, a);
      }
    }
  }
}

function fillRoundedRect(pixels, size, x, y, w, h, rad, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      let inside = true;
      // Check corners
      if (dx < rad && dy < rad) {
        inside = (dx - rad) ** 2 + (dy - rad) ** 2 <= rad ** 2;
      } else if (dx >= w - rad && dy < rad) {
        inside = (dx - (w - rad - 1)) ** 2 + (dy - rad) ** 2 <= rad ** 2;
      } else if (dx < rad && dy >= h - rad) {
        inside = (dx - rad) ** 2 + (dy - (h - rad - 1)) ** 2 <= rad ** 2;
      } else if (dx >= w - rad && dy >= h - rad) {
        inside = (dx - (w - rad - 1)) ** 2 + (dy - (h - rad - 1)) ** 2 <= rad ** 2;
      }
      if (inside) {
        setPixel(pixels, size, x + dx, y + dy, r, g, b, a);
      }
    }
  }
}

function drawLine(pixels, width, x0, y0, x1, y1, thickness, r, g, b, a = 255) {
  const dist = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
  const steps = Math.ceil(dist * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x0 + (x1 - x0) * t;
    const cy = y0 + (y1 - y0) * t;
    fillCircle(pixels, width, Math.round(cx), Math.round(cy), Math.floor(thickness / 2), r, g, b, a);
  }
}

// --- Icon generation ---

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4); // starts transparent

  // Colors
  const bg     = [26, 29, 39];    // #1a1d27
  const accent = [52, 211, 153];  // #34d399
  const white  = [240, 240, 245]; // #f0f0f5
  const dim    = [36, 40, 55];    // #242837

  const s = size / 128; // scale factor

  // Background rounded rect
  fillRoundedRect(pixels, size, 0, 0, size, size, Math.round(20 * s), ...bg);

  // Document body
  const docX = Math.round(24 * s);
  const docY = Math.round(16 * s);
  const docW = Math.round(56 * s);
  const docH = Math.round(80 * s);
  const docR = Math.round(6 * s);
  fillRoundedRect(pixels, size, docX, docY, docW, docH, docR, ...dim);

  // Document lines
  const lineThick = Math.max(1, Math.round(2.5 * s));
  const lineColors = [...white, 180];
  const lineStartX = Math.round(34 * s);
  const lineW = Math.round(36 * s);

  for (let i = 0; i < 4; i++) {
    const ly = Math.round((34 + i * 14) * s);
    const lw = i === 3 ? Math.round(22 * s) : lineW;
    fillRect(pixels, size, lineStartX, ly, lw, lineThick, ...white, i === 3 ? 120 : 160);
  }

  // Green circle (bottom-right)
  const circR = Math.round(22 * s);
  const circX = Math.round(88 * s);
  const circY = Math.round(88 * s);
  fillCircle(pixels, size, circX, circY, circR, ...accent);

  // Checkmark inside circle
  const checkThick = Math.max(1, Math.round(4 * s));
  const cx = circX;
  const cy = circY;
  drawLine(pixels, size,
    cx - Math.round(8 * s), cy,
    cx - Math.round(2 * s), cy + Math.round(7 * s),
    checkThick, ...bg
  );
  drawLine(pixels, size,
    cx - Math.round(2 * s), cy + Math.round(7 * s),
    cx + Math.round(10 * s), cy - Math.round(6 * s),
    checkThick, ...bg
  );

  return createPNG(size, size, pixels);
}

// --- Main ---
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of [16, 48, 128]) {
  const png = generateIcon(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${png.length} bytes)`);
}

console.log('Done! Icons generated.');
