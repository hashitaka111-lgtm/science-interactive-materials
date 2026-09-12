// 円運動(4シーン: 等速円運動・水平面内・鉛直面内・円錐振り子)の物理計算とレイアウト計算。
// DOM・ブラウザAPIに依存しない純粋関数のみで構成する。html/phys-circular-motion.html に
// そのまま埋め込んで使うのと同時に、scripts/check-phys-circular-motion-overlaps.mjs から
// 直接importして重なり検査にも使う(実装と検査で計算式が食い違うのを避けるため)。
//
// vector-diagram-engine.mjs の関数だけを使い、力学の知識(質量・力の意味・向心力の
// 担い手が何か)はこの上の層(このファイル)に閉じる。projection-engine.mjs はここでは
// importしない(mechanics-series-vector-conventions.md の取り決め)。CONICAL PENDULUM
// (円錐振り子)の3D計算は、3D世界座標の点・方向ベクトルを作る関数と、「画面px座標へ
// 投影する関数(projectPoint)を呼び出し側から受け取って2Dの矢印を組み立てる関数」に
// 分けてある。makeCamera/project/toScreen の呼び出し自体は、この関数群の外
// (html/phys-circular-motion.html 側、および check-phys-circular-motion-overlaps.mjs 側の
// どちらも projection-engine.mjs を直接importして行う)にあるので、このファイルは
// projection-engine.mjs を一切importしない。

import {
  toPolar,
  computeScale,
  magnitudeToLength,
  arrowGeometry,
  labelAnchor,
} from "./vector-diagram-engine.mjs";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const TAU = Math.PI * 2;

/* ---------- 物理定数 ---------- */
// 高校物理教科書の慣用値(有効数字2桁)。この教材ではμ・N(θ)・張力Tなど実数値の力を
// 扱うため、phys-projectile-motion.json と同じ値を直接定数として持つ(教材間でJSONを
// 共有する仕組みはないため、値だけを揃える)。
const G = 9.8;

/* ---------- UNIFORM: 等速円運動の基礎 ---------- */
function period(omega) {
  return TAU / omega;
}
function tangentialSpeed(r, omega) {
  return r * omega;
}
function centripetalAccel(r, omega) {
  return r * omega * omega;
}
function centripetalForce(m, r, omega) {
  return m * r * omega * omega;
}

/* ---------- HORIZONTAL: 水平面内(摩擦力が向心力の役を担う) ---------- */
function requiredFriction(m, r, omega) {
  return centripetalForce(m, r, omega);
}
function maxStaticFriction(mu, m) {
  return mu * m * G;
}
function criticalOmega(mu, r) {
  return Math.sqrt((mu * G) / r);
}
function isSlipping(mu, m, r, omega) {
  return requiredFriction(m, r, omega) > maxStaticFriction(mu, m);
}

/* ---------- VERTICAL: 鉛直面内(位置角θ、最下点を0とする) ----------
   θ=0(最下点)での速さをv0=rωとし、エネルギー保存 (1/2)v² + g r(1-cosθ) = (1/2)v0²
   で高さθにおける速さを求める。垂直抗力/張力Nは、中心向きを正としたニュートンの
   第2法則 N + (重力の中心向き成分) = m v²/r から N = m v²/r + mg cosθ になる
   (最下点θ=0でN=mv0²/r+mg、最高点θ=πでN=mv_top²/r-mgと、教科書の見慣れた式に一致する)。
   最高点を一周できる条件はv_top²≥grで、エネルギー保存から書き直すとv0²≥5gr。 */
function bottomSpeed(r, omega) {
  return r * omega;
}
function speedSquaredAt(thetaRad, r, v0) {
  return v0 * v0 - 2 * G * r * (1 - Math.cos(thetaRad));
}
function normalForceAt(thetaRad, m, r, v0) {
  const v2 = Math.max(speedSquaredAt(thetaRad, r, v0), 0);
  return (m * v2) / r + m * G * Math.cos(thetaRad);
}
function minBottomSpeedSquaredToComplete(r) {
  return 5 * G * r;
}

