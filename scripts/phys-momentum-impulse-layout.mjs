// 運動量と力積(1次元衝突)の物理計算とレイアウト計算。DOM・ブラウザAPIに依存しない
// 純粋関数のみで構成する。html/phys-momentum-impulse.html にそのまま埋め込んで使うのと
// 同時に、scripts/check-phys-momentum-impulse-overlaps.mjs から直接importして
// ラベル・矢印の重なり検査にも使う(実装と検査で計算式が食い違うのを避けるため、
// 「画面に実際に描く座標」を作る関数をここに1つだけ用意し、両方から参照する)。
//
// vector-diagram-engine.mjs の関数だけを使い、力学の知識(質量・力の意味)は
// この上の層(このファイル)に閉じる。projection-engine.mjs は import しない。

import {
  toPolar,
  computeScale,
  magnitudeToLength,
  arrowGeometry,
  labelAnchor,
} from "./vector-diagram-engine.mjs";

/* ---------- 物理: 運動量保存則 + 反発係数の定義から導く衝突後速度 ---------- */
// e = -(v1'-v2')/(v1-v2)、m1v1+m2v2 = m1v1'+m2v2' の連立を解いた閉じた式。
// 高校物理(物理)の教科書に載る標準的な式で、途中式は本文側(HTML)の解説カードに書く。
function postVelocities(m1, m2, v1, v2, e) {
  const denom = m1 + m2;
  const v1p = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / denom;
  const v2p = ((1 + e) * m1 * v1 + (m2 - e * m1) * v2) / denom;
  return { v1p, v2p };
}

function momentum(m, v) {
  return m * v;
}
function kineticEnergy(m, v) {
  return 0.5 * m * v * v;
}

/* ---------- タイミング(演出上の値。物理定数ではない) ----------
   衝突までの助走・衝突後に観察する時間をどちらも固定2秒とする。速度の大小に
   よらず時間軸は変えず、位置レンジ(viewXMax)だけを自動フィットさせる方針
   (mechanics-series-vector-conventions.mdの「実数値を導入しない」節とは別の
   話だが、同じ発想で「物理量ではない演出パラメータ」であることを明示する)。 */
const TIMING = { collisionTime: 2, postDuration: 2 };
const IMPULSE_WINDOW = 0.12; // 秒。|t - t_collision| がこの範囲内なら力積の矢印を出す

function sceneDuration() {
  return TIMING.collisionTime + TIMING.postDuration;
}

/* ---------- 時刻tでの状態 ---------- */
function stateAt(t, params) {
  const { m1, m2, v1, v2, e } = params;
  const { v1p, v2p } = postVelocities(m1, m2, v1, v2, e);
  const tc = TIMING.collisionTime;
  const before = t < tc;
  const v1cur = before ? v1 : v1p;
  const v2cur = before ? v2 : v2p;
  return {
    x1: v1cur * (t - tc),
    x2: v2cur * (t - tc),
    v1cur,
    v2cur,
    v1p,
    v2p,
    before,
    atCollision: Math.abs(t - tc) <= IMPULSE_WINDOW,
  };
}

/* ---------- 数値パネル用の一式 ---------- */
function computeStats(t, params) {
  const { m1, m2, v1, v2 } = params;
  const s = stateAt(t, params);
  const p1Before = momentum(m1, v1);
  const p2Before = momentum(m2, v2);
  const p1After = momentum(m1, s.v1p);
  const p2After = momentum(m2, s.v2p);
  const p1 = momentum(m1, s.v1cur);
  const p2 = momentum(m2, s.v2cur);
  const keBefore = kineticEnergy(m1, v1) + kineticEnergy(m2, v2);
  const keAfter = kineticEnergy(m1, s.v1p) + kineticEnergy(m2, s.v2p);
  return {
    p1,
    p2,
    pTotal: p1 + p2,
    ke1: kineticEnergy(m1, s.v1cur),
    ke2: kineticEnergy(m2, s.v2cur),
    keBefore,
    keAfter,
    j1: p1After - p1Before,
    j2: p2After - p2Before,
    v1p: s.v1p,
    v2p: s.v2p,
  };
}

