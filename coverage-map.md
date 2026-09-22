# 高校化学 単元網羅マップ

対象：manifest.json のうち `subject: chemistry` の42本（chem-crystal-lattice〜chem-genetic-code、order 1〜42）。判定は各HTMLの見出しと本文、選択肢として実装されている物質・反応のリストを読んで行った。HTMLは読み取りのみ。

注記：本文書はもともと化学教材17本の時点で作られ、その後42本まで増えた教材数に内容が追いついていなかった（セクション1は一部だけ糖類・核酸の追加が反映済みだったが、セクション2の集計はそれ以前の数値のまま止まっていた）。今回、42本全件をmanifest.jsonの一覧とHTML本文で読み直し、56行すべてを再判定した。行の増減・改名はせず、列挙どおり56行のまま更新している。

---

## セクション1：網羅マップ

| 大分類 | 中分類 | 単元名 | 主 | 従 | 状態 |
|---|---|---|---|---|---|
| 理論 | 物質の構成 | 原子の構造と電子配置 | | | 未 |
| 理論 | 物質の構成 | 周期表と周期律 | chem-periodic-trends | | 済 |
| 理論 | 物質の構成 | イオン結合とイオン結晶 | | chem-crystal-lattice, chem-thermochemistry | 部分 |
| 理論 | 物質の構成 | 共有結合と分子の形 | | chem-crystal-lattice | 部分 |
| 理論 | 物質の構成 | 金属結合と金属結晶 | | chem-crystal-lattice | 部分 |
| 理論 | 物質の構成 | 分子間力と水素結合 | | chem-gases-ideal-and-real, chem-hydrocarbon-nomenclature, chem-alcohol-ether-nomenclature | 部分 |
| 理論 | 物質の構成 | 結晶格子と単位格子 | chem-crystal-lattice | | 済 |
| 理論 | 物質の変化 | 物質量と化学反応式 | | chem-crystal-lattice, chem-electrochemistry, chem-gases-ideal-and-real, chem-elemental-analysis, chem-fats-oils-saponification | 部分 |
| 理論 | 物質の変化 | 溶液の濃度 | | chem-dilute-solutions | 部分 |
| 理論 | 物質の変化 | 酸と塩基の定義 | | chem-strong-weak-acid-base, chem-acid-base-distribution, chem-soap-surfactants | 部分 |
| 理論 | 物質の変化 | pHと電離度 | chem-strong-weak-acid-base | chem-polyprotic-distribution, chem-salt-hydrolysis | 済 |
| 理論 | 物質の変化 | 中和滴定と滴定曲線 | chem-titration | chem-buffer-solutions | 済 |
| 理論 | 物質の変化 | 酸化還元の定義と酸化数 | | chem-electrochemistry | 部分 |
| 理論 | 物質の変化 | 酸化還元滴定 | | chem-electrochemistry | 部分 |
| 理論 | 物質の状態 | 状態変化と状態図 | | chem-dilute-solutions, chem-gases-ideal-and-real | 部分 |
| 理論 | 物質の状態 | 蒸気圧と沸点 | | chem-dilute-solutions, chem-gases-ideal-and-real | 部分 |
| 理論 | 物質の状態 | 気体の法則（理想気体・実在気体） | chem-gases-ideal-and-real | | 済 |
| 理論 | 物質の状態 | 気体の溶解とヘンリーの法則 | chem-henry-law | | 済 |
| 理論 | 物質の状態 | 溶解度と溶解度曲線 | chem-solubility-curve | | 済 |
| 理論 | 物質の状態 | 希薄溶液の束一的性質 | chem-dilute-solutions | | 済 |
| 理論 | 物質の状態 | コロイド | | | 未 |
| 理論 | 変化と平衡 | 反応エンタルピーとヘスの法則 | chem-thermochemistry | chem-reaction-kinetics, chem-chemical-equilibrium | 済 |
| 理論 | 変化と平衡 | 電池 | chem-electrochemistry | | 済 |
| 理論 | 変化と平衡 | 電気分解とファラデーの法則 | chem-electrochemistry | | 済 |
| 理論 | 変化と平衡 | 反応速度と活性化エネルギー | chem-reaction-kinetics | chem-thermochemistry, chem-chemical-equilibrium, chem-enzyme-kinetics, chem-gases-ideal-and-real | 済 |
| 理論 | 変化と平衡 | 化学平衡と平衡定数 | chem-chemical-equilibrium | chem-reaction-kinetics | 済 |
| 理論 | 変化と平衡 | ルシャトリエの原理 | chem-chemical-equilibrium | chem-henry-law, chem-solubility-curve | 済 |
| 理論 | 変化と平衡 | 電離平衡と緩衝溶液 | chem-buffer-solutions, chem-acid-base-distribution, chem-polyprotic-distribution | chem-titration, chem-organic-separation | 済 |
| 理論 | 変化と平衡 | 塩の加水分解 | chem-salt-hydrolysis | chem-buffer-solutions, chem-soap-surfactants | 済 |
| 理論 | 変化と平衡 | 溶解度積と沈殿平衡 | chem-ksp-basics, chem-ksp-ph-control | chem-soap-surfactants | 済 |
| 無機 | 非金属元素 | 水素・希ガス・ハロゲン | | chem-ksp-basics, chem-electrochemistry, chem-periodic-trends | 部分 |
| 無機 | 非金属元素 | 酸素・硫黄とその化合物 | | chem-ksp-ph-control, chem-chemical-equilibrium | 部分 |
| 無機 | 非金属元素 | 窒素・リンとその化合物 | | chem-chemical-equilibrium, chem-polyprotic-distribution, chem-ester-nomenclature | 部分 |
| 無機 | 非金属元素 | 炭素・ケイ素とその化合物 | | chem-crystal-lattice | 部分 |
| 無機 | 金属元素 | アルカリ金属・アルカリ土類金属 | | chem-ksp-basics, chem-periodic-trends | 部分 |
| 無機 | 金属元素 | アルミニウム・亜鉛・スズ・鉛 | | chem-ksp-ph-control, chem-ksp-basics | 部分 |
| 無機 | 金属元素 | 遷移元素（鉄・銅・銀・クロム・マンガン） | | chem-ksp-ph-control, chem-electrochemistry | 部分 |
| 無機 | 金属元素 | 錯イオンと配位結合 | | chem-ksp-ph-control | 部分 |
| 無機 | 実験と工業 | 気体の製法と性質 | | | 未 |
| 無機 | 実験と工業 | 金属イオンの分離と系統分析 | | chem-ksp-ph-control, chem-ksp-basics | 部分 |
| 無機 | 実験と工業 | 工業的製法（アンモニア・硫酸・ソーダ・製鉄） | | chem-electrochemistry, chem-chemical-equilibrium, chem-organic-reaction-map, chem-fats-oils-saponification | 部分 |
| 有機 | 脂肪族 | 炭化水素（アルカン・アルケン・アルキン） | chem-hydrocarbon-nomenclature | chem-organic-reaction-map | 済 |
| 有機 | 脂肪族 | アルコールとエーテル | chem-alcohol-ether-nomenclature | chem-organic-reaction-map | 済 |
| 有機 | 脂肪族 | アルデヒド・ケトン | chem-aldehyde-ketone-nomenclature | chem-organic-reaction-map | 済 |
| 有機 | 脂肪族 | カルボン酸とエステル | chem-carboxylic-acid-nomenclature, chem-ester-nomenclature | chem-organic-separation, chem-acid-base-distribution, chem-organic-reaction-map, chem-fats-oils-saponification, chem-substituted-carboxylic-acid-nomenclature | 済 |
| 有機 | 芳香族 | ベンゼンと置換反応 | chem-organic-reaction-map | | 済 |
| 有機 | 芳香族 | フェノール類 | chem-organic-reaction-map | chem-organic-separation, chem-acid-base-distribution | 済 |
| 有機 | 芳香族 | 芳香族カルボン酸とアミン | chem-organic-reaction-map, chem-substituted-carboxylic-acid-nomenclature | chem-organic-separation, chem-acid-base-distribution, chem-ester-nomenclature | 済 |
| 有機 | 芳香族 | 有機化合物の分離 | chem-organic-separation | | 済 |
| 有機 | 構造決定 | 元素分析と分子式決定 | chem-elemental-analysis | | 済 |
| 有機 | 構造決定 | 異性体 | chem-isomers | chem-hydrocarbon-nomenclature, chem-carboxylic-acid-nomenclature, chem-substituted-carboxylic-acid-nomenclature | 済 |
| 有機 | 構造決定 | 構造決定の手順 | chem-structure-determination | chem-organic-reaction-map, chem-elemental-analysis, chem-isomers | 済 |
| 高分子 | 天然高分子 | 糖類 | chem-monosaccharide-structure, chem-starch-helix, chem-disaccharides | | 済 |
| 高分子 | 天然高分子 | アミノ酸とタンパク質 | chem-amino-acids-matrix, chem-peptide-sequencing, chem-protein-structure | chem-acid-base-distribution, chem-titration | 済 |
| 高分子 | 天然高分子 | 核酸 | chem-nucleotide-structure, chem-dna-double-helix, chem-genetic-code | | 済 |
| 高分子 | 合成高分子 | 合成樹脂・合成繊維・ゴム | | chem-polymer-degree | 部分 |

