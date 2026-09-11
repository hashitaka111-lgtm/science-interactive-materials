// html/phys-rigid-body-equilibrium.html のラベル重なり検証に使う純粋な幾何判定関数群。
// DOM・ブラウザ非依存。Node標準機能のみ、依存パッケージなし。
//
// この教材のSVGは「棒(横線)+4本の力の矢印+ラベル+軸目盛りテキスト」で構成される。
// html/phys-rigid-body-equilibrium.html の <script> 内にある computeScene(params) が
// 矢印(軸線分・矢じり多角形)とラベル(矩形)の実座標を計算して window.__debugScene として
// 公開しており、本スクリプトの checkScene() はその戻り値(シーン記述)を受け取って
// 以下4種類の交差をチェックする。
//   - 矢印の線分×ラベル矩形
//   - 矢印の矢じり(多角形)×ラベル矩形
//   - ラベル×ラベル
//   - ラベル×軸目盛りのテキスト
//
// 実際の検証(ブラウザでHTMLを開いてcomputeScene()を複数パラメータで呼び出し、
// このファイルの関数で判定する)は開発時に手動で実行する。このファイル自体は
// 交差判定ロジックのみを提供する純粋関数の集まりで、下のmain()は判定ロジック自体が
// 正しく動くかを確認する自己テスト(既知の重なりあり/なしケース)。
//
//   node scripts/check-phys-rigid-body-equilibrium-diagram.mjs   自己テストを実行

// ---------- rectsOverlap ----------
// 軸並行の矩形同士が重なっているか。接するだけ(境界が一致)は重なりとしない。
function rectsOverlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

// ---------- segSegIntersect ----------
// 線分同士が交差しているか(端点の一致・共線は考慮しない単純判定。
// ラベル回避の判定用途では十分)。
function cross(ax, ay, bx, by) {
  return ax * by - ay * bx;
}
function segSegIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = cross(x4 - x3, y4 - y3, x1 - x3, y1 - y3);
  const d2 = cross(x4 - x3, y4 - y3, x2 - x3, y2 - y3);
  const d3 = cross(x2 - x1, y2 - y1, x3 - x1, y3 - y1);
  const d4 = cross(x2 - x1, y2 - y1, x4 - x1, y4 - y1);
  const s1 = (d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0);
  const s2 = (d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0);
  return s1 && s2;
}

// ---------- segRectOverlap ----------
// 線分が矩形と重なっているか(端点が矩形内、または矩形の4辺のいずれかと交差)。
function segRectOverlap(seg, rect) {
  const inside = (x, y) => x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1;
  if (inside(seg.x1, seg.y1) || inside(seg.x2, seg.y2)) return true;
  const edges = [
    [rect.x0, rect.y0, rect.x1, rect.y0],
    [rect.x1, rect.y0, rect.x1, rect.y1],
    [rect.x1, rect.y1, rect.x0, rect.y1],
    [rect.x0, rect.y1, rect.x0, rect.y0],
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    if (segSegIntersect(seg.x1, seg.y1, seg.x2, seg.y2, ex1, ey1, ex2, ey2)) return true;
  }
  return false;
}

// ---------- polyRectOverlap ----------
// 凸多角形(矢じり)と矩形(ラベル)が重なっているか。分離軸定理(SAT)で判定する。
// 矢じりは3点の三角形、矩形は4点、どちらも凸なのでSATがそのまま使える。
function projectPoints(pts, axis) {
  let min = Infinity, max = -Infinity;
  for (const p of pts) {
    const d = p.x * axis.x + p.y * axis.y;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}
function polyRectOverlap(poly, rect) {
  const rectPts = [
    { x: rect.x0, y: rect.y0 },
    { x: rect.x1, y: rect.y0 },
    { x: rect.x1, y: rect.y1 },
    { x: rect.x0, y: rect.y1 },
  ];
  const axes = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i], p2 = poly[(i + 1) % poly.length];
    const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
    axes.push({ x: -edge.y, y: edge.x });
  }
  for (const axis of axes) {
    const [aMin, aMax] = projectPoints(poly, axis);
    const [bMin, bMax] = projectPoints(rectPts, axis);
    if (aMax < bMin || bMax < aMin) return false;
  }
  return true;
}

