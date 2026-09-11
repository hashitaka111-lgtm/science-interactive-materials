// projection-engine.mjs のテスト。node:test のみ使用。座標はすべて幾何学的な値で、
// どの教材にも属さない単なる点として扱う。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeCamera,
  project,
  boundsOf,
  fitToViewport,
  toScreen,
  paintersOrder,
} from "./projection-engine.mjs";

const EPS = 1e-9;
function approxEqual(actual, expected, msg) {
  assert.ok(
    Math.abs(actual - expected) < EPS,
    (msg ? msg + ": " : "") + `expected ${expected}, got ${actual}`
  );
}
function approxVec(actual, expected, msg) {
  for (let i = 0; i < 3; i++) {
    approxEqual(actual[i], expected[i], (msg || "vec") + `[${i}]`);
  }
}

// html/charged-particle-3d.html の setCam/P3/DEP が直接計算していた式をそのまま再現した
// ローカル関数。projection-engine.mjs がそれと同じ値を返すことを確かめる基準にする。
function referenceSx(th, ph, x, y) {
  return -x * Math.sin(th) + y * Math.cos(th);
}
function referenceSy(th, ph, x, y, z) {
  return Math.sin(ph) * (x * Math.cos(th) + y * Math.sin(th)) - z * Math.cos(ph);
}
function referenceDepth(th, ph, x, y, z) {
  return Math.cos(ph) * (x * Math.cos(th) + y * Math.sin(th)) + z * Math.sin(ph);
}

// ---------- makeCamera ----------

test("makeCamera: 方位角0・仰角0では+x方向から見た基底になる", () => {
  const cam = makeCamera(0, 0);
  approxVec(cam.right, [0, 1, 0], "right");
  approxVec(cam.up, [0, 0, -1], "up");
  approxVec(cam.forward, [1, 0, 0], "forward");
});

test("makeCamera: right/up/forwardは互いに直交する単位ベクトル", () => {
  for (const [az, el] of [[0, 0], [37, 12], [-90, 45], [180, 84], [-135, 6]]) {
    const cam = makeCamera(az, el);
    for (const v of [cam.right, cam.up, cam.forward]) {
      approxEqual(v[0] * v[0] + v[1] * v[1] + v[2] * v[2], 1, `|v| az=${az} el=${el}`);
    }
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    approxEqual(dot(cam.right, cam.up), 0, `right・up az=${az} el=${el}`);
    approxEqual(dot(cam.right, cam.forward), 0, `right・forward az=${az} el=${el}`);
    approxEqual(dot(cam.up, cam.forward), 0, `up・forward az=${az} el=${el}`);
  }
});

test("makeCamera: 方位角360度ごとに同じ基底に戻る", () => {
  const a = makeCamera(50, 20);
  const b = makeCamera(50 + 360, 20);
  approxVec(b.right, a.right);
  approxVec(b.up, a.up);
  approxVec(b.forward, a.forward);
});

// ---------- project ----------

test("project: 方位角0・仰角0での内積を手計算と突き合わせる", () => {
  const cam = makeCamera(0, 0);
  const p = project([1, 2, 3], cam);
  approxEqual(p.x, 2, "x = dot(point, right)");
  approxEqual(p.y, -3, "y = dot(point, up)");
  approxEqual(p.depth, 1, "depth = dot(point, forward)");
});

test("project: charged-particle-3d.html のsx/sy/depth計算式と一致する", () => {
  const cases = [
    [12, 30, 0.4, -0.7, 0.1],
    [-42, 24, -1, -1, 1],
    [180, 6, 0.72, 0.72, -0.92],
    [-90, 84, 0, 0, 0.5],
    [0, 45, 0.3, 0.9, -0.3],
  ];
  for (const [az, el, x, y, z] of cases) {
    const th = az * Math.PI / 180, ph = el * Math.PI / 180;
    const cam = makeCamera(az, el);
    const p = project([x, y, z], cam);
    approxEqual(p.x, referenceSx(th, ph, x, y), `x az=${az} el=${el}`);
    approxEqual(p.y, referenceSy(th, ph, x, y, z), `y az=${az} el=${el}`);
    approxEqual(p.depth, referenceDepth(th, ph, x, y, z), `depth az=${az} el=${el}`);
  }
});

test("project: 原点はどのカメラでも(0,0,0)に投影される", () => {
  const cam = makeCamera(-123, 67);
  const p = project([0, 0, 0], cam);
  approxEqual(p.x, 0);
  approxEqual(p.y, 0);
  approxEqual(p.depth, 0);
});

// ---------- boundsOf ----------

