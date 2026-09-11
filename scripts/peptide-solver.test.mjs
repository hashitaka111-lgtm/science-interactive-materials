// peptide-solver.mjs のテスト。node:test のみ使用。フィクスチャは化学と無関係の
// 抽象ラベル(a,b,c,d,...)で組み、ソルバー本体がラベルの意味を知らないことを担保する。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDomain,
  domainSpecOf,
  deriveObservation,
  matches,
  solve,
  findFinishingCondition,
  suggestNextCondition,
  minimizeConditions,
  generateProblem,
  createRng,
} from "./peptide-solver.mjs";

const TABLES = {
  color: {
    stainX: { a: true, b: false, c: false, d: true },
    stainY: { a: false, b: false, c: true, d: false },
  },
  mass: { a: 10, b: 20, c: 30, d: 5 },
  chirality: { a: true, b: false, c: true, d: false },
};

function sortRows(rows) {
  return rows.map((r) => r.join("")).sort();
}

// ---------- buildDomain ----------

test("buildDomain counts: 多重集合の重複順列を重複なく列挙する", () => {
  const domain = buildDomain({ mode: "counts", counts: { a: 2, b: 1 } });
  assert.deepEqual(sortRows(domain), ["aab", "aba", "baa"]);
});

test("buildDomain kinds: 種類のn乗を全列挙する", () => {
  const domain = buildDomain({ mode: "kinds", kinds: ["x", "y"], length: 3 });
  assert.equal(domain.length, 8);
  assert.equal(new Set(domain.map((c) => c.join(""))).size, 8);
});

test("buildDomain pool: kindsと同じ列挙処理", () => {
  const domain = buildDomain({ mode: "pool", pool: ["p", "q", "r"], length: 2 });
  assert.equal(domain.length, 9);
});

test("buildDomain pool: プール6種・6残基の46656件が通る", () => {
  const domain = buildDomain({
    mode: "pool",
    pool: ["a", "b", "c", "d", "e", "f"],
    length: 6,
  });
  assert.equal(domain.length, 46656);
});

test("buildDomain kinds: 上限(10万)を超えるとthrow", () => {
  assert.throws(() => buildDomain({ mode: "kinds", kinds: ["a", "b", "c", "d"], length: 9 }));
});

// ---------- domainSpecOf ----------

test("domainSpecOf: composition(pool)からpoolモードを組み立てる", () => {
  const problem = {
    residue_count: 2,
    answer: ["a", "b"],
    conditions: [{ type: "composition", reveal: "pool", pool: ["a", "b", "c"] }],
  };
  assert.deepEqual(domainSpecOf(problem), { mode: "pool", pool: ["a", "b", "c"], length: 2 });
});

test("domainSpecOf: composition(full)からcountsモードを組み立てる(answerの多重集合)", () => {
  const problem = {
    answer: ["a", "a", "b"],
    conditions: [{ type: "composition", reveal: "full" }],
  };
  assert.deepEqual(domainSpecOf(problem), { mode: "counts", counts: { a: 2, b: 1 } });
});

test("domainSpecOf: composition(kinds)からkindsモードを組み立てる(answerの使用ラベル集合)", () => {
  const problem = {
    answer: ["b", "a", "a"],
    conditions: [{ type: "composition", reveal: "kinds" }],
  };
  assert.deepEqual(domainSpecOf(problem), { mode: "kinds", kinds: ["a", "b"], length: 3 });
});

test("domainSpecOf: 明示的なdomainフィールドがあればそれを優先する", () => {
  const problem = {
    domain: { mode: "counts", counts: { x: 1 } },
    answer: ["y"],
    conditions: [{ type: "composition", reveal: "full" }],
  };
  assert.deepEqual(domainSpecOf(problem), { mode: "counts", counts: { x: 1 } });
});

test("domainSpecOf: domainフィールドもcomposition条件も無ければthrow", () => {
  const problem = { answer: ["a"], conditions: [{ type: "terminus", end: "N" }] };
  assert.throws(() => domainSpecOf(problem));
});