/* ---------- CONICAL PENDULUM: 円錐振り子 ---------- */
function conicalOmega(L, thetaRad) {
  return Math.sqrt(G / (L * Math.cos(thetaRad)));
}
function conicalTension(m, thetaRad) {
  return (m * G) / Math.cos(thetaRad);
}
function conicalRadius(L, thetaRad) {
  return L * Math.sin(thetaRad);
}
function conicalDrop(L, thetaRad) {
  return L * Math.cos(thetaRad);
}

/* ---------- BRIDGE: 単振動教材との対応(表1つだけ) ----------
   UNIFORMシーンの現在のr・ωと、現在の回転角φ(=ωtに相当)から、ある直径方向(x軸)への
   射影 x(t)=r cos(ωt) と、その速度・加速度成分の最大値(=rω, rω²、UNIFORMのv・aと
   同じ値になる)を返す。 */
function bridgeValues(r, omega, phi) {
  return {
    x: r * Math.cos(phi),
    vMax: tangentialSpeed(r, omega),
    aMax: centripetalAccel(r, omega),
  };
}

/* ---------- ベクトル矢印のスケール(単位ごとに独立して呼ぶ) ----------
   mechanics-series-vector-conventions.md: 速度(m/s)・加速度(m/s²)・力(N)は単位が
   異なるので、computeScaleは3グループに分けてそれぞれ別に呼ぶ。ここでは各グループの
   基準値(REF)をスライダーの可動域よりやや高めの「きりのよい」値に固定して1回だけ
   computeScaleを呼び、矢印の長さがスライダー操作に応じて連続的に変わるようにする
   (画面内の全ベクトルの現在値からその場でスケールを作る方式だと、この教材では
   1本しか矢印がないシーンが多く、常に最大長になってしまい大きさの変化が見えない)。 */
const VEL_REF = 6; // m/s
const ACC_REF = 24; // m/s²
const FORCE_REF = 30; // N
const VEL_MAX_PX = 56;
const ACC_MAX_PX = 56;
const FORCE_MAX_PX = 56;
const VEL_HARD_CAP = 70;
const ACC_HARD_CAP = 70;
const FORCE_HARD_CAP = 70;

function velScale() {
  return computeScale([VEL_REF], VEL_MAX_PX);
}
function accScale() {
  return computeScale([ACC_REF], ACC_MAX_PX);
}
function forceScale() {
  return computeScale([FORCE_REF], FORCE_MAX_PX);
}

function cappedLengthPx(magnitude, pxPerUnit, hardCap) {
  const len = magnitudeToLength(magnitude, pxPerUnit, 0);
  return Math.min(len, hardCap);
}

/* ---------- レイアウト定数(px)。UNIFORM/HORIZONTAL/VERTICALは同じ円盤ステージを使う ---------- */
const RING_BOX = { w: 500, h: 500 };
const RING_CENTER = { x: 250, y: 250 };
const PX_PER_METER = 60;

// 物理座標(x右向き正・y上向き正、原点=円の中心)を画面px座標に変える。
function worldToScreen(x, y) {
  return { x: RING_CENTER.x + x * PX_PER_METER, y: RING_CENTER.y - y * PX_PER_METER };
}

const LABEL_CHAR_W = 6.3;
const LABEL_PAD = 6;
const LABEL_H = 13;
function labelBox(x, y, text) {
  const w = text.length * LABEL_CHAR_W + LABEL_PAD;
  const h = LABEL_H;
  return { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 };
}
function fmt(n, d) {
  return n.toFixed(d);
}

