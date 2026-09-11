// vector-diagram-engine.mjs のテスト。node:test のみ使用。座標・角度はすべて幾何学的な
// 値として扱い、力や速度など特定の物理量には結びつけない。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toCartesian,
  toPolar,
  sumVectors,
  flipToScreen,
  magnitudeToLength,
  computeScale,
  arrowGeometry,
  labelAnchor,
} from "./vector-diagram-engine.mjs";

const EPS = 1e-9;
function approxEqual(actual, expected, msg) {
  assert.ok(
    Math.abs(actual - expected) < EPS,
    (msg ? msg + ": " : "") + `expected ${expected}, got ${actual}`
  );
}

// ---------- toCartesian ----------

test("toCartesian: 角度0は+x方向", () => {
  const v = toCartesian(0, 5);
  approxEqual(v.fx, 5);
  approxEqual(v.fy, 0);
});

test("toCartesian: 角度90は+y方向(上向き)", () => {
  const v = toCartesian(90, 3);
  approxEqual(v.fx, 0);
  approxEqual(v.fy, 3);
});

test("toCartesian: 角度180は-x方向", () => {
  const v = toCartesian(180, 2);
  approxEqual(v.fx, -2);
  approxEqual(v.fy, 0);
});

test("toCartesian: 角度270(または-90)は-y方向(下向き)", () => {
  const v1 = toCartesian(270, 4);
  const v2 = toCartesian(-90, 4);
  approxEqual(v1.fx, 0);
  approxEqual(v1.fy, -4);
  approxEqual(v2.fx, 0);
  approxEqual(v2.fy, -4);
});

// ---------- toPolar ----------

test("toPolar: (1,0)は角度0", () => {
  const p = toPolar(1, 0);
  approxEqual(p.angleDeg, 0);
  approxEqual(p.magnitude, 1);
});

test("toPolar: (0,1)は角度90", () => {
  const p = toPolar(0, 1);
  approxEqual(p.angleDeg, 90);
  approxEqual(p.magnitude, 1);
});

test("toPolar: 負の成分は[0,360)に正規化される", () => {
  const p = toPolar(0, -1);
  approxEqual(p.angleDeg, 270);
});

test("toPolar: (0,0)はangleDeg=0・magnitude=0(NaNにならない)", () => {
  const p = toPolar(0, 0);
  approxEqual(p.angleDeg, 0);
  approxEqual(p.magnitude, 0);
});

test("toCartesianとtoPolarは互いに逆変換になる", () => {
  for (const [angle, mag] of [[37, 4], [123, 1.5], [-60, 9], [359, 0.01]]) {
    const v = toCartesian(angle, mag);
    const p = toPolar(v.fx, v.fy);
    approxEqual(p.magnitude, mag, `magnitude angle=${angle}`);
    const normalizedAngle = ((angle % 360) + 360) % 360;
    approxEqual(p.angleDeg, normalizedAngle, `angle angle=${angle}`);
  }
});

// ---------- sumVectors ----------

test("sumVectors: 空配列は{fx:0,fy:0}", () => {
  assert.deepEqual(sumVectors([]), { fx: 0, fy: 0 });
});

test("sumVectors: 直交する2成分を単純に足す(速度の合成)", () => {
  const r = sumVectors([{ fx: 3, fy: 0 }, { fx: 0, fy: 4 }]);
  approxEqual(r.fx, 3);
  approxEqual(r.fy, 4);
  approxEqual(toPolar(r.fx, r.fy).magnitude, 5);
});

test("sumVectors: 3つ以上のベクトルも足せる", () => {
  const r = sumVectors([{ fx: 1, fy: 1 }, { fx: 2, fy: -1 }, { fx: -0.5, fy: 0.5 }]);
  approxEqual(r.fx, 2.5);
  approxEqual(r.fy, 0.5);
});

// ---------- flipToScreen ----------

test("flipToScreen: xはそのまま、yの符号だけ反転する", () => {
  assert.deepEqual(flipToScreen({ x: 3, y: 4 }), { x: 3, y: -4 });
  assert.deepEqual(flipToScreen({ x: -2, y: -5 }), { x: -2, y: 5 });
  const zero = flipToScreen({ x: 0, y: 0 });
  approxEqual(zero.x, 0);
  approxEqual(zero.y, 0);
});

