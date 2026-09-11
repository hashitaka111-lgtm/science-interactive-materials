// scripts/check-embedded-data.mjs の単体テスト。node:test のみ使用、依存パッケージなし。
//   node --test scripts/check-embedded-data.test.mjs
// フィクスチャはすべてこのファイル内に持ち、data/ と html/ の実ファイルには依存しない。
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseComparePath,
  groupCompareKeys,
  buildExpectedEmbedded,
  checkOne,
  extractEmbeddedScript,
  diffScriptText,
  stripMomentumImpulseLayoutWiring,
} from "./check-embedded-data.mjs";

// 実データ(amino-acids.json)を模した最小フィクスチャ。
// abbr3/name/molar_mass/tests/chiral の5フィールドをsubset比較の対象にし、
// id/extra はcompareKeysに含めない「原本にはあるが埋め込み対象外」の項目として使う。
function makeOriginal() {
  return {
    meta: { note: "fixture" },
    amino_acids: [
      {
        id: "a1",
        abbr3: "Aaa",
        name: "アミノ酸A",
        molar_mass: 100,
        chiral: true,
        tests: { ninhydrin: { result: "positive", note: "", confidence: "high" } },
        extra: "not embedded",
      },
      {
        id: "a2",
        abbr3: "Bbb",
        name: "アミノ酸B",
        molar_mass: 200,
        chiral: false,
        tests: { ninhydrin: { result: "negative", note: "", confidence: "high" } },
        extra: "not embedded",
      },
    ],
  };
}

const SUBSET_KEYS = [
  "amino_acids[].abbr3",
  "amino_acids[].name",
  "amino_acids[].molar_mass",
  "amino_acids[].tests",
  "amino_acids[].chiral",
];

// original から compareKeys 通りに埋め込み用オブジェクトを組み立てるヘルパー（テスト用）。
function makeSubsetEmbedded(original) {
  return {
    amino_acids: original.amino_acids.map((el) => ({
      abbr3: el.abbr3,
      name: el.name,
      molar_mass: el.molar_mass,
      tests: el.tests,
      chiral: el.chiral,
    })),
  };
}

describe("parseComparePath", () => {
  test("ルート直下のキー名を許可する", () => {
    assert.deepStrictEqual(parseComparePath("foo"), { kind: "root", rootKey: "foo" });
  });

  test("配列要素のフィールド指定を許可する", () => {
    assert.deepStrictEqual(parseComparePath("foo[].bar"), {
      kind: "arrayField",
      rootKey: "foo",
      field: "bar",
    });
  });

  test("3階層のパスはエラーにする", () => {
    assert.throws(() => parseComparePath("foo[].bar.baz"), /未対応のパス構文/);
  });

  test("[]を伴わないドット区切りはエラーにする", () => {
    assert.throws(() => parseComparePath("foo.bar"), /未対応のパス構文/);
  });

  test("配列指定の二重ネストはエラーにする", () => {
    assert.throws(() => parseComparePath("foo[][].bar"), /未対応のパス構文/);
  });
});

describe("groupCompareKeys", () => {
  test("同じrootKeyでルート指定と配列指定が混在するとエラーにする", () => {
    assert.throws(
      () => groupCompareKeys(["amino_acids", "amino_acids[].name"]),
      /混在/
    );
    assert.throws(
      () => groupCompareKeys(["amino_acids[].name", "amino_acids"]),
      /混在|複数回/
    );
  });

  test("同一フィールドの重複指定はエラーにする", () => {
    assert.throws(
      () => groupCompareKeys(["amino_acids[].name", "amino_acids[].name"]),
      /重複/
    );
  });

  test("正常なパス群を正しくグループ化する", () => {
    const groups = groupCompareKeys(SUBSET_KEYS);
    assert.deepStrictEqual(groups.get("amino_acids"), {
      kind: "arrayField",
      fields: ["abbr3", "name", "molar_mass", "tests", "chiral"],
    });
  });
});