test("boundsOf: x/yそれぞれの最小最大を求める", () => {
  const pts = [{ x: 1, y: 5 }, { x: -3, y: 2 }, { x: 4, y: -1 }];
  assert.deepEqual(boundsOf(pts), { minX: -3, maxX: 4, minY: -1, maxY: 5 });
});

test("boundsOf: 点が1つでも成立する", () => {
  assert.deepEqual(boundsOf([{ x: 2, y: -2 }]), { minX: 2, maxX: 2, minY: -2, maxY: -2 });
});

test("boundsOf: 空の配列はthrow", () => {
  assert.throws(() => boundsOf([]));
});

// ---------- fitToViewport ----------

test("fitToViewport: 幅の広い矩形は高さ側の縮尺に合わせられる(アスペクト比を保つ)", () => {
  const bounds = { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  const viewport = { x: 0, y: 0, w: 400, h: 100 };
  const t = fitToViewport(bounds, viewport);
  approxEqual(t.scale, 50); // h/2 = 50 < w/2 = 200 なので高さ側が効く
});

test("fitToViewport: boundsの最小点はviewportの左上(x,y)に写る", () => {
  const bounds = { minX: 2, maxX: 6, minY: -3, maxY: 1 };
  const viewport = { x: 10, y: 20, w: 200, h: 200 };
  const t = fitToViewport(bounds, viewport);
  const p0 = toScreen({ x: bounds.minX, y: bounds.minY }, t);
  approxEqual(p0.x, 10);
  approxEqual(p0.y, 20);
});

test("fitToViewport: boundsの最大点はスケールを効かせた軸でviewportの右または下端に写る", () => {
  const bounds = { minX: -1, maxX: 1, minY: -1, maxY: 1 }; // 正方形なのでx,y両方とも詰まる
  const viewport = { x: 0, y: 0, w: 300, h: 300 };
  const t = fitToViewport(bounds, viewport);
  const p1 = toScreen({ x: bounds.maxX, y: bounds.maxY }, t);
  approxEqual(p1.x, 300);
  approxEqual(p1.y, 300);
});

test("fitToViewport: 幅または高さの範囲が0でもNaN/Infinityにならない(点が1つに縮退した場合)", () => {
  const bounds = { minX: 5, maxX: 5, minY: 5, maxY: 5 };
  const viewport = { x: 0, y: 0, w: 100, h: 50 };
  const t = fitToViewport(bounds, viewport);
  assert.ok(Number.isFinite(t.scale));
  assert.ok(Number.isFinite(t.originX));
  assert.ok(Number.isFinite(t.originY));
});

// ---------- toScreen ----------

test("toScreen: project→fitToViewport→toScreenを通した点は全てviewport内に収まる", () => {
  const cam = makeCamera(24, 30);
  const cubeCorners = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    cubeCorners.push([sx, sy, sz]);
  }
  const projected = cubeCorners.map((c) => project(c, cam));
  const bounds = boundsOf(projected);
  const viewport = { x: 10, y: 10, w: 380, h: 280 };
  const t = fitToViewport(bounds, viewport);
  for (const p of projected) {
    const s = toScreen(p, t);
    assert.ok(s.x >= viewport.x - EPS && s.x <= viewport.x + viewport.w + EPS, `x=${s.x}`);
    assert.ok(s.y >= viewport.y - EPS && s.y <= viewport.y + viewport.h + EPS, `y=${s.y}`);
  }
});

// ---------- paintersOrder ----------

test("paintersOrder: depthの昇順(奥から手前)に並べ替える", () => {
  const items = [{ id: "near", depth: 5 }, { id: "far", depth: -2 }, { id: "mid", depth: 0 }];
  const sorted = paintersOrder(items, (it) => it.depth);
  assert.deepEqual(sorted.map((it) => it.id), ["far", "mid", "near"]);
});

test("paintersOrder: 元の配列は変更しない", () => {
  const items = [{ depth: 3 }, { depth: 1 }, { depth: 2 }];
  const before = items.map((it) => it.depth);
  paintersOrder(items, (it) => it.depth);
  assert.deepEqual(items.map((it) => it.depth), before);
});

test("paintersOrder: depthが同じ要素は元の順序を保つ(安定ソート)", () => {
  const items = [
    { id: "a", depth: 1 },
    { id: "b", depth: 1 },
    { id: "c", depth: 0 },
    { id: "d", depth: 1 },
  ];
  const sorted = paintersOrder(items, (it) => it.depth);
  assert.deepEqual(sorted.map((it) => it.id), ["c", "a", "b", "d"]);
});
