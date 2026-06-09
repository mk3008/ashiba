# Ashiba 普及計画

## 台帳スナップショット

* 目的: Ashiba の機能開発とは別に、認知、理解、試用、信頼、採用を増やすための普及計画を管理する。
* 現在: 初期調査レポートと現行 README の方向性をもとに、普及上の優先順位を整理した段階。
* 次: P0 施策を個別 issue または作業チケットに分解し、30日以内に外部から見える成果物を公開する。
* ブロッカー: 公開採用指標、競合比較数値、npm download、検索順位などはまだ独自検証していない。
* 証拠状況: partial。現時点では調査レポート由来の仮説と、現行リポジトリ内容に基づく判断を含む。

## 課題

Ashiba には明確な技術的個性がある一方で、普及上のボトルネックは機能量そのものではない。

直近の課題は、市場が Ashiba を Prisma / Drizzle / sqlc と並べて理解するための言葉、比較材料、試用導線、社会的証明が不足していること。

README はすでにキャッチーな方向に改善されている。次に必要なのは、README に来る前の人へ届く説明、比較記事、スターター、実行可能なデモである。

## 基本方針

Ashiba の普及では、機能追加よりも次を優先する。

* 何の道具なのかを一文で説明できるようにする。
* なぜ Prisma / Drizzle / sqlc ではなく Ashiba を選ぶのかを説明できるようにする。
* 逆に、Ashiba を選ばない方がよい場面も明記する。
* PostgreSQL で実際に試せる導線を磨く。
* 主張を文章だけでなく、スターター、drift check デモ、mapper test、DB 対応状況で支える。
* 初期 KPI は stars ではなく、実際に試した人と得られたフィードバックを重視する。

## 想定利用者

* SQL を見える形で保ち、レビュー可能にしたい TypeScript チーム。
* 型安全は欲しいが、実行時 ORM オブジェクト層を主要な抽象にしたくないチーム。
* Prisma / Drizzle / sqlc / 生 SQL 運用を比較していて、SQL-first な TypeScript 選択肢を探しているチーム。
* PostgreSQL を使っており、SQL、DTO、mapper、test、drift check の運用を整理したいチーム。
* AI コーディングを使うが、最終的には人間が SQL と生成物をレビューできる状態を求めるチーム。
* 実案件で Ashiba を試し、導入上のフィードバックを返せる初期デザインパートナー。

## 利用者価値

利用者が Ashiba を数分で理解し、1時間以内に試し、既存選択肢と正直に比較できるようにする。

さらに、Ashiba の主張が、実行可能な例、見えるドキュメント、検査可能なデモ、初期利用証拠で支えられている状態を作る。

## 優先度モデル

優先度は、機能としての新規性ではなく、普及への効きやすさで決める。

* P0: Ashiba を理解可能、試用可能にするために必須。30日以内に外部から見える成果物にする。
* P1: メンテナ本人の主張を超えて、信用とフィードバックループを作るために必要。
* P2: メッセージ、試用導線、証拠ループができた後に効く拡張。

## 優先順位