describe("buildExpectedEmbedded", () => {
  test("compareKeys未指定なら原本をそのまま返す", () => {
    const original = makeOriginal();
    assert.strictEqual(buildExpectedEmbedded(original, undefined), original);
  });

  test("指定フィールドだけを抜き出し、原本にしかないキーは含めない", () => {
    const original = makeOriginal();
    const expected = buildExpectedEmbedded(original, SUBSET_KEYS);
    assert.deepStrictEqual(Object.keys(expected), ["amino_acids"]);
    assert.deepStrictEqual(Object.keys(expected.amino_acids[0]).sort(), [
      "abbr3",
      "chiral",
      "molar_mass",
      "name",
      "tests",
    ]);
    assert.strictEqual("id" in expected.amino_acids[0], false);
    assert.strictEqual("extra" in expected.amino_acids[0], false);
  });

  test("原本に存在しないルートキーはエラーにする", () => {
    const original = makeOriginal();
    assert.throws(
      () => buildExpectedEmbedded(original, ["no_such_root"]),
      /"no_such_root".*存在しません/
    );
  });

  test("原本の配列要素に存在しないフィールドはエラーにする", () => {
    const original = makeOriginal();
    assert.throws(
      () => buildExpectedEmbedded(original, ["amino_acids[].no_such_field"]),
      /no_such_field.*存在しません/
    );
  });

  test("配列指定なのに原本が配列でない場合はエラーにする", () => {
    const original = { meta: { note: "x" } };
    assert.throws(
      () => buildExpectedEmbedded(original, ["meta[].note"]),
      /配列ではありません/
    );
  });
});

describe("checkOne（検証全体の合否）", () => {
  test("完全一致なら差分なし", () => {
    const original = makeOriginal();
    const embedded = makeSubsetEmbedded(original);
    const diffs = checkOne(original, embedded, SUBSET_KEYS);
    assert.deepStrictEqual(diffs, []);
  });

  test("キー順序が違うだけなら差分なし", () => {
    const original = makeOriginal();
    const embedded = {
      amino_acids: original.amino_acids.map((el) => ({
        chiral: el.chiral,
        tests: el.tests,
        molar_mass: el.molar_mass,
        name: el.name,
        abbr3: el.abbr3,
      })),
    };
    const diffs = checkOne(original, embedded, SUBSET_KEYS);
    assert.deepStrictEqual(diffs, []);
  });

  test("埋め込み側に余分なキーが残っていれば差分を検出する", () => {
    const original = makeOriginal();
    const embedded = makeSubsetEmbedded(original);
    embedded.amino_acids[0].id = "a1"; // compareKeysに含まれない余分なフィールド
    const diffs = checkOne(original, embedded, SUBSET_KEYS);
    assert.strictEqual(diffs.length, 1);
    assert.strictEqual(diffs[0].path, "amino_acids[0].id");
  });

  test("要素数が不一致なら差分を検出する", () => {
    const original = makeOriginal();
    const embedded = makeSubsetEmbedded(original);
    embedded.amino_acids.pop();
    const diffs = checkOne(original, embedded, SUBSET_KEYS);
    assert.ok(diffs.length > 0);
    assert.ok(diffs.some((d) => d.path === "amino_acids[1]"));
  });

  test("要素の順序が違えば差分を検出する", () => {
    const original = makeOriginal();
    const embedded = makeSubsetEmbedded(original);
    [embedded.amino_acids[0], embedded.amino_acids[1]] = [
      embedded.amino_acids[1],
      embedded.amino_acids[0],
    ];
    const diffs = checkOne(original, embedded, SUBSET_KEYS);
    assert.ok(diffs.length > 0);
  });

  test("compareKeys未指定の完全一致モードでも動く", () => {
    const original = { a: 1, b: [1, 2, 3] };
    assert.deepStrictEqual(checkOne(original, { a: 1, b: [1, 2, 3] }, undefined), []);
    assert.ok(checkOne(original, { a: 1, b: [1, 2] }, undefined).length > 0);
  });

  test("compareKeysの設定ミス（存在しないパス）はcheckOne自体が例外を投げる", () => {
    const original = makeOriginal();
    const embedded = makeSubsetEmbedded(original);
    assert.throws(
      () => checkOne(original, embedded, ["amino_acids[].no_such_field"]),
      /存在しません/
    );
  });
});