// ---------- magnitudeToLength ----------

test("magnitudeToLength: 大きさ0以下は0", () => {
  approxEqual(magnitudeToLength(0, 10), 0);
  approxEqual(magnitudeToLength(-5, 10), 0);
});

test("magnitudeToLength: pxPerUnit倍した長さになる(下限指定なし)", () => {
  approxEqual(magnitudeToLength(3, 10), 30);
});

test("magnitudeToLength: minPxを下回らない", () => {
  approxEqual(magnitudeToLength(0.1, 10, 5), 5);
  approxEqual(magnitudeToLength(3, 10, 5), 30); // 下限より大きいので下限は効かない
});

// ---------- computeScale ----------

test("computeScale: 最大値がmaxPxになるpxPerUnitを返す", () => {
  const scale = computeScale([2, 8, 4], 40);
  approxEqual(scale, 5); // 8 * 5 = 40
});

test("computeScale: 全て0以下ならスケール0", () => {
  approxEqual(computeScale([0, 0], 40), 0);
});

test("computeScale: 空配列でもスケール0(例外を投げない)", () => {
  approxEqual(computeScale([], 40), 0);
});

test("computeScale: 同じグループ内で共有すれば、各要素の相対的な長さ比が大きさの比と一致する", () => {
  const magnitudes = [3, 9];
  const scale = computeScale(magnitudes, 60);
  const lengths = magnitudes.map((m) => magnitudeToLength(m, scale));
  approxEqual(lengths[1] / lengths[0], magnitudes[1] / magnitudes[0]);
});

// ---------- arrowGeometry ----------

test("arrowGeometry: 角度0は+x方向へ伸びる(originPxから右へ)", () => {
  const a = arrowGeometry({ x: 0, y: 0 }, 0, 10);
  approxEqual(a.x1, 0);
  approxEqual(a.y1, 0);
  approxEqual(a.x2, 10);
  approxEqual(a.y2, 0);
});

test("arrowGeometry: 角度90(物理座標で上向き)は画面px上でyが減る方向へ伸びる", () => {
  const a = arrowGeometry({ x: 0, y: 0 }, 90, 10);
  approxEqual(a.x2, 0);
  approxEqual(a.y2, -10);
});

test("arrowGeometry: 矢じりの3頂点のうち1つは矢印の先端(x2,y2)と一致する", () => {
  const a = arrowGeometry({ x: 5, y: 5 }, 30, 20, { headLength: 6, headWidth: 4 });
  approxEqual(a.head[0].x, a.x2);
  approxEqual(a.head[0].y, a.y2);
});

test("arrowGeometry: headLengthが軸線長を超えていても、矢じりの底辺は原点を超えない", () => {
  const originPx = { x: 0, y: 0 };
  const lengthPx = 5;
  const a = arrowGeometry(originPx, 0, lengthPx, { headLength: 999, headWidth: 4 });
  // 実効headLengthはlengthPxで頭打ちになるので、底辺の2点は原点(x1,y1)に一致する
  approxEqual(a.head[1].x, originPx.x);
  approxEqual(a.head[2].x, originPx.x);
});

test("arrowGeometry: 矢じりの底辺2頂点は軸線について対称", () => {
  const a = arrowGeometry({ x: 0, y: 0 }, 40, 15, { headLength: 5, headWidth: 6 });
  const midX = (a.head[1].x + a.head[2].x) / 2;
  const midY = (a.head[1].y + a.head[2].y) / 2;
  const baseX = a.x2 - (a.x2 - a.x1) * (5 / 15);
  const baseY = a.y2 - (a.y2 - a.y1) * (5 / 15);
  approxEqual(midX, baseX);
  approxEqual(midY, baseY);
});

// ---------- labelAnchor ----------

test("labelAnchor: 角度0ならtipからx方向にgapPxだけ離れる", () => {
  const p = labelAnchor({ x: 10, y: 10 }, 0, 6);
  approxEqual(p.x, 16);
  approxEqual(p.y, 10);
});

test("labelAnchor: 角度90(物理座標で上向き)ならtipから画面px上で上へ(yが減る方向へ)離れる", () => {
  const p = labelAnchor({ x: 10, y: 10 }, 90, 6);
  approxEqual(p.x, 10);
  approxEqual(p.y, 4);
});
