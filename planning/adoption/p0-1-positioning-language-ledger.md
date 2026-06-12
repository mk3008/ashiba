# P0-1 ポジショニングと言葉の固定

## 目的

Ashiba を外部に説明するときの言葉を固定する。

この文書は、README、docs、npm、GitHub description、比較ページ、スターター README、記事、SNS 投稿で説明が揺れないようにするための内部原本である。

この文書の目的は、公開文書の本文をそのまま書くことではない。

目的は、Ashiba を説明するときに使う言葉、守るべき思想、注意すべき表現、テーマごとの使い分けを管理することである。

## 言語方針

この台帳は日本語を原本とする。

Ashiba の思想やニュアンスは、まず日本語で固定する。

英語コピーや英語説明文は、後続タスクで日本語原本をもとに翻訳する。

英語のキャッチコピーや短い説明文を個別セクションとして持つことは許可する。ただし、英語表現を思想の原本にはしない。

## 正本ブロック

このセクションを、P0-1 内の表現の正本とする。

後続の README、docs、npm、GitHub description、比較ページ、スターター README、記事、SNS 投稿では、まずこの正本ブロックの表現を優先する。

この台帳を更新するときは、まず正本ブロックを更新し、その後にポジショニング原則、発信テーマ、コピー例、注意・禁止表現を追従させる。

### 標準一文説明

Ashiba は、SQLの自由度とORMの足場を両立する TypeScript generator。

### 中心メッセージ

Ashiba は、SQLを諦めるための道具ではない。

SQLをSQLのまま資産として残し、DTO、Mapper、Accessor、Mapper Test、Metadata、Drift Check などの足場を生成と検査で支える。

SQLの自由度を保ったまま、TypeScriptアプリケーションで使い続けるための足場である。

### "ORMの足場" の定義

ここでいう "ORMの足場" は、ORM runtime を指さない。

Ashiba が指す足場は、SQLをTypeScriptアプリケーションで扱うための生成物と検査である。

具体的には、DTO、Mapper、Accessor、Mapper Test、Metadata、Drift Check、reviewable migration support などを指す。

Relation loading、Unit of Work、Change Tracking、Lazy Loading、Entity lifecycle 管理などを中心にした ORM runtime を意味しない。

### SQLの定義

Ashiba が重視するSQLは、Ashiba専用の断片組み立てを前提にしない、DBで実行可能な完成したSQLである。

ただし、これは "どのSQLクライアントにも、何も補助なく貼れば必ずそのまま動く" という意味ではない。

実際の確認には、適切な bind parameters、検証用の値、またはSQLクライアント側で実行できる形への最小限の置換が必要になることがある。

重要なのは、SQLの全貌が見えること、レビューできること、EXPLAINできること、Ashiba専用の隠れた断片組み立てを通さなければ意味を持たないSQLにしないことである。

### 主要コピー

* SQLは文字列ではない。資産だ。
* SQLはSQLのまま。足場だけを生成する。
* 書き味はIDEに任せる。読み味はSQLのまま守る。
* AIが書いても、人間が読めるSQLを残す。

### DB対応表現の境界

P0-1 では、DB対応の成熟度を詳述しない。

DB対応の外向き表現は P0-2 DB対応状況の期待値整理を参照する。

P0-1 では multi-DB を中心訴求にしない。現時点の中心訴求は、SQL資産、DBネイティブ性、TypeScriptの足場、生成と検査である。

### sqlc との差分の境界

Ashiba と sqlc は、SQL を中心にする点で近い。

ただし、Ashiba は SQL から閉じた query function をコンパイルする方向ではなく、生成物を customer-owned code としてアプリケーション側に残す方向を選ぶ。

また、Ashiba は ORM runtime object layer を持たない一方で、safe optional conditions と safe sort のような、SQL の汎用性を安全な範囲で高める driver adapter の責務を認める。

この driver adapter は Ashiba の思想に合わせて作られるため実質的には Ashiba 向けである。ただし、Ashiba 本体の ORM runtime ではなく、単独利用も原理的には妨げない。

## ポジショニング原則

このセクションでは、Ashiba が大事にする思想、判断基準、注意すべき表現を管理する。

各原則は、発信テーマから参照する。

### P1 SQLはプロダクトの資産である

意味:

SQLは単なる文字列ではない。

