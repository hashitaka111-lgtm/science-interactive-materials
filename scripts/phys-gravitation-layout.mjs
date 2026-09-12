// 万有引力(5シーン: 万有引力の法則・円軌道・楕円軌道・ケプラー第3法則・エネルギーと脱出速度)の
// 物理計算とレイアウト計算。DOM・ブラウザAPIに依存しない純粋関数のみで構成する。
// html/phys-gravitation.html にそのまま埋め込んで使うのと同時に、
// scripts/check-phys-gravitation-overlaps.mjs から直接importして重なり検査にも使う
// (実装と検査で計算式が食い違うのを避けるため)。
//
// vector-diagram-engine.mjs の関数だけを使う。projection-engine.mjs はimportしない
// (この教材は軌道をすべて平面内の運動として2Dで表現し、3Dを必要としないため)。
//
// KEPLER'S THIRD LAW(ケプラー第3法則)のシーンだけは、太陽系惑星の実データを
// そのままHTML側の表(DOM)で見せる方針のため、SVGの矢印・ラベルを一切使わない。
// そのためこのシーンには「レイアウト」関数がなく、keplerRatio() という物理計算の
// 純粋関数だけを持つ(check-phys-gravitation-overlaps.mjs の対象にも含まれない)。

import {
  toPolar,
  computeScale,
  magnitudeToLength,
  arrowGeometry,
  labelAnchor,
} from "./vector-diagram-engine.mjs";

const R2D = 180 / Math.PI;
const TAU = Math.PI * 2;

/* ---------- 物理定数・データ(検証済み。書き換えない) ---------- */
const G = 6.6743e-11; // m^3 kg^-1 s^-2 (CODATA 2022)

const BODIES = [
  { id: "earth", name: "地球", M: 5.97217e24, R: 6.371e6 },
  { id: "moon", name: "月", M: 7.342e22, R: 1.7374e6 },
  { id: "sun", name: "太陽", M: 1.989e30, R: 6.957e8 },
];

// ケプラー第3法則の確認用(太陽まわり、a=AU単位、T=年単位)
const PLANETS = [
  { name: "水星", a_AU: 0.3871, T_year: 0.2408 },
  { name: "金星", a_AU: 0.7233, T_year: 0.6152 },
  { name: "地球", a_AU: 1.0, T_year: 1.0 },
  { name: "火星", a_AU: 1.5273, T_year: 1.8809 },
  { name: "木星", a_AU: 5.2028, T_year: 11.862 },
  { name: "土星", a_AU: 9.5388, T_year: 29.458 },
];

/* ---------- 物理計算(全シーン共通の基礎式) ---------- */
function gravForce(M, m, r) {
  return (G * M * m) / (r * r);
}
function gravPotentialEnergy(M, m, r) {
  return -(G * M * m) / r;
}
function firstCosmicVelocity(M, r) {
  // mv²/r = GMm/r² を v について解いた式。4本目(円運動)のF=mv²/rを
  // 与えられた道具として使い、万有引力=向心力とおくとこの式が出る。
  return Math.sqrt((G * M) / r);
}
function orbitalPeriod(M, r) {
  // 円軌道はr、楕円軌道は半長軸aを渡せばそのまま使える(ケプラー第3法則)。
  return TAU * Math.sqrt((r * r * r) / (G * M));
}
function escapeVelocity(M, r) {
  return Math.sqrt((2 * G * M) / r);
}
function kineticEnergy(m, v) {
  return 0.5 * m * v * v;
}

