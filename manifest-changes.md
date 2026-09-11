# manifest.json 変更履歴（2026-08-30 追記）

## 検証結果

- 要素数: 26件（変更前後とも一致）
- 各要素のキー数: 13キー（既存11 + course + section）、全26件で一致
- order: chemistry 1〜17（重複・欠番なし）、physics 1〜9（重複・欠番なし）
- course: 全26件が「化学基礎」「化学」「物理」「発展」のいずれか
- 上記3つの変更（order差し替え／course・section追加／chem-reaction-kineticsのinteractions・confidence変更）以外の差分: **0件**（変更前後のJSONをキー単位で突合し確認）

## 変更1: order の差し替え（26件全件）

指定表の通りに order を差し替えた。id・course・section の対応は以下の通り（新order順）。

### 化学（chemistry, 1〜17）

| order | id | course | section |
|---|---|---|---|
| 1 | chem-crystal-lattice | 化学基礎 | 物質の構成 |
| 2 | chem-strong-weak-acid-base | 化学基礎 | 物質の変化 |
| 3 | chem-titration | 化学基礎 | 物質の変化 |
| 4 | chem-gases-ideal-and-real | 化学 | 物質の状態と平衡 |
| 5 | chem-dilute-solutions | 化学 | 物質の状態と平衡 |
| 6 | chem-thermochemistry | 化学 | 物質の変化と平衡 |
| 7 | chem-electrochemistry | 化学 | 物質の変化と平衡 |
| 8 | chem-reaction-kinetics | 化学 | 物質の変化と平衡 |
| 9 | chem-chemical-equilibrium | 化学 | 物質の変化と平衡 |
| 10 | chem-salt-hydrolysis | 化学 | 物質の変化と平衡 |
| 11 | chem-buffer-solutions | 化学 | 物質の変化と平衡 |
| 12 | chem-acid-base-distribution | 化学 | 物質の変化と平衡 |
| 13 | chem-polyprotic-distribution | 化学 | 物質の変化と平衡 |
| 14 | chem-ksp-basics | 化学 | 物質の変化と平衡 |
| 15 | chem-ksp-ph-control | 化学 | 物質の変化と平衡 |
| 16 | chem-organic-separation | 化学 | 有機化合物の性質 |
| 17 | chem-enzyme-kinetics | 発展 | 発展（学習指導要領外） |

### 物理（physics, 1〜9）

| order | id | course | section |
|---|---|---|---|
| 1 | phys-shm-oscillation | 物理 | 様々な運動 |
| 2 | phys-wave-superposition | 物理 | 波 |
| 3 | phys-doppler-effect | 物理 | 波 |
| 4 | phys-potential-field | 物理 | 電気と磁気 |
| 5 | phys-capacitor | 物理 | 電気と磁気 |
| 6 | phys-charged-particle-3d | 物理 | 電気と磁気 |
| 7 | phys-photoelectric-effect | 物理 | 原子 |
| 8 | phys-hydrogen-atom | 物理 | 原子 |
| 9 | phys-radioactive-decay | 物理 | 原子 |

## 変更2: course / section キーの追加

全26件に `course`・`section` を追加。キー位置は指定通り `unit` の直後（`id, file, subject, unit, course, section, order, title, heading, summary, topics, interactions, confidence` の順）。値は上表の通り。

## 変更3: chem-reaction-kinetics の修正

- `interactions`: `["スライダー", "グラフ連動", "クイズ"]` → `["スライダー", "グラフ連動"]`（"クイズ" を削除）
- `confidence`: `"low"` → `"high"`

## 変更していないもの

id, file, subject, unit, title, heading, summary, topics は全26件で変更なし。interactions も chem-reaction-kinetics 以外は変更なし。html/ 配下のHTMLファイルは読んでおらず、一切触っていない。manifest-report.md と units-draft.md も変更していない。

---

# manifest.json 変更履歴（2026-09-01 追記）

## 変更4: 27本目（chem-organic-reaction-map）の登録

`html/organic-reaction-map.html` を27本目として追加した（order 18、化学 / 有機化合物の性質）。他の26件は追加していない（既存キーの値も変更していない）。

## 変更5: 全27件への type / related の追加

全27件に `type`・`related` を追加。キー位置は既存13キーの末尾（`confidence` の後ろ）。

- `type`: simulator 24件 / procedure 2件（chem-thermochemistry, chem-organic-separation）/ diagram 1件（chem-organic-reaction-map）/ matrix 0件
- `related`: 各1〜4件、manifest内に実在するid、双方向にそろえ済み（自己参照なし）

## 変更6: interactions の語彙を2語追加

既存の語彙は「スライダー」「グラフ連動」「3D」「アニメーション」の4語で、いずれもUI部品の名前だった。chem-organic-reaction-map（系統図型）はこの4語のどれにも当てはまらない操作（絞り込み・経路の数え上げ）が主体のため、新たに2語を追加した。

- `絞り込み` — 官能基・反応の種類・検出反応の有無などで表示対象を減らす操作
- `経路探索` — 2つのノード間の経路を数え上げる、または辿る操作

**理由**: 既存4語はスライダーやグラフといったUI部品そのものの名前で、系統図型（ノードと矢印を辿る）やマトリクス型（表で絞り込む）の操作を表現できないため。この2語は今後追加するマトリクス型・系統図型の教材でも再利用する想定。

chem-organic-reaction-map の interactions: `["絞り込み", "経路探索"]`

## 変更していないもの（2026-09-01時点）

既存26件の id, file, subject, unit, course, section, order, title, heading, summary, topics, interactions, confidence はすべて変更なし。html/ 配下のHTMLファイルは一切変更していない。
