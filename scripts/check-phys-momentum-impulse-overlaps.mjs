// html/phys-momentum-impulse.html の描画レイアウト(scripts/phys-momentum-impulse-layout.mjs)
// が、ラベル・矢印・軸目盛りのテキストのあらゆる組み合わせで重ならないかを検査する。
// 実装(HTML)とチェックで計算式が食い違わないよう、レイアウト計算そのものを
// phys-momentum-impulse-layout.mjs からimportして使う(再実装しない)。
//
// 検査する4種類(1本目の落体・放物運動で起きた不具合を踏まえた必須要件):
//   1. 矢印の線分 × ラベル矩形   (mechanics-series-vector-conventions.md により
//      「細い線がラベルの上を横切ること自体」は本来問題にしないとされているが、
//      この教材では要件により重なりゼロを目標にする)
//   2. 矢印の矢じり(三角形) × ラベル矩形  (面積を持つので文字を隠すため必ずゼロ)
//   3. ラベル × ラベル
//   4. ラベル × 軸目盛りのテキスト
//
// Node標準機能のみ。依存パッケージなし。
//   node scripts/check-phys-momentum-impulse-overlaps.mjs

import { computeLayout, TIMING, IMPULSE_WINDOW, sceneDuration } from "./phys-momentum-impulse-layout.mjs";

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

/* ---------- テスト対象パラメータ(質量・速度の極端値、v1<v2の追突順、3モードを含む) ---------- */
const CASES = [
  { label: "既定値(弾性 e=1)", m1: 3, m2: 5, v1: 6, v2: -2, e: 1 },
  { label: "既定値(完全非弾性 e=0)", m1: 3, m2: 5, v1: 6, v2: -2, e: 0 },
  { label: "既定値(カスタム e=0.5)", m1: 3, m2: 5, v1: 6, v2: -2, e: 0.5 },
  { label: "質量極端(m1=10,m2=1)+高速接近", m1: 10, m2: 1, v1: 10, v2: -10, e: 0.3 },
  { label: "質量極端(m1=1,m2=10)+追突順(v1<v2)", m1: 1, m2: 10, v1: -10, v2: 10, e: 0.8 },
  { label: "相対速度が小さい(v1-v2=1)", m1: 5, m2: 5, v1: 3, v2: 2, e: 0.5 },
  { label: "追突順+弾性(v1<v2)", m1: 2, m2: 8, v1: -5, v2: 1, e: 1 },
  { label: "同質量+高速+完全非弾性", m1: 10, m2: 10, v1: 10, v2: -10, e: 0 },
];

function timesFor(params) {
  const tc = TIMING.collisionTime;
  const T = sceneDuration();
  const w = IMPULSE_WINDOW;
  return [0, tc * 0.5, tc - w * 0.5, tc, tc + w * 0.5, tc + TIMING.postDuration * 0.5, T];
}

/* ---------- 1つのレイアウトについて4種類の交差を検査する ---------- */
function checkLayout(layout, context) {
  const problems = [];
  const labels = layout.arrows.map((a) => a.label);
  const ticks = layout.axisTicks;

  // 1. 矢印の線分 × ラベル矩形(自分自身のラベルも含めて全組み合わせ)
  for (const arrow of layout.arrows) {
    for (const label of labels) {
      if (segRectIntersect(arrow.geo.x1, arrow.geo.y1, arrow.geo.x2, arrow.geo.y2, label.box)) {
        problems.push(`[線分×ラベル] 矢印${arrow.id} × ラベル"${label.text}"`);
      }
    }
  }

  // 2. 矢印の矢じり(三角形) × ラベル矩形
  for (const arrow of layout.arrows) {
    for (const label of labels) {
      if (convexPolysOverlap(arrow.geo.head, rectToPoly(label.box))) {
        problems.push(`[矢じり×ラベル] 矢印${arrow.id}の矢じり × ラベル"${label.text}"`);
      }
    }
  }

  // 3. ラベル × ラベル(自分以外との組み合わせ)
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (rectsOverlap(labels[i].box, labels[j].box)) {
        problems.push(`[ラベル×ラベル] "${labels[i].text}" × "${labels[j].text}"`);
      }
    }
  }

  // 4. ラベル × 軸目盛りのテキスト
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

function run() {
  const report = [];
  let total = 0;
  for (const c of CASES) {
    const params = { m1: c.m1, m2: c.m2, v1: c.v1, v2: c.v2, e: c.e };
    for (const t of timesFor(params)) {
      total++;
      const layout = computeLayout(t, params);
      const context = `[${c.label}] m1=${c.m1} m2=${c.m2} v1=${c.v1} v2=${c.v2} e=${c.e} t=${t.toFixed(3)}`;
      report.push(...checkLayout(layout, context));
    }
  }

  if (report.length === 0) {
    console.log(`[check-phys-momentum-impulse-overlaps] OK: ${CASES.length}パターン × 時刻7点 = ${total}ケースすべて重なりゼロ`);
    return true;
  }
  console.error(report.join("\n"));
  console.error(`\n[check-phys-momentum-impulse-overlaps] NG: 上記の重なりが見つかりました(検査対象 ${total}ケース)`);
  return false;
}

const isMain = process.argv[1] && process.argv[1].endsWith("check-phys-momentum-impulse-overlaps.mjs");
if (isMain) {
  const ok = run();
  if (!ok) process.exit(1);
}

export { run, rectsOverlap, segRectIntersect, convexPolysOverlap };