| 優先度 | 施策                                | 先にやる理由                                                | 観測可能な成果                                                                                                |
| --- | --------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| P0  | カテゴリ文と主張セットの固定                    | 一文で説明できないと、後続の施策すべてで価値が漏れる。                           | GitHub / npm / README / docs / SNS で同じカテゴリ表現と 3-5 個の主張を使う。                                             |
| P0  | README / docs / npm の導線補強         | README は改善済みなので、大改造よりも比較、Why、スターターへの導線を揃える方が効く。       | ファーストビューと導線で SQL-first TypeScript generator、非 ORM runtime、生成物、quickstart、比較ページを示す。                     |
| P0  | Why Ashiba ページ                    | Prisma / Drizzle / sqlc 比較の前に、Ashiba の存在理由を固定する必要がある。 | SQL を隠さない理由、生 SQL だけでは足りない理由、Ashiba が生成する足場を1ページで説明する。                                                 |
| P0  | 磨き込んだ PostgreSQL スターター1本          | 概念に納得しても、動く入口がないと採用に進まない。                             | clone して SQL 確認、生成、mapper test、drift check まで実行できるスターターを用意する。                                          |
| P0  | DB 対応状況の成熟度整理                     | PostgreSQL-first な導線と他 adapter の成熟度を曖昧にすると過剰期待につながる。  | stable / preview / experimental / planned などの成熟度ラベルを docs に明記する。                                       |
| P0  | 最初の比較記事1本                         | 既存ツールの理解から入る評価者に対して、Ashiba のカテゴリを伝える入口になる。            | まず Ashiba vs Prisma または Ashiba vs sqlc を公開し、使うべき時と使わない方がよい時を書く。                                        |
| P1  | Prisma / Drizzle / sqlc 比較ページの拡充  | 比較検索での流入と、意思決定時の説明材料を作る。                              | 3ページを公開し、README / docs / Why Ashiba から相互リンクする。                                                         |
| P1  | migration review / drift check デモ | Ashiba の強みは、文章より動作を見る方が伝わりやすい。                        | SQL / DDL 変更、生成物、drift 検出、レビュー可能な migration SQL を短い再現デモで示す。                                            |
| P1  | AI ネイティブ訴求ページ                     | AI に任せるほど、SQL と生成物が見えることの価値が増える。                      | AI による変更、SQL レビュー、mapper test、drift check の関係を説明するページまたは記事を公開する。                                       |
| P1  | デザインパートナー募集                       | 初期の信用には、小さくても実利用者が必要。                                 | 3件前後を対象に、募集文、対象プロフィール、期待する協力内容、フィードバック導線を公開する。                                                         |
| P1  | ケーススタディ導線                         | 社会的証明がない段階では、導入メモだけでも価値がある。                           | 実トライアルから、少なくとも1件の導入メモまたは匿名ケーススタディ草案を作る。                                                                |
| P1  | 日本語記事シリーズ                         | 初期の濃いユーザーは、日本語圏の SQL 好き TypeScript 層から取りやすい。          | Why Ashiba、スターター、SSSQL / Safe Sort、比較観点を説明する記事を 3-5 本作る。                                               |
| P1  | 英語 SEO 導線                         | 長期の discoverability には英語検索面が必要。                       | `sql-first typescript generator`、`Prisma SQL visible`、`Drizzle raw SQL`、`sqlc TypeScript` などを狙うページを作る。 |
| P2  | benchmark / 再現ハーネス                | 性能競争に早く入りすぎると主張がぶれるため、試用導線ができてから行う。                   | 公開ハーネスを用意し、何を証明し、何を証明しないかを明記する。                                                                        |
| P2  | コミュニティ受け皿整備                       | 関心が出た後、質問や小さな貢献を受け止める場所が必要。                           | issue template、Discussions 区分、contribution note、good first issue を整える。                                 |
| P2  | 登壇・発表資料                           | メッセージとデモが安定した後に効果が出やすい。                               | 20-30分程度の発表アウトラインとデモ台本を作る。                                                                             |
| P2  | multi-DB roadmap 表明               | 重要だが、まず PostgreSQL レーンの価値証明を優先する。                     | adapter の成熟度と昇格条件を public roadmap で説明する。                                                               |

## 推奨 P0 実行順

1. Ashiba のカテゴリ文と主張セットを固定する。
2. GitHub / npm / README / docs の説明文を揃える。
3. README / docs に Why Ashiba、comparison、starter、DB support への導線を追加する。
4. Why Ashiba ページを公開する。
5. PostgreSQL starter を1本公開または既存導線を磨き込む。
6. DB 対応状況に成熟度ラベルを付ける。
7. 最初の比較記事を1本公開する。
8. 反応を見て、残りの比較記事に展開する。

この順序は、集客より前に理解と試用導線を整えるためのもの。スターターや比較ページは、README、docs、npm metadata と同じカテゴリ表現を繰り返すほど効きやすい。

## 最初の30日で出すもの

最初の30日は、広く拡散するより、外部から見て理解し、試せる状態を作る。

| 期間  | 成果物                                             |
| --- | ----------------------------------------------- |
| 1週目 | カテゴリ文、主張セット、GitHub / npm / README / docs の説明文統一 |
| 2週目 | Why Ashiba ページ、README / docs の導線補強              |
| 3週目 | PostgreSQL starter、DB 対応成熟度表                    |
| 4週目 | 最初の比較記事1本、デザインパートナー候補への打診開始                     |

## 推奨メッセージ

主カテゴリ:

> Ashiba is a SQL-first TypeScript generator for teams that want visible SQL, generated mappers, and drift-safe changes.

日本語の作業メッセージ:

> SQLを隠さず、面倒だけ減らす TypeScript generator。

補助主張:

* 実行時 ORM オブジェクト層の裏に SQL を隠さず、SQL を見える形で保つ。
* DTO、Mapper、Accessor、Mapper Test、レビュー可能な migration SQL を生成する。
* schema / query drift を本番前に見つける。
* safe optional filters と safe sort により、ユーザー入力を SQL 断片として受け取らない。
* AI にコードを補助させても、最終的に人間がレビューできる SQL に戻せる。

## Why Ashiba の主張セット

Why Ashiba では、次の順序で説明する。

1. SQLを隠すと、レビュー、調査、チューニングが遅れる。
2. SQLクライアント、EXPLAIN、DB固有機能、チューニング済みSQLをそのまま使いにくくなる。
3. DSLに翻訳すると、SQLの細部や意図が失われることがある。
4. ただし、生SQLだけでは DTO、mapper、test、drift check が面倒で品質がばらつく。
5. Ashiba は SQL を主役にしたまま、周辺の退屈で壊れやすい作業を生成する。
6. Ashiba は静かに壊さない。壊れたら見える場所で派手に壊す。
7. Prisma / Drizzle / sqlc が向く場面も認めたうえで、Ashiba が向く場面を説明する。

## 比較ページ方針

比較ページは、相手を否定するためではなく、評価者が自分に合う道具を選ぶために作る。

### Ashiba vs Prisma

中心メッセージ:

> Prisma is schema-first ORM. Ashiba is SQL-visible generator.

書くこと:

* Prisma が向く場面。
* Ashiba が向く場面。
* SQL を明示的にレビューしたい場合の違い。
* schema model を中心にするか、SQL と DTO を中心にするか。
* Ashiba を選ばない方がよい場面。

### Ashiba vs Drizzle

中心メッセージ:

> Drizzle is SQL-like TypeScript ORM. Ashiba is SQL-owned development tooling.

書くこと:

* Drizzle が向く場面。
* Ashiba が向く場面。
* TypeScript 側の query builder と、SQL ファイル中心の違い。
* 生成物、mapper test、drift check の違い。
* Ashiba を選ばない方がよい場面。

### Ashiba vs sqlc

中心メッセージ:

> sqlc gives generated query functions. Ashiba gives editable TypeScript scaffolds around visible SQL.

書くこと:

* sqlc が向く場面。
* Ashiba が向く場面。
* 生成コードの所有権と編集可能性。
* TypeScript での DTO、mapper、test、drift check。
* Ashiba を選ばない方がよい場面。

## Starter 方針

最初の starter は PostgreSQL に絞る。

候補は Hono + pg + Docker Compose を第一候補とする。理由は、フレームワークが薄く、Ashiba の価値が見えやすいため。

starter に含める題材:

* users table
* users list
* optional search
* safe sort
* DTO mapping
* mapper test
* DDL 変更
* ashiba check による drift 検知
* migration SQL のレビュー

starter の受け入れ条件:

* clone して手順通りに実行できる。
* SQL ファイルを確認できる。
* 生成コマンドを実行できる。
* mapper test を実行できる。
* DDL 変更で drift check が失敗する例を確認できる。
* README から Why Ashiba と比較ページに移動できる。

## KPI

最初の KPI は stars、npm downloads、検索順位を主指標にしない。

初期の主 KPI:

* 30日以内に、Ashiba を実際に clone または install して試した人を3人作る。
* そのうち1人から、公開可能または匿名のフィードバックを得る。
* PostgreSQL starter を最後まで実行できた報告を1件得る。
* 比較記事または Why Ashiba を読んだ人から、位置づけに関する反応を得る。

補助 KPI:

* GitHub stars
* npm downloads
* README / docs visit
* starter repository clone
* issue / discussion / direct message
* 検索結果での発見性

## 受け入れ条件

* P0 普及計画が、機能開発計画とは別に管理されている。
* 各 P0 施策に、普及上の理由と観測可能な成果がある。
* README 大改造ではなく、導線補強と説明統一が主目的になっている。
* Why Ashiba が P0 として明示されている。
* 比較ページが、相手の否定ではなく、適用場面の整理になっている。
* benchmark が早すぎる性能競争ではなく、P2 または限定的な再現ハーネスとして扱われている。
* 未検証の市場主張が、検証済み事実として扱われていない。
* 個別の GitHub issue や作業チケットに分解しやすい粒度になっている。

