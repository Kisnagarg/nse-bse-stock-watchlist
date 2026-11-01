/**
 * Icon generator for Chrome Extension.
 * Generates crisp TradingView-style PNG icons (sizes 16, 32, 48, 128) using pure Node.js zlib.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(size, bgColor, fgColor) {
  // Width and height: size
  const width = size;
  const height = size;

  // Buffer for RGBA pixels
  // Each row starts with filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const radius = Math.floor(size * 0.2); // rounded corner radius

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Check rounded corner distance
      let inside = true;
      const dx = Math.min(x, width - 1 - x);
      const dy = Math.min(y, height - 1 - y);
      if (dx < radius && dy < radius) {
        const dist = Math.hypot(radius - dx, radius - dy);
        if (dist > radius) inside = false;
      }

      if (!inside) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Draw stylized "SO" or "TV" chart bar pattern
      // Bar 1: x from 25% to 40%, y from 40% to 80%
      // Bar 2: x from 45% to 60%, y from 25% to 80%
      // Bar 3: x from 65% to 80%, y from 50% to 80%
      const nx = x / width;
      const ny = y / height;

      const isBar1 = nx >= 0.22 && nx <= 0.38 && ny >= 0.45 && ny <= 0.78;
      const isBar2 = nx >= 0.42 && nx <= 0.58 && ny >= 0.22 && ny <= 0.78;
      const isBar3 = nx >= 0.62 && nx <= 0.78 && ny >= 0.35 && ny <= 0.78;

      if (isBar1 || isBar2 || isBar3) {
        // Foreground bar
        rawData[pxOffset] = fgColor[0];
        rawData[pxOffset + 1] = fgColor[1];
        rawData[pxOffset + 2] = fgColor[2];
        rawData[pxOffset + 3] = 255;
      } else {
        // Background
        rawData[pxOffset] = bgColor[0];
        rawData[pxOffset + 1] = bgColor[1];
        rawData[pxOffset + 2] = bgColor[2];
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // Helper to make PNG chunk
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);

    const toCrc = Buffer.concat([typeBuf, data]);
    const crcVal = crc32(toCrc);
    crcBuf.writeUInt32BE(crcVal, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // CRC32 table & calc
  function crc32(buf) {
    let table = crc32.table;
    if (!table) {
      table = crc32.table = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
          c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c >>> 0;
      }
    }

    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Background: #2962ff (TradingView Blue), Foreground: #ffffff
const bg = [41, 98, 255];
const fg = [255, 255, 255];

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = createPng(size, bg, fg);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${size}x${size}, ${png.length} bytes)`);
}

