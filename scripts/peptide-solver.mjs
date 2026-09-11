// 逆引き（性質から候補を絞り込む）の汎用ソルバー。html/reverse-lookup-spec.md 第2部の型の実装。
// ラベルの意味（アミノ酸か、他の何かか）は一切知らない。color/mass/chirality の3条件だけ、
// ラベルごとの値テーブルを引数(tables)として外から受け取る。
//
// ブラウザでもそのまま動くこと。Node固有のAPIは使わない。ESM export のみ。外部ライブラリ禁止。
//
// 型（コメントのみ、実行時チェックはしない）
//   Label      = string
//   Candidate  = Label[]                      長さ n のラベル列
//   DomainSpec = { mode:"counts", counts: Record<Label,number> }
//              | { mode:"kinds",  kinds: Label[], length: number }
//              | { mode:"pool",   pool:  Label[], length: number }   // 列挙処理は kinds と同一
//   Tables     = { color: Record<testName, Record<Label,boolean>>, mass: Record<Label,number>,
//                  chirality: Record<Label,boolean> }
//   Condition  = { type:"terminus",   end: "N"|"C" }
//              | { type:"fragment",   start: number, length: number }
//              | { type:"enzyme",     cleaveAfter: Label[], reveal: "sequence"|"composition"|"count" }
//              | { type:"color",      test: string }
//              | { type:"mass" }
//              | { type:"chirality" }
//              | { type:"composition", reveal:"full"|"kinds" }
//              | { type:"composition", reveal:"pool", pool: Label[] }   // 判定は常にtrue。定義域を定めるだけ

const DOMAIN_LIMIT = 100000;
const MASS_EPSILON = 1e-6;

// ---------- buildDomain ----------

function permuteCounts(counts) {
  const labels = Object.keys(counts).sort();
  const total = labels.reduce((sum, l) => sum + counts[l], 0);
  const remaining = { ...counts };
  const current = [];
  const result = [];

  function backtrack() {
    if (current.length === total) {
      result.push(current.slice());
      return;
    }
    for (const l of labels) {
      if (remaining[l] > 0) {
        remaining[l] -= 1;
        current.push(l);
        backtrack();
        current.pop();
        remaining[l] += 1;
      }
    }
  }
  backtrack();
  return result;
}

function cartesianPow(kinds, length) {
  const total = kinds.length ** length;
  if (total > DOMAIN_LIMIT) {
    throw new Error(
      `候補数が上限を超えます: ${kinds.length}^${length} = ${total} > ${DOMAIN_LIMIT}`
    );
  }
  const current = new Array(length);
  const result = [];

  function rec(pos) {
    if (pos === length) {
      result.push(current.slice());
      return;
    }
    for (const k of kinds) {
      current[pos] = k;
      rec(pos + 1);
    }
  }
  rec(0);
  return result;
}

export function buildDomain(spec) {
  if (spec.mode === "counts") return permuteCounts(spec.counts);
  if (spec.mode === "kinds") return cartesianPow(spec.kinds, spec.length);
  if (spec.mode === "pool") return cartesianPow(spec.pool, spec.length);
  throw new Error(`未知の domain mode: ${spec.mode}`);
}

// ---------- domainSpecOf ----------
// { conditions, answer, residue_count? } の形をした問題から DomainSpec を組み立てる。
// composition条件は必ず定義域を宣言する（reveal に関わらず、定義域内の全候補がその条件を
// 自動的に満たすように domain を作る）ので、それを手がかりにする。
//   composition/pool  → { mode:"pool",  pool:  その pool,             length: residue_count }
//   composition/kinds → { mode:"kinds", kinds: answerの使用ラベル集合, length: residue_count }
//   composition/full  → { mode:"counts", counts: answerの多重集合 }
// 明示的な domain フィールドがあればそれを優先する。どちらも無ければエラー。

export function domainSpecOf(problem) {
  if (problem.domain) return problem.domain;

  const poolCond = problem.conditions.find(
    (c) => c.type === "composition" && c.reveal === "pool"
  );
  if (poolCond) {
    return {
      mode: "pool",
      pool: poolCond.pool,
      length: problem.residue_count ?? problem.answer.length,
    };
  }

  const kindsCond = problem.conditions.find(
    (c) => c.type === "composition" && c.reveal === "kinds"
  );
  if (kindsCond) {
    return {
      mode: "kinds",
      kinds: uniqueSortedLabels(problem.answer),
      length: problem.residue_count ?? problem.answer.length,
    };
  }

  const fullCond = problem.conditions.find(
    (c) => c.type === "composition" && c.reveal === "full"
  );
  if (fullCond) {
    return { mode: "counts", counts: Object.fromEntries(countsOf(problem.answer)) };
  }

  throw new Error(
    "domainSpecOf: 定義域を推定できません（domain フィールドも、composition条件も無い）"
  );
}

