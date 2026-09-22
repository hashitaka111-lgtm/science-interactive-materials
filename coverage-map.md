# 高校化学 単元網羅マップ

対象：manifest.json のうち `subject: chemistry` の17本。判定は各HTMLの見出しと本文、選択肢として実装されている物質・反応のリストを読んで行った。HTMLは読み取りのみ。

注記：指示文の見出しは「43行」となっていたが、実際に列挙されていた単元は56行だった。行の増減・改名はせず、列挙どおり56行で作成している。

---

## セクション1：網羅マップ

| 大分類 | 中分類 | 単元名 | 主 | 従 | 状態 |
|---|---|---|---|---|---|
| 理論 | 物質の構成 | 原子の構造と電子配置 | | | 未 |
| 理論 | 物質の構成 | 周期表と周期律 | | | 未 |
| 理論 | 物質の構成 | イオン結合とイオン結晶 | | chem-crystal-lattice, chem-thermochemistry | 部分 |
| 理論 | 物質の構成 | 共有結合と分子の形 | | chem-crystal-lattice | 部分 |
| 理論 | 物質の構成 | 金属結合と金属結晶 | | chem-crystal-lattice | 部分 |
| 理論 | 物質の構成 | 分子間力と水素結合 | | chem-gases-ideal-and-real | 部分 |
| 理論 | 物質の構成 | 結晶格子と単位格子 | chem-crystal-lattice | | 済 |
| 理論 | 物質の変化 | 物質量と化学反応式 | | chem-crystal-lattice, chem-electrochemistry, chem-gases-ideal-and-real | 部分 |
| 理論 | 物質の変化 | 溶液の濃度 | | chem-dilute-solutions | 部分 |
| 理論 | 物質の変化 | 酸と塩基の定義 | | chem-strong-weak-acid-base, chem-acid-base-distribution | 部分 |
| 理論 | 物質の変化 | pHと電離度 | chem-strong-weak-acid-base | chem-polyprotic-distribution, chem-salt-hydrolysis | 済 |
| 理論 | 物質の変化 | 中和滴定と滴定曲線 | chem-titration | chem-buffer-solutions | 済 |
| 理論 | 物質の変化 | 酸化還元の定義と酸化数 | | chem-electrochemistry | 部分 |
| 理論 | 物質の変化 | 酸化還元滴定 | | chem-electrochemistry | 部分 |
| 理論 | 物質の状態 | 状態変化と状態図 | | chem-dilute-solutions, chem-gases-ideal-and-real | 部分 |
| 理論 | 物質の状態 | 蒸気圧と沸点 | | chem-dilute-solutions, chem-gases-ideal-and-real | 部分 |
| 理論 | 物質の状態 | 気体の法則（理想気体・実在気体） | chem-gases-ideal-and-real | | 済 |
| 理論 | 物質の状態 | 気体の溶解とヘンリーの法則 | | | 未 |
| 理論 | 物質の状態 | 溶解度と溶解度曲線 | | | 未 |
| 理論 | 物質の状態 | 希薄溶液の束一的性質 | chem-dilute-solutions | | 済 |
| 理論 | 物質の状態 | コロイド | | | 未 |
| 理論 | 変化と平衡 | 反応エンタルピーとヘスの法則 | chem-thermochemistry | chem-reaction-kinetics, chem-chemical-equilibrium | 済 |
| 理論 | 変化と平衡 | 電池 | chem-electrochemistry | | 済 |
| 理論 | 変化と平衡 | 電気分解とファラデーの法則 | chem-electrochemistry | | 済 |
| 理論 | 変化と平衡 | 反応速度と活性化エネルギー | chem-reaction-kinetics | chem-thermochemistry, chem-chemical-equilibrium, chem-enzyme-kinetics, chem-gases-ideal-and-real | 済 |
| 理論 | 変化と平衡 | 化学平衡と平衡定数 | chem-chemical-equilibrium | chem-reaction-kinetics | 済 |
| 理論 | 変化と平衡 | ルシャトリエの原理 | chem-chemical-equilibrium | | 済 |
| 理論 | 変化と平衡 | 電離平衡と緩衝溶液 | chem-buffer-solutions, chem-acid-base-distribution, chem-polyprotic-distribution | chem-titration, chem-organic-separation | 済 |
| 理論 | 変化と平衡 | 塩の加水分解 | chem-salt-hydrolysis | chem-buffer-solutions | 済 |
| 理論 | 変化と平衡 | 溶解度積と沈殿平衡 | chem-ksp-basics, chem-ksp-ph-control | | 済 |
| 無機 | 非金属元素 | 水素・希ガス・ハロゲン | | chem-ksp-basics, chem-electrochemistry | 部分 |
| 無機 | 非金属元素 | 酸素・硫黄とその化合物 | | chem-ksp-ph-control, chem-chemical-equilibrium | 部分 |
| 無機 | 非金属元素 | 窒素・リンとその化合物 | | chem-chemical-equilibrium, chem-polyprotic-distribution | 部分 |
| 無機 | 非金属元素 | 炭素・ケイ素とその化合物 | | chem-crystal-lattice | 部分 |
| 無機 | 金属元素 | アルカリ金属・アルカリ土類金属 | | chem-ksp-basics | 部分 |
| 無機 | 金属元素 | アルミニウム・亜鉛・スズ・鉛 | | chem-ksp-ph-control, chem-ksp-basics | 部分 |
| 無機 | 金属元素 | 遷移元素（鉄・銅・銀・クロム・マンガン） | | chem-ksp-ph-control, chem-electrochemistry | 部分 |
| 無機 | 金属元素 | 錯イオンと配位結合 | | chem-ksp-ph-control | 部分 |
| 無機 | 実験と工業 | 気体の製法と性質 | | | 未 |
| 無機 | 実験と工業 | 金属イオンの分離と系統分析 | | chem-ksp-ph-control, chem-ksp-basics | 部分 |
| 無機 | 実験と工業 | 工業的製法（アンモニア・硫酸・ソーダ・製鉄） | | chem-electrochemistry, chem-chemical-equilibrium | 部分 |
| 有機 | 脂肪族 | 炭化水素（アルカン・アルケン・アルキン） | | | 未 |
| 有機 | 脂肪族 | アルコールとエーテル | | | 未 |
| 有機 | 脂肪族 | アルデヒド・ケトン | | | 未 |
| 有機 | 脂肪族 | カルボン酸とエステル | | chem-organic-separation, chem-acid-base-distribution | 部分 |
| 有機 | 芳香族 | ベンゼンと置換反応 | | | 未 |
| 有機 | 芳香族 | フェノール類 | | chem-organic-separation, chem-acid-base-distribution | 部分 |
| 有機 | 芳香族 | 芳香族カルボン酸とアミン | | chem-organic-separation, chem-acid-base-distribution | 部分 |
| 有機 | 芳香族 | 有機化合物の分離 | chem-organic-separation | | 済 |
| 有機 | 構造決定 | 元素分析と分子式決定 | | | 未 |
| 有機 | 構造決定 | 異性体 | | | 未 |
| 有機 | 構造決定 | 構造決定の手順 | | | 未 |
| 高分子 | 天然高分子 | 糖類 | chem-monosaccharide-structure, chem-starch-helix, chem-disaccharides | | 済 |
| 高分子 | 天然高分子 | アミノ酸とタンパク質 | | chem-acid-base-distribution, chem-titration | 部分 |
| 高分子 | 天然高分子 | 核酸 | chem-nucleotide-structure | | 部分 |
| 高分子 | 合成高分子 | 合成樹脂・合成繊維・ゴム | | | 未 |

