// html/phys-gravitation.html の描画レイアウト(scripts/phys-gravitation-layout.mjs)が、
// ラベル・矢印・軸目盛りのテキストのあらゆる組み合わせで重ならないかを検査する。
// 実装(HTML)とチェックで計算式が食い違わないよう、レイアウト計算そのものを
// phys-gravitation-layout.mjs からimportして使う(再実装しない)。
//
// 検査する4種類:
//   1. 矢印の線分 × ラベル矩形
//   2. 矢印の矢じり(三角形) × ラベル矩形
//   3. ラベル × ラベル
//   4. ラベル × 軸目盛りのテキスト
//
// 対象はLAW・CIRCULAR ORBIT・ELLIPTICAL ORBIT・ENERGY & ESCAPE VELOCITYの4シーン。
// KEPLER'S THIRD LAW(ケプラー第3法則)は太陽系惑星の実データをHTML側のDOM表として
// そのまま見せるだけで、vector-diagram-engine.mjsのSVG矢印・ラベルを一切使わないため、
// この検査の対象に含めない(phys-gravitation-layout.mjs側にもレイアウト関数がない)。
//
// Node標準機能のみ。依存パッケージなし。
//   node scripts/check-phys-gravitation-overlaps.mjs

import {
  BODIES,
  computeLawLayout,
  computeCircularOrbitLayout,
  computeEllipticalOrbitLayout,
  computeEnergyLayout,
  gravForce,
  firstCosmicVelocity,
} from "./phys-gravitation-layout.mjs";

/* ---------- 幾何: 矩形×矩形 ---------- */
function rectsOverlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/* ---------- 幾何: 線分×矩形(Liang-Barsky法によるクリッピング判定) ---------- */
function segRectIntersect(x1, y1, x2, y2, rect) {
  let t0 = 0,
    t1 = 1;
  const dx = x2 - x1,
    dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rect.x0, rect.x1 - x1, y1 - rect.y0, rect.y1 - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
}

/* ---------- 幾何: 凸多角形×凸多角形(SAT。矢じり三角形×ラベル矩形に使う) ---------- */
function rectToPoly(rect) {
  return [
    { x: rect.x0, y: rect.y0 },
    { x: rect.x1, y: rect.y0 },
    { x: rect.x1, y: rect.y1 },
    { x: rect.x0, y: rect.y1 },
  ];
}
function convexPolysOverlap(polyA, polyB) {
  for (const poly of [polyA, polyB]) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const normal = { x: -(p2.y - p1.y), y: p2.x - p1.x };
      let minA = Infinity,
        maxA = -Infinity,
        minB = Infinity,
        maxB = -Infinity;
      for (const p of polyA) {
        const proj = p.x * normal.x + p.y * normal.y;
        minA = Math.min(minA, proj);
        maxA = Math.max(maxA, proj);
      }
      for (const p of polyB) {
        const proj = p.x * normal.x + p.y * normal.y;
        minB = Math.min(minB, proj);
        maxB = Math.max(maxB, proj);
      }
      if (maxA < minB || maxB < minA) return false;
    }
  }
  return true;
}

/* ---------- 1つのレイアウトについて4種類の交差(+はみ出し)を検査する ---------- */
function checkLayout(layout, context) {
  const problems = [];
  const labels = layout.arrows.map((a) => a.label).concat(layout.readout ? [layout.readout] : []);
  const ticks = layout.axisTicks || [];

  for (const arrow of layout.arrows) {
    for (const label of labels) {
      if (segRectIntersect(arrow.geo.x1, arrow.geo.y1, arrow.geo.x2, arrow.geo.y2, label.box)) {
        problems.push(`[線分×ラベル] 矢印${arrow.id} × ラベル"${label.text}"`);
      }
    }
  }

  for (const arrow of layout.arrows) {
    for (const label of labels) {
      if (convexPolysOverlap(arrow.geo.head, rectToPoly(label.box))) {
        problems.push(`[矢じり×ラベル] 矢印${arrow.id}の矢じり × ラベル"${label.text}"`);
      }
    }
  }

  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (rectsOverlap(labels[i].box, labels[j].box)) {
        problems.push(`[ラベル×ラベル] "${labels[i].text}" × "${labels[j].text}"`);
      }
    }
  }

  for (const label of labels) {
    for (const tick of ticks) {
      if (rectsOverlap(label.box, tick.box)) {
        problems.push(`[ラベル×軸目盛り] "${label.text}" × 目盛り"${tick.text}"`);
      }
    }
  }

  // 付帯チェック: 矢印・ラベルがステージ(viewBox)の外にはみ出していないか
  const { w, h } = layout.box;
  for (const arrow of layout.arrows) {
    for (const p of [{ x: arrow.geo.x1, y: arrow.geo.y1 }, { x: arrow.geo.x2, y: arrow.geo.y2 }, ...arrow.geo.head]) {
      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
        problems.push(`[はみ出し] 矢印${arrow.id}の座標(${p.x.toFixed(1)},${p.y.toFixed(1)})がステージ外`);
      }
    }
  }
  for (const label of labels) {
    if (label.box.x0 < 0 || label.box.x1 > w || label.box.y0 < 0 || label.box.y1 > h) {
      problems.push(`[はみ出し] ラベル"${label.text}"がステージ外(${JSON.stringify(label.box)})`);
    }
  }

  if (problems.length) {
    return [`${context}: ${problems.length}件`, ...problems.map((p) => `  ${p}`)];
  }
  return [];
}