// ---------- 内部ヘルパー ----------

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// cleaveAfter に含まれるラベルの直後で分割する。末尾で切れる場合は空断片を作らない。
function cleave(sequence, cleaveAfter) {
  const fragments = [];
  let current = [];
  for (const label of sequence) {
    current.push(label);
    if (cleaveAfter.includes(label)) {
      fragments.push(current);
      current = [];
    }
  }
  if (current.length > 0) fragments.push(current);
  return fragments;
}

// 断片1つを「ラベルでソートした文字列」に正規化する（断片内の順序を無視するため）。
function fragmentSignature(fragment) {
  return fragment.slice().sort().join(",");
}

// 断片の集まりを「順序を無視した比較」ができる形にする（断片同士の順序も無視するため）。
function normalizeFragments(fragments) {
  return fragments.map(fragmentSignature).sort();
}

function countsOf(sequence) {
  const counts = {};
  for (const label of sequence) counts[label] = (counts[label] || 0) + 1;
  return Object.keys(counts)
    .sort()
    .map((l) => [l, counts[l]]);
}

function uniqueSortedLabels(sequence) {
  return Array.from(new Set(sequence)).sort();
}

function massOf(sequence, tables) {
  const sum = sequence.reduce((s, label) => s + tables.mass[label], 0);
  return sum - 18.0 * (sequence.length - 1);
}

function colorOf(sequence, testName, tables) {
  const table = tables.color[testName];
  return sequence.some((label) => !!table[label]);
}

function chiralityFalseCountOf(sequence, tables) {
  return sequence.filter((label) => tables.chirality[label] === false).length;
}

// ---------- deriveObservation / matches ----------

export function deriveObservation(answer, condition, tables) {
  switch (condition.type) {
    case "terminus":
      return condition.end === "N" ? answer[0] : answer[answer.length - 1];

    case "fragment":
      return answer.slice(condition.start, condition.start + condition.length);

    case "enzyme": {
      const fragments = cleave(answer, condition.cleaveAfter);
      if (condition.reveal === "sequence") return fragments.map((f) => f.slice());
      if (condition.reveal === "composition") return normalizeFragments(fragments);
      if (condition.reveal === "count") return fragments.length;
      throw new Error(`未知の enzyme reveal: ${condition.reveal}`);
    }

    case "color":
      return colorOf(answer, condition.test, tables);

    case "mass":
      return massOf(answer, tables);

    case "chirality":
      return chiralityFalseCountOf(answer, tables);

    case "composition":
      if (condition.reveal === "full") return countsOf(answer);
      if (condition.reveal === "kinds") return uniqueSortedLabels(answer);
      if (condition.reveal === "pool") return condition.pool.slice();
      throw new Error(`未知の composition reveal: ${condition.reveal}`);

    default:
      throw new Error(`未知の condition type: ${condition.type}`);
  }
}

export function matches(candidate, condition, observation, tables) {
  switch (condition.type) {
    case "terminus": {
      const end = condition.end === "N" ? candidate[0] : candidate[candidate.length - 1];
      return end === observation;
    }

    case "fragment": {
      const len = observation.length;
      if (len === 0) return true;
      for (let i = 0; i + len <= candidate.length; i++) {
        if (arraysEqual(candidate.slice(i, i + len), observation)) return true;
      }
      return false;
    }

    case "enzyme": {
      const fragments = cleave(candidate, condition.cleaveAfter);
      if (condition.reveal === "sequence") {
        if (fragments.length !== observation.length) return false;
        return fragments.every((f, i) => arraysEqual(f, observation[i]));
      }
      if (condition.reveal === "composition") {
        return arraysEqual(normalizeFragments(fragments), observation);
      }
      if (condition.reveal === "count") return fragments.length === observation;
      throw new Error(`未知の enzyme reveal: ${condition.reveal}`);
    }

    case "color":
      return colorOf(candidate, condition.test, tables) === observation;

    case "mass":
      return Math.abs(massOf(candidate, tables) - observation) < MASS_EPSILON;

    case "chirality":
      return chiralityFalseCountOf(candidate, tables) === observation;

    case "composition": {
      if (condition.reveal === "pool") return true;
      if (condition.reveal === "full") {
        const c = countsOf(candidate);
        return (
          c.length === observation.length &&
          c.every(([l, n], i) => l === observation[i][0] && n === observation[i][1])
        );
      }
      if (condition.reveal === "kinds") {
        return arraysEqual(uniqueSortedLabels(candidate), observation);
      }
      throw new Error(`未知の composition reveal: ${condition.reveal}`);
    }

    default:
      throw new Error(`未知の condition type: ${condition.type}`);
  }
}

