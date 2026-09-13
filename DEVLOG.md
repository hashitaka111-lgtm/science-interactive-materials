# 開発ログ

運用ルールは [scripts/DEVLOG-CONVENTION.md](scripts/DEVLOG-CONVENTION.md) を参照。
全ての作業セッションの最後に、このファイルへの追記・コミット・pushを行う。

## 2026-09-12 — リポジトリ初期化とGitHub公開

- 変更: リポジトリ全体を新規git初期化(既存git履歴は存在しなかったため1コミットで開始)、`.gitignore`、`scripts/DEVLOG-CONVENTION.md`、`DEVLOG.md`
- 教材数: 化学21件・物理12件、合計33件(manifest.jsonのidを`chem-`/`phys-`で集計。初回記載時にアミノ酸・タンパク質・酵素反応系を「生物」として誤って別枠に数えていたため訂正)
- 保留: 特になし
- 次: 特になし

## 2026-09-12 — 力学シリーズ4本目「円運動」の実装

- 変更: `html/phys-circular-motion.html`(新規)、`scripts/phys-circular-motion-layout.mjs`(新規)、`scripts/check-phys-circular-motion-overlaps.mjs`(新規)、`scripts/check-embedded-data.mjs`(EMBED_SCRIPT_CHECKSに3エントリ追加、`stripProjectionEngineD2RForCircularMotion`・`stripCircularMotionLayoutWiring`を追加)、`manifest.json`(`phys-circular-motion`を新規追加、`phys-shm-oscillation`・`phys-rigid-body-equilibrium`・`phys-momentum-impulse`のrelatedに相互リンクを追加)、`index.html`(build.mjsで再生成)
- UNIFORM(等速円運動)・HORIZONTAL(水平面、摩擦力が向心力)・VERTICAL(鉛直面、N(θ)の境界条件)・CONICAL PENDULUM(円錐振り子、3D)の4シーンを実装。shm-oscillation.htmlが天下り的に使っていたv=rω・a=rω²を、弧度法と相似な三角形から導出するDERIVATIONカードと、UNIFORMシーンに連動する読み取り専用のBRIDGE表(shm-oscillation.htmlへのリンク付き)を用意し、単振動教材との内容の重複を避けた
- 実装中に判明した注意点: vector-diagram-engine.mjsとprojection-engine.mjsは共に独自に`const D2R`を持っており、円錐振り子のために両方を同じ`<script type="module">`に埋め込むと`Identifier 'D2R' has already been declared`でSyntaxErrorになる。先に埋め込んだvector-diagram-engine.mjs側のD2R(値は同じ)を後続のprojection-engine.mjs・phys-circular-motion-layout.mjsの埋め込みから使い回す形にし、重複する宣言行だけをtransformSourceで取り除いて解消した(値そのものは変更していない)
- 教材数: 化学21件・物理13件、合計34件
- 保留: manifest.jsonの`phys-circular-motion`のrelatedに`phys-gravitation`をまだ含めていない(5本目「万有引力」がまだ存在しないため、含めるとbuild.mjsのvalidateが落ちる)。5本目の実装時にrelatedへの追加と、phys-gravitation側からの逆リンクを両方行うこと
- 次: 力学シリーズ5本目「万有引力」(phys-gravitation)の実装

## 2026-09-12 — 力学シリーズ5本目「万有引力」の実装(力学シリーズ完結)

