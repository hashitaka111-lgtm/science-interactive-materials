/* ==========================================================================
   equilibrium-core.js  —  水溶液の酸塩基平衡を数値的に解く共通コア

   分布曲線・滴定曲線・塩の加水分解・緩衝溶液のいずれも、
   同じ1本の電荷収支式に帰着する。

       h − Kw/h + C_A(m₀ − n̄(h)) + T(h) = 0

       h    : [H⁺]
       C_A  : 分析種（フラスコの中身）の全濃度
       m₀   : 溶かした化学種の段数（最もプロトン化した形を 0 とする）
       n̄(h) : 平均して外れているプロトン数 Σ k·α_k
       T(h) : 滴定剤の電荷寄与

   f(pH) は pH について単調減少なので、二分法が必ず収束する。
   近似式（√(K₁C) など）は一切使わない。

   使い方:
       var a = EqCore.fractions([7.5e-3,6.2e-8,4.8e-13], 7.0);
       var p = EqCore.pHofSolution([1.8e-5], 0.10, 0);        // 0.1M 酢酸
       var c = EqCore.titrationCurve(setup, Vmax, 400);

   依存なし。ブラウザでもNode（module.exports）でも動く。
   ========================================================================== */

var EqCore = (function () {
"use strict";

var KW = 1e-14;

/* --------------------------------------------------------------------------
   1. 存在率
   Ka は段階電離定数を強い順に並べた配列。長さ n が価数、化学種は n+1 個。
   D = 1 + K₁/h + K₁K₂/h² + … として α_k = (K₁…K_k/h^k)/D を返す。
   -------------------------------------------------------------------------- */
function fractions(Ka, pH) {
  var h = Math.pow(10, -pH), t = [1], prod = 1, D = 1, k, v;
  for (k = 1; k <= Ka.length; k++) {
    prod *= Ka[k - 1];
    v = prod / Math.pow(h, k);
    t.push(v); D += v;
  }
  for (k = 0; k < t.length; k++) t[k] = t[k] / D;
  return t;
}

/* 平均して外れているプロトン数 */
function nbar(Ka, pH) {
  var a = fractions(Ka, pH), s = 0;
  for (var k = 0; k < a.length; k++) s += k * a[k];
  return s;
}

function pK(Ka, i) { return -Math.log10(Ka[i]); }

/* --------------------------------------------------------------------------
   2. 単調減少関数の零点を二分法で求める
   pH の探索範囲は既定で −2 〜 16。90回で 18/2⁹⁰ まで詰まる。
   -------------------------------------------------------------------------- */
function solveMonotonic(f, lo, hi, iter) {
  lo = (lo == null ? -2 : lo);
  hi = (hi == null ? 16 : hi);
  iter = iter || 90;
  for (var i = 0; i < iter; i++) {
    var m = (lo + hi) / 2;
    if (f(m) > 0) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

/* --------------------------------------------------------------------------
   3. 滴定剤の電荷寄与 T(h)

   強塩基は「共役酸の Ka = 0 の塩基」とみなすと h/(h+0) = 1 となり、
   弱塩基と同じ式に畳める。強酸も Ka を十分大きくとれば同様。

       {type:'base', Ka:0}      NaOH など強塩基     → +C_T
       {type:'base', Ka:5.6e-10} NH₃               → +C_T·h/(h+Ka)
       {type:'acid', Ka:1e10}   HCl など強酸        → −C_T
       {type:'acid', Ka:1.8e-5} CH₃COOH            → −C_T·Ka/(h+Ka)
   -------------------------------------------------------------------------- */
function titrantCharge(t, Ct, h) {
  if (!t || !Ct) return 0;
  if (t.type === 'base') return Ct * h / (h + (t.Ka || 0));
  return -Ct * t.Ka / (h + t.Ka);
}

/* --------------------------------------------------------------------------
   4. 混合系の電荷収支と、その解
   o = {Ka, Ca, m0, Ct, titrant}
   -------------------------------------------------------------------------- */
function balance(o, pH) {
  var h = Math.pow(10, -pH);
  return h - KW / h
       + o.Ca * (o.m0 - nbar(o.Ka, pH))
       + titrantCharge(o.titrant, o.Ct, h);
}

function pHofMixture(o) {
  return solveMonotonic(function (p) { return balance(o, p); });
}

/* 化学種 m を濃度 C で溶かしただけの水溶液の pH
   （酸そのもの、その塩、両性塩、アミノ酸の双性イオン、すべてこれで出る） */
function pHofSolution(Ka, C, m) {
  return pHofMixture({ Ka: Ka, Ca: C, m0: m, Ct: 0, titrant: null });
}

/* --------------------------------------------------------------------------
   5. 滴定
   setup = {Ka, Ca, Va, m0, Ct, titrant}
   Ca·Va がフラスコの分析種、Ct が滴定剤の濃度。V は滴下量。
   希釈は両方に同じ係数でかかる。
   -------------------------------------------------------------------------- */
function pHofTitration(s, V) {
  var f = 1 / (s.Va + V);
  return pHofMixture({
    Ka: s.Ka,
    Ca: s.Ca * s.Va * f,
    m0: s.m0,
    Ct: s.Ct * V * f,
    titrant: s.titrant
  });
}

/* 中和できる段数。塩基で滴定するなら残っているプロトンの数、
   酸で滴定するならすでに外れている数。 */
function stepCount(s) {
  return (s.titrant.type === 'base') ? (s.Ka.length - s.m0) : s.m0;
}

/* 当量点の滴下量 */
function equivalenceVolumes(s) {
  var unit = s.Ca * s.Va / s.Ct, out = [], cnt = stepCount(s);
  for (var j = 1; j <= cnt; j++) out.push(j * unit);
  return out;
}

/* 半当量点。ここで pH が pKa に一致する。
   塩基で滴定するなら j 段目は Ka[m0+j−1]、酸なら Ka[m0−j]。 */
function halfEquivalences(s) {
  var unit = s.Ca * s.Va / s.Ct, out = [], cnt = stepCount(s), j, idx;
  for (j = 1; j <= cnt; j++) {
    idx = (s.titrant.type === 'base') ? (s.m0 + j - 1) : (s.m0 - j);
    out.push({ V: (j - 0.5) * unit, pKa: pK(s.Ka, idx), index: idx });
  }
  return out;
}

/* --------------------------------------------------------------------------
   6. 曲線の生成
   当量点の近傍は pH が桁で跳ねるため、等間隔だけでは折れ線になる。
   当量点のまわりに対数的に点を足してから並べ替える。
   -------------------------------------------------------------------------- */
function sampleVolumes(s, Vmax, steps) {
  var Vs = [], i, p, d;
  for (i = 0; i <= steps; i++) Vs.push(i / steps * Vmax);
  equivalenceVolumes(s).forEach(function (ve) {
    if (ve > Vmax) return;
    Vs.push(ve);
    for (p = 0.3; p <= 4.5; p += 0.15) {
      d = ve * Math.pow(10, -p);
      if (ve - d > 0) Vs.push(ve - d);
      if (ve + d < Vmax) Vs.push(ve + d);
    }
  });
  Vs.sort(function (a, b) { return a - b; });
  var out = [Vs[0]];
  for (i = 1; i < Vs.length; i++) if (Vs[i] - out[out.length - 1] > 1e-12) out.push(Vs[i]);
  return out;
}

/* [{V, pH, alpha:[…]}] を返す */
function titrationCurve(s, Vmax, steps) {
  return sampleVolumes(s, Vmax, steps || 360).map(function (V) {
    var p = pHofTitration(s, V);
    return { V: V, pH: p, alpha: fractions(s.Ka, p) };
  });
}

/* --------------------------------------------------------------------------
   7. 指示薬の判定
   当量点の ±0.1 % で pH がどこまで跳ぶかを調べ、
   変色域の中点がその区間に入るかどうかで使えるかを決める。
   -------------------------------------------------------------------------- */
function jumpRange(s, Veq, rel) {
  rel = rel || 0.001;
  var a = pHofTitration(s, Veq * (1 - rel));
  var b = pHofTitration(s, Veq * (1 + rel));
  return { lo: Math.min(a, b), hi: Math.max(a, b) };
}

/* 厳密な基準。変色域の中点が ±0.1 % の跳びの中に入るか。
   これを満たせば滴定誤差 0.1 % 以内で終点が取れる。 */
function indicatorFits(ind, jump) {
  var mid = (ind.lo + ind.hi) / 2;
  return mid >= jump.lo && mid <= jump.hi;
}

/* 実用の基準。当量点の pH が変色域の中に入るか。
   多価酸の各段のように跳びが小さい滴定では、厳密な基準を満たす指示薬が
   存在しないことがあるが、実際にはこちらの基準で運用されている。
   炭酸ナトリウムの二段滴定（ワルダー法）がその代表例。 */
function indicatorUsable(ind, pHeq) {
  return pHeq >= ind.lo && pHeq <= ind.hi;
}

/* ◎ = 厳密基準も満たす / ○ = 実用上は使える / × = 使えない */
function indicatorGrade(ind, jump, pHeq) {
  if (indicatorFits(ind, jump)) return 2;
  if (indicatorUsable(ind, pHeq)) return 1;
  return 0;
}

/* --------------------------------------------------------------------------
   8. 等電点（電荷 0 の化学種が両端でない系にだけ存在する）
   -------------------------------------------------------------------------- */
function isoelectric(Ka, species) {
  var n = Ka.length;
  for (var i = 0; i < species.length; i++) {
    if (species[i].z === '0' && i > 0 && i < n) return (pK(Ka, i - 1) + pK(Ka, i)) / 2;
  }
  return null;
}

/* --------------------------------------------------------------------------
   9. 表示用のこまごま
   -------------------------------------------------------------------------- */
var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
            '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
var SUB = { 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆' };

function sup(n) {
  return String(n).split('').map(function (c) { return SUP[c] || c; }).join('');
}
function sci(x, d) {
  if (!(x > 0)) return '0';
  var e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
  if (m >= 9.995) { m = m / 10; e = e + 1; }
  return m.toFixed(d == null ? 2 : d) + '×10' + sup(e);
}
function pct(a) {
  var p = a * 100;
  if (p >= 10) return p.toFixed(1) + ' %';
  if (p >= 0.1) return p.toFixed(2) + ' %';
  if (p >= 1e-3) return p.toFixed(4) + ' %';
  if (p <= 0) return '0 %';
  return sci(p, 1) + ' %';
}

/* 電荷収支から出る (n+1) 次方程式を文字列で組み立てる（表示用） */
function exactPolynomial(Ka) {
  function kprod(k) { var s = ''; for (var i = 1; i <= k; i++) s += 'K' + SUB[i]; return s; }
  function hpow(e) { return e === 0 ? '' : (e === 1 ? 'h' : 'h' + sup(e)); }
  var n = Ka.length, parts = [hpow(n + 1), '+ ' + kprod(1) + hpow(n)], m, c;
  for (m = n - 1; m >= 1; m--) {
    c = n - m;
    parts.push('+ ' + kprod(c) + '(K' + SUB[n + 1 - m] + ' − ' + (c === 1 ? '' : c) + 'C)' + hpow(m));
  }
  parts.push('− ' + (n === 1 ? '' : n) + 'C' + kprod(n));
  return parts.join(' ') + ' = 0';
}

return {
  KW: KW, SUB: SUB,
  fractions: fractions, nbar: nbar, pK: pK,
  solveMonotonic: solveMonotonic,
  titrantCharge: titrantCharge, balance: balance,
  pHofMixture: pHofMixture, pHofSolution: pHofSolution,
  pHofTitration: pHofTitration,
  stepCount: stepCount,
  equivalenceVolumes: equivalenceVolumes, halfEquivalences: halfEquivalences,
  sampleVolumes: sampleVolumes, titrationCurve: titrationCurve,
  jumpRange: jumpRange, indicatorFits: indicatorFits,
  indicatorUsable: indicatorUsable, indicatorGrade: indicatorGrade,
  isoelectric: isoelectric,
  sup: sup, sci: sci, pct: pct, exactPolynomial: exactPolynomial
};

})();

if (typeof module !== 'undefined' && module.exports) module.exports = EqCore;