---

## セクション2：集計

### 全体（56行）

| 状態 | 行数 |
|---|---|
| 済 | 31 |
| 部分 | 22 |
| 未 | 3 |

### 大分類ごと

| 大分類 | 行数 | 済 | 部分 | 未 |
|---|---|---|---|---|
| 理論 | 30 | 17 | 11 | 2 |
| 無機 | 11 | 0 | 10 | 1 |
| 有機 | 11 | 11 | 0 | 0 |
| 高分子 | 4 | 3 | 1 | 0 |

### 中分類ごとの「未」の行数（多い順）

| 中分類 | 未 | その中分類の全行数 |
|---|---|---|
| 物質の構成 | 1 | 7 |
| 物質の状態 | 1 | 7 |
| 実験と工業 | 1 | 3 |
| 物質の変化 | 0 | 7 |
| 変化と平衡 | 0 | 9 |
| 非金属元素 | 0 | 4 |
| 金属元素 | 0 | 4 |
| 脂肪族 | 0 | 4 |
| 芳香族 | 0 | 4 |
| 構造決定 | 0 | 3 |
| 天然高分子 | 0 | 3 |
| 合成高分子 | 0 | 1 |

有機11行・天然高分子3行（糖類・アミノ酸とタンパク質・核酸）がすべて済になったため、未は3行（原子の構造と電子配置／コロイド／気体の製法と性質）まで減った。