// ---------- terminus ----------

test("terminus: N末端・C末端の一致判定", () => {
  const answer = ["a", "b", "c"];
  const condN = { type: "terminus", end: "N" };
  const obsN = deriveObservation(answer, condN, TABLES);
  assert.equal(obsN, "a");
  assert.equal(matches(["a", "x", "y"], condN, obsN, TABLES), true);
  assert.equal(matches(["b", "a", "c"], condN, obsN, TABLES), false);

  const condC = { type: "terminus", end: "C" };
  const obsC = deriveObservation(answer, condC, TABLES);
  assert.equal(obsC, "c");
  assert.equal(matches(["x", "y", "c"], condC, obsC, TABLES), true);
});

// ---------- fragment ----------

test("fragment: 連続部分列が位置を問わず一致すれば合格", () => {
  const answer = ["a", "b", "c", "d"];
  const cond = { type: "fragment", start: 1, length: 2 };
  const obs = deriveObservation(answer, cond, TABLES);
  assert.deepEqual(obs, ["b", "c"]);
  assert.equal(matches(["x", "b", "c", "y"], cond, obs, TABLES), true);
  assert.equal(matches(["b", "x", "c"], cond, obs, TABLES), false);
});

// ---------- enzyme ----------

test("enzyme cleave: 末尾で切れる場合は空断片を作らない", () => {
  const answer = ["a", "b", "c", "d", "b", "e"];
  const cond = { type: "enzyme", cleaveAfter: ["b"], reveal: "sequence" };
  const obs = deriveObservation(answer, cond, TABLES);
  assert.deepEqual(obs, [
    ["a", "b"],
    ["c", "d", "b"],
    ["e"],
  ]);
});

test("enzyme reveal=sequence: 断片の列が順序込みで一致", () => {
  const answer = ["a", "b", "c", "b"];
  const cond = { type: "enzyme", cleaveAfter: ["b"], reveal: "sequence" };
  const obs = deriveObservation(answer, cond, TABLES);
  assert.equal(matches(["a", "b", "c", "b"], cond, obs, TABLES), true);
  assert.equal(matches(["c", "b", "a", "b"], cond, obs, TABLES), false);
});

test("enzyme reveal=composition: 断片の多重集合が順序を無視して一致", () => {
  const cond = { type: "enzyme", cleaveAfter: ["b"], reveal: "composition" };
  const answer = ["a", "c", "b", "d", "b"];
  const obs = deriveObservation(answer, cond, TABLES);
  // 断片: ["a","c","b"], ["d","b"]
  const reordered = ["d", "b", "a", "c", "b"]; // 断片: ["d","b"], ["a","c","b"] 順序が逆
  assert.equal(matches(reordered, cond, obs, TABLES), true);
  const different = ["a", "b", "c", "d", "b"]; // 断片: ["a","b"],["c","d","b"] 中身が違う
  assert.equal(matches(different, cond, obs, TABLES), false);
});

test("enzyme reveal=count: 断片の個数が一致", () => {
  const cond = { type: "enzyme", cleaveAfter: ["b"], reveal: "count" };
  const answer = ["a", "b", "c", "b", "d"]; // 断片: [a,b],[c,b],[d] → 3
  const obs = deriveObservation(answer, cond, TABLES);
  assert.equal(obs, 3);
  assert.equal(matches(["x", "b", "y", "b", "z", "b"], cond, obs, TABLES), true);
  assert.equal(matches(["x", "b", "y"], cond, obs, TABLES), false);
});

// ---------- color ----------

test("color: 陽性(true)観測値は真のラベルを含む候補だけ通す", () => {
  const cond = { type: "color", test: "stainX" };
  const answer = ["a", "c"]; // a=true
  const obs = deriveObservation(answer, cond, TABLES);
  assert.equal(obs, true);
  assert.equal(matches(["c", "a"], cond, obs, TABLES), true);
  assert.equal(matches(["c", "c"], cond, obs, TABLES), false);
});