// ---------- solve ----------

export function solve(domain, conditions, answer, tables) {
  let remaining = domain.slice();
  const steps = [];
  for (const condition of conditions) {
    const observation = deriveObservation(answer, condition, tables);
    remaining = remaining.filter((c) => matches(c, condition, observation, tables));
    steps.push({ condition, observation, remaining: remaining.length });
  }
  return { steps, final: remaining };
}

// ---------- findFinishingCondition ----------
// 「残候補を全部異なる値に分ける条件」を探す分離型（amino-acids-matrix.html の
// findDecisiveCondition）とは別物。こちらは完了型:
// unusedConditions を配列の先頭から順に試し、その条件の実際の観測値（answer から導出）で
// remaining を絞ったとき1件になるものを返す。見つからなければ null。

export function findFinishingCondition(remaining, unusedConditions, answer, tables) {
  for (const condition of unusedConditions) {
    const observation = deriveObservation(answer, condition, tables);
    const filtered = remaining.filter((c) => matches(c, condition, observation, tables));
    if (filtered.length === 1) return { condition, observation, remaining: filtered };
  }
  return null;
}

// ---------- suggestNextCondition ----------
// 各未選択条件について、remaining の各候補を「それ自身が answer だったら」の観測値でビン分けし、
// worst(最大ビン件数)昇順・同値なら split(ビン数)降順で並べた先頭を返す。

export function suggestNextCondition(remaining, unusedConditions, tables) {
  if (!unusedConditions.length) return null;
  const rows = unusedConditions.map((condition) => {
    const bins = new Map();
    for (const candidate of remaining) {
      const key = JSON.stringify(deriveObservation(candidate, condition, tables));
      bins.set(key, (bins.get(key) || 0) + 1);
    }
    let worst = 0;
    for (const n of bins.values()) if (n > worst) worst = n;
    return { condition, worst, split: bins.size };
  });
  rows.sort((a, b) => a.worst - b.worst || b.split - a.split);
  return rows[0];
}

// ---------- minimizeConditions ----------
// composition条件は reveal が full/kinds/pool のどれでも「定義域を定める条件」(domainSpecOfの
// 手がかりそのもの)なので、matchesが常にtrueで判定に効かなくても削除対象から外す。

function isDomainDefining(condition) {
  return condition.type === "composition";
}

export function minimizeConditions(domain, conditions, answer, tables) {
  let kept = conditions.slice();
  const removed = [];
  for (const condition of conditions) {
    if (isDomainDefining(condition)) continue;
    const trial = kept.filter((c) => c !== condition);
    if (solve(domain, trial, answer, tables).final.length === 1) {
      kept = trial;
      removed.push(condition);
    }
  }
  return { kept, removed };
}

// ---------- シード付き乱数 (xorshift32) ----------

export function createRng(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return function next() {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- generateProblem ----------
// domain.mode === "pool" のときは、定義域を宣言する composition/pool 条件を自動で先頭に足す
// （minimizeConditions で絶対に落ちない）。conditionPool をシャッフルした順に条件を足していき、
// 1件に絞れた時点で止め、最後に minimizeConditions で最小集合に削る。

export function generateProblem(options, rng) {
  const domainCandidates = buildDomain(options.domain);
  const answer = pick(rng, domainCandidates);

  const chosen = [];
  if (options.domain.mode === "pool") {
    chosen.push({ type: "composition", reveal: "pool", pool: options.domain.pool.slice() });
  }

  const shuffledPool = shuffle(rng, options.conditionPool);
  let finalCandidates = solve(domainCandidates, chosen, answer, options.tables).final;
  for (const condition of shuffledPool) {
    if (finalCandidates.length <= 1) break;
    chosen.push(condition);
    finalCandidates = solve(domainCandidates, chosen, answer, options.tables).final;
  }

  if (finalCandidates.length !== 1) {
    throw new Error("generateProblem: conditionPool では候補を1件に絞り込めません");
  }

  const { kept } = minimizeConditions(domainCandidates, chosen, answer, options.tables);
  return { answer, domain: options.domain, conditions: kept };
}