---

## セクション3：未の単元の一覧

今回済・部分になった行はここから除いた。残った3行のみ。優先度順位は前回の考え方（変数のある単元を優先。ただし3行とも変数なし）を踏襲して振り直したが、更新は必須ではなく次回セッションでの再検討を前提とする。

| 単元名 | その単元で受験生が扱う中心的な対象 | 連続的に動かせる変数の有無 | 優先度順位 |
|---|---|---|---|
| 気体の製法と性質 | 製法と捕集の手順 | 無 | 1 |
| コロイド | 現象の分類 | 無 | 2 |
| 原子の構造と電子配置 | 配置の規則 | 無 | 3 |

---

## セクション4：気づいた点

### 主として割り当てられなかった教材

42本中4本が、56行のどこにも主として乗らなかった。

- **chem-enzyme-kinetics**（前回からの記録）。ミカエリス・メンテン式の導出と3種の阻害様式が中心で、manifest上も`course: 発展`/`section: 発展（学習指導要領外）`。本文に「活性化エネルギー」も「タンパク質」も「アミノ酸」も出てこないため、56行のどれにも中心テーマとして乗らない。「反応速度と活性化エネルギー」に従として付けた。
- **chem-polymer-degree**（今回）。「重合度nから平均分子量Mを計算する」という1点に絞った計算教材で、本文自身が「天然ゴム(イソプレンの重合)や加硫、熱可塑性樹脂と熱硬化性樹脂の分類、フェノール樹脂のような付加縮合は、いずれもこの教材の範囲外」と明記している。合成樹脂・合成繊維・ゴムという単元全体を中心的に扱っているとは言えないため、この行は主を空欄のまま部分にとどめ、chem-polymer-degreeは従とした。
- **chem-fats-oils-saponification**（今回）。油脂はカルボン酸とエステルの応用例(グリセリンと脂肪酸のトリエステル)で、カルボン酸・エステルの命名法そのものはchem-carboxylic-acid-nomenclature/chem-ester-nomenclatureが主として扱う。この教材はけん化価・ヨウ素価という2つの計算に絞っているため従にとどめた（物質量と化学反応式・カルボン酸とエステル・工業的製法の3行に従として付いた）。
- **chem-soap-surfactants**（今回）。本文が「弱酸+強塩基の塩は加水分解して塩基性を示す、という一般論...はchem-salt-hydrolysisで扱っている。本教材ではその一般論をセッケンという具体例に適用した結論だけを扱う」と明記しており、セッケン・界面活性剤という単元名の行は56行の中に存在しない。関連する3行（酸と塩基の定義／塩の加水分解／溶解度積と沈殿平衡）すべてに従として付けた。