---

## セクション2：集計

### 全体（56行）

| 状態 | 行数 |
|---|---|
| 済 | 15 |
| 部分 | 25 |
| 未 | 16 |

### 大分類ごと

| 大分類 | 行数 | 済 | 部分 | 未 |
|---|---|---|---|---|
| 理論 | 30 | 14 | 11 | 5 |
| 無機 | 11 | 0 | 10 | 1 |
| 有機 | 11 | 1 | 3 | 7 |
| 高分子 | 4 | 0 | 1 | 3 |

### 中分類ごとの「未」の行数（多い順）

| 中分類 | 未 | その中分類の全行数 |
|---|---|---|
| 物質の状態 | 3 | 7 |
| 脂肪族 | 3 | 4 |
| 構造決定 | 3 | 3 |
| 物質の構成 | 2 | 7 |
| 天然高分子 | 2 | 3 |
| 芳香族 | 1 | 4 |
| 実験と工業 | 1 | 3 |
| 合成高分子 | 1 | 1 |
| 物質の変化 | 0 | 7 |
| 変化と平衡 | 0 | 9 |
| 非金属元素 | 0 | 4 |
| 金属元素 | 0 | 4 |

---

## セクション3：未の単元の一覧

| 単元名 | その単元で受験生が扱う中心的な対象 | 連続的に動かせる変数の有無 | 優先度順位 |
|---|---|---|---|
| 原子の構造と電子配置 | 配置の規則 | 無 | 16 |
| 周期表と周期律 | 元素どうしの比較 | 無 | 5 |
| 気体の溶解とヘンリーの法則 | 溶解量の計算 | 有（圧力・温度） | 1 |
| 溶解度と溶解度曲線 | 析出量の計算 | 有（温度・水の量） | 2 |
| コロイド | 現象の分類 | 無 | 15 |
| 気体の製法と性質 | 製法と捕集の手順 | 無 | 14 |
| 炭化水素（アルカン・アルケン・アルキン） | 反応系統の関係 | 無 | 8 |
| アルコールとエーテル | 官能基の反応関係 | 無 | 9 |
| アルデヒド・ケトン | 反応による区別 | 無 | 10 |
| ベンゼンと置換反応 | 反応経路の関係 | 無 | 11 |
| 元素分析と分子式決定 | 組成比の計算 | 有（CO₂・H₂Oの質量） | 3 |
| 異性体 | 構造の数え上げ | 無 | 12 |
| 構造決定の手順 | 条件の絞り込み | 無 | 13 |
| 合成樹脂・合成繊維・ゴム | 単量体と重合の関係 | 有（重合度・平均分子量） | 4 |