SQLは、テーブルをどのように結合し、どの条件で絞り込み、どの粒度で集計し、どの形でアプリケーションへ返すのかを示す、実行可能なビジネスロジックである。

ER図や外部キー制約だけでは、実際の業務上の問い合わせ、集計、判定、例外、優先順位、表示要件までは表現しきれない。SQLには、それらが具体的な形で現れる。

つまり、SQLはテーブル構造の利用例であり、ビジネスロジックの実例であり、プロダクトがデータをどう解釈しているかを示す資産である。

SQLをTypeScript DSLへ移すと、DB取得宣言としてのSQLが、TypeScriptの処理ロジックと区別しづらくなる。

SQLファイルとして独立していれば、SQLクライアントで確認し、EXPLAINし、レビューし、別のSQLを書くときの参考としてそのまま使える。

Ashiba は、SQLをTypeScriptロジックの中に溶かさず、SQLの全貌を読める単位として残すことを重視する。

必ず伝えること:

* SQLは全体を読めるからレビューできる。
* SQLは全体を読めるから真似できる。
* SQLは全体を読めるから修正できる。
* SQLは全体を読めるから、似た業務ロジックを実装するときの手がかりになる。
* SQLは、コードの再利用性だけでなく、知識の再利用性を持つ。
* SQLをTypeScript DSLへ移すと、DB取得宣言としてのSQLの輪郭がTypeScriptコードの中に溶け込みやすくなる。
* SQLファイルとして独立していれば、何を取得し、どう結合し、どう絞り込み、どう返すのかをSQLのまま読める。
* Ashiba は、SQLをSQLのままプロダクト資産として残し、その周辺にTypeScriptの型、生成物、検査を接続する。

注意:

* "多くのORMでは、資産の中心が schema model、client API、query builder 側に置かれる。Ashiba は query SQL と DDL を見える資産として扱い、その周辺に生成物と検査を接続する" と表現する。
* TypeScript DSLを否定しすぎない。書き味やIDE支援を重視するチームには向く、と認める。
* Ashiba の主張は、SQLをTypeScript側へ寄せることではなく、SQLをSQLファイルとして読める単位に保つことである。

使うテーマ:

* T1 Why Ashiba
* T3 Drizzle比較
* T4 sqlc比較
* T5 AIネイティブ訴求

### P2 SQLは単体で確認できる完成したSQLである

意味:

Ashiba におけるSQLは、部品化された中間表現ではなく、DBで実行できる完成したSQLである。

ただし、確認には適切な bind parameters、検証用の値、またはSQLクライアント側で実行できる形への最小限の置換が必要になることがある。

必ず伝えること:

* SQLの全貌が見えることを重視する。
* SQLクライアントで確認できることを重視する。
* EXPLAINできることを重視する。
* Ashiba専用の隠れた断片組み立てを通さなければ意味を持たないSQLにしない。
* CTE、WHERE句、JOIN句などのSQL部品をアプリケーション側で共有リソース化する設計を標準にはしない。

注意:

* "何も補助なく任意のSQLクライアントで必ずそのまま動く" とは言わない。
* named parameters、SSSQL、safe sort などの存在を踏まえ、"確認できる"、"EXPLAINできる"、"全貌が見える" と表現する。

使うテーマ:

* T1 Why Ashiba
* T3 Drizzle比較
* T6 Starter説明

### P3 SQLの自由度とORMの足場を両立する

意味:

Ashiba は、SQLを使う自由と、ORMが担っていた一部の開発支援を両立する。

ここでいう足場は ORM runtime ではなく、SQLをTypeScriptアプリケーションで扱うための生成物と検査である。

必ず伝えること:

* DBネイティブなSQLをそのまま使う。
* DTO、Mapper、Accessor、Mapper Test、Metadata、Drift Check を生成と検査で支える。
* SQLをTypeScriptアプリケーションとして保守しやすくする。
* SQLを諦めるための道具ではなく、SQLを使い続けるための足場である。

注意:

* "ORMの足場" を ORM runtime と誤解させない。
* Relation loading、Unit of Work、Change Tracking、Lazy Loading などを提供するとは言わない。

使うテーマ:

* T1 Why Ashiba
* T2 Prisma比較
* T4 sqlc比較
* T6 Starter説明

### P4 書き味はIDEに任せ、読み味はSQLのまま守る

意味:

Ashiba は、コードエディタ上の書き味への貢献を目的にはしていない。

