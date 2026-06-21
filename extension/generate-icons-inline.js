/**
 * Generate icons inline — run with: node generate-icons-inline.js
 * Creates minimal valid 16x16, 48x48, and 128x128 PNGs.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function makePNG(w, h, rgbaFn) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  // IHDR
  const ihd = Buffer.alloc(13);
  ihd.writeUInt32BE(w,0); ihd.writeUInt32BE(h,4);
  ihd[8]=8; ihd[9]=6; ihd[10]=0; ihd[11]=0; ihd[12]=0;
  // Raw rows
  const raw = Buffer.alloc(h*(1+w*4));
  for(let y=0;y<h;y++){
    raw[y*(1+w*4)]=0;
    for(let x=0;x<w;x++){
      const c=rgbaFn(x,y,w,h);
      const o=y*(1+w*4)+1+x*4;
      raw[o]=c[0]; raw[o+1]=c[1]; raw[o+2]=c[2]; raw[o+3]=c[3];
    }
  }
  const comp=zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR',ihd), chunk('IDAT',comp), chunk('IEND',Buffer.alloc(0))]);
}

function chunk(t,d){
  const l=Buffer.alloc(4); l.writeUInt32BE(d.length);
  const tb=Buffer.from(t,'ascii');
  const c=crc32(Buffer.concat([tb,d]));
  const cb=Buffer.alloc(4); cb.writeUInt32BE(c);
  return Buffer.concat([l,tb,d,cb]);
}

function crc32(b){
  if(!crc32.t){crc32.t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);crc32.t[i]=c;}}
  let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crc32.t[(c^b[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0;
}

function dist(x1,y1,x2,y2){return Math.sqrt((x1-x2)**2+(y1-y2)**2);}

function iconPixel(x, y, w, h) {
  const s = w / 128;
  // Background: #1a1d27 with rounded corners
  const cornerR = 20 * s;
  const inBg = (() => {
    const cx = x < cornerR ? cornerR : (x >= w - cornerR ? w - cornerR - 1 : x);
    const cy = y < cornerR ? cornerR : (y >= h - cornerR ? h - cornerR - 1 : y);
    if (x < cornerR || x >= w - cornerR || y < cornerR || y >= h - cornerR) {
      return dist(x, y, cx, cy) <= cornerR;
    }
    return true;
  })();
  if (!inBg) return [0, 0, 0, 0];

  // Green circle: center (88s, 88s), radius 22s
  const circCx = 88 * s, circCy = 88 * s, circR = 22 * s;
  const dCirc = dist(x, y, circCx, circCy);
  if (dCirc <= circR) {
    // Checkmark inside
    const lx = (x - circCx) / s, ly = (y - circCy) / s;
    // Check arm 1: (-8,0) to (-2,7)
    const d1 = distToSeg(lx, ly, -8, 0, -2, 7);
    // Check arm 2: (-2,7) to (10,-6)
    const d2 = distToSeg(lx, ly, -2, 7, 10, -6);
    const checkW = 3.5;
    if (d1 <= checkW || d2 <= checkW) return [26, 29, 39, 255]; // dark on green
    return [52, 211, 153, 255]; // accent green
  }

  // Document rect: x=24s..80s, y=16s..96s with radius 6s
  const docX1 = 24*s, docY1 = 16*s, docX2 = 80*s, docY2 = 96*s, docR = 6*s;
  const inDoc = (() => {
    if (x < docX1 || x >= docX2 || y < docY1 || y >= docY2) return false;
    const rx = x - docX1, ry = y - docY1, dw = docX2 - docX1, dh = docY2 - docY1;
    if (rx < docR && ry < docR) return dist(rx, ry, docR, docR) <= docR;
    if (rx >= dw-docR && ry < docR) return dist(rx, ry, dw-docR-1, docR) <= docR;
    if (rx < docR && ry >= dh-docR) return dist(rx, ry, docR, dh-docR-1) <= docR;
    if (rx >= dw-docR && ry >= dh-docR) return dist(rx, ry, dw-docR-1, dh-docR-1) <= docR;
    return true;
  })();
  if (inDoc) {
    // Lines inside document
    const lineX1 = 34*s, lineThick = Math.max(1, Math.round(2.5*s));
    for (let i = 0; i < 4; i++) {
      const ly = Math.round((34 + i*14)*s);
      const lw = i === 3 ? 22*s : 36*s;
      if (y >= ly && y < ly + lineThick && x >= lineX1 && x < lineX1 + lw) {
        return [240, 240, 245, i === 3 ? 120 : 160];
      }
    }
    return [36, 40, 55, 255]; // #242837
  }

  return [26, 29, 39, 255]; // bg
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2-x1, dy = y2-y1;
  const lenSq = dx*dx + dy*dy;
  let t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / lenSq));
  const nx = x1 + t*dx, ny = y1 + t*dy;
  return Math.sqrt((px-nx)**2 + (py-ny)**2);
}

// Generate
const dir = path.join(__dirname, 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = makePNG(size, size, iconPixel);
  const fp = path.join(dir, `icon${size}.png`);
  fs.writeFileSync(fp, png);
  console.log(`${fp} (${png.length} bytes)`);
}
console.log('Icons generated.');