- 変更: `html/phys-gravitation.html`(新規)、`scripts/phys-gravitation-layout.mjs`(新規)、`scripts/check-phys-gravitation-overlaps.mjs`(新規)、`scripts/check-embedded-data.mjs`(EMBED_SCRIPT_CHECKSに2エントリ追加、`stripGravitationLayoutWiring`を追加)、`manifest.json`(`phys-gravitation`を新規追加、`phys-circular-motion`・`phys-momentum-impulse`・`phys-rigid-body-equilibrium`のrelatedに相互リンクを追加)、`index.html`(build.mjsで再生成)
- LAW(万有引力の法則F=GMm/r²・2物体と力ベクトル)・CIRCULAR ORBIT(円軌道・第一宇宙速度v=√(GM/r)の導出)・ELLIPTICAL ORBIT(楕円軌道・ケプラー第2法則)・KEPLER'S THIRD LAW(ケプラー第3法則・太陽系惑星の実データでT²/a³がほぼ一定なことを表で確認)・ENERGY & ESCAPE VELOCITY(U=-GMm/rのグラフと脱出速度)の5シーンを実装。CIRCULAR ORBITでは4本目(phys-circular-motion)で確立したF=mv²/rを「すでに証明済みの道具」として明示的に使い、mv²/r=GMm/r²から段階を追ってv=√(GM/r)を導く形にした。軌道は指示どおりすべて2D(projection-engine.mjsは使わない)。中心天体は地球・月・太陽のプリセットに加えて、質量M(・距離r)を指数(10^x)で直接動かせる「カスタム」モードを4シーン(LAW/CIRCULAR ORBIT/ELLIPTICAL ORBIT/ENERGY)に用意した
- 楕円軌道のアニメーションは、ケプラー方程式M=E-e sinEをニュートン法で解いて求めた実際の位置を使っており(演出用の一定角速度ではない)、近日点で速く・遠日点で遅く動く様子と、同じ時間に掃く2つの扇形(近日点側は短い半径で広い角度、遠日点側は長い半径で狭い角度)がほぼ同じ面積になることを視覚的に確認できる
- ベクトル表示: 力(N)と速度(m/s)は指示どおりcomputeScaleを別グループで呼んでいる。矢印ラベルは単位を付けず数値だけにした(数値パネル側に単位を表示)—扱う量の桁が極端(力が1e-5N〜1e13Nなど)なため、単位まで含めるとラベル幅の見積もりがずれて重なりの原因になったため。破線は使っていない(合成ベクトルの表示もこの教材にはない)
- レイアウト定数の決め方で1点工夫した点: CIRCULAR ORBITの軌道半径pxは実際の距離rに比例させず√(r/rMax)で決めている。比例のままだと低高度(よくあるデフォルト値)がどれも中心点近くの点になってしまい、高度による見た目の違いがほとんど分からなかったため
- 検証: `node scripts/check-phys-gravitation-overlaps.mjs`(LAW/CIRCULAR ORBIT/ELLIPTICAL ORBIT/ENERGY & ESCAPE VELOCITYの4シーン×パラメータ複数パターンで合計303ケース、重なりゼロ)、`node scripts/check-embedded-data.mjs`、`node build.mjs`がすべて通ることを確認。あわせてPlaywright(Chromium)でページを実際に開き、4シーンすべてで中心天体プリセット切り替え・カスタムスライダー・時刻スクラブを一通り操作してJSエラーが出ないこと、375px幅でも操作できること、prefers-reduced-motionで自動アニメーションが止まり「+1コマ進める」に切り替わることを目視確認した
- KEPLER'S THIRD LAWのシーンはSVGの矢印・ラベルを使わず、太陽系惑星6個の実データをそのままHTML側の表(DOM)に描画するだけにした(操作変数の指定もなかったため)。そのためcheck-phys-gravitation-overlaps.mjsの対象にも含めていない
- 保留: 特になし(G=6.6743e-11・BODIES・PLANETSの数値は指示のとおりそのまま使用。ケプラー第3法則のT²/a³は全惑星で0.99〜1.00程度に収まり、実測データとして自然なばらつきの範囲内で違和感はなかった)
- 教材数: 化学21件・物理14件、合計35件
- 次: これで力学シリーズ(落体・放物運動/剛体のつり合い/運動量と力積/円運動/万有引力)の5本が完結した。次にこのシリーズに着手する場合は、新規教材ではなく5本の相互リンク・表現の整合性の見直しが中心になる見込み

## 2026-09-13 — 新規教材「気体の溶解とヘンリーの法則」第1段階(データ生成のみ)