SQLに対する補完、構文チェック、リアルタイム支援は、IDE、拡張、SQL Language Server、接続先DBのschema情報、DDLとの同期によって改善できる可能性がある。

そこを重視するかどうかはチームの判断である。

Ashiba が中心価値として守るのは、SQLの読み味である。

ここでいう読み味は、単なる読みやすさだけではない。

* SQLの全貌が見えること。
* DB取得の宣言文として読めること。
* TypeScriptの業務ロジックとは異なる関心として分離されていること。
* SQLクライアントで確認できること。
* レビュー対象が明確であること。
* 既存SQLから業務知識を再利用できること。
* AIにも人間にも、どこを見るべきかが分かりやすいこと。

必ず伝えること:

* TypeScript query builder や ORM client API は書き味に強い。
* Ashiba は書き味を否定しない。
* Ashiba はSQLの読み味、資産性、DBネイティブ性を優先する。
* SQLの価値はコードの再利用性だけではなく、知識の再利用性にある。

注意:

* "人間がコードを直接書く場面では書き味は有用" と認める。
* AI補助が増える場面では、入力支援だけでなくレビューと検証の認知負荷が重要になる、と表現する。

使うテーマ:

* T3 Drizzle比較
* T5 AIネイティブ訴求
* T6 Starter説明

### P5 生成、検査、制御、任意支援を分ける

意味:

Ashiba の責任範囲を説明するときは、生成するもの、検査するもの、adapter または runtime 側で制御するもの、任意に支援するものを分ける。

これらを一括して "生成する" と表現しない。

生成するもの:

* DTO
* Mapper
* Accessor
* Mapper Test
* Metadata

検査するもの:

* Drift Check
* SQLとDDLの対応確認
* SQL、DTO、Mapper、Metadata の前提ずれの検出
* Mapper Test による SQL結果形状と DTO/Mapper の対応確認

adapter または runtime 側で制御するもの:

* named parameter binding
* safe optional filters
* safe sort
* ユーザー入力をSQL断片として受け取らないための制御

SQL記述パターンまたは安全制御の境界:

* SSSQL
* safe optional condition
* safe sort profile

任意に支援するもの:

* migration SQL
* migration review のための材料
* パフォーマンス検証へつなげるためのSQL可視性
* starter や demo における再現手順

注意:

* "Test" とだけ広く書かない。
* Ashiba が直接生成するテストは "Mapper Test" と明記する。
* アプリケーションのすべてのユニットテストを生成するとは言わない。
* SQLチューニングを自動化して性能問題を消すとは言わない。

使うテーマ:

* T1 Why Ashiba
* T4 sqlc比較
* T6 Starter説明
* T7 DB対応と機能範囲

### P6 safeな動的加工はdriver adapterの責務として認める

意味:

Ashiba は ORM runtime object layer を持たない。

ただし、現実のアプリケーションでは、optional condition と sort の需要が非常に高い。

ここを完全にアプリケーション側の文字列組み立てへ任せると、SQLの全貌、レビュー可能性、安全性を損ないやすい。

そのため Ashiba は、safe optional condition と safe sort のような、制限付きの動的加工を driver adapter の責務として認める。

この責務は Ashiba 本体が SQL を隠して書き換えることではない。

SQLの全貌を俯瞰できる状態を保ち、ユーザー入力をSQL断片として受け取らず、metadata や whitelist などの安全な境界の内側でだけ動的性を扱うためのものである。

必ず伝えること:

* Ashiba 本体は ORM runtime object layer を持たない。
* safe optional condition と safe sort は、需要の高い動的加工を safe の範囲へ閉じ込めるための境界である。
* その責務は driver adapter 側に置く。
* driver adapter は Ashiba の思想に合わせて作られているため実質的には Ashiba 向けである。
* ただし、driver adapter は Ashiba 本体そのものではなく、単独利用も原理的には妨げない。
* safe optional condition と safe sort は、SQLの全貌を壊さず、俯瞰できるSQLという思想と共存するためにある。

注意:

* safe optional condition や safe sort を「任意のSQL文字列加工」として説明しない。
* driver adapter を ORM runtime と呼ばない。
* Ashiba 本体が隠れた query planner や query DSL を持つように見せない。
* シンプルさだけを優先すれば関わらない方がよい領域だが、需要と安全性のために意図的に責務を置いている、と説明する。