---

## セクション4：気づいた点

### 主として割り当てられなかった教材

**chem-enzyme-kinetics**（1本）。ミカエリス・メンテン式の導出と3種の阻害様式が中心で、manifest 上も `course: 発展` / `section: 発展（学習指導要領外）`。本文に「活性化エネルギー」も「タンパク質」も「アミノ酸」も出てこないため、56行のどれにも中心テーマとして乗らない。「反応速度と活性化エネルギー」に従として付けた。

残り16本はすべて主が1〜2行付いた。2行に付いたのは chem-electrochemistry（電池／電気分解とファラデーの法則）と chem-chemical-equilibrium（化学平衡と平衡定数／ルシャトリエの原理）の2本。

### 3行以上に「従」としてまたがる教材

| 教材 | 従の行数 | 従として付いた行 |
|---|---|---|
| chem-electrochemistry | 6 | 物質量と化学反応式／酸化還元の定義と酸化数／酸化還元滴定／水素・希ガス・ハロゲン／遷移元素／工業的製法 |
| chem-acid-base-distribution | 5 | 酸と塩基の定義／カルボン酸とエステル／フェノール類／芳香族カルボン酸とアミン／アミノ酸とタンパク質 |
| chem-chemical-equilibrium | 5 | 反応エンタルピーとヘスの法則／反応速度と活性化エネルギー／酸素・硫黄とその化合物／窒素・リンとその化合物／工業的製法 |
| chem-crystal-lattice | 5 | イオン結合とイオン結晶／共有結合と分子の形／金属結合と金属結晶／物質量と化学反応式／炭素・ケイ素とその化合物 |
| chem-gases-ideal-and-real | 5 | 分子間力と水素結合／物質量と化学反応式／状態変化と状態図／蒸気圧と沸点／反応速度と活性化エネルギー |
| chem-ksp-ph-control | 5 | 酸素・硫黄とその化合物／アルミニウム・亜鉛・スズ・鉛／遷移元素／錯イオンと配位結合／金属イオンの分離と系統分析 |
| chem-ksp-basics | 4 | 水素・希ガス・ハロゲン／アルカリ金属・アルカリ土類金属／アルミニウム・亜鉛・スズ・鉛／金属イオンの分離と系統分析 |
| chem-organic-separation | 4 | 電離平衡と緩衝溶液／カルボン酸とエステル／フェノール類／芳香族カルボン酸とアミン |
| chem-dilute-solutions | 3 | 溶液の濃度／状態変化と状態図／蒸気圧と沸点 |