/* ---------- ワールド座標(x, m)のレンジ ---------- */
// 位置の極値は必ずt=0・t=シーン全長のどちらかで起きる(各区間で等速なので位置はtの
// 一次式、極値は区間の端にしかない)。60点サンプリングのような数値探索は不要。
function computeXRange(params) {
  const { m1, m2, v1, v2, e } = params;
  const { v1p, v2p } = postVelocities(m1, m2, v1, v2, e);
  const tc = TIMING.collisionTime;
  const T = sceneDuration();
  const xs = [v1 * (0 - tc), v2 * (0 - tc), v1p * (T - tc), v2p * (T - tc), 0];
  const maxAbs = Math.max(...xs.map((x) => Math.abs(x)), 1);
  return maxAbs * 1.15;
}

/* ---------- レイアウト定数(px) ---------- */
const BOX = { w: 440, h: 240 };
// 矢印本体(最大 MOM_MAX_PX)+ラベルまでの隙間(LABEL_GAP)+ラベル半幅の分だけ、
// 描画領域の外側に余白(PAD_SIDE)を確保する。これにより「矢印+ラベルが
// ステージの外にはみ出す/矢印の線が自分のラベルに重なる」を両方防ぐ。
const PAD_SIDE = 118;
const AXIS_Y = 118;
const ROW_DY = { p1: -58, j1: -24, j2: 24, p2: 58 };
const TICK_Y_OFFSET = 94; // ROW_DY.p2(58)よりさらに下に離す
const MOM_MAX_PX = 40;
const LABEL_GAP = 34; // 矢じり先端からラベル中心までの距離。ラベル半幅の想定最大値より大きく取る
const LABEL_CHAR_W = 6.3;
const LABEL_PAD = 6;
const LABEL_H = 13;

function circleRadius(m) {
  return 6 + 2.6 * Math.sqrt(m);
}

function computeTransform(viewXMax) {
  const availW = BOX.w - PAD_SIDE * 2;
  const scale = availW / (2 * viewXMax);
  return { scale, originX: BOX.w / 2 };
}
function worldXToPx(x, transform) {
  return transform.originX + x * transform.scale;
}

function labelBox(x, y, text) {
  const w = text.length * LABEL_CHAR_W + LABEL_PAD;
  const h = LABEL_H;
  return { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 };
}

function fmt(n, digits) {
  return n.toFixed(digits);
}
function signed(n, digits) {
  const v = n.toFixed(digits);
  return n >= 0 && !v.startsWith("-") ? `+${v}` : v;
}

// 大きさ(符号付き, fy=0固定)から矢印一式(線分・矢じり・ラベル位置)を作る。
// 大きさが0(またはスケール0)なら null を返す(=描画しない)。
function buildArrow(id, originPx, signedMagnitude, color, opts) {
  const polar = toPolar(signedMagnitude, 0);
  const lengthPx = magnitudeToLength(polar.magnitude, opts.pxPerUnit, 0);
  if (lengthPx <= 0) return null;
  const geo = arrowGeometry(originPx, polar.angleDeg, lengthPx, {
    headLength: opts.headLength,
    headWidth: opts.headWidth,
  });
  const labelPos = labelAnchor({ x: geo.x2, y: geo.y2 }, polar.angleDeg, opts.labelGap ?? LABEL_GAP);
  const text = `${opts.labelPrefix} ${signed(signedMagnitude, 1)}`;
  return {
    id,
    color,
    strokeWidth: opts.strokeWidth ?? 2.2,
    geo,
    label: { x: labelPos.x, y: labelPos.y, text, color: opts.labelColor ?? color, box: labelBox(labelPos.x, labelPos.y, text) },
  };
}

function niceStep(range) {
  const candidates = [0.5, 1, 2, 5, 10, 20, 25, 50];
  for (const c of candidates) if (range / c <= 4) return c;
  return 50;
}

