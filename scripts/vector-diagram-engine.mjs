// 汎用の2Dベクトル矢印描画エンジン。成分分解・合成・スケール変換・矢印の幾何計算だけを扱う。
// 力学の知識(力とは何か、質量、単位)は一切持ち込まない。「原点・角度・大きさ」の
// 組から矢印のSVG座標を作るだけの純粋関数の集まりで、力にも速度にも同じ関数を使い回せる。
//
// projection-engine.mjs は import しない。教材HTMLには埋め込みJSONと同様、
// このファイルの中身をそのまま1つの<script>ブロックに埋め込む運用のため、
// 3D教材のように projection-engine.mjs も同じ画面で埋め込む場合に
// 関数名が衝突しない・importの解決が要らない、という2点を優先した設計。
//
// ブラウザでもそのまま動くこと。Node固有のAPIは使わない。ESM export のみ。外部ライブラリ禁止。
//
// 角度の規約: 度数法、0°=+x方向、反時計回りが正（物理でふつうに使う向き）。
// SVGの画面座標はy軸が下向きに正なので、その変換(反転)は各関数の内部で閉じる。
//
// 型（コメントのみ、実行時チェックはしない）
//   Vector    = { fx: number, fy: number }                 物理座標系での成分(y上向き正)
//   Point     = { x: number, y: number }
//   ArrowOpts = { headLength?: number, headWidth?: number }
//   Arrow     = { x1, y1, x2, y2: number, head: [Point, Point, Point] }  すべて画面px

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// ---------- toCartesian ----------
// 角度(度)と大きさから成分に分解する。
function toCartesian(angleDeg, magnitude) {
  const rad = angleDeg * D2R;
  return {
    fx: magnitude * Math.cos(rad),
    fy: magnitude * Math.sin(rad),
  };
}

// ---------- toPolar ----------
// 成分から角度(度, [0,360)に正規化)と大きさに戻す。fx=fy=0のときangleDegは0とする。
function toPolar(fx, fy) {
  const magnitude = Math.hypot(fx, fy);
  if (magnitude === 0) return { angleDeg: 0, magnitude: 0 };
  const deg = Math.atan2(fy, fx) * R2D;
  return { angleDeg: ((deg % 360) + 360) % 360, magnitude };
}

// ---------- sumVectors ----------
// 複数のベクトル(成分表示)を単純に足し合わせる。合力にも速度の合成にも使う。
// 空配列は{fx:0, fy:0}を返す(「その方向には何もない」を自然に表せるようにする)。
function sumVectors(vectors) {
  let fx = 0, fy = 0;
  for (const v of vectors) {
    fx += v.fx;
    fy += v.fy;
  }
  return { fx, fy };
}

// ---------- flipToScreen ----------
// 物理座標(y上向き正)の点を、画面座標の向き(y下向き正)に直す。xはそのまま。
// まだpx化はしない(ワールド座標→px座標のスケール・原点位置は教材ごとのステージに
// 依存するため、この関数の外、教材側のコードが担当する)。
function flipToScreen(point) {
  return { x: point.x, y: -point.y };
}

// ---------- magnitudeToLength ----------
// 大きさをpxの矢印長に変換する。magnitudeが0以下なら0(=描画しない扱い)を返す。
// minPxを指定すると、それより短くならない下限を設けられる(既定0、つまり比例を厳守)。
function magnitudeToLength(magnitude, pxPerUnit, minPx = 0) {
  if (magnitude <= 0) return 0;
  return Math.max(magnitude * pxPerUnit, minPx);
}

// ---------- computeScale ----------
// 同じ画面・同じフレームで並べて描く一群の大きさ(magnitudes)から、
// 最大値がmaxPxになるようなpxPerUnitを作る。単位の異なる量(速度と力など)を
// 混ぜて渡さないこと(呼び出し側がグループを分けて別々に呼ぶ)。
// 全て0以下ならスケール0を返す(何も描かれない)。
function computeScale(magnitudes, maxPx) {
  const maxMag = Math.max(0, ...magnitudes);
  if (maxMag === 0) return 0;
  return maxPx / maxMag;
}

// ---------- arrowGeometry ----------
// 画面px座標の原点・物理角度(度)・矢印の長さ(px)から、軸線と矢じり(三角形)の
// 座標を作る。角度は物理座標の向き(0°=+x, 反時計回り正)のまま渡してよく、
// y反転を含む画面上の方向への変換はこの関数の内部で行う。
// 矢じりの長さが軸線長を超えて軸線からはみ出さないよう、headLengthはlengthPxで頭打ちにする。
function arrowGeometry(originPx, angleDeg, lengthPx, opts = {}) {
  const headLength = Math.min(opts.headLength ?? 10, lengthPx);
  const headWidth = opts.headWidth ?? 7;

  const rad = angleDeg * D2R;
  const dx = Math.cos(rad);
  const dy = -Math.sin(rad);

  const x2 = originPx.x + dx * lengthPx;
  const y2 = originPx.y + dy * lengthPx;
  const baseX = x2 - dx * headLength;
  const baseY = y2 - dy * headLength;
  const nx = -dy;
  const ny = dx;

  return {
    x1: originPx.x,
    y1: originPx.y,
    x2,
    y2,
    head: [
      { x: x2, y: y2 },
      { x: baseX + (nx * headWidth) / 2, y: baseY + (ny * headWidth) / 2 },
      { x: baseX - (nx * headWidth) / 2, y: baseY - (ny * headWidth) / 2 },
    ],
  };
}

// ---------- labelAnchor ----------
// 矢じりの先端から、同じ角度の延長線上にgapPxだけ離れた位置を返す。
// 矢印の大きさを示す数値ラベルの置き場所に使う。
function labelAnchor(tipPx, angleDeg, gapPx) {
  const rad = angleDeg * D2R;
  return {
    x: tipPx.x + Math.cos(rad) * gapPx,
    y: tipPx.y - Math.sin(rad) * gapPx,
  };
}

export {
  toCartesian,
  toPolar,
  sumVectors,
  flipToScreen,
  magnitudeToLength,
  computeScale,
  arrowGeometry,
  labelAnchor,
};