残り38本はすべて主が1本以上付いた。

### 3行以上に「従」としてまたがる教材

| 教材 | 従の行数 | 従として付いた行 |
|---|---|---|
| chem-electrochemistry | 6 | 物質量と化学反応式／酸化還元の定義と酸化数／酸化還元滴定／水素・希ガス・ハロゲン／遷移元素／工業的製法 |
| chem-organic-reaction-map | 6 | 炭化水素／アルコールとエーテル／アルデヒド・ケトン／カルボン酸とエステル／工業的製法／構造決定の手順 |
| chem-acid-base-distribution | 5 | 酸と塩基の定義／カルボン酸とエステル／フェノール類／芳香族カルボン酸とアミン／アミノ酸とタンパク質 |
| chem-chemical-equilibrium | 5 | 反応エンタルピーとヘスの法則／反応速度と活性化エネルギー／酸素・硫黄とその化合物／窒素・リンとその化合物／工業的製法 |
| chem-crystal-lattice | 5 | イオン結合とイオン結晶／共有結合と分子の形／金属結合と金属結晶／物質量と化学反応式／炭素・ケイ素とその化合物 |
| chem-gases-ideal-and-real | 5 | 分子間力と水素結合／物質量と化学反応式／状態変化と状態図／蒸気圧と沸点／反応速度と活性化エネルギー |
| chem-ksp-ph-control | 5 | 酸素・硫黄とその化合物／アルミニウム・亜鉛・スズ・鉛／遷移元素／錯イオンと配位結合／金属イオンの分離と系統分析 |
| chem-ksp-basics | 4 | 水素・希ガス・ハロゲン／アルカリ金属・アルカリ土類金属／アルミニウム・亜鉛・スズ・鉛／金属イオンの分離と系統分析 |
| chem-organic-separation | 4 | 電離平衡と緩衝溶液／カルボン酸とエステル／フェノール類／芳香族カルボン酸とアミン |
| chem-dilute-solutions | 3 | 溶液の濃度／状態変化と状態図／蒸気圧と沸点 |
| chem-soap-surfactants | 3 | 酸と塩基の定義／塩の加水分解／溶解度積と沈殿平衡 |

chem-organic-reaction-mapは主3行(ベンゼンと置換反応／フェノール類／芳香族カルボン酸とアミン)と従6行を合わせ、42本の中で最も多くの行に関わる教材になった。有機化合物全体を1枚の反応網羅図にした教材であるため、命名法に特化した専用教材が存在する単元では従、存在しない単元では主という役割分担になっている。

