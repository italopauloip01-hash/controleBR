// src/utils/sevenSegment.ts
var DIGIT_PATTERNS = [
  ["0", [1, 1, 1, 1, 1, 1, 0]],
  ["1", [0, 1, 1, 0, 0, 0, 0]],
  ["2", [1, 1, 0, 1, 1, 0, 1]],
  ["3", [1, 1, 1, 1, 0, 0, 1]],
  ["4", [0, 1, 1, 0, 0, 1, 1]],
  ["5", [1, 0, 1, 1, 0, 1, 1]],
  ["6", [1, 0, 1, 1, 1, 1, 1]],
  ["6", [0, 0, 1, 1, 1, 1, 1]],
  ["7", [1, 1, 1, 0, 0, 0, 0]],
  ["7", [1, 1, 1, 0, 0, 1, 0]],
  ["8", [1, 1, 1, 1, 1, 1, 1]],
  ["9", [1, 1, 1, 1, 0, 1, 1]],
  ["9", [1, 1, 1, 0, 0, 1, 1]]
];
var SEGMENT_REGIONS = [
  [0.3, 0.7, 0, 0.17],
  // a - topo
  [0.68, 1, 0.2, 0.4],
  // b - direita superior
  [0.68, 1, 0.6, 0.8],
  // c - direita inferior
  [0.3, 0.7, 0.83, 1],
  // d - base
  [0, 0.32, 0.6, 0.8],
  // e - esquerda inferior
  [0, 0.32, 0.2, 0.4],
  // f - esquerda superior
  [0.3, 0.7, 0.4, 0.6]
  // g - meio
];
var MAX_WORK_SIDE = 1100;
function imageDataFromCanvas(source) {
  const scale = Math.min(1, MAX_WORK_SIDE / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
function luminanceMap(img) {
  const { data, width, height } = img;
  const lum = new Float32Array(width * height);
  for (let i = 0, p = 0; p < lum.length; i += 4, p++) {
    lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return lum;
}
function backlitMask(img, tolerant) {
  const { data, width, height } = img;
  const minBright = tolerant ? 90 : 120, minSat = tolerant ? 0.15 : 0.3;
  const mask = new Uint8Array(width * height);
  for (let i = 0, p = 0; p < mask.length; i += 4, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max > minBright && (max - min) / max > minSat) mask[p] = 1;
  }
  return mask;
}
function dilate(mask, width, height, radius) {
  const tmp = new Uint8Array(mask.length);
  const out2 = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    let run = 0;
    for (let x = 0; x < width + radius; x++) {
      if (x < width && mask[y * width + x]) run = radius * 2 + 1;
      if (run > 0) {
        const tx = x - radius;
        if (tx >= 0 && tx < width) tmp[y * width + tx] = 1;
        run--;
      }
    }
    run = 0;
    for (let x = width - 1; x >= -radius; x--) {
      if (x >= 0 && mask[y * width + x]) run = radius + 1;
      if (run > 0 && x >= 0) tmp[y * width + x] = 1;
      if (run > 0) run--;
    }
  }
  for (let x = 0; x < width; x++) {
    let run = 0;
    for (let y = 0; y < height; y++) {
      if (tmp[y * width + x]) run = radius + 1;
      if (run > 0) {
        out2[y * width + x] = 1;
        run--;
      }
    }
    run = 0;
    for (let y = height - 1; y >= 0; y--) {
      if (tmp[y * width + x]) run = radius + 1;
      if (run > 0) {
        out2[y * width + x] = 1;
        run--;
      }
    }
  }
  return out2;
}
function connectedBoxes(mask, width, height) {
  const seen = new Uint8Array(mask.length);
  const boxes = [];
  const stack = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    let minX = width, minY = height, maxX = 0, maxY = 0, count = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % width, y = (p - x) / width;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const neighbors = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
      for (const n of neighbors) {
        if (n >= 0 && mask[n] && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, count });
  }
  return boxes;
}
function findDisplayBoxes(img, tolerant) {
  const { width, height } = img;
  const raw = backlitMask(img, tolerant);
  const radius = Math.max(1, Math.round(Math.min(width, height) / 300));
  const mask = dilate(raw, width, height, radius);
  const minSide = Math.min(width, height);
  return connectedBoxes(mask, width, height).filter((b) => {
    const aspect = b.w / b.h;
    const fill = b.count / (b.w * b.h);
    return b.w >= minSide * 0.06 && b.h >= minSide * 0.025 && aspect >= 1.3 && aspect <= 12 && fill >= 0.55;
  }).map(({ x, y, w, h }) => ({ x, y, w, h }));
}
function inkInside(img, lum, box) {
  const marginX = Math.round(box.w * 0.02), marginY = Math.round(box.h * 0.06);
  const x0 = box.x + marginX, y0 = box.y + marginY;
  const w = box.w - marginX * 2, h = box.h - marginY * 2;
  if (w < 10 || h < 6) return null;
  const values = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) values.push(lum[(y0 + y) * img.width + x0 + x]);
  const sorted = [...values].sort((a, b) => a - b);
  const bright = sorted[Math.floor(sorted.length * 0.85)];
  const dark = sorted[Math.floor(sorted.length * 0.05)];
  if (bright - dark < 30) return null;
  const threshold = dark + (bright - dark) * 0.5;
  const ink = new Uint8Array(w * h);
  values.forEach((v, i) => {
    if (v < threshold) ink[i] = 1;
  });
  removeBorderInk(ink, w, h);
  return { ink, w, h };
}
function removeBorderInk(ink, w, h) {
  const stack = [];
  const push = (p) => {
    if (ink[p]) {
      ink[p] = 0;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w, y = (p - x) / w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }
}
function digitBand(grid) {
  const rows = new Array(grid.h).fill(0);
  for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) rows[y] += grid.ink[y * grid.w + x];
  const active = rows.map((c) => c > grid.w * 0.03);
  let best = null;
  let start = -1, gap = 0;
  for (let y = 0; y <= grid.h; y++) {
    if (y < grid.h && active[y]) {
      if (start < 0) start = y;
      gap = 0;
    } else if (start >= 0) {
      gap++;
      if (gap > Math.max(1, grid.h * 0.04) || y === grid.h) {
        const end = y - gap;
        if (!best || end - start > best[1] - best[0]) best = [start, end];
        start = -1;
        gap = 0;
      }
    }
  }
  return best && best[1] - best[0] >= grid.h * 0.3 ? best : null;
}
function deskew(grid, top, bottom) {
  const bandH = bottom - top + 1;
  let bestShear = 0, bestScore = Infinity;
  for (let s = -0.35; s <= 0.351; s += 0.05) {
    const cols = /* @__PURE__ */ new Set();
    for (let y = top; y <= bottom; y++) {
      const offset = Math.round(s * (bottom - y));
      for (let x = 0; x < grid.w; x++) if (grid.ink[y * grid.w + x]) cols.add(x - offset);
    }
    if (cols.size < bestScore) {
      bestScore = cols.size;
      bestShear = s;
    }
  }
  const pad = Math.ceil(Math.abs(bestShear) * bandH);
  const w = grid.w + pad;
  const ink = new Uint8Array(w * bandH);
  for (let y = top; y <= bottom; y++) {
    const shift = Math.round(bestShear * (bottom - y));
    for (let x = 0; x < grid.w; x++) {
      if (!grid.ink[y * grid.w + x]) continue;
      const nx = x - shift + (bestShear > 0 ? pad : 0);
      if (nx >= 0 && nx < w) ink[(y - top) * w + nx] = 1;
    }
  }
  return { ink, w, h: bandH };
}
function classifyDigit(grid, x0, x1) {
  const fractions = SEGMENT_REGIONS.map(([rx0, rx1, ry0, ry1]) => {
    const sx = Math.floor(x0 + (x1 - x0 + 1) * rx0), ex = Math.ceil(x0 + (x1 - x0 + 1) * rx1);
    const sy = Math.floor(grid.h * ry0), ey = Math.ceil(grid.h * ry1);
    let on = 0, total = 0;
    for (let y = sy; y < ey; y++) for (let x = sx; x < ex; x++) {
      total++;
      on += grid.ink[y * grid.w + x];
    }
    return total ? on / total : 0;
  });
  const ref = Math.max(0.15, [...fractions].sort((a, b) => b - a)[1]);
  const level = fractions.map((f) => Math.min(1, f / ref));
  let best = { char: "?", cost: Infinity }, second = Infinity;
  for (const [char, pattern] of DIGIT_PATTERNS) {
    const cost = pattern.reduce((c, on, i) => c + (on ? 1 - level[i] : level[i]), 0);
    if (cost < best.cost) {
      if (best.char !== char) second = best.cost;
      best = { char, cost };
    } else if (char !== best.char && cost < second) {
      second = cost;
    }
  }
  if (best.cost > 2) return { char: "?", confidence: 0 };
  const margin = Math.min(1, (second - best.cost) / 1.5);
  return { char: best.char, confidence: Math.max(0, 1 - best.cost / 3.5) * (0.5 + margin / 2) };
}
function readDisplay(grid) {
  const band = digitBand(grid);
  if (!band) return null;
  const g = deskew(grid, band[0], band[1]);
  const cols = new Array(g.w).fill(0);
  const bottomCols = new Array(g.w).fill(0);
  const colMin = new Array(g.w).fill(g.h), colMax = new Array(g.w).fill(-1);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (!g.ink[y * g.w + x]) continue;
    cols[x]++;
    if (y > g.h * 0.75) bottomCols[x]++;
    if (y < colMin[x]) colMin[x] = y;
    if (y > colMax[x]) colMax[x] = y;
  }
  const groups = [];
  for (let x = 0; x < g.w; x++) {
    if (cols[x] < Math.max(1, g.h * 0.06)) continue;
    const last = groups[groups.length - 1];
    if (last && x - last.x1 <= 1) {
      last.x1 = x;
      last.ink += cols[x];
      last.bottomInk += bottomCols[x];
      last.yMin = Math.min(last.yMin, colMin[x]);
      last.yMax = Math.max(last.yMax, colMax[x]);
    } else {
      groups.push({ x0: x, x1: x, ink: cols[x], bottomInk: bottomCols[x], yMin: colMin[x], yMax: colMax[x] });
    }
  }
  if (groups.length === 0) return null;
  const wide = groups.map((gr) => gr.x1 - gr.x0 + 1).filter((w) => w > g.h * 0.3).sort((a, b) => a - b);
  const digitWidth = wide.length ? wide[Math.floor(wide.length / 2)] : g.h * 0.55;
  let text = "";
  const confidences = [];
  for (const gr of groups) {
    const width = gr.x1 - gr.x0 + 1;
    const onlyBottom = gr.bottomInk >= gr.ink * 0.8;
    if (onlyBottom && width < digitWidth * 0.5) {
      text += ".";
    } else if (width < digitWidth * 0.5) {
      if (gr.ink >= g.h * 0.45 && gr.yMax - gr.yMin >= g.h * 0.6) {
        text += "1";
        confidences.push(0.85);
      }
    } else if (width > digitWidth * 1.6) {
      const mid = Math.round((gr.x0 + gr.x1) / 2);
      for (const [a, b] of [[gr.x0, mid], [mid + 1, gr.x1]]) {
        const d = classifyDigit(g, a, b);
        text += d.char;
        confidences.push(d.confidence * 0.8);
      }
    } else {
      const d = classifyDigit(g, gr.x0, gr.x1);
      text += d.char;
      confidences.push(d.confidence);
    }
  }
  const digits = text.replace(/[^0-9]/g, "");
  if (digits.length === 0) return null;
  const confidence = confidences.reduce((a, b) => a + b, 0) / Math.max(1, confidences.length);
  return { text: text.replace(/^\.+|\.+$/g, ""), confidence };
}
function readSevenSegmentDisplays(img) {
  const lum = luminanceMap(img);
  const read = (tolerant) => {
    const readings2 = [];
    for (const box of findDisplayBoxes(img, tolerant)) {
      const grid = inkInside(img, lum, box);
      if (!grid) continue;
      const result = readDisplay(grid);
      if (result) readings2.push({ ...result, box });
    }
    return readings2;
  };
  let readings = read(false);
  if (!readings.some((r) => r.confidence >= 0.5 && r.text.replace(/\D/g, "").length >= 3)) {
    readings = [...readings, ...read(true)];
  }
  return readings.sort((a, b) => a.box.y - b.box.y);
}