test("color: 陰性(false)観測値は真のラベルを含む候補を落とす", () => {
  const cond = { type: "color", test: "stainX" };
  const answer = ["b", "c"]; // どちらもfalse
  const obs = deriveObservation(answer, cond, TABLES);
  assert.equal(obs, false);
  assert.equal(matches(["b", "c"], cond, obs, TABLES), true);
  assert.equal(matches(["a", "c"], cond, obs, TABLES), false); // aがtrueなので陰性と矛盾
});

// ---------- mass ----------

test("mass: 合計から18.0×(n-1)を引いた値が一致", () => {
  const cond = { type: "mass" };
  const answer = ["a", "b"]; // 10+20-18=12
  const obs = deriveObservation(answer, cond, TABLES);
  assert.equal(obs, 12);
  assert.equal(matches(["b", "a"], cond, obs, TABLES), true);
  assert.equal(matches(["a", "a"], cond, obs, TABLES), false); // 10+10-18=2
});

test("mass: 浮動小数の誤差をepsilonで吸収する", () => {
  const tables = { ...TABLES, mass: { a: 10.1, b: 19.9, c: 30.0 } };
  const cond = { type: "mass" };
  const answer = ["a", "b"]; // 10.1+19.9-18 = 12 だが浮動小数演算で厳密には12にならない
  const obs = deriveObservation(answer, cond, tables);
  assert.equal(matches(["a", "b"], cond, obs, tables), true);
  assert.equal(matches(["c"], cond, obs, tables), false); // 30-0=30
});

// ---------- chirality ----------

test("chirality: 偽のラベルの個数が一致すれば、構成ラベルが違っても合格", () => {
  const cond = { type: "chirality" };
  const answer = ["a", "b", "d"]; // false: b,d → 2
  const obs = deriveObservation(answer, cond, TABLES);
  assert.equal(obs, 2);
  assert.equal(matches(["c", "b", "d"], cond, obs, TABLES), true); // aをcに変えても両方true
  assert.equal(matches(["a", "b", "c"], cond, obs, TABLES), false); // false数=1
});

// ---------- composition ----------

test("composition reveal=full: ラベルごとの個数が一致", () => {
  const cond = { type: "composition", reveal: "full" };
  const answer = ["a", "a", "b"];
  const obs = deriveObservation(answer, cond, TABLES);
  assert.equal(matches(["a", "b", "a"], cond, obs, TABLES), true);
  assert.equal(matches(["a", "b", "b"], cond, obs, TABLES), false);
});

test("composition reveal=kinds: 使われている種類の集合だけが一致", () => {
  const cond = { type: "composition", reveal: "kinds" };
  const answer = ["a", "a", "b"];
  const obs = deriveObservation(answer, cond, TABLES);
  assert.equal(matches(["a", "b", "b", "b"], cond, obs, TABLES), true);
  assert.equal(matches(["a", "c"], cond, obs, TABLES), false);
});

test("composition reveal=pool: 判定は常にtrue、定義域を定めるだけ", () => {
  const cond = { type: "composition", reveal: "pool", pool: ["a", "b", "c"] };
  const answer = ["a", "b"];
  const obs = deriveObservation(answer, cond, TABLES);
  assert.deepEqual(obs, ["a", "b", "c"]);
  assert.equal(matches(["z", "z", "z"], cond, obs, TABLES), true);
});

// ---------- solve ----------

test("solve: 条件を順に適用し、段階ごとの残候補数と最終候補を返す", () => {
  const domain = buildDomain({ mode: "counts", counts: { a: 1, b: 1, c: 1 } }); // 6件
  const answer = ["a", "b", "c"];
  const conditions = [
    { type: "terminus", end: "N" }, // a始まり: abc,acb の2件
    { type: "terminus", end: "C" }, // c終わり: abc の1件
  ];
  const result = solve(domain, conditions, answer, TABLES);
  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[0].remaining, 2);
  assert.equal(result.steps[1].remaining, 1);
  assert.deepEqual(result.final, [["a", "b", "c"]]);
});

// ---------- findFinishingCondition ----------