使うテーマ:

* T4 sqlc比較
* T6 Starter説明
* T7 DB対応と機能範囲

### P7 AI時代はレビューと検証の認知負荷が重要になる

意味:

AI補助が増える場面では、開発者は書き手であるだけでなく、レビュアー、判断者、マネージャーとしての役割を強める。

重要になる問い:

* どこに何があるのか。
* どの粒度で見るべきか。
* どのスコープをレビューすべきか。
* 何を見なくてよいのか。
* どこを検証すればよいのか。
* 壊れた場所と直すべき場所はどこか。

必ず伝えること:

* AIが書いても、人間が読めるSQLを残す。
* DDL、既存SQL、Metadata、DTO、Mapper、Mapper Test など、AIと人間が読める資産が重要になる。
* Ashiba は、書く体験だけでなく、読む、確認する、比較する、検証する、修正するための認知負荷を下げることを重視する。

注意:

* AIがすべて正しく書くとは言わない。
* AIを効率よく疑うべきだとする。
* AI補助が増えるほど、検証可能な足場が重要になる、と表現する。

使うテーマ:

* T5 AIネイティブ訴求
* T1 Why Ashiba
* T3 Drizzle比較

### P8 "SQLを隠さない" は中心ではなく結果である

意味:

Ashiba の中心は、単に "SQLを隠さない" ことではない。

中心は、SQLの自由度とORMの足場を両立することである。

その結果として、SQLは隠れない。

必ず伝えること:

* SQLをDBネイティブなまま扱う。
* SQLをプロダクト資産として扱う。
* SQLの周辺をDTO、Mapper、Accessor、Mapper Test、Metadata、Drift Checkで支える。
* その結果として、SQLがデバッグ、レビュー、チューニング、保守しやすくなる。

注意:

* "SQLを隠さない" だけを中心コピーにしない。
* "SQLを書ける" より "SQLを書いても困らない" まで言う。

使うテーマ:

* T1 Why Ashiba
* T2 Prisma比較
* T3 Drizzle比較

## 発信テーマ

このセクションでは、後続の公開文書や記事で扱うテーマを定義する。

テーマ本文をここで完成させるのではなく、どのポジショニング原則を使うか、何を伝えるか、何に注意するかを管理する。

### T1 Why Ashiba

目的:

Ashiba の存在理由を説明する。

使う原則:

* P1 SQLはプロダクトの資産である
* P2 SQLは単体で確認できる完成したSQLである
* P3 SQLの自由度とORMの足場を両立する
* P7 AI時代はレビューと検証の認知負荷が重要になる
* P8 "SQLを隠さない" は中心ではなく結果である

伝えること:

* SQLは単なる文字列ではなく、プロダクトの資産である。
* SQLは全貌を読める状態で残す価値がある。
* 生SQLには自由度があるが、周辺作業がつらい。
* Ashiba は、SQLをSQLのまま残し、周辺の足場を生成と検査で支える。
* Ashiba は、SQLを諦めるための道具ではなく、SQLを使い続けるための足場である。

注意:

* ORM全般を否定する記事にしない。
* "SQLを隠さない" だけを中心にしない。
* "SQLを書ける" ではなく "SQLを書いても困らない" まで説明する。

コピー例:

* SQLは文字列ではない。資産だ。
* SQLはSQLのまま。足場だけを生成する。
* Ashiba は、SQLを使い続けるための足場である。

### T2 Prisma比較

目的:

Prisma と Ashiba の選択基準を明確にする。

使う原則:

* P1 SQLはプロダクトの資産である
* P3 SQLの自由度とORMの足場を両立する
* P8 "SQLを隠さない" は中心ではなく結果である

伝えること:

* Prisma は schema model と client API を中心にした強力な ORM である。
* Prisma は schema-first な開発体験、豊富なエコシステム、統合されたDXを重視するチームに向く。
* Ashiba は、SQLの自由度、SQL資産、DBネイティブ性を重視するチームに向く。
* Ashiba は、SQLをそのまま使い、DTO、Mapper、Accessor、Mapper Test、Metadata、Drift Check で支える。

注意:

* Prismaを否定しない。
* Prismaが向く場面を明確に認める。
* Ashibaを "Prismaの完全上位互換" と言わない。

対比コピー例:

* Prisma は、schema-first なORMエコシステムが欲しいチームに向く。
* Ashiba は、SQLの自由度とTypeScriptの足場を両立したいチームに向く。

### T3 Drizzle比較

目的:

Drizzle と Ashiba の違いを、"SQL-likeな書き味" と "SQLそのものの資産性" の対比で説明する。

使う原則:

* P1 SQLはプロダクトの資産である
* P2 SQLは単体で確認できる完成したSQLである
* P4 書き味はIDEに任せ、読み味はSQLのまま守る
* P7 AI時代はレビューと検証の認知負荷が重要になる

伝えること:

* Drizzle は TypeScript上でSQLに近い表現を書ける ORM / query builder である。
* Drizzle は補完、型推論、メソッドチェーンなど、TypeScriptコード上の書き味に強い。
* Ashiba は、SQL-likeなDSLを書くより、SQLそのものを書く立場を取る。
* Ashiba は、SQLをSQLクライアントで確認できる完成した資産として残すことを重視する。
* Ashiba は、書き味はIDEや拡張に任せ、読み味をSQLのまま守る。

注意:

* Drizzleを "中途半端" と公開文書で言わない。
* 書き味を重視するならDrizzleが向く、と認める。
* "SQL-likeならSQLを書けばよい" というAshiba側の立場は、相手を攻撃せずに表現する。

対比コピー例:

* Drizzle は、TypeScript上でSQL-likeなquery builderを書きたいチームに向く。
* Ashiba は、SQL-likeではなくSQLそのものを保守したいチームに向く。
* Drizzle は、TypeScript上の書き味を重視するチームに向く。
* Ashiba は、SQLの読み味とDBネイティブ性を重視するチームに向く。

### T4 sqlc比較

目的:

sqlc と Ashiba の近さと違いを説明する。

使う原則:

* P1 SQLはプロダクトの資産である
* P3 SQLの自由度とORMの足場を両立する
* P5 生成、検査、制御、任意支援を分ける
* P6 safeな動的加工はdriver adapterの責務として認める

伝えること:

* sqlc は SQL から型付き query function を生成する強力な選択肢である。
* Ashiba もSQLを中心にする点では近い。
* Ashiba は sqlc 的な規律に近いが、閉じたコンパイル型の query function だけに寄せなかった。
* Ashiba は生成物を customer-owned code としてアプリケーション側に残し、確認、調整、育てられる足場として扱う。
* Ashiba は query function だけでなく、DTO、Mapper、Accessor、Mapper Test、Metadata、Drift Check などの足場を生成と検査で支える。
* Ashiba は safe optional condition と safe sort を、SQLの全貌を壊さず汎用性を高める driver adapter の責務として認める。
* この driver adapter は Ashiba の思想に合わせて作られているため実質的には Ashiba 向けだが、Ashiba 本体の ORM runtime ではない。

注意:

* sqlcを下げない。
* sqlcの成熟度や規律を認める。
* Ashibaの独自性は、customer-owned code、TypeScript側の足場、Mapper Test、Drift Check、safe optional condition、safe sort、driver adapter の境界に置く。
* driver adapter を ORM runtime と説明しない。

対比コピー例:

* sqlc は、SQLから型付きquery functionを生成したいチームに向く。
* Ashiba は、SQLを中心にしながら、TypeScript側のDTO、Mapper、Mapper Test、Drift Checkまで含めた保守の足場が欲しいチームに向く。
* sqlc は、SQLから型付きquery functionを得る。
* Ashiba は、SQLを中心に、customer-owned code と safe driver adapter で保守の足場を作る。

### T5 AIネイティブ訴求

目的:

AI補助が増える開発において、Ashiba がなぜ向くのかを説明する。

使う原則:

* P1 SQLはプロダクトの資産である
* P4 書き味はIDEに任せ、読み味はSQLのまま守る
* P7 AI時代はレビューと検証の認知負荷が重要になる

伝えること:

* AIが書いたコードでも、人間がレビューできる形で残すことが重要である。
* SQLが見えると、人間もAIも既存SQLからプロダクト固有の結合、条件、集計、DTOへの写し方を学びやすい。
* AI補助が増えるほど、書く体験だけでなく、読む、確認する、検証するための認知負荷が重要になる。
* Ashiba は、SQL、DTO、Mapper、Accessor、Mapper Test、Metadata、Drift Check の境界を見える形にする。

注意:

* AIなら何でも正しく書けるとは言わない。
* インテリセンス不要とは言わない。
* AI時代だからこそ、検証可能な資産と足場が重要になる、と表現する。

コピー例:

* AIが書いても、人間が読めるSQLを残す。
* 書くより、検証しやすく。
* レビューできるSQLを、プロダクト資産にする。

### T6 Starter説明

目的:

Ashiba を試す人に、何を確認すべきかを示す。

使う原則:

* P2 SQLは単体で確認できる完成したSQLである
* P3 SQLの自由度とORMの足場を両立する
* P5 生成、検査、制御、任意支援を分ける
* P6 safeな動的加工はdriver adapterの責務として認める

伝えること:

* SQLファイルを読む。
* SQLクライアントで確認する。
* DTO、Mapper、Accessor、Mapper Test、Metadata を見る。
* Drift Check を試す。
* SQL変更、DDL変更でどこが壊れるかを見る。
* safe sort や optional filters が、ユーザー入力をSQL断片として扱わないことを確認する。

注意:

* 全機能を一度に見せようとしない。
* PostgreSQL-first の現状を誤解させない。
* DB対応の成熟度は P0-2 を参照する。

### T7 DB対応と機能範囲

目的:

DB対応や機能範囲について、過剰期待を防ぐ。

使う原則:

* P5 生成、検査、制御、任意支援を分ける
* P6 safeな動的加工はdriver adapterの責務として認める

伝えること:

* P0-1では multi-DB を中心訴求にしない。
* DB対応の成熟度は P0-2 で管理する。
* PostgreSQL-first な導線を中心に説明する。
* 他DB adapter は stable / preview / experimental / planned などの成熟度に応じて扱う。

注意:

* すべてのDBで同等の体験があるように見せない。
* adapterが存在することと、starterや検査導線が成熟していることを混同しない。

## コピー例

### 基本コピー

* Ashiba は、SQLの自由度とORMの足場を両立する TypeScript generator。
* SQLはそのまま。型と検査は生成する。
* SQLはSQLのまま。足場だけを生成する。
* Ashiba は、SQLを使い続けるための足場である。

### SQL資産コピー

* SQLは文字列ではない。資産だ。
* SQLを資産として残す。足場だけを生成する。
* SQLの全貌を残し、型と検査で支える。
* SQLに刻まれた業務知識を、TypeScriptの足場へ接続する。
* レビューできるSQLを、プロダクト資産にする。

### 書き味と読み味コピー

* 書き味はIDEに任せる。読み味はSQLのまま守る。
* SQL-likeではなく、SQLそのものを残す。
* 書くより、検証しやすく。
* AIが書いても、人間が読めるSQLを残す。

### 比較用コピー

* Prisma は、schema-first なORMエコシステムが欲しいチームに向く。
* Ashiba は、SQLの自由度とTypeScriptの足場を両立したいチームに向く。
* Drizzle は、TypeScript上でSQL-likeなquery builderを書きたいチームに向く。
* Ashiba は、SQL-likeではなくSQLそのものを保守したいチームに向く。
* sqlc は、SQLから型付きquery functionを生成したいチームに向く。
* Ashiba は、SQLを中心にしながら、TypeScript側のDTO、Mapper、Mapper Test、Drift Checkまで含めた保守の足場が欲しいチームに向く。
* sqlc は、SQLから型付きquery functionを得る。
* Ashiba は、SQLを中心に、customer-owned code と safe driver adapter で保守の足場を作る。

## 注意・禁止表現

### 避ける表現

* Ashiba は Prisma の完全上位互換である。
* Drizzle は中途半端である。
* SQLクライアントに貼れば、どんな場合でも何も補助なくそのまま動く。
* Ashiba は ORM runtime を提供する。
* driver adapter は Ashiba の ORM runtime である。
* safe optional condition や safe sort は任意のSQL文字列加工である。
* Ashiba はすべてのユニットテストを生成する。
* Ashiba はSQLチューニングを自動化して性能問題を消す。
* AI時代にはインテリセンスは不要である。
* multi-DB がすべて同じ成熟度で使える。

### 条件付きで使う表現

"SQLクライアントで確認できる"

条件:

適切な bind parameters、検証用の値、またはSQLクライアント側で実行できる形への最小限の置換が必要になることがある。

"ORMの足場"

条件:

ORM runtime ではなく、DTO、Mapper、Accessor、Mapper Test、Metadata、Drift Check などの生成物と検査を指すと説明する。

"Test"

条件:

Ashiba が直接生成するものは Mapper Test と明記する。広い意味のユニットテストやパフォーマンステストは、Ashibaの生成物によって書きやすくなるものとして扱う。

"書き味より読み味"

条件:

インテリセンスやIDE支援を否定しない。書き味はIDEや拡張で補える可能性があるが、Ashiba はSQLの全貌、レビューしやすさ、知識再利用性を重視する、と説明する。

"safe optional condition / safe sort"

条件:

任意のSQL文字列加工ではなく、ユーザー入力をSQL断片として受け取らないための safe な制御点として説明する。責務は driver adapter 側にあり、Ashiba 本体の ORM runtime ではない。

"driver adapter"

条件:

Ashiba の思想に合わせて作られた実質的な Ashiba 向け adapter として説明できる。ただし、Ashiba 本体そのもの、ORM runtime、隠れた query planner として説明しない。単独利用も原理的には妨げない。

## 受け入れ条件

* この台帳が日本語原本として管理されている。
* 冒頭に正本ブロックがあり、後続セクションの表現がそこから派生している。
* "SQLを隠さない" が中心ではなく、結果として扱われている。
* 中心メッセージが "SQLの自由度とORMの足場を両立する" に整理されている。
* "ORMの足場" が ORM runtime ではなく、DTO、Mapper、Accessor、Mapper Test、Metadata、Drift Check などの生成物と検査を指すことが説明されている。
* SQLは、適切な bind parameters や検証用の値を与えれば SQLクライアントで確認、EXPLAINできる完成したSQLとして扱う、という原則が説明されている。
* "SQLクライアントで確認できる" が、何も補助なく任意のSQLクライアントで常にそのまま動くという過剰主張になっていない。
* SQLは単なる文字列ではなく、プロダクトの資産であるという思想が説明されている。
* SQLには、ER図や外部キー制約だけでは表現しきれないビジネスロジックや業務知識が刻まれる、という観点が説明されている。
* SQL断片の過度な部品化、専用前処理、特殊コメント記法、テンプレート記法を標準にしない思想が説明されている。
* 書き味はIDEや拡張で補える可能性がある一方、Ashiba は読み味をSQLのまま守るというトレードオフが説明されている。
* SQLの読み味が、可読性だけでなく、SQLの全貌、関心ごとの分離、レビュー範囲の明確化、知識再利用性を含むことが説明されている。
* TypeScript query builder や ORM client API がコードエディタ上の補完、型推論、書き味に強いことを認めたうえで、Ashiba が別の価値を優先することが説明されている。
* インテリセンス自体を否定せず、人間が直接書く場面では有用であると説明されている。
* AI補助が増える場面では、開発者が書き手だけでなくレビュアー、マネージャーになるという観点が説明されている。
* レビューや検証においては、書き味だけでなく、どこを見るか、どの粒度で見るか、何を見なくてよいかという認知負荷の整理が重要になることが説明されている。
* SSSQL と safe sort が、SQLを壊すためではなく、安全な制御点として位置づけられている。
* safe optional condition と safe sort が、需要の高い動的加工を safe の範囲に閉じ込めるための driver adapter の責務として説明されている。
* driver adapter が ORM runtime ではなく、Ashiba の思想に合わせた SQL 汎用性と安全性の境界として説明されている。
* sqlc との差分として、customer-owned code、コンパイル型に寄せなかった理由、safe optional condition、safe sort、driver adapter の境界が説明されている。
* DBネイティブなSQL、TypeScriptの型、生成と検査、Drift Check の関係が説明されている。
* Ashiba が生成するもの、検査するもの、adapter/runtime 側で制御するもの、optional に支援するものが分けられている。
* "Test" とだけ広く書かず、直接生成するものは "Mapper Test" と表現されている。
* DB対応の成熟度表現は P0-2 を参照し、P0-1 では multi-DB を中心訴求にしないことが明記されている。
* Ashiba が何ではないかを明記している。
* Prisma、Drizzle、sqlc の価値を否定せず、適用場面の違いとして説明している。
* PostgreSQL-first な現状と、他 DB adapter の成熟度を誤解させない。
* README、docs、npm、GitHub description、比較記事、starter README に再利用できる言葉になっている。