// src/utils/fuelDisplayParser.ts
var MIN_CONFIDENCE = 0.35;
var RANGES = {
  total: [3, 3e3],
  litros: [0.3, 250],
  preco: [1.5, 15]
};
function cleanDisplays(displays) {
  return displays.filter((d) => d.confidence >= MIN_CONFIDENCE && !d.text.includes("?") && d.text.replace(/\D/g, "").length >= 2);
}
function candidates(text) {
  const digits = text.replace(/\D/g, "");
  if (digits.length < 2 || digits.length > 7) return [];
  const list = [];
  const dot = text.lastIndexOf(".");
  if (dot > 0) list.push({ value: parseFloat(`${text.slice(0, dot).replace(/\D/g, "")}.${text.slice(dot + 1).replace(/\D/g, "")}`), explicit: true });
  for (const decimals of [0, 1, 2, 3]) list.push({ value: parseInt(digits, 10) / 10 ** decimals, explicit: false });
  return list;
}
var inRange = (v, [min, max]) => v >= min && v <= max;
function parsePumpDisplays(raw) {
  const displays = cleanDisplays(raw).sort((a, b) => a.box.y - b.box.y);
  let best = null;
  displays.forEach((dt, it) => displays.forEach((dl, il) => displays.forEach((dp, ip) => {
    if (it === il || it === ip || il === ip) return;
    for (const t of candidates(dt.text)) {
      if (!inRange(t.value, RANGES.total)) continue;
      for (const l of candidates(dl.text)) {
        if (!inRange(l.value, RANGES.litros)) continue;
        for (const p of candidates(dp.text)) {
          if (!inRange(p.value, RANGES.preco)) continue;
          const err = Math.abs(l.value * p.value - t.value);
          if (err > Math.max(0.06, t.value * 6e-3)) continue;
          const orderPenalty = it < il && il < ip ? 0 : 0.6;
          const explicitBonus = [t, l, p].filter((c) => c.explicit).length * 0.1;
          const confidence = (dt.confidence + dl.confidence + dp.confidence) / 3;
          const score = err / t.value * 50 + orderPenalty - explicitBonus - confidence;
          if (!best || score < best.score) best = { score, t: t.value, l: l.value, p: p.value };
        }
      }
    }
  })));
  if (best) {
    const b = best;
    return { total: +b.t.toFixed(2), litros: +b.l.toFixed(3), preco: +b.p.toFixed(3), validated: true };
  }
  if (displays.length < 3) return { total: null, litros: null, preco: null, validated: false };
  const pick = (d, decimals, range) => {
    if (!d) return null;
    const explicit = candidates(d.text).find((c) => c.explicit && inRange(c.value, range));
    if (explicit) return explicit.value;
    const typical = parseInt(d.text.replace(/\D/g, ""), 10) / 10 ** decimals;
    return inRange(typical, range) ? typical : null;
  };
  const [top, middle, bottom] = displays;
  const result = {
    total: pick(top, 2, RANGES.total),
    litros: pick(middle, 3, RANGES.litros),
    preco: pick(bottom, 3, RANGES.preco),
    validated: false
  };
  if (result.litros == null && result.total != null && result.preco) result.litros = +(result.total / result.preco).toFixed(3);
  if (result.total == null && result.litros != null && result.preco != null) result.total = +(result.litros * result.preco).toFixed(2);
  return result;
}
function parseOdometerDisplays(raw, lastMileage) {
  const values = cleanDisplays(raw).map((d) => ({ value: parseInt(d.text.split(".")[0].replace(/\D/g, ""), 10), digits: d.text.split(".")[0].replace(/\D/g, "").length, confidence: d.confidence })).filter((v) => v.digits >= 3 && v.digits <= 7 && !isNaN(v.value));
  if (values.length === 0) return null;
  if (lastMileage > 0) {
    const plausible = values.filter((v) => v.value >= lastMileage && v.value <= lastMileage + 5e3).sort((a, b) => a.value - b.value);
    if (plausible.length > 0) return plausible[0].value;
  }
  const valid = values.filter((v) => lastMileage <= 0 || v.value >= lastMileage);
  if (valid.length === 0) return null;
  valid.sort((a, b) => b.digits - a.digits || b.confidence - a.confidence);
  return valid[0].value;
}
function parseFuelDisplays(pump, dash, lastMileage = 0) {
  const notes = [];
  let pumpResult = parsePumpDisplays(pump);
  let odometerSource = dash;
  if (!pumpResult.validated) {
    const swapped = parsePumpDisplays(dash);
    if (swapped.validated) {
      pumpResult = swapped;
      odometerSource = pump;
      notes.push("as fotos estavam na ordem invertida, j\xE1 corrigi");
    }
  }
  const odometro_km = parseOdometerDisplays(odometerSource, lastMileage);
  if (pumpResult.total != null && !pumpResult.validated) notes.push("n\xE3o consegui confirmar litros \xD7 pre\xE7o = total");
  if (odometro_km != null && lastMileage > 0 && (odometro_km < lastMileage || odometro_km > lastMileage + 5e3)) {
    notes.push("KM fora do esperado pelo hist\xF3rico");
  }
  return {
    odometro_km,
    litros: pumpResult.litros,
    valor_total: pumpResult.total,
    preco_litro: pumpResult.preco,
    observacoes: notes.join("; ")
  };
}