test("findFinishingCondition: 1つで残候補を一意にできる条件を検出する", () => {
  const domain = buildDomain({ mode: "counts", counts: { a: 1, b: 1, c: 1 } });
  const answer = ["a", "b", "c"];
  const remaining = domain; // 6件
  const unused = [
    { type: "composition", reveal: "kinds" }, // 全候補が同じkind集合なので絞れない(6件のまま)
    { type: "fragment", start: 0, length: 2 }, // "ab"を含む候補はabc,cabの2件残る。決定打ではない
    { type: "fragment", start: 0, length: 3 }, // 全長一致は候補列そのものと同じなので必ず1件に決まる
  ];
  const found = findFinishingCondition(remaining, unused, answer, TABLES);
  assert.notEqual(found, null);
  assert.equal(found.condition, unused[2]);
  assert.equal(found.remaining.length, 1);
  assert.deepEqual(found.remaining[0], ["a", "b", "c"]);
});

test("findFinishingCondition: 見つからなければnull", () => {
  const domain = buildDomain({ mode: "counts", counts: { a: 1, b: 1, c: 1 } });
  const answer = ["a", "b", "c"];
  const unused = [{ type: "composition", reveal: "kinds" }]; // 全候補同じkindなので絞れない
  const found = findFinishingCondition(domain, unused, answer, TABLES);
  assert.equal(found, null);
});

// ---------- suggestNextCondition ----------

test("suggestNextCondition: worst昇順・同値ならsplit降順のミニマックス", () => {
  const domain = buildDomain({ mode: "counts", counts: { a: 1, b: 1, c: 1 } }); // 6件
  const unused = [
    { type: "composition", reveal: "kinds" }, // 全6件が同じ結果 → worst=6, split=1
    { type: "terminus", end: "N" }, // a/b/cそれぞれ2件ずつ → worst=2, split=3
  ];
  const best = suggestNextCondition(domain, unused, TABLES);
  assert.equal(best.condition.type, "terminus");
  assert.equal(best.worst, 2);
  assert.equal(best.split, 3);
});

test("suggestNextCondition: 未選択条件が空ならnull", () => {
  assert.equal(suggestNextCondition([["a"]], [], TABLES), null);
});

// ---------- minimizeConditions ----------

test("minimizeConditions: 冗長な条件を先頭から固定順で落とす", () => {
  const domain = buildDomain({ mode: "counts", counts: { a: 1, b: 1, c: 1 } });
  const answer = ["a", "b", "c"];
  const conditions = [
    { type: "terminus", end: "N" }, // これだけでは2件(abc,acb)
    { type: "terminus", end: "C" }, // これを足すと1件(abc)
    { type: "fragment", start: 0, length: 1 }, // 追加してもすでに1件なので冗長
  ];
  const { kept, removed } = minimizeConditions(domain, conditions, answer, TABLES);
  assert.equal(solve(domain, kept, answer, TABLES).final.length, 1);
  assert.equal(removed.length, 1);
  assert.equal(removed[0].type, "fragment");
});

test("minimizeConditions: composition/poolは判定に効かなくても絶対に落とさない", () => {
  const domain = buildDomain({ mode: "pool", pool: ["a", "b", "c"], length: 2 }); // 9件
  const answer = ["a", "b"];
  const conditions = [
    { type: "composition", reveal: "pool", pool: ["a", "b", "c"] }, // 判定は常にtrueで冗長に見える
    { type: "terminus", end: "N" },
    { type: "terminus", end: "C" },
  ];
  const { kept, removed } = minimizeConditions(domain, conditions, answer, TABLES);
  assert.equal(
    kept.some((c) => c.type === "composition" && c.reveal === "pool"),
    true
  );
  assert.equal(
    removed.some((c) => c.type === "composition" && c.reveal === "pool"),
    false
  );
});