const EARTH = BODIES.find((b) => b.id === "earth");
const MOON = BODIES.find((b) => b.id === "moon");
const SUN = BODIES.find((b) => b.id === "sun");

/* ==================== LAW ==================== */
const LAW_CASES = [
  { label: "地球・m=1kg", M: EARTH.M, m: 1, rMin: EARTH.R, rMax: EARTH.R * 10 },
  { label: "地球・m=1000kg", M: EARTH.M, m: 1000, rMin: EARTH.R, rMax: EARTH.R * 10 },
  { label: "月・m=1kg", M: MOON.M, m: 1, rMin: MOON.R, rMax: MOON.R * 10 },
  { label: "太陽・m=1kg(半径最大クランプ)", M: SUN.M, m: 1, rMin: SUN.R, rMax: SUN.R * 10 },
  { label: "太陽・m=1000kg", M: SUN.M, m: 1000, rMin: SUN.R, rMax: SUN.R * 10 },
  { label: "カスタム最小質量", M: 1e22, m: 1, rMin: 1e6, rMax: 1e10 },
  { label: "カスタム最大質量", M: 1e31, m: 1000, rMin: 1e6, rMax: 1e12 },
];
function runLawChecks() {
  const report = [];
  let total = 0;
  for (const c of LAW_CASES) {
    for (const rNorm of [0, 0.25, 0.5, 0.75, 1]) {
      total++;
      const r = c.rMin + rNorm * (c.rMax - c.rMin);
      const refForce = gravForce(c.M, c.m, c.rMin);
      const layout = computeLawLayout({ M: c.M, m: c.m, r, rNorm, refForce });
      const context = `[LAW/${c.label}] M=${c.M.toExponential(2)} m=${c.m} rNorm=${rNorm}`;
      report.push(...checkLayout(layout, context));
    }
  }
  return { report, total };
}

/* ==================== CIRCULAR ORBIT ==================== */
const CIRC_CASES = [
  { label: "地球・m=100kg", M: EARTH.M, m: 100, rMin: EARTH.R, rMax: EARTH.R * 6 },
  { label: "月・m=50kg", M: MOON.M, m: 50, rMin: MOON.R, rMax: MOON.R * 6 },
  { label: "太陽・m=1000kg", M: SUN.M, m: 1000, rMin: SUN.R, rMax: SUN.R * 6 },
  { label: "カスタム最小質量", M: 1e22, m: 10, rMin: 1e6, rMax: 5e6 },
  { label: "カスタム最大質量", M: 1e31, m: 1000, rMin: 1e9, rMax: 5e9 },
];
const PHI_SAMPLES = [0, 45, 90, 135, 180, 225, 270, 315].map((d) => (d * Math.PI) / 180);
function runCircularChecks() {
  const report = [];
  let total = 0;
  for (const c of CIRC_CASES) {
    const refV = firstCosmicVelocity(c.M, c.rMin);
    const refF = gravForce(c.M, c.m, c.rMin);
    for (const rFrac of [0, 0.5, 1]) {
      const r = c.rMin + rFrac * (c.rMax - c.rMin);
      for (const phi of PHI_SAMPLES) {
        total++;
        const layout = computeCircularOrbitLayout({ M: c.M, m: c.m, r, rMax: c.rMax, refV, refF, phi });
        const context = `[CIRCULAR/${c.label}] r=${r.toExponential(2)} phi=${((phi * 180) / Math.PI).toFixed(0)}deg`;
        report.push(...checkLayout(layout, context));
      }
    }
  }
  return { report, total };
}