function computeAxisTicks(viewXMax, transform) {
  const step = niceStep(viewXMax);
  const ticks = [];
  const n = Math.floor(viewXMax / step);
  for (let i = -n; i <= n; i++) {
    const x = i * step;
    const px = worldXToPx(x, transform);
    const y = AXIS_Y + TICK_Y_OFFSET;
    const text = String(Math.round(x * 10) / 10);
    ticks.push({ x: px, y, text, box: labelBox(px, y, text) });
  }
  return ticks;
}

/* ---------- 全体レイアウト(画面に描く座標一式) ---------- */
function computeLayout(t, params) {
  const { m1, m2 } = params;
  const s = stateAt(t, params);
  const stats = computeStats(t, params);
  const viewXMax = computeXRange(params);
  const transform = computeTransform(viewXMax);

  const x1px = worldXToPx(s.x1, transform);
  const x2px = worldXToPx(s.x2, transform);
  const collisionPx = worldXToPx(0, transform);

  const pxPerUnit = computeScale(
    [stats.p1, stats.p2, momentum(m1, s.v1p), momentum(m2, s.v2p), stats.j1, stats.j2].map((v) => Math.abs(v)),
    MOM_MAX_PX
  );

  const circles = [
    { id: "body1", cx: x1px, cy: AXIS_Y, r: circleRadius(m1), fill: "var(--c2)" },
    { id: "body2", cx: x2px, cy: AXIS_Y, r: circleRadius(m2), fill: "var(--c1)" },
  ];

  const arrowOpts = { pxPerUnit, headLength: 9, headWidth: 6.5, strokeWidth: 2.4 };
  const arrows = [];

  const p1Arrow = buildArrow("p1", { x: x1px, y: AXIS_Y + ROW_DY.p1 }, stats.p1, "var(--c2)", {
    ...arrowOpts,
    labelPrefix: "p1",
    labelColor: "var(--c2t)",
  });
  if (p1Arrow) arrows.push(p1Arrow);

  const p2Arrow = buildArrow("p2", { x: x2px, y: AXIS_Y + ROW_DY.p2 }, stats.p2, "var(--c1)", {
    ...arrowOpts,
    labelPrefix: "p2",
    labelColor: "var(--c1t)",
  });
  if (p2Arrow) arrows.push(p2Arrow);

  if (s.atCollision) {
    const j1Arrow = buildArrow("j1", { x: collisionPx, y: AXIS_Y + ROW_DY.j1 }, stats.j1, "var(--c4)", {
      ...arrowOpts,
      labelPrefix: "J1",
      labelColor: "var(--c4t)",
    });
    if (j1Arrow) arrows.push(j1Arrow);

    const j2Arrow = buildArrow("j2", { x: collisionPx, y: AXIS_Y + ROW_DY.j2 }, stats.j2, "var(--c3)", {
      ...arrowOpts,
      labelPrefix: "J2",
      labelColor: "var(--c3t)",
    });
    if (j2Arrow) arrows.push(j2Arrow);
  }

  const axisTicks = computeAxisTicks(viewXMax, transform);

  return {
    box: BOX,
    axisY: AXIS_Y,
    axisLine: { x1: 0, y1: AXIS_Y, x2: BOX.w, y2: AXIS_Y },
    collisionGuide: { x1: collisionPx, y1: AXIS_Y + ROW_DY.p1 - 12, x2: collisionPx, y2: AXIS_Y + ROW_DY.p2 + 12 },
    circles,
    arrows,
    axisTicks,
    stats,
    state: s,
    transform,
    viewXMax,
  };
}

export {
  postVelocities,
  momentum,
  kineticEnergy,
  TIMING,
  IMPULSE_WINDOW,
  sceneDuration,
  stateAt,
  computeStats,
  computeXRange,
  BOX,
  AXIS_Y,
  circleRadius,
  computeTransform,
  worldXToPx,
  labelBox,
  fmt,
  signed,
  computeAxisTicks,
  computeLayout,
};