describe("emit相当の出力ラウンドトリップ", () => {
  test("buildExpectedEmbeddedをJSON.stringifyして戻してもcheckOneを通る", () => {
    const original = makeOriginal();
    const expected = buildExpectedEmbedded(original, SUBSET_KEYS);
    const emitted = JSON.stringify(expected).replace(/<\//g, "<\\/");
    // 1行minifyであることの確認（改行を含まない）
    assert.strictEqual(emitted.includes("\n"), false);
    const embedded = JSON.parse(emitted);
    const diffs = checkOne(original, embedded, SUBSET_KEYS);
    assert.deepStrictEqual(diffs, []);
  });

  test("compareKeys未指定（フルコピー）でもラウンドトリップが通る", () => {
    const original = makeOriginal();
    const expected = buildExpectedEmbedded(original, undefined);
    const emitted = JSON.stringify(expected).replace(/<\//g, "<\\/");
    const embedded = JSON.parse(emitted);
    const diffs = checkOne(original, embedded, undefined);
    assert.deepStrictEqual(diffs, []);
  });
});

// scripts/*.mjs を丸ごと埋め込む教材向けのチェック(EMBED_SCRIPT_CHECKS)の単体テスト。
// html/peptide-sequencing.html の実物には依存せず、境界コメントとテキストはすべて
// このファイル内で組み立てる。
const START = "/* ---------- START ---------- */";
const END = "/* ---------- END ---------- */";

describe("extractEmbeddedScript", () => {
  test("開始・終了マーカーに囲まれた範囲を取り出す", () => {
    const html = `<script>\n${START}\nconst x = 1;\n${END}\n</script>`;
    assert.strictEqual(extractEmbeddedScript(html, START, END), "\nconst x = 1;\n");
  });

  test("開始マーカーが無ければエラー", () => {
    const html = `<script>\nconst x = 1;\n${END}\n</script>`;
    assert.throws(() => extractEmbeddedScript(html, START, END), /開始境界/);
  });

  test("終了マーカーが無ければエラー", () => {
    const html = `<script>\n${START}\nconst x = 1;\n</script>`;
    assert.throws(() => extractEmbeddedScript(html, START, END), /終了境界/);
  });

  test("開始マーカーより後ろにある終了マーカーだけを探す(開始マーカー自身に一致しない)", () => {
    // START と END が同じ文字列だった場合の事故防止: 開始位置の直後から終了マーカーを探す
    const html = `${START}\nconst x = 1;\n${START}`;
    assert.strictEqual(extractEmbeddedScript(html, START, START), "\nconst x = 1;\n");
  });
});

describe("diffScriptText", () => {
  test("完全一致なら null", () => {
    const src = "function f() {\n  return 1;\n}\n";
    assert.strictEqual(diffScriptText(src, `\n${src}\n`), null);
  });

  test("境界コメント前後の改行・空白だけの差はnullとして無視する", () => {
    const src = "const a = 1;\nconst b = 2;";
    const embedded = "\n\n  " + src + "  \n\n";
    assert.strictEqual(diffScriptText(src, embedded), null);
  });

  test("中身が1行でもずれていれば最初にずれた行番号を返す", () => {
    const src = "const a = 1;\nconst b = 2;\nconst c = 3;";
    const embedded = "const a = 1;\nconst b = 999;\nconst c = 3;";
    const diff = diffScriptText(src, embedded);
    assert.strictEqual(diff.line, 2);
    assert.strictEqual(diff.sourceLine, "const b = 2;");
    assert.strictEqual(diff.embeddedLine, "const b = 999;");
  });

  test("埋め込み側に行が足りなければ末尾のずれとして検出する", () => {
    const src = "const a = 1;\nconst b = 2;";
    const embedded = "const a = 1;";
    const diff = diffScriptText(src, embedded);
    assert.strictEqual(diff.line, 2);
    assert.strictEqual(diff.sourceLine, "const b = 2;");
    assert.strictEqual(diff.embeddedLine, undefined);
  });

  test("原本側に無いインデントを埋め込み側で足すと検出する", () => {
    const src = "function f() {\n  return 1;\n}";
    const embedded = "function f() {\n    return 1;\n}";
    const diff = diffScriptText(src, embedded);
    assert.strictEqual(diff.line, 2);
  });
});

// transformSource(scripts/phys-momentum-impulse-layout.mjs用)の単体テスト。
// このtransformSourceは「先頭のimport文・末尾のexport文だけを原本から取り除く」という
// 変換で、それ以外の本文は一切書き換えない前提。変換自体が正しいかに加えて、
// 変換後もimport/export以外の不一致を隠さず検出できるかを確認する
// (変換の実装ミスで本文側まで巻き込んで削ってしまうと、そこにある不一致が
// 消えてしまい検査が素通りしてしまう恐れがあるため)。
describe("stripMomentumImpulseLayoutWiring", () => {
  function makeSource({ body = "function f() {\n  return 1;\n}" } = {}) {
    return [
      "// header comment",
      "// 2行目のコメント",
      "",
      "import {",
      "  toPolar,",
      "  computeScale,",
      '} from "./vector-diagram-engine.mjs";',
      "",
      body,
      "",
      "export { f };",
    ].join("\n");
  }

  test("先頭のimport文と末尾のexport文だけを取り除き、それ以外は変更しない", () => {
    const src = makeSource();
    const stripped = stripMomentumImpulseLayoutWiring(src);
    assert.strictEqual(
      stripped,
      ["// header comment", "// 2行目のコメント", "", "function f() {\n  return 1;\n}"].join("\n")
    );
    assert.strictEqual(stripped.includes("import"), false);
    assert.strictEqual(stripped.includes("export"), false);
  });

  test("import文が無い(想定外に書き換えられた)場合は取り除かず素通りする", () => {
    // 正規表現が一致しなければ何もしないので、「importが消えている」という
    // 別種の不一致は後段のdiffScriptTextがそのまま検出できる(サイレントに隠さない)。
    const src = "// no import here\n\nfunction f() {\n  return 1;\n}\n\nexport { f };";
    const stripped = stripMomentumImpulseLayoutWiring(src);
    assert.strictEqual(stripped.includes("no import here"), true);
    assert.strictEqual(stripped.includes("export { f };"), false);
  });

  test("変換後もimport/export以外の1行改変(本文のバグ)を検出できる", () => {
    // 原本(あるべき姿)をtransformSourceにかけたものが「期待される埋め込み内容」。
    const original = makeSource();
    const expected = stripMomentumImpulseLayoutWiring(original);

    // 埋め込み側でimport/exportは規約通り省略しているが、本文を1箇所だけ
    // (数値を1→999に)誤って書き換えてしまった、というダミーの不一致ケース。
    const buggyEmbedded = expected.replace("return 1;", "return 999;");
    assert.notStrictEqual(buggyEmbedded, expected, "テストの前提: ダミー改変で実際に差分が生まれていること");

    const diff = diffScriptText(expected, buggyEmbedded);
    assert.ok(diff, "import/export以外の不一致はnullにならず検出されるべき");
    assert.match(diff.sourceLine, /return 1;/);
    assert.match(diff.embeddedLine, /return 999;/);
  });

  test("import/export以外に不一致が無ければ、変換後は完全一致として扱われる", () => {
    const original = makeSource();
    const expected = stripMomentumImpulseLayoutWiring(original);
    const correctlyEmbedded = expected; // 規約通りに書き写した想定
    assert.strictEqual(diffScriptText(expected, correctlyEmbedded), null);
  });
});