### 判定に迷った箇所（前回時点の記録）

- **無機の10行が「部分」になっている中身**。無機に主は1本もない。従が付いたのは、平衡計算の題材として無機物質が登場するためで、性質・製法・反応そのものを説明する教材ではない。内訳はKsp表の難溶性塩（ハロゲン化銀・BaSO₄・CaCO₃・PbCl₂など）、電極反応と電解精錬・イオン交換膜法・融解塩電解、平衡定数の反応例（NH₃合成・接触法・N₂O₄）、H₂Sの分別沈殿と両性水酸化物。無機を「部分」と読むか実質「未」と読むかは、この性格を踏まえて判断が必要。この構図は今回の再監査でも変わっていない（水素・希ガス・ハロゲンとアルカリ金属・アルカリ土類金属にchem-periodic-trendsが従として加わったが、periodic-trendsも分類・物性一覧であり反応・製法の教材ではないため、無機の性格自体は変わらない）。
- **共有結合と分子の形**。chem-crystal-latticeのダイヤモンド型（`kind:'covalent'`、CとSiの実例つき）を従にしたが、これは共有結合結晶であって分子の形ではない。VSEPR・電子式・分子の極性は42本のどこにも出てこない（今回新たに読んだ25本にも該当なし）。
- **分子間力と水素結合**。chem-gases-ideal-and-realのa定数はHe 0.035→H₂O 5.54と並び、分子間引力の強さの序列そのものになっている。ただし本文に「水素結合」「ファンデルワールス力」の語がない。加えて今回、chem-hydrocarbon-nomenclature（沸点は分子量が大きいほど高いという一般論）とchem-alcohol-ether-nomenclature（多価アルコールはOHが増えるほど水素結合が増え水に溶けやすくなる、と明記）を従に追加した。いずれも一般論への言及にとどまり、水素結合の仕組みそのもの（双極子と孤立電子対の位置関係など）を説明する教材ではない。
- **酸化還元滴定**。chem-electrochemistryの電位ラダーに例として「過マンガン酸と鉄(Ⅱ)」の組があるだけで、滴定の量的関係も終点判定もない。迷ったので従にしたが、実態は未に近い。
- **金属イオンの分離と系統分析**は従にとどめた。chem-ksp-ph-controlは冒頭で「系統分析の骨格になる2つの操作」と書いているが、実装は硫化物の分別沈殿と両性水酸化物の再溶解の2つだけで、塩化物での第1属分離・炎色反応・分析全体の手順はない。
- **気体の製法と性質**は未にした。chem-electrochemistryの電気分解でCl₂・H₂・O₂が発生し22.4 L/molの体積計算まで出るが、実験室製法・捕集法・乾燥剤というこの単元の中身とは別物。今回追加で読んだ25本にも実験室的な気体発生装置・捕集法を扱う教材はなかった（chem-organic-reaction-mapの「炭化カルシウムに水を加えるとアセチレン」「NaOHソーダ石灰でメタン」は気体そのものの製法ではなく有機反応の出発点としての言及）。
- **アミノ酸とタンパク質の従にchem-titrationを入れるか迷った**（前回の記録）。グリシン・グルタミン酸・リシン・ヒスチジンが滴定対象として入っているが、等電点の記述はchem-acid-base-distribution側にしかない（等電点6か所・pI 7か所）。両方を従にした。今回、この行の主をchem-amino-acids-matrix／chem-peptide-sequencing／chem-protein-structureの3本に差し替えたため、chem-acid-base-distribution／chem-titrationは主から従に格下げした。

### 判定に迷った箇所（今回のセッション）