/* ==================== ELLIPTICAL ORBIT ==================== */
const ELL_CASES = [
  { label: "地球・近円軌道", M: EARTH.M, m: 500, rp: EARTH.R * 1.1, ra: EARTH.R * 1.3 },
  { label: "地球・高離心率", M: EARTH.M, m: 500, rp: EARTH.R * 1.05, ra: EARTH.R * 8 },
  { label: "月・中程度離心率", M: MOON.M, m: 200, rp: MOON.R * 1.2, ra: MOON.R * 3 },
  { label: "太陽・高離心率", M: SUN.M, m: 1000, rp: SUN.R * 1.1, ra: SUN.R * 20 },
  { label: "カスタム中質量", M: 1e28, m: 100, rp: 1e7, ra: 5e7 },
  { label: "カスタム極端離心率", M: 1e24, m: 10, rp: 1e6, ra: 1e9 },
];
const ELL_VISUAL_PERIOD = 8;
function runEllipticalChecks() {
  const report = [];
  let total = 0;
  for (const c of ELL_CASES) {
    for (let i = 0; i < 8; i++) {
      total++;
      const t = (ELL_VISUAL_PERIOD * i) / 8;
      const layout = computeEllipticalOrbitLayout({ M: c.M, m: c.m, rp: c.rp, ra: c.ra, t });
      const context = `[ELLIPTICAL/${c.label}] t=${t.toFixed(2)}s`;
      report.push(...checkLayout(layout, context));
    }
  }
  return { report, total };
}

/* ==================== ENERGY & ESCAPE VELOCITY ==================== */
const EN_CASES = [
  { label: "地球・m=500kg", M: EARTH.M, m: 500, rMin: EARTH.R, rMax: EARTH.R * 8 },
  { label: "月・m=200kg", M: MOON.M, m: 200, rMin: MOON.R, rMax: MOON.R * 8 },
  { label: "太陽・m=2000kg", M: SUN.M, m: 2000, rMin: SUN.R, rMax: SUN.R * 8 },
  { label: "カスタム最小質量", M: 1e22, m: 50, rMin: 1e6, rMax: 8e6 },
  { label: "カスタム最大質量", M: 1e31, m: 5000, rMin: 1e6, rMax: 8e6 },
];
function runEnergyChecks() {
  const report = [];
  let total = 0;
  for (const c of EN_CASES) {
    for (const rFrac of [0, 0.25, 0.5, 0.75, 1]) {
      for (const speedRatio of [0, 0.5, 1, 1.4]) {
        total++;
        const r = c.rMin + rFrac * (c.rMax - c.rMin);
        const layout = computeEnergyLayout({ M: c.M, m: c.m, r, rMin: c.rMin, rMax: c.rMax, speedRatio });
        const context = `[ENERGY/${c.label}] r=${r.toExponential(2)} speedRatio=${speedRatio}`;
        report.push(...checkLayout(layout, context));
      }
    }
  }
  return { report, total };
}

function run() {
  const results = [runLawChecks(), runCircularChecks(), runEllipticalChecks(), runEnergyChecks()];
  const names = ["LAW", "CIRCULAR ORBIT", "ELLIPTICAL ORBIT", "ENERGY & ESCAPE VELOCITY"];
  let report = [];
  let total = 0;
  const summary = [];
  results.forEach((res, i) => {
    report = report.concat(res.report);
    total += res.total;
    summary.push(`${names[i]}: ${res.total}ケース`);
  });

  if (report.length === 0) {
    console.log(`[check-phys-gravitation-overlaps] OK: ${summary.join(", ")} (合計${total}ケース)すべて重なりゼロ`);
    return true;
  }
  console.error(report.join("\n"));
  console.error(`\n[check-phys-gravitation-overlaps] NG: 上記の重なりが見つかりました(検査対象 合計${total}ケース)`);
  return false;
}

const isMain = process.argv[1] && process.argv[1].endsWith("check-phys-gravitation-overlaps.mjs");
if (isMain) {
  const ok = run();
  if (!ok) process.exit(1);
}

export { run, rectsOverlap, segRectIntersect, convexPolysOverlap };
