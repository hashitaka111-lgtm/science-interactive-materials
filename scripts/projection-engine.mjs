// 汎用の3D→2D投影エンジン。回転(方位角・仰角からのカメラ基底)・投影(点→画面座標)・
// 深度(点→奥行きの並べ替えキー)だけを扱う。特定の教材・特定の図形の知識は一切持ち込まない。
//
// html/charged-particle-3d.html の setCam/P3/DEP を汎用化したもの。あちらは
//   sx = -x*sin(th) + y*cos(th)
//   sy = sin(ph)*(x*cos(th) + y*sin(th)) - z*cos(ph)
//   depth = cos(ph)*(x*cos(th) + y*sin(th)) + z*sin(ph)
// を直接計算していたが、これは点と3本の正規直交基底ベクトル(right/up/forward)との内積に
// 分解できる。ここではその基底ベクトルを作る関数と、内積を取るだけの投影関数に分けてある。
//
// ブラウザでもそのまま動くこと。Node固有のAPIは使わない。ESM export のみ。外部ライブラリ禁止。
//
// 型（コメントのみ、実行時チェックはしない）
//   Vec3      = [number, number, number]
//   Camera    = { right: Vec3, up: Vec3, forward: Vec3 }   互いに直交する単位ベクトル
//   Projected = { x: number, y: number, depth: number }    カメラ空間での座標(まだ画面px化していない)
//   Bounds    = { minX: number, maxX: number, minY: number, maxY: number }
//   Viewport  = { x: number, y: number, w: number, h: number }  画面上の描画先の矩形(px)
//   Transform = { scale: number, originX: number, originY: number }

const D2R = Math.PI / 180;

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// ---------- makeCamera ----------
// 「対象を中心に周回するカメラ」のモデル。方位角(azimuthDeg)で z 軸まわりに回し、
// 仰角(elevationDeg)で水平面から傾ける。azimuthDeg=0, elevationDeg=0 のとき
// right=(0,1,0), up=(0,0,-1), forward=(1,0,0) になり、+x 方向から見た状態になる。
function makeCamera(azimuthDeg, elevationDeg) {
  const th = azimuthDeg * D2R;
  const ph = elevationDeg * D2R;
  const ca = Math.cos(th), sa = Math.sin(th);
  const ce = Math.cos(ph), se = Math.sin(ph);
  return {
    right: [-sa, ca, 0],
    up: [se * ca, se * sa, -ce],
    forward: [ce * ca, ce * sa, se],
  };
}

// ---------- project ----------
// 点をカメラ基底に投影する。x/y はまだ画面pxではなく無次元のカメラ空間座標、
// depth は forward 方向への内積で、値が大きいほどカメラに近い(手前)。
function project(point, camera) {
  return {
    x: dot3(point, camera.right),
    y: dot3(point, camera.up),
    depth: dot3(point, camera.forward),
  };
}

// ---------- boundsOf ----------
// project() 済みの点列から、x/y それぞれの最小・最大を求める。
function boundsOf(projectedPoints) {
  if (!projectedPoints.length) {
    throw new Error("boundsOf: 空の配列です");
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of projectedPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

// ---------- fitToViewport ----------
// bounds をアスペクト比を保ったまま viewport(px)に収めるための変換を作る。
// 縦横で余りが出た軸は詰めず、bounds の最小値を viewport の左上(x,y)に合わせる
// (中央寄せはしない)。bounds の幅または高さが 0 のとき(点が1つだけ、等)は
// その軸を 1 とみなし、0 除算や Infinity を出さない。
function fitToViewport(bounds, viewport) {
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;
  const scale = Math.min(viewport.w / rangeX, viewport.h / rangeY);
  return {
    scale,
    originX: viewport.x - bounds.minX * scale,
    originY: viewport.y - bounds.minY * scale,
  };
}

// ---------- toScreen ----------
// project() の結果(カメラ空間座標)を、fitToViewport() の変換で画面px座標にする。
function toScreen(projected, transform) {
  return {
    x: transform.originX + projected.x * transform.scale,
    y: transform.originY + projected.y * transform.scale,
  };
}

// ---------- paintersOrder ----------
// depth(値が大きいほど手前)をもとに、奥から手前の順に並べ替えた新しい配列を返す。
// ペインターズアルゴリズム用: この順に描けば、手前のものが奥のものを正しく隠す。
// 元の配列は変更しない。
function paintersOrder(items, depthOf) {
  return [...items].sort((a, b) => depthOf(a) - depthOf(b));
}

export { makeCamera, project, boundsOf, fitToViewport, toScreen, paintersOrder };