// 原点px・角度(度)・大きさから矢印一式(線分・矢じり・ラベル位置)を作る。
// 大きさが0以下、またはスケール0なら null(=描画しない)。
function buildArrowAt(id, originPx, angleDeg, magnitude, pxPerUnit, hardCap, color, opts) {
  if (!(magnitude > 0)) return null;
  const lengthPx = cappedLengthPx(magnitude, pxPerUnit, hardCap);
  if (lengthPx <= 0) return null;
  const geo = arrowGeometry(originPx, angleDeg, lengthPx, {
    headLength: opts.headLength ?? 9,
    headWidth: opts.headWidth ?? 6.5,
  });
  const labelPos = labelAnchor({ x: geo.x2, y: geo.y2 }, angleDeg, opts.labelGap ?? 34);
  const text = `${opts.labelPrefix} ${fmt(magnitude, opts.digits ?? 1)}`;
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

/* ---------- UNIFORM レイアウト ---------- */
// params: { r, omega, m, phi }  phi(rad)=現在の回転角。円周上の点の位置そのもの。
function computeUniformLayout(params) {
  const { r, omega, m, phi } = params;
  const R = r * PX_PER_METER;
  const marker = worldToScreen(r * Math.cos(phi), r * Math.sin(phi));

  const v = tangentialSpeed(r, omega);
  const a = centripetalAccel(r, omega);
  const F = centripetalForce(m, r, omega);
  const T = period(omega);

  const velAngleDeg = phi * R2D + 90; // 接線方向(反時計回りに前向き)
  const accAngleDeg = phi * R2D + 180; // 中心向き

  const arrows = [];
  const vArrow = buildArrowAt("v", marker, velAngleDeg, v, velScale(), VEL_HARD_CAP, "var(--c2)", {
    labelPrefix: "v",
    labelColor: "var(--c2t)",
  });
  if (vArrow) arrows.push(vArrow);
  const aArrow = buildArrowAt(
    "a",
    marker,
    accAngleDeg,
    a,
    accScale(),
    Math.min(ACC_HARD_CAP, R * 0.85),
    "var(--c4)",
    { labelPrefix: "a", labelColor: "var(--c4t)" }
  );
  if (aArrow) arrows.push(aArrow);

  return {
    box: RING_BOX,
    center: RING_CENTER,
    circleR: R,
    marker,
    arrows,
    axisTicks: [],
    stats: { v, a, F, T, m, r, omega },
  };
}

/* ---------- HORIZONTAL レイアウト ---------- */
// params: { r, omega, m, mu, phi }
function computeHorizontalLayout(params) {
  const { r, omega, m, mu, phi } = params;
  const R = r * PX_PER_METER;
  const marker = worldToScreen(r * Math.cos(phi), r * Math.sin(phi));

  const v = tangentialSpeed(r, omega);
  const Freq = requiredFriction(m, r, omega);
  const Fmax = maxStaticFriction(mu, m);
  const omegaCrit = criticalOmega(mu, r);
  const slipping = isSlipping(mu, m, r, omega);

  const velAngleDeg = phi * R2D + 90;
  const forceAngleDeg = phi * R2D + 180;

  const arrows = [];
  const vArrow = buildArrowAt("v", marker, velAngleDeg, v, velScale(), VEL_HARD_CAP, "var(--c2)", {
    labelPrefix: "v",
    labelColor: "var(--c2t)",
  });
  if (vArrow) arrows.push(vArrow);
  const fArrow = buildArrowAt(
    "f",
    marker,
    forceAngleDeg,
    Freq,
    forceScale(),
    Math.min(FORCE_HARD_CAP, R * 0.85),
    "var(--c4)",
    { labelPrefix: "F", labelColor: "var(--c4t)" }
  );
  if (fArrow) arrows.push(fArrow);

  return {
    box: RING_BOX,
    center: RING_CENTER,
    circleR: R,
    marker,
    arrows,
    axisTicks: [],
    stats: { v, Freq, Fmax, omegaCrit, slipping, m, r, omega, mu },
  };
}

/* ---------- VERTICAL レイアウト ---------- */
// params: { r, omega, m, theta }  theta(rad, 0=最下点、反時計回りに増加)
function computeVerticalLayout(params) {
  const { r, omega, m, theta } = params;
  const R = r * PX_PER_METER;
  const marker = worldToScreen(r * Math.sin(theta), -r * Math.cos(theta));

  const v0 = bottomSpeed(r, omega);
  const v2 = Math.max(speedSquaredAt(theta, r, v0), 0);
  const v = Math.sqrt(v2);
  const N = (m * v2) / r + m * G * Math.cos(theta);
  const minV0Sq = minBottomSpeedSquaredToComplete(r);
  const canComplete = v0 * v0 >= minV0Sq;

  const velAngleDeg = theta * R2D;
  const normalAngleDeg = theta * R2D + 90;

  const arrows = [];
  const vArrow = buildArrowAt("v", marker, velAngleDeg, v, velScale(), VEL_HARD_CAP, "var(--c2)", {
    labelPrefix: "v",
    labelColor: "var(--c2t)",
  });
  if (vArrow) arrows.push(vArrow);
  if (N > 0) {
    const nArrow = buildArrowAt(
      "n",
      marker,
      normalAngleDeg,
      N,
      forceScale(),
      Math.min(FORCE_HARD_CAP, R * 0.85),
      "var(--c3)",
      { labelPrefix: "N", labelColor: "var(--c3t)" }
    );
    if (nArrow) arrows.push(nArrow);
  }

  return {
    box: RING_BOX,
    center: RING_CENTER,
    circleR: R,
    marker,
    arrows,
    axisTicks: [],
    stats: { v, v0, N, minV0Sq, canComplete, m, r, omega, theta },
  };
}

/* ---------- CONICAL PENDULUM: 3D世界座標 ---------- */
// params: { L, thetaDeg, phi, m }  phi(rad)=回転位相。thetaDeg=半頂角(度)。
// 戻り値はワールド座標(z軸上向き正、ひもの支点を原点、おもりは支点より下=z<0)。
function computeConicalWorldPoints(params) {
  const { L, thetaDeg, phi } = params;
  const theta = thetaDeg * D2R;
  const r = conicalRadius(L, theta);
  const h = conicalDrop(L, theta);
  const pivot = [0, 0, 0];
  const mass = [r * Math.cos(phi), r * Math.sin(phi), -h];
  const tangentDir = [-Math.sin(phi), Math.cos(phi), 0]; // 水平面内、速度の向き
  const tensionDir = [-Math.sin(theta) * Math.cos(phi), -Math.sin(theta) * Math.sin(phi), Math.cos(theta)]; // おもり→支点
  const orbit = [];
  const N_ORBIT = 48;
  for (let i = 0; i <= N_ORBIT; i++) {
    const a = (i / N_ORBIT) * TAU;
    orbit.push([r * Math.cos(a), r * Math.sin(a), -h]);
  }
  return { pivot, mass, tangentDir, tensionDir, orbit, r, h, theta };
}

function addScaled(p, dir, s) {
  return [p[0] + dir[0] * s, p[1] + dir[1] * s, p[2] + dir[2] * s];
}

// カメラのfitToViewport用の基準点(支点+軌道円のx/y端4点)。おもり自身の位置(phiで動く)を
// 使わないのは、phiが変わるたびに投影の拡大率が変わって画面がガタつくのを防ぐため。
// html/phys-circular-motion.html とcheck-phys-circular-motion-overlaps.mjsの両方から、
// L・thetaDegが変わるたびに(phiが変わるたびではなく)呼び出す想定。
function conicalBoundsPoints(L, thetaDeg) {
  const theta = thetaDeg * D2R;
  const r = conicalRadius(L, theta);
  const h = conicalDrop(L, theta);
  return [
    [0, 0, 0],
    [r, 0, -h],
    [-r, 0, -h],
    [0, r, -h],
    [0, -r, -h],
  ];
}

// 画面px座標2点から、vector-diagram-engineの角度規約(度数法、0°=+x、反時計回り正、
// y上向き正)に合わせた角度を作る。スクリーン座標はy下向き正なので符号を反転する。
const DIR_EPS = 1; // ワールド単位。project()は線形(正射影)なので大きさは角度に影響しない
function directionAngleDeg(originPx, tipPx) {
  const dx = tipPx.x - originPx.x;
  const dy = tipPx.y - originPx.y;
  return toPolar(dx, -dy).angleDeg;
}

// projectPoint: ワールド座標の点(3要素配列)を画面px座標{x,y}に変換する関数。
// 呼び出し側(html/phys-circular-motion.html、check-phys-circular-motion-overlaps.mjs)が
// projection-engine.mjs の makeCamera/project/fitToViewport/toScreen を使って組み立てて渡す。
// このファイル自身はprojection-engine.mjsをimportしない。
// 2つの角度(度)の「向きの近さ」を0〜90で返す(0=同じ向きまたは正反対、90=直交)。
// 3D空間ではT(ひもの向き)とv(接線方向)は常に直交するが、画面に投影すると視点によっては
// 見かけ上ほぼ同じ向きになることがあるため、ラベルの間隔をその場合だけ広げる。
function angleClosenessDeg(a, b) {
  let d = Math.abs(a - b) % 180;
  if (d > 90) d = 180 - d;
  return 90 - d; // 0=直交、90=同じ向き/正反対
}

function computeConicalScreenLayout(params, projectPoint) {
  const world = computeConicalWorldPoints(params);
  const theta = world.theta;
  const omega = conicalOmega(params.L, theta);
  const v = tangentialSpeed(world.r, omega);
  const T = conicalTension(params.m, theta);

  const originPx = projectPoint(world.mass);
  const tTipPx = projectPoint(addScaled(world.mass, world.tensionDir, DIR_EPS));
  const vTipPx = projectPoint(addScaled(world.mass, world.tangentDir, DIR_EPS));
  const angleT = directionAngleDeg(originPx, tTipPx);
  const angleV = directionAngleDeg(originPx, vTipPx);
  // 画面上でTとvの向きが近い(視点によって起こる)ときは、ラベルが重ならないよう
  // vのラベルだけ矢印の先からさらに離す。
  const closeness = angleClosenessDeg(angleT, angleV);
  const vLabelGap = 34 + closeness * 1.3;

  const arrows = [];
  const tArrow = buildArrowAt("T", originPx, angleT, T, forceScale(), FORCE_HARD_CAP, "var(--c4)", {
    labelPrefix: "T",
    labelColor: "var(--c4t)",
    labelGap: 34,
  });
  if (tArrow) arrows.push(tArrow);
  const vArrow = buildArrowAt("v", originPx, angleV, v, velScale(), VEL_HARD_CAP, "var(--c2)", {
    labelPrefix: "v",
    labelColor: "var(--c2t)",
    labelGap: vLabelGap,
  });
  if (vArrow) arrows.push(vArrow);

  const pivotPx = projectPoint(world.pivot);
  const orbitPx = world.orbit.map(projectPoint);

  return {
    marker: originPx,
    pivot: pivotPx,
    orbit: orbitPx,
    arrows,
    axisTicks: [],
    stats: { omega, v, T, r: world.r, h: world.h, theta, L: params.L, m: params.m },
  };
}

export {
  G,
  period,
  tangentialSpeed,
  centripetalAccel,
  centripetalForce,
  requiredFriction,
  maxStaticFriction,
  criticalOmega,
  isSlipping,
  bottomSpeed,
  speedSquaredAt,
  normalForceAt,
  minBottomSpeedSquaredToComplete,
  conicalOmega,
  conicalTension,
  conicalRadius,
  conicalDrop,
  bridgeValues,
  RING_BOX,
  RING_CENTER,
  PX_PER_METER,
  worldToScreen,
  labelBox,
  fmt,
  computeUniformLayout,
  computeHorizontalLayout,
  computeVerticalLayout,
  computeConicalWorldPoints,
  addScaled,
  conicalBoundsPoints,
  directionAngleDeg,
  DIR_EPS,
  computeConicalScreenLayout,
};