/* ---------- 楕円軌道 ---------- */
function semiMajorAxis(rp, ra) {
  return (rp + ra) / 2;
}
function eccentricity(rp, ra) {
  return (ra - rp) / (ra + rp);
}
// vis-viva方程式: v(r)² = GM(2/r - 1/a)。近日点・遠日点に限らずどの位置でも使える。
function visVivaSpeed(M, r, a) {
  return Math.sqrt(G * M * (2 / r - 1 / a));
}
// ケプラー方程式 M = E - e sinE をニュートン法で解く(Mは平均近点角、Eは離心近点角、rad)。
function solveEccentricAnomaly(meanAnomaly, e, iterations = 10) {
  let E = meanAnomaly;
  for (let i = 0; i < iterations; i++) {
    E = E - (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
  }
  return E;
}
// 焦点(万有引力を及ぼす中心天体の位置)を原点とした位置。E=0が近日点(+x方向)、
// E=πが遠日点(-x方向)になる標準的なパラメータ表示。
function ellipsePositionAtE(a, e, E) {
  const b = a * Math.sqrt(1 - e * e);
  return { x: a * (Math.cos(E) - e), y: b * Math.sin(E) };
}
function ellipsePositionAtMeanAnomaly(a, e, meanAnomaly) {
  const E = solveEccentricAnomaly(meanAnomaly, e);
  const pos = ellipsePositionAtE(a, e, E);
  return { x: pos.x, y: pos.y, E };
}
function radiusAtE(a, e, E) {
  return a * (1 - e * Math.cos(E));
}

/* ---------- ケプラー第3法則(表示はHTML側のDOM表。ここでは比の計算だけ) ---------- */
function keplerRatio(a_AU, T_year) {
  return (T_year * T_year) / (a_AU * a_AU * a_AU);
}

/* ---------- 表示用の数値整形 ----------
   万有引力は扱う量の桁が極端(力は1e-5N〜1e13N、質量は1e22kg〜1e30kgなど)なので、
   toFixedで固定桁にすると0.0や桁あふれになる。指数表記が要る範囲だけ切り替える。 */
function fmt(n, digits) {
  return n.toFixed(digits);
}
function fmtCompact(n) {
  const a = Math.abs(n);
  if (a !== 0 && (a >= 1e5 || a < 1e-2)) {
    return n.toExponential(2);
  }
  if (a >= 100) return n.toFixed(0);
  if (a >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/* ---------- ラベル矩形(他教材と同じ式) ---------- */
const LABEL_CHAR_W = 6.3;
const LABEL_PAD = 6;
const LABEL_H = 13;
function labelBox(x, y, text) {
  const w = text.length * LABEL_CHAR_W + LABEL_PAD;
  const h = LABEL_H;
  return { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 };
}

/* ---------- 矢印一式(線分・矢じり・ラベル位置)を作る共通ヘルパー ----------
   大きさが0以下、またはスケール0で長さが0になるなら null(=描画しない)。 */
function cappedLengthPx(magnitude, pxPerUnit, hardCap) {
  const len = magnitudeToLength(magnitude, pxPerUnit, 0);
  return Math.min(len, hardCap);
}
function buildArrowAt(id, originPx, angleDeg, magnitude, pxPerUnit, hardCap, color, opts) {
  if (!(magnitude > 0)) return null;
  const lengthPx = cappedLengthPx(magnitude, pxPerUnit, hardCap);
  if (lengthPx <= 0) return null;
  const geo = arrowGeometry(originPx, angleDeg, lengthPx, {
    headLength: opts.headLength ?? 9,
    headWidth: opts.headWidth ?? 6.5,
  });
  const labelPos = labelAnchor({ x: geo.x2, y: geo.y2 }, angleDeg, opts.labelGap ?? 44);
  // 単位(N・m/sなど)はラベルに付けない(数値パネル側に表示する)。指数表記を含む
  // 数値だけでも桁の大きいこの教材では文字数が伸びやすく、単位まで足すとラベル幅の
  // 見積もりが崩れて重なりの原因になりやすいため。
  const text = `${opts.labelPrefix} ${fmtCompact(magnitude)}`;
  return {
    id,
    color,
    strokeWidth: opts.strokeWidth ?? 2.2,
    geo,
    label: {
      x: labelPos.x,
      y: labelPos.y,
      text,
      color: opts.labelColor ?? color,
      box: labelBox(labelPos.x, labelPos.y, text),
    },
  };
}

/* =====================================================================
   LAW(万有引力の法則): F=GMm/r² を2物体アニメーション+力ベクトルで見せる
   ===================================================================== */
const LAW_BOX = { w: 520, h: 200 };
const LAW_CY = 62;
const LAW_CENTRAL_X = 66;
const LAW_BODY_R_MIN = 14;
const LAW_BODY_R_MAX = 30;
const LAW_TEST_R = 6;
const LAW_X_MIN = 196;
const LAW_X_MAX = 480;
const LAW_LANE_Y1 = LAW_CY + 62; // 試験物体mが受ける力Fのレーン(中心へ向く=左向き)
const LAW_LANE_Y2 = LAW_CY + 96; // 中心天体Mが受ける反作用力F'のレーン(mへ向く=右向き、作用・反作用)
const LAW_FORCE_REF_MAX_PX = 90;
const LAW_FORCE_HARD_CAP_RATIO = 0.82;
const LAW_FORCE_HARD_CAP_MAX = 74;

function lawBodyRadiusPx(M) {
  const r = 14 + 3.0 * (Math.log10(M) - 22);
  return Math.min(Math.max(r, LAW_BODY_R_MIN), LAW_BODY_R_MAX);
}

// params: { M, m, r, rNorm, refForce }
//   rNorm(0〜1): 試験物体を画面上のどこに置くかだけを決める模式的な位置(実距離に比例しない)。
//   refForce: 現在のスライダー可動域で最大になる力(=最も近い距離での力)。矢印の基準長に使う。
function computeLawLayout(params) {
  const { M, m, r, rNorm, refForce } = params;
  const centralR = lawBodyRadiusPx(M);
  const testX = LAW_X_MIN + rNorm * (LAW_X_MAX - LAW_X_MIN);
  const testR = LAW_TEST_R;
  const F = gravForce(M, m, r);

  const pxPerUnit = computeScale([refForce], LAW_FORCE_REF_MAX_PX);
  const gapLeft = LAW_CENTRAL_X + centralR;
  const gapRight = testX - testR;
  const gapWidth = Math.max(gapRight - gapLeft, 1);
  const hardCap = Math.min(gapWidth * LAW_FORCE_HARD_CAP_RATIO, LAW_FORCE_HARD_CAP_MAX);

  const arrows = [];
  const fOnTest = buildArrowAt(
    "Fm",
    { x: gapRight, y: LAW_LANE_Y1 },
    180,
    F,
    pxPerUnit,
    hardCap,
    "var(--c4)",
    { labelPrefix: "F", labelColor: "var(--c4t)" }
  );
  if (fOnTest) arrows.push(fOnTest);
  const fOnCentral = buildArrowAt(
    "FM",
    { x: gapLeft, y: LAW_LANE_Y2 },
    0,
    F,
    pxPerUnit,
    hardCap,
    "var(--c3)",
    { labelPrefix: "F'", labelColor: "var(--c3t)" }
  );
  if (fOnCentral) arrows.push(fOnCentral);

  return {
    box: LAW_BOX,
    central: { x: LAW_CENTRAL_X, y: LAW_CY, r: centralR },
    test: { x: testX, y: LAW_CY, r: testR },
    connector: { x1: gapLeft, y1: LAW_CY, x2: gapRight, y2: LAW_CY },
    arrows,
    axisTicks: [],
    stats: { F, r, M, m },
  };
}

/* =====================================================================
   CIRCULAR ORBIT(円軌道): mv²/r = GMm/r² から v=√(GM/r)、T=2π√(r³/GM)
   ===================================================================== */
const CIRC_BOX = { w: 480, h: 480 };
const CIRC_CENTER = { x: 240, y: 240 };
const CIRC_RING_MAX_PX = 108;
const CIRC_CENTRAL_PX = 11;
const CIRC_VEL_REF_MAX_PX = 40;
const CIRC_FORCE_REF_MAX_PX = 40;
const CIRC_VEL_HARD_CAP = 40;
const CIRC_FORCE_HARD_CAP = 40;
// v(接線方向)とF(中心方向)は常に90°離れているので、同じ間隔でラベルを置くと
// 斜め(45°刻み)の位相で2つのラベルが接近しやすい。gapを変えて距離を稼ぐ。
const CIRC_VEL_LABEL_GAP = 40;
const CIRC_FORCE_LABEL_GAP = 68;

// params: { M, m, r, rMax, refV, refF, phi }
//   rMax: 現在のスライダー可動域の最大r(輪の描画スケールを決めるためだけに使う)。
//   refV, refF: スライダー可動域で最大になるv・F(=最も低い高度での値)。矢印の基準長。
//   phi(rad): 見やすさのための演出用の回転位相(実際の公転周期Tとは無関係)。
function computeCircularOrbitLayout(params) {
  const { M, m, r, rMax, refV, refF, phi } = params;
  const v = firstCosmicVelocity(M, r);
  const F = gravForce(M, m, r);
  const T = orbitalPeriod(M, r);

  // rが小さいところ(低高度)ほど見た目の変化がわかるよう、線形ではなく平方根で
  // 縮尺をとる(r/rMaxそのままだと、よくある低高度がどれも輪の中心近くの
  // 点になってしまい、高度による違いが見えにくいため)。
  const ringPx = Math.sqrt(r / rMax) * CIRC_RING_MAX_PX;
  const marker = {
    x: CIRC_CENTER.x + ringPx * Math.cos(phi),
    y: CIRC_CENTER.y - ringPx * Math.sin(phi),
  };

  const velAngleDeg = phi * R2D + 90; // 接線方向(反時計回りに前向き)
  const forceAngleDeg = phi * R2D + 180; // 中心向き(万有引力=向心力)

  const velScale = computeScale([refV], CIRC_VEL_REF_MAX_PX);
  const forceScale = computeScale([refF], CIRC_FORCE_REF_MAX_PX);

  const arrows = [];
  const vArrow = buildArrowAt(
    "v",
    marker,
    velAngleDeg,
    v,
    velScale,
    Math.min(CIRC_VEL_HARD_CAP, Math.max(ringPx * 0.85, 14)),
    "var(--c2)",
    { labelPrefix: "v", labelColor: "var(--c2t)", labelGap: CIRC_VEL_LABEL_GAP }
  );
  if (vArrow) arrows.push(vArrow);
  const fArrow = buildArrowAt(
    "F",
    marker,
    forceAngleDeg,
    F,
    forceScale,
    Math.min(CIRC_FORCE_HARD_CAP, Math.max(ringPx * 0.85, 14)),
    "var(--c4)",
    { labelPrefix: "F", labelColor: "var(--c4t)", labelGap: CIRC_FORCE_LABEL_GAP }
  );
  if (fArrow) arrows.push(fArrow);

  return {
    box: CIRC_BOX,
    center: CIRC_CENTER,
    centralPx: CIRC_CENTRAL_PX,
    ringPx,
    marker,
    arrows,
    axisTicks: [],
    stats: { v, F, T, r, M, m },
  };
}

/* =====================================================================
   ELLIPTICAL ORBIT(楕円軌道): ケプラー第2法則(面積速度一定)
   ===================================================================== */
const ELL_BOX = { w: 500, h: 340 };
// マージンは「矢印の最大長+ラベルまでの隙間+ラベル半幅」を確実に収める大きさにする
// (近日点・遠日点はステージのマージン境界ちょうどに来るため、はみ出しの余地がない)。
const ELL_MARGIN_X = 125;
const ELL_MARGIN_Y = 115;
const ELL_VEL_REF_MAX_PX = 34;
const ELL_VEL_HARD_CAP = 34;
const ELL_VISUAL_PERIOD = 8; // s。演出上のアニメーション周期(実際の周期Tとは無関係)
const ELL_SECTOR_DM = TAU * 0.07; // 「同じ時間」として比べる2つの扇形の平均近点角の幅

function ellTransform(a, b) {
  const availW = ELL_BOX.w - ELL_MARGIN_X * 2;
  const availH = ELL_BOX.h - ELL_MARGIN_Y * 2;
  const scale = Math.min(availW / (2 * a), availH / (2 * b));
  // 世界座標(焦点=中心天体が原点)のx範囲は[-ra, rp]=[-(a+ae)... ]ではなく、
  // 実際には[-(a+c), (a-c)] = [-ra, rp](c=aeで近日点=a-c, 遠日点=a+c)。
  // 焦点を原点として、xの取りうる最小値-raがステージ左端に来るようにする。
  return { scale, focusPx: { x: ELL_MARGIN_X, y: ELL_BOX.h / 2 }, a, b };
}
function ellWorldToPx(x, y, transform, rp, ra) {
  // 世界座標のxは[-ra, rp]の範囲。左端(-ra)がステージ左マージンに来るよう、
  // (x+ra)を使ってオフセットする。
  return {
    x: transform.focusPx.x + (x + ra) * transform.scale,
    y: transform.focusPx.y - y * transform.scale,
  };
}

function ellOrbitPathPx(a, e, rp, ra, transform, samples = 72) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const E = (i / samples) * TAU;
    const p = ellipsePositionAtE(a, e, E);
    pts.push(ellWorldToPx(p.x, p.y, transform, rp, ra));
  }
  return pts;
}

function ellSectorPolygonPx(a, e, startM, dM, transform, rp, ra, steps = 6) {
  const pts = [ellWorldToPx(0, 0, transform, rp, ra)];
  for (let i = 0; i <= steps; i++) {
    const M = startM + (dM * i) / steps;
    const p = ellipsePositionAtMeanAnomaly(a, e, M);
    pts.push(ellWorldToPx(p.x, p.y, transform, rp, ra));
  }
  return pts;
}

// params: { M, m, rp, ra, t }  t(s): アニメーション時刻(ELL_VISUAL_PERIODで一周)
function computeEllipticalOrbitLayout(params) {
  const { M, m, rp, ra, t } = params;
  const a = semiMajorAxis(rp, ra);
  const e = eccentricity(rp, ra);
  const b = a * Math.sqrt(1 - e * e);
  const T = orbitalPeriod(M, a);
  const vp = visVivaSpeed(M, rp, a);
  const va = visVivaSpeed(M, ra, a);

  const transform = ellTransform(a, b);
  const orbitPath = ellOrbitPathPx(a, e, rp, ra, transform);

  const frac = (t % ELL_VISUAL_PERIOD) / ELL_VISUAL_PERIOD;
  const meanAnomaly = TAU * frac;
  const pos = ellipsePositionAtMeanAnomaly(a, e, meanAnomaly);
  const r = radiusAtE(a, e, pos.E);
  const v = visVivaSpeed(M, r, a);

  // 速度の向きは、ごく短い時間だけ先の位置との差分から求める(向きだけを使う。
  // 大きさはvis-viva方程式の解析式を使う方が正確なのでそちらを採用する)。
  const dFrac = 0.0015;
  const pos2 = ellipsePositionAtMeanAnomaly(a, e, meanAnomaly + TAU * dFrac);
  const dir = toPolar(pos2.x - pos.x, pos2.y - pos.y);
  const velAngleDeg = dir.angleDeg;

  const markerPx = ellWorldToPx(pos.x, pos.y, transform, rp, ra);
  const focusPx = ellWorldToPx(0, 0, transform, rp, ra);

  const refV = vp; // 近日点(最速)を基準長にする
  const velScale = computeScale([refV], ELL_VEL_REF_MAX_PX);
  const arrows = [];
  const vArrow = buildArrowAt(
    "v",
    markerPx,
    velAngleDeg,
    v,
    velScale,
    ELL_VEL_HARD_CAP,
    "var(--c2)",
    { labelPrefix: "v", labelColor: "var(--c2t)" }
  );
  if (vArrow) arrows.push(vArrow);

  const sectorPerihelion = ellSectorPolygonPx(a, e, 0, ELL_SECTOR_DM, transform, rp, ra);
  const sectorAphelion = ellSectorPolygonPx(a, e, Math.PI, ELL_SECTOR_DM, transform, rp, ra);

  return {
    box: ELL_BOX,
    focus: focusPx,
    marker: markerPx,
    orbitPath,
    sectors: [
      { points: sectorPerihelion, fill: "var(--c2)" },
      { points: sectorAphelion, fill: "var(--c1)" },
    ],
    arrows,
    axisTicks: [],
    stats: { a, e, b, T, vp, va, rp, ra, r, v, M, m },
  };
}

/* =====================================================================
   ENERGY & ESCAPE VELOCITY(エネルギーと脱出速度): U=-GMm/r のグラフ
   ===================================================================== */
const EN_BOX = { w: 460, h: 230 };
const EN_PLOT_LEFT = 58;
const EN_PLOT_RIGHT = 440;
const EN_PLOT_TOP = 42;
const EN_PLOT_BOTTOM = 176;
const EN_TICK_ROW_Y = 198;
const EN_READOUT_Y = 16;
const EN_CURVE_SAMPLES = 48;

function enXToPx(r, rMin, rMax) {
  const frac = (r - rMin) / (rMax - rMin);
  return EN_PLOT_LEFT + frac * (EN_PLOT_RIGHT - EN_PLOT_LEFT);
}
function enYToPx(U, uMin) {
  // U∈[uMin, 0]。uMinが最も負(グラフ下端)、0が上端(漸近線)。
  const frac = (U - uMin) / (0 - uMin);
  return EN_PLOT_BOTTOM - frac * (EN_PLOT_BOTTOM - EN_PLOT_TOP);
}

function enNiceTicks(rMin, rMax, count = 5) {
  const ticks = [];
  for (let i = 0; i < count; i++) {
    ticks.push(rMin + ((rMax - rMin) * i) / (count - 1));
  }
  return ticks;
}

// params: { M, m, r, rMin, rMax, speedRatio }
//   speedRatio: 現在の速さを、その距離での脱出速度に対する比(v/v_esc)で指定する
//   (惑星ごとに脱出速度の桁が大きく違うため、比で操作できるようにしてある)。
function computeEnergyLayout(params) {
  const { M, m, r, rMin, rMax, speedRatio } = params;
  const uMin = gravPotentialEnergy(M, m, rMin);
  const U = gravPotentialEnergy(M, m, r);
  const v1 = firstCosmicVelocity(M, r);
  const vEsc = escapeVelocity(M, r);
  const v = speedRatio * vEsc;
  const KE = kineticEnergy(m, v);
  const E = KE + U;
  const bound = E < 0;

  const curve = [];
  for (let i = 0; i <= EN_CURVE_SAMPLES; i++) {
    const rr = rMin + ((rMax - rMin) * i) / EN_CURVE_SAMPLES;
    const uu = gravPotentialEnergy(M, m, rr);
    curve.push({ x: enXToPx(rr, rMin, rMax), y: enYToPx(uu, uMin) });
  }

  const markerPx = { x: enXToPx(r, rMin, rMax), y: enYToPx(U, uMin) };

  const xTicks = enNiceTicks(rMin, rMax, 5).map((rr) => {
    const px = enXToPx(rr, rMin, rMax);
    const text = `${fmtCompact(rr)}`;
    return { x: px, y: EN_TICK_ROW_Y, text, box: labelBox(px, EN_TICK_ROW_Y, text) };
  });
  const yTicks = [
    {
      x: EN_PLOT_LEFT - 26,
      y: EN_PLOT_TOP,
      text: "0",
      box: labelBox(EN_PLOT_LEFT - 26, EN_PLOT_TOP, "0"),
    },
    {
      x: EN_PLOT_LEFT - 26,
      y: EN_PLOT_BOTTOM,
      text: fmtCompact(uMin),
      box: labelBox(EN_PLOT_LEFT - 26, EN_PLOT_BOTTOM, fmtCompact(uMin)),
    },
  ];
  const axisTicks = [...xTicks, ...yTicks];

  const readoutText = `r=${fmtCompact(r)}m  U=${fmtCompact(U)}J`;
  const readout = {
    x: EN_PLOT_LEFT + (EN_PLOT_RIGHT - EN_PLOT_LEFT) / 2,
    y: EN_READOUT_Y,
    text: readoutText,
    color: "var(--c4t)",
    box: labelBox(EN_PLOT_LEFT + (EN_PLOT_RIGHT - EN_PLOT_LEFT) / 2, EN_READOUT_Y, readoutText),
  };

  return {
    box: EN_BOX,
    plot: { left: EN_PLOT_LEFT, right: EN_PLOT_RIGHT, top: EN_PLOT_TOP, bottom: EN_PLOT_BOTTOM },
    curve,
    marker: markerPx,
    arrows: [],
    axisTicks,
    readout,
    stats: { U, v1, vEsc, v, KE, E, bound, r, M, m },
  };
}

export {
  G,
  BODIES,
  PLANETS,
  gravForce,
  gravPotentialEnergy,
  firstCosmicVelocity,
  orbitalPeriod,
  escapeVelocity,
  kineticEnergy,
  semiMajorAxis,
  eccentricity,
  visVivaSpeed,
  solveEccentricAnomaly,
  ellipsePositionAtE,
  ellipsePositionAtMeanAnomaly,
  radiusAtE,
  keplerRatio,
  fmt,
  fmtCompact,
  labelBox,
  buildArrowAt,
  LAW_BOX,
  computeLawLayout,
  CIRC_BOX,
  computeCircularOrbitLayout,
  ELL_BOX,
  computeEllipticalOrbitLayout,
  EN_BOX,
  computeEnergyLayout,
};