### 判定に迷った箇所

- **無機の10行が「部分」になっている中身**。無機に主は1本もない。従が付いたのは、平衡計算の題材として無機物質が登場するためで、性質・製法・反応そのものを説明する教材ではない。内訳は Ksp表の難溶性塩（ハロゲン化銀・BaSO₄・CaCO₃・PbCl₂ など）、電極反応と電解精錬・イオン交換膜法・融解塩電解、平衡定数の反応例（NH₃合成・接触法・N₂O₄）、H₂S の分別沈殿と両性水酸化物。無機を「部分」と読むか実質「未」と読むかは、この性格を踏まえて判断が必要。
- **共有結合と分子の形**。chem-crystal-lattice のダイヤモンド型（`kind:'covalent'`、CとSiの実例つき）を従にしたが、これは共有結合結晶であって分子の形ではない。VSEPR・電子式・分子の極性は17本のどこにも出てこない。
- **分子間力と水素結合**。chem-gases-ideal-and-real の a 定数は He 0.035 → H₂O 5.54 と並び、分子間引力の強さの序列そのものになっている。ただし本文に「水素結合」「ファンデルワールス力」の語がない。迷ったので従。
- **酸化還元滴定**。chem-electrochemistry の電位ラダーに例として「過マンガン酸と鉄(Ⅱ)」の組があるだけで、滴定の量的関係も終点判定もない。迷ったので従にしたが、実態は未に近い。
- **溶解度と溶解度曲線**を未のままにした。chem-ksp-basics の「溶解度 ⇄ Ksp 換算」は難溶性塩の mol/L を扱うもので、この単元が扱う温度依存の g/100 g水・再結晶とは別の量。従にはしなかった。
- **電離平衡と緩衝溶液に主を3本**（chem-buffer-solutions / chem-acid-base-distribution / chem-polyprotic-distribution）割り当てた。分布曲線2本は「電離平衡をpH軸で見る」ことが中心テーマで、他に主として置ける行がない。この行だけ三重に埋まっている。
- **ルシャトリエの原理を主にした**。chem-chemical-equilibrium の内容セクション5つのうち2つ（「K の列だけを見る」の操作表と「収率マップ」）がこの単元にあたるため。1教材2行の上限内。
- **金属イオンの分離と系統分析**は従にとどめた。chem-ksp-ph-control は冒頭で「系統分析の骨格になる2つの操作」と書いているが、実装は硫化物の分別沈殿と両性水酸化物の再溶解の2つだけで、塩化物での第1属分離・炎色反応・分析全体の手順はない。
- **気体の製法と性質**は未にした。chem-electrochemistry の電気分解で Cl₂・H₂・O₂ が発生し 22.4 L/mol の体積計算まで出るが、実験室製法・捕集法・乾燥剤というこの単元の中身とは別物。
- **アミノ酸とタンパク質**の従に chem-titration を入れるか迷った。グリシン・グルタミン酸・リシン・ヒスチジンが滴定対象として入っているが、等電点の記述は chem-acid-base-distribution 側にしかない（等電点6か所・pI 7か所）。両方を従にした。