- 変更: `data/henry-law.json`(新規)、`data/henry-law-review.md`(新規)
- 今回はデータ生成のみで、HTML・manifest.jsonには一切触れていない。方針(化学の内容データ(JSON)と描画(HTML)を別タスクに分け、データを人間が検証してから実装に進む)に従い、`data/organic-properties.json`/`data/organic-properties-review.md`と同じ進め方を踏襲した
- 対象は酸素O2・窒素N2・二酸化炭素CO2の3種類。0℃・1.0×10⁵Pa基準で水1Lに溶ける気体の体積(mL)を0/10/20/30/40℃の5点で持たせ、分子量(32.0/28.0/44.0)も含めた。ヘンリーの法則が成り立たない例としてアンモニア・塩化水素を数値なしの注記用メモとして追加した
- 数値はWeb調査により、高校化学の資料集・問題集で使われる典型的な数値パターンとBunsen吸収係数の古典的データ(International Critical Tables系統)を突き合わせて決定。0℃・20℃の値は複数資料で確度が高いが、窒素の0℃(23mL/24mLの両方の記載あり)・20℃(15mL/16mLの両方の記載あり)、および全気体の10℃・30℃・40℃(補間値)はconfidenceをlowとし、henry-law-review.mdに揺れの内容を記録した
- 既存教材`html/gases-ideal-and-real.html`(PV=nRT・ファンデルワールス式・分圧・気体分子の速さの分布を扱う)との内容重複がないことを確認済み(気体が液体に溶ける現象=ヘンリーの法則に範囲を限定)
- 教材数: 化学21件・物理14件、合計35件(manifest.jsonは今回変更していないため変化なし)
- 保留: 本教材はまだHTML実装前で、人間によるhenry-law-review.mdの化学的正しさのレビュー待ち。特にN2・CO2のconfidence: lowの数値(窒素0℃23mL/24mL、20℃15mL/16mL、および10/30/40℃の補間値)は人間の確認が必要
- 次: レビュー完了後、第2段階としてhtml/henry-law.htmlの実装指示を受ける予定

## 2026-09-13 — 熱力学シリーズ1本目「熱力学第一法則とモル比熱」の実装