// src/utils/fuelPhotoReader.ts
async function loadCanvas(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}
function photoDate(files) {
  const timestamps = files.map((f) => f.lastModified).filter((ts) => ts > 0 && ts <= Date.now());
  if (timestamps.length === 0) return null;
  const d = new Date(Math.min(...timestamps));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
async function readFuelPhotos({ pump, dash }, lastMileage = 0) {
  const pumpDisplays = readSevenSegmentDisplays(imageDataFromCanvas(await loadCanvas(pump)));
  const dashDisplays = readSevenSegmentDisplays(imageDataFromCanvas(await loadCanvas(dash)));
  return { ...parseFuelDisplays(pumpDisplays, dashDisplays, lastMileage), data_foto: photoDate([pump, dash]) };
}

// public/ocr-test/entry.ts
var out = document.getElementById("out");
var load = async (url, name, type) => new File([await (await fetch(url)).blob()], name, { type });
(async () => {
  out.textContent = "";
  const files = { pump: await load("bomba.png", "bomba.png", "image/png"), dash: await load("painel.webp", "painel.webp", "image/webp") };
  for (const last of [0, 131650, 125e3]) {
    const t0 = performance.now();
    const r = await readFuelPhotos(files, last);
    out.textContent += `ultimo KM=${last} (${(performance.now() - t0).toFixed(0)}ms): ${JSON.stringify(r)}
`;
  }
  const swapped = await readFuelPhotos({ pump: files.dash, dash: files.pump }, 131650);
  out.textContent += `fotos trocadas: ${JSON.stringify(swapped)}
`;
  const twoPumps = await readFuelPhotos({ pump: files.dash, dash: files.dash }, 131650);
  out.textContent += `painel 2x (sem bomba): ${JSON.stringify(twoPumps)}
`;
  const twoDash = await readFuelPhotos({ pump: files.pump, dash: files.pump }, 131650);
  out.textContent += `bomba 2x (sem painel): ${JSON.stringify(twoDash)}
`;
  window.__done = true;
})();