- **合成樹脂・合成繊維・ゴムをchem-polymer-degreeの主にするか迷った**。重合度→平均分子量の計算そのものは4物質（ポリエチレン・ポリ塩化ビニル・ナイロン66・PET）ぶん扱っているが、天然ゴム・加硫・熱可塑性/熱硬化性樹脂の分類、フェノール樹脂のような付加縮合は明示的に範囲外としている。単元全体ではなく計算の1手法に絞った教材と判断し、主は空欄のまま部分・従にとどめた。
- **ベンゼンと置換反応／フェノール類／芳香族カルボン酸とアミンの主をchem-organic-reaction-mapにするか迷った**。この3行には、炭化水素・アルコールとエーテル・アルデヒド・ケトンにあるような命名法専用の教材が存在しない。chem-organic-reaction-mapは47化合物の反応系統図で、ベンゼン→トルエン/クロロベンゼン/ニトロベンゼン/アニリン系、フェノール→ナトリウムフェノキシド/ピクリン酸、安息香酸→サリチル酸→アスピリンの流れを試薬・条件つきで扱っており、他に代わる教材がないため主とした。一方、炭化水素・アルコールとエーテル・アルデヒド・ケトンの3行は、chem-hydrocarbon-nomenclature等の専用教材自身が「反応の仕組み・検出反応の詳細はchem-organic-reaction-mapを参照」と明記しているため、専用教材を主・organic-reaction-mapを従とした。
- **芳香族カルボン酸とアミンに主を2本（chem-organic-reaction-map／chem-substituted-carboxylic-acid-nomenclature）割り当てた**。前者はアニリン・ジアゾ化・カップリングという「アミン」側の反応を、後者はアントラニル酸・p-アミノ安息香酸(PABA)という「アミノカルボン酸」側の命名を扱っており、どちらか一方だけでは単元を覆えないため両方を主にした。
- **カルボン酸とエステルに主を2本（chem-carboxylic-acid-nomenclature／chem-ester-nomenclature）割り当てた**。カルボン酸の命名法とエステルの命名法が別教材として完全に分業されており、片方だけでは単元の半分しか扱えないため。
- **アミノ酸とタンパク質に主を3本（chem-amino-acids-matrix／chem-peptide-sequencing／chem-protein-structure）割り当てた**。アミノ酸マトリクス＝20種の分類・検出反応・分子構造、ペプチドの配列決定＝一次構造(配列)の決定手順、タンパク質の構造と変性＝二次〜四次構造・変性という役割分担で、3本ともこの単元の一部ではなく中心テーマそのものを扱っている。3本とも従来の主（chem-acid-base-distribution／chem-titration、等電点のみを扱う）より内容が直接的なため、旧2本は従に格下げした。
- **工業的製法にchem-organic-reaction-mapとchem-fats-oils-saponificationを従で追加するか迷った**。行の単元名の括弧書きは「アンモニア・硫酸・ソーダ・製鉄」という無機工業化学の例だが、organic-reaction-mapのクメン法（フェノール・アセトンの工業的製法）とワッカー法（アセトアルデヒドの工業的製法、O₂/PdCl₂・CuCl₂）、fats-oils-saponificationの硬化油（H₂付加でヨウ素価を下げる工業プロセス、マーガリン・ショートニング）は、いずれも本文中に「工業的製法」「工業プロセス」と明記された有機工業化学の実例。括弧書きの例は無機に限定する趣旨ではなく単元名は「工業的製法」であるため、両方を従に加えた。
- **異性体にchem-hydrocarbon-nomenclature／chem-carboxylic-acid-nomenclature／chem-substituted-carboxylic-acid-nomenclatureを従で追加した**。chem-isomers自身は「立体異性体はこの数には含めていません」と明記し構造異性体の数え上げに絞っているが、hydrocarbon-nomenclatureのシス-トランス異性体、carboxylic-acid-nomenclatureのマレイン酸/フマル酸（幾何異性体とKa1・Ka2の違い）、substituted-carboxylic-acid-nomenclatureのβ-アラニン/アラニン（位置異性体、指示文の「骨格上の異性体」という誤りを実装時に訂正したと明記）は、いずれも異性体そのものを主題にした記述であるため従に加えた。chem-alcohol-ether-nomenclatureは「骨格/位置異性体の判定はchem-isomersを参照」と自ら退いているため、従には加えていない。