test("minimizeConditions: composition(full/kinds)も判定に効かなくても絶対に落とさない", () => {
  const domain = buildDomain({ mode: "counts", counts: { a: 1, b: 1, c: 1 } });
  const answer = ["a", "b", "c"];

  const conditionsFull = [
    { type: "composition", reveal: "full" },
    { type: "terminus", end: "N" },
    { type: "terminus", end: "C" },
  ];
  const full = minimizeConditions(domain, conditionsFull, answer, TABLES);
  assert.equal(full.kept.some((c) => c.type === "composition" && c.reveal === "full"), true);
  assert.equal(full.removed.some((c) => c.type === "composition"), false);

  const conditionsKinds = [
    { type: "composition", reveal: "kinds" },
    { type: "terminus", end: "N" },
    { type: "terminus", end: "C" },
  ];
  const kinds = minimizeConditions(domain, conditionsKinds, answer, TABLES);
  assert.equal(kinds.kept.some((c) => c.type === "composition" && c.reveal === "kinds"), true);
  assert.equal(kinds.removed.some((c) => c.type === "composition"), false);
});

// ---------- generateProblem ----------

test("generateProblem: 同じシードなら同じ問題が出る", () => {
  const options = {
    domain: { mode: "counts", counts: { a: 1, b: 1, c: 1, d: 1 } },
    conditionPool: [
      { type: "terminus", end: "N" },
      { type: "terminus", end: "C" },
      { type: "fragment", start: 0, length: 2 },
      { type: "fragment", start: 1, length: 2 },
      { type: "composition", reveal: "full" },
      { type: "chirality" },
      { type: "mass" },
    ],
    tables: TABLES,
  };
  const p1 = generateProblem(options, createRng(12345));
  const p2 = generateProblem(options, createRng(12345));
  assert.deepEqual(p1.answer, p2.answer);
  assert.deepEqual(
    p1.conditions.map((c) => JSON.stringify(c)),
    p2.conditions.map((c) => JSON.stringify(c))
  );
});

test("generateProblem: 生成された問題は候補を1件に絞り込める", () => {
  const options = {
    domain: { mode: "counts", counts: { a: 1, b: 1, c: 1, d: 1 } },
    conditionPool: [
      { type: "terminus", end: "N" },
      { type: "terminus", end: "C" },
      { type: "fragment", start: 0, length: 2 },
      { type: "fragment", start: 1, length: 2 },
      { type: "composition", reveal: "full" },
      { type: "chirality" },
      { type: "mass" },
    ],
    tables: TABLES,
  };
  const problem = generateProblem(options, createRng(999));
  const domain = buildDomain(problem.domain);
  const result = solve(domain, problem.conditions, problem.answer, options.tables);
  assert.equal(result.final.length, 1);
  assert.deepEqual(result.final[0], problem.answer);
});

test("generateProblem: pool モードでは定義域を定める条件が自動で入り、削除されない", () => {
  const options = {
    domain: { mode: "pool", pool: ["a", "b", "c"], length: 3 },
    conditionPool: [
      { type: "terminus", end: "N" },
      { type: "terminus", end: "C" },
      { type: "composition", reveal: "full" },
    ],
    tables: TABLES,
  };
  const problem = generateProblem(options, createRng(7));
  assert.equal(
    problem.conditions.some((c) => c.type === "composition" && c.reveal === "pool"),
    true
  );
});

test("generateProblem: conditionPoolでは絞り込めない場合はthrow", () => {
  const options = {
    domain: { mode: "counts", counts: { a: 1, b: 1 } }, // ab, ba の2件
    conditionPool: [{ type: "composition", reveal: "kinds" }], // 両方とも{a,b}なので絞れない
    tables: TABLES,
  };
  assert.throws(() => generateProblem(options, createRng(1)));
});

// ---------- createRng ----------

test("createRng: 同じシードから同じ数列が再現される", () => {
  const r1 = createRng(42);
  const r2 = createRng(42);
  const seq1 = [r1(), r1(), r1()];
  const seq2 = [r2(), r2(), r2()];
  assert.deepEqual(seq1, seq2);
  for (const v of seq1) {
    assert.ok(v >= 0 && v < 1);
  }
});