- 変更: `html/phys-thermo-first-law.html`(新規)、`manifest.json`(`phys-thermo-first-law`を新規追加)、`index.html`(build.mjsで再生成)
- 高校物理に力学・波動・電磁気・原子はすでにあったが熱力学が1本もなかったため、そのシリーズ1本目として実装。radioactive-decay.html(グラフ・数値パネル中心の構成)を参照元にし、vector-diagram-engine.mjs・projection-engine.mjsは使っていない。化学側のgases-ideal-and-real.htmlで扱ったPV=nRTは前提知識として簡潔に触れるにとどめ、ΔU=Q+W・定積/定圧/断熱の3変化・モル比熱Cv,Cpに絞った
- 符号規約: ΔU=Q+W、W=「気体が外部からされた仕事」を採用し、FIRST LAWカードでタップ式の記号説明として明記した。もう一つの流儀(W=気体が外部にする仕事、Q=ΔU+W)との違いも本文とNOTESカードで注記した
- PROCESSカードの核になる設計判断: 3つの変化を「同じ始点(P&#8320;,V&#8320;,T&#8320;)から同じ終端温度T&#8321;に到達する」という条件で揃えた。こうするとΔU=nCvΔTが3つの変化で厳密に同じ値になり、道筋によってQとWの内訳だけが変わることが数値上はっきり見える(定積:W=0,Q=ΔU / 定圧:W=&minus;pΔV,Q=ΔU+pΔV / 断熱:Q=0,W=ΔU)。T&#8321;はT&#8320;比(0.5〜2.0倍)のスライダー1つで操作し、V&#8320;やT&#8320;を動かしてもスライダーの範囲を再計算しなくて済むようにした
- ADIABATICカードは指示どおり「発展」ラベル(琥珀色のtagとcard.adv背景)で通常カードと視覚的に区別し、dU=dWからpV^γ=一定を微分で導く5ステップと、PROCESSカードの断熱変化の終端がP&#8320;V&#8320;^γ=P&#8321;V&#8321;^γを満たすことを数値で確認する小さなグラフ(T&#8320;等温線と断熱線の傾きの比較)を用意した
- 実装中に判明した注意点: テーブルの1列目に「単原子分子」のような複数文字の日本語ラベルを入れると、th/tdにwhite-space:nowrapを指定しない場合、375px幅ではセル内で1文字ずつ縦に折り返されてしまい読めなくなった。gases-ideal-and-real.htmlがth/tdにnowrapを指定して.scrollラッパーで横スクロールさせる方式を採用していたのに合わせ、th/tdにwhite-space:nowrapを追加してこの教材でも同じ方式に統一した
- 検証: Playwright(Chromium)でheadless起動し、375px/820px幅でJSエラーが出ないこと、気体の種類・変化の種類・4つのスライダー(n, V&#8320;, T&#8320;, T&#8321;/T&#8320;)を極端な値まで動かしてもp-V図とADIABATICの小グラフでラベルの重なりが起きないことを目視確認。あわせてP&#8320;V&#8320;^γとP&#8321;V&#8321;^γが浮動小数点誤差(相対差 約10&minus;14%)の範囲で一致することと、FIRST LAWカードのタップ式記号説明(ΔU/Q/W)が正しく切り替わることも確認した
- 保留: manifestのrelatedは当面`chem-gases-ideal-and-real`との相互リンクのままにしている。`phys-thermo-heat-engine`(2本目「熱機関」)を含めたかったが、まだファイルが存在せずbuild.mjsのvalidateが落ちるため断念した。本来`chem-gases-ideal-and-real`側のこの枠は化学のhenry-law用に空けておく予定だったが、`phys-thermo-first-law`のrelatedを他の空き枠(id未定)に差し替えない限り双方向ルール上どちらかを埋めておく必要があり、いったんこの組み合わせで通した。2本目「熱機関」の実装時にphys-thermo-first-law側のrelatedを`phys-thermo-heat-engine`に差し替え、`chem-gases-ideal-and-real`側の枠をhenry-law用に明け渡すこと
- 教材数: 化学21件・物理15件、合計36件
- 次: 熱力学シリーズ2本目「熱機関」(phys-thermo-heat-engine、仮)の実装。定積・定圧・断熱の3つの道具をサイクルに組み合わせて熱効率を扱う想定

## 2026-09-13 — 新規教材「溶解度と溶解度曲線」データ生成(第1段階のみ・人間レビュー待ち)

- 変更: `data/solubility-curve.json`(新規)、`data/solubility-curve-review.md`(新規)
- **この回はデータ生成のみ。HTML・manifest.jsonには一切触れていない。** 指示により、データの内容を人間がレビューしてから第2段階(HTML実装)の指示を別途受ける想定
- 対象はKNO3(硝酸カリウム、素直な右上がり)・NaCl(塩化ナトリウム、ほぼ横ばい)・Na2SO4(硫酸ナトリウム、32.4℃で水和物⇔無水物の相転移により折れ曲がる)・Ca(OH)2(水酸化カルシウム、逆行溶解度で右下がり)の4物質。各物質0〜100℃で11点以上(Na2SO4は32.4℃前後を細かく14点)のg/100g水データを用意した
- Na2SO4は全点confidence lowとした。曲線の「形」(32.4℃までは急な右上がり、そこから先はゆるい右下がり)自体は化学便覧・相図資料で確立しているが、個々の数値は資料間でg単位のずれが大きいため。**実装前にCRC Handbook等の原典で再確認することを推奨**する旨をreview.mdに明記した
- Ca(OH)2は0〜100℃で単調減少になっているかを自分でスクリプト検証した(assert済み)。0/20/40/60/80/100℃は資料に広く載る定番値、10/30/50/70/90℃はその間の線形補間(confidence low)
- review.mdには単なる数値一覧に加えて、各物質1〜2個ずつ再結晶の計算問題例を用意し、実際に数値を検算した(KNO3・NaClは質量保存だけで解ける単純な冷却析出、Na2SO4は十水和物Na2SO4・10H2Oとして析出する場合の水分収支つき計算、Ca(OH)2は加熱すると析出する逆行溶解度特有の計算)。Na2SO4の十水和物の例は32.4℃をまたぐ場合とまたがない場合を対比させる設問案も添えた
- 保留: Na2SO4の数値全点(原典での再確認待ち)、NaCl 100℃の値(資料が39.1g系統と39.8g系統に分かれる)
- 次: データ内容の人間レビュー完了後、HTML実装(第2段階)の指示を受けて着手