// ---------- checkScene ----------
// シーン記述(html側のcomputeScene()の戻り値と同じ形)を受け取り、4種類の交差を
// 全数チェックする。戻り値: { ok: boolean, violations: string[] }
//   scene.arrows      : [{ key, lenPx, geo:{x1,y1,x2,y2,head:[{x,y}x3]} }, ...] (lenPx<=0は除外)
//   scene.placedLabels: [{ key, text, box:{x0,y0,x1,y1} }, ...]  (力のラベル)
//   scene.dimLabels   : [{ key, text, box }, ...]                (腕の長さのラベル)
//   scene.tickLabels  : [{ key, text, box }, ...]                (軸目盛り相当のラベル)
function checkScene(scene) {
  const violations = [];
  const arrows = (scene.arrows || []).filter((a) => a.lenPx > 0);
  const vectorLabels = [...(scene.placedLabels || []), ...(scene.dimLabels || [])];
  const tickLabels = scene.tickLabels || [];

  // 1) 矢印の線分 × ラベル矩形(力のラベル・腕のラベルの両方が対象)
  for (const a of arrows) {
    const seg = { x1: a.geo.x1, y1: a.geo.y1, x2: a.geo.x2, y2: a.geo.y2 };
    for (const lbl of vectorLabels) {
      if (segRectOverlap(seg, lbl.box)) {
        violations.push(`矢印の線分×ラベル矩形: 矢印[${a.key}]の軸線 × ラベル[${lbl.key}]("${lbl.text}")`);
      }
    }
  }

  // 2) 矢印の矢じり(多角形) × ラベル矩形
  for (const a of arrows) {
    for (const lbl of vectorLabels) {
      if (polyRectOverlap(a.geo.head, lbl.box)) {
        violations.push(`矢じり×ラベル矩形: 矢印[${a.key}]の矢じり × ラベル[${lbl.key}]("${lbl.text}")`);
      }
    }
  }

  // 3) ラベル × ラベル(力のラベル・腕のラベル・軸目盛りラベルすべての組み合わせ)
  const allLabels = [...vectorLabels, ...tickLabels];
  for (let i = 0; i < allLabels.length; i++) {
    for (let j = i + 1; j < allLabels.length; j++) {
      if (rectsOverlap(allLabels[i].box, allLabels[j].box)) {
        violations.push(`ラベル×ラベル: [${allLabels[i].key}]("${allLabels[i].text}") × [${allLabels[j].key}]("${allLabels[j].text}")`);
      }
    }
  }

  // 4) ラベル(力・腕) × 軸目盛りのテキスト
  for (const lbl of vectorLabels) {
    for (const tick of tickLabels) {
      if (rectsOverlap(lbl.box, tick.box)) {
        violations.push(`ラベル×軸目盛り: [${lbl.key}]("${lbl.text}") × 目盛り[${tick.key}]("${tick.text}")`);
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

// ---------- 自己テスト(判定ロジック自体の正しさを確認する) ----------
function assert(cond, msg) {
  if (!cond) throw new Error(`自己テスト失敗: ${msg}`);
}

function runSelfTest() {
  // rectsOverlap
  assert(rectsOverlap({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 5, y0: 5, x1: 15, y1: 15 }), "rectsOverlap: 重なるはずの矩形が重ならない判定");
  assert(!rectsOverlap({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 20, y0: 20, x1: 30, y1: 30 }), "rectsOverlap: 離れた矩形が重なる判定");
  assert(!rectsOverlap({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 10, y0: 0, x1: 20, y1: 10 }), "rectsOverlap: 辺が接するだけの矩形を重なりと判定");

  // segRectOverlap
  assert(segRectOverlap({ x1: -5, y1: 5, x2: 15, y2: 5 }, { x0: 0, y0: 0, x1: 10, y1: 10 }), "segRectOverlap: 矩形を貫通する線分を検出できない");
  assert(!segRectOverlap({ x1: -5, y1: -5, x2: -1, y2: -1 }, { x0: 0, y0: 0, x1: 10, y1: 10 }), "segRectOverlap: 矩形から離れた線分を交差と判定");
  assert(segRectOverlap({ x1: 5, y1: 5, x2: 5, y2: 5 }, { x0: 0, y0: 0, x1: 10, y1: 10 }), "segRectOverlap: 矩形内の点(退化線分)を検出できない");

  // polyRectOverlap(矢じりの三角形を模したテスト)
  const tri = [{ x: 5, y: 5 }, { x: 5, y: -5 }, { x: -5, y: 0 }];
  assert(polyRectOverlap(tri, { x0: -2, y0: -2, x1: 2, y1: 2 }), "polyRectOverlap: 矩形と重なる三角形を検出できない");
  assert(!polyRectOverlap(tri, { x0: 20, y0: 20, x1: 30, y1: 30 }), "polyRectOverlap: 離れた三角形を重なると判定");
  assert(!polyRectOverlap(tri, { x0: -30, y0: -30, x1: -20, y1: -20 }), "polyRectOverlap: 分離軸のある配置を重なると判定(偽陽性)");

  // checkScene(統合テスト): わざと重なるシーンと、重ならないシーンの両方を確認
  const overlappingScene = {
    arrows: [{ key: "F", lenPx: 20, geo: { x1: 0, y1: 0, x2: 20, y2: 0, head: [{ x: 20, y: 0 }, { x: 15, y: 3 }, { x: 15, y: -3 }] } }],
    placedLabels: [{ key: "F_label", text: "F 10.00 N", box: { x0: 10, y0: -3, x1: 30, y1: 3 } }],
    dimLabels: [],
    tickLabels: [{ key: "tick0", text: "0 m", box: { x0: 8, y0: -1, x1: 12, y1: 1 } }],
  };
  const r1 = checkScene(overlappingScene);
  assert(!r1.ok, "checkScene: 明らかに重なるシーンをokと判定してしまう");

  const cleanScene = {
    arrows: [{ key: "F", lenPx: 20, geo: { x1: 0, y1: 0, x2: 20, y2: 0, head: [{ x: 20, y: 0 }, { x: 15, y: 3 }, { x: 15, y: -3 }] } }],
    placedLabels: [{ key: "F_label", text: "F 10.00 N", box: { x0: 40, y0: -3, x1: 60, y1: 3 } }],
    dimLabels: [],
    tickLabels: [{ key: "tick0", text: "0 m", box: { x0: -10, y0: 20, x1: -2, y1: 22 } }],
  };
  const r2 = checkScene(cleanScene);
  assert(r2.ok, `checkScene: 重ならないはずのシーンで違反を検出してしまった: ${JSON.stringify(r2.violations)}`);

  console.log("[check-phys-rigid-body-equilibrium-diagram] 自己テスト: 全て成功");
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  try {
    runSelfTest();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

export { rectsOverlap, segSegIntersect, segRectOverlap, polyRectOverlap, checkScene };