## 検証方法

* このファイルを確認し、機能開発計画とは別の普及ロードマップになっていることを確認する。
* すべての P0 施策に、曖昧な意図ではなく具体的な成果物があることを確認する。
* 現在の採用指標を、検証済みの repository fact として断言していないことを確認する。
* README / docs / npm / GitHub のカテゴリ表現が一致していることを確認する。
* Why Ashiba、starter、DB support、comparison の導線が README または docs から辿れることを確認する。
* 各施策の実装後は、README / docs / npm / GitHub を直接確認して検証する。

## スコープ内

* 普及戦略。
* ポジショニング。
* Why Ashiba。
* ドキュメントと比較ページ。
* 普及のためのスターター、デモ、再現ハーネス。
* デザインパートナーとケーススタディ導線。
* コミュニティ受け皿と discoverability。

## スコープ外

* コア機能の開発ロードマップ。
* 内部アーキテクチャ変更。
* 採用証拠に関係しないリリースエンジニアリング詳細。
* 調査レポート全体の競合ファクトチェック。
* README / docs / 比較ページの最終コピー全文。
* 実証前の性能主張。

## リスク

* メッセージの分散: ページごとに Ashiba の説明が揺れる。
* 証拠不足: 技術主張が plausible でも、デモや再現手順で支えられない。
* スコープ膨張: 普及計画が機能開発ロードマップに混ざる。
* 過剰主張: PostgreSQL 安定導線と他 adapter の成熟度が曖昧になる。
* フィードバック不足: 実利用者なしでコンテンツだけが増える。
* 検索衝突: `ashiba` 単体では曖昧なため、`@ashiba-ts` と比較キーワードを繰り返す必要がある。
* 性能競争への早期巻き込まれ: Ashiba の本筋が SQL 可視性、生成物、drift check であることを見失う可能性がある。
* 比較記事の攻撃化: Prisma / Drizzle / sqlc の価値を理解しない比較になると信用を失う。

## 必要なドキュメント / テスト / Changeset

* 現時点で必要: この普及計画。
* P0 実施時に必要: README / docs トップ導線、Why Ashiba、比較ページ初回分、スターター README、DB 対応状況セクション。
* P1 実施時に必要: デモスクリプト、AI 訴求ページ、デザインパートナー募集ページ、ケーススタディ雛形。
* P2 実施時に必要: benchmark / 再現ハーネスのドキュメント、コミュニティ受け皿、発表資料。
* この計画ファイル自体にテストは不要。ただし starter、demo、benchmark には実行可能な検証コマンドが必要。
* planning-only artifact なので changeset は不要。

## リポジトリ証拠計画

リポジトリだけで確認できること:

* 機能開発計画とは別に、この普及計画が存在する。
* README / docs / comparison / starter のファイルが追加または更新されている。
* Why Ashiba ページが存在する。
* starter / demo / benchmark の実行手順が書かれている。
* DB 対応状況の成熟度表現が docs に存在する。
* 必要に応じて issue template、Discussions 案内、contribution surface が存在する。

## 補助証拠計画

リポジトリだけでは実際の普及は確認できない。最低限ほしい補助証拠:

* 現在の GitHub stars / forks / issues / dependents のスナップショット。
* 現在の npm package download / version のスナップショット。
* `ashiba`、`ashiba ts`、`ashiba prisma`、`sql-first typescript generator` の検索結果確認。
* docs / README リンクの analytics があればその数値。
* デザインパートナーへの打診ログとトライアルのフィードバック。
* 可能なら公開ケーススタディまたは外部利用者の証拠。

## 未決事項

* public language は日本語先行、英語先行、日英並行のどれにするか。
* 最初の starter は Hono、Next.js、NestJS、最小 Node/PostgreSQL のどれにするか。
* 各 adapter package の正確な成熟度は現在どうなっているか。
* 既存コマンドだけで、どの主張をすぐ実証できるか。
* 最初のデザインパートナー候補は誰か。
* 最初の30日で qualified trial をどう記録するか。

