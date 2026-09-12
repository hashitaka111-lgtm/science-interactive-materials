// html/phys-circular-motion.html の描画レイアウト(scripts/phys-circular-motion-layout.mjs)が、
// UNIFORM/HORIZONTAL/VERTICAL/CONICAL PENDULUMの4シーンそれぞれで、r・ω・μ・θ・Lなどの
// パラメータを複数パターン振っても、ラベル・矢印・軸目盛りのあらゆる組み合わせで
// 重ならないかを検査する。実装(HTML)とチェックで計算式が食い違わないよう、
// レイアウト計算そのものを phys-circular-motion-layout.mjs からimportして使う(再実装しない)。
//
// 検査する4種類(phys-momentum-impulse用の検査を踏襲):
//   1. 矢印の線分 × ラベル矩形
//   2. 矢印の矢じり(三角形) × ラベル矩形
//   3. ラベル × ラベル
//   4. ラベル × 軸目盛りのテキスト(この教材はどのシーンも軸目盛りを持たないため、
//      該当ラベルが無く常に空集合との比較になる=自動的に満たされる)
//
// CONICAL PENDULUM(円錐振り子)だけは3D→2D投影が要るので、projection-engine.mjsを
// このチェックスクリプトが直接importして使う(phys-circular-motion-layout.mjs自身は
// projection-engine.mjsをimportしない設計のため)。
//
// Node標準機能のみ。依存パッケージなし。
//   node scripts/check-phys-circular-motion-overlaps.mjs

import {
  computeUniformLayout,
  computeHorizontalLayout,
  computeVerticalLayout,
  computeConicalScreenLayout,
  conicalBoundsPoints,
} from "./phys-circular-motion-layout.mjs";
import { makeCamera, project, boundsOf, fitToViewport, toScreen } from "./projection-engine.mjs";

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

/* ---------- 1つのレイアウトについて4種類の交差 + はみ出しを検査する ---------- */
function checkLayout(layout, context) {
  const problems = [];
  const labels = layout.arrows.map((a) => a.label);
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

  if (layout.box) {
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
  }

  if (problems.length) {
    return [`${context}: ${problems.length}件`, ...problems.map((p) => `  ${p}`)];
  }
  return [];
}

/* ---------- パラメータの刻み(range()は両端含む) ---------- */
function range(min, max, n) {
  if (n <= 1) return [min];
  const out = [];
  for (let i = 0; i < n; i++) out.push(min + ((max - min) * i) / (n - 1));
  return out;
}

const R_VALUES = range(0.8, 2.0, 4);
const OMEGA_VALUES = range(1.0, 5.0, 4);
const M_VALUES = range(0.5, 5.0, 3);
const MU_VALUES = range(0.1, 1.0, 3);
const PHI_VALUES = range(0, Math.PI * 2 * (23 / 24), 24); // 0〜2πを24等分(2πちょうどは0と同じなので除く)
const THETA_VALUES = PHI_VALUES; // VERTICALの位置角も同じ刻みで振る

function run() {
  const report = [];
  let total = 0;

  // ---------- UNIFORM ----------
  for (const r of R_VALUES) {
    for (const omega of OMEGA_VALUES) {
      for (const phi of PHI_VALUES) {
        total++;
        const layout = computeUniformLayout({ r, omega, m: 1, phi });
        const context = `[UNIFORM] r=${r.toFixed(2)} omega=${omega.toFixed(2)} phi=${phi.toFixed(2)}`;
        report.push(...checkLayout(layout, context));
      }
    }
  }

  // ---------- HORIZONTAL ----------
  for (const r of R_VALUES) {
    for (const omega of OMEGA_VALUES) {
      for (const m of M_VALUES) {
        for (const mu of MU_VALUES) {
          for (const phi of PHI_VALUES) {
            total++;
            const layout = computeHorizontalLayout({ r, omega, m, mu, phi });
            const context = `[HORIZONTAL] r=${r.toFixed(2)} omega=${omega.toFixed(2)} m=${m.toFixed(2)} mu=${mu.toFixed(2)} phi=${phi.toFixed(2)}`;
            report.push(...checkLayout(layout, context));
          }
        }
      }
    }
  }

  // ---------- VERTICAL ----------
  for (const r of R_VALUES) {
    for (const omega of OMEGA_VALUES) {
      for (const m of M_VALUES) {
        for (const theta of THETA_VALUES) {
          total++;
          const layout = computeVerticalLayout({ r, omega, m, theta });
          const context = `[VERTICAL] r=${r.toFixed(2)} omega=${omega.toFixed(2)} m=${m.toFixed(2)} theta=${theta.toFixed(2)}`;
          report.push(...checkLayout(layout, context));
        }
      }
    }
  }

  // ---------- CONICAL PENDULUM ----------
  const L_VALUES = range(0.5, 2.0, 3);
  const THETA_DEG_VALUES = range(5, 75, 5);
  const CONICAL_PHI_VALUES = range(0, Math.PI * 2 * (7 / 8), 8);
  const CAMERA_VIEWS = [
    { az: 35, el: 22 },
    { az: -20, el: 45 },
    { az: 90, el: 10 },
    { az: 160, el: 60 },
  ];
  const VIEWPORT = { x: 30, y: 30, w: 340, h: 340 };

  for (const view of CAMERA_VIEWS) {
    const camera = makeCamera(view.az, view.el);
    for (const L of L_VALUES) {
      for (const thetaDeg of THETA_DEG_VALUES) {
        for (const phi of CONICAL_PHI_VALUES) {
          total++;
          const params = { L, thetaDeg, phi, m: 1 };
          // bounds(投影後の点群)は、支点・軌道円のx/y端4点で決める(html/phys-circular-motion.html
          // と同じ conicalBoundsPoints() を使い、phiが変わるたびに拡大率が変わらないようにする)。
          const worldPtsForBounds = conicalBoundsPoints(L, thetaDeg);
          const projected = worldPtsForBounds.map((p) => project(p, camera));
          const bounds = boundsOf(projected);
          const transform = fitToViewport(bounds, VIEWPORT);
          const projectPoint = (p3) => toScreen(project(p3, camera), transform);

          const layout = computeConicalScreenLayout(params, projectPoint);
          const context = `[CONICAL] az=${view.az} el=${view.el} L=${L.toFixed(2)} thetaDeg=${thetaDeg.toFixed(1)} phi=${phi.toFixed(2)}`;
          report.push(...checkLayout({ ...layout, box: null }, context));
        }
      }
    }
  }

  if (report.length === 0) {
    console.log(
      `[check-phys-circular-motion-overlaps] OK: UNIFORM/HORIZONTAL/VERTICAL/CONICAL 合計 ${total}ケースすべて重なりゼロ`
    );
    return true;
  }
  console.error(report.join("\n"));
  console.error(`\n[check-phys-circular-motion-overlaps] NG: 上記の重なりが見つかりました(検査対象 ${total}ケース)`);
  return false;
}

const isMain = process.argv[1] && process.argv[1].endsWith("check-phys-circular-motion-overlaps.mjs");
if (isMain) {
  const ok = run();
  if (!ok) process.exit(1);
}

export { run, rectsOverlap, segRectIntersect, convexPolysOverlap };
