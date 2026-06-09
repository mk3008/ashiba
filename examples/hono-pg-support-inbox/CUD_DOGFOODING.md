# Support Inbox CUD Dogfooding Log

このファイルは、Support Inbox demo に Create flow と optimistic Update flow を追加したときの dogfooding 記録です。

目的は「Ashiba は R だけでなく CUD / mutation でも実用できるのか」を確認し、実装中に見つかった摩擦、改善点、比較材料を残すことです。

## 仮説

ORM が強いのは、主に初期 CRUD scaffold です。

ただし、schema や workflow が変わったあとも「ORM だから常に楽」とは限りません。定義変更後は、DTO、mapper、query shape、test、migration、transaction 境界、画面/API との接続を見直す必要があります。

Ashiba は初期 scaffold だけで勝つ道具ではありません。むしろ、scaffold 後の変更に対して次の強みを持てる可能性があります。

- mutation SQL が見える資産として残る
- DDL と SQL の drift を runtime 前に検知できる
- `RETURNING` の DB result から DTO への mapper test を生成できる
- generated code を customer 側の所有物として編集できる
- transaction policy を Ashiba runtime ではなく application boundary に置ける
- ORM runtime に隠れないため、変更後に人間が review すべき範囲が見えやすい

これは仮説です。今回の Create / optimistic Update 実装では、実際に楽だった点、つらかった点、誤解しやすい点、改善すべき点を記録します。

## 対象フロー

既存の support inbox demo に、最小限のチケット登録フローを追加します。

- `GET /tickets/new` で新規チケット登録フォームを表示する
- `POST /tickets` でチケットと初回 customer message を登録する
- write path は見える `INSERT ... RETURNING` SQL を使う
- write path は application-owned な PostgreSQL transaction の中で実行する
- route-level test で、登録したチケットが既存の list/detail read path から見えることを確認する

## 対象範囲

対象に含めるもの:

- create のみ
- ticket と初回 customer message
- transaction boundary の例
- mutation `RETURNING` result row の query metadata と mapper test
- route-level test
- ORM 比較に使える観察メモ

今回の lane では対象外:

- update / delete
- optimistic locking
- audit trail
- permission model
- production migration 適用
- 汎用 form framework

## 観察ログ

### 2026-06-09: 開始時点

- 既存 example には `src/adapters/pg/pool.ts` に `withPgTransaction` があった。
- これは「Ashiba は transaction policy を所有しないが、generated query boundary は application-owned transaction の中で実行できる」という立場と合っている。
- CLI help と既存 test から、`insert`、`update`、`delete`、mutation `RETURNING` の scaffold support があることを確認した。
- 既存 demo は read-heavy のままにしつつ、Create flow は mutation boundary の証明として小さく追加するのがよい。

### 2026-06-09: Query scaffold の観察

- `ashiba feature query scaffold create-ticket create-ticket --table tickets --action insert` で、既存 feature 配下に `INSERT ... RETURNING` SQL、metadata、mapper tests が生成された。
- `ashiba feature query scaffold create-ticket create-ticket-message --table ticket_messages --action insert` でも、初回 message 登録用の同様の query boundary が生成された。
- これにより、Ashiba は read query だけの道具ではなく、mutation boundary でも SQL asset を見える形で保持できることが確認できた。
- 生成された insert SQL は table columns を広く `RETURNING` する。scaffold default としては妥当だが、demo response に不要な列まで返すので、将来的には review-relevant な `RETURNING` へ絞る選択肢があるとよい。
- 2つの insert を1つの transaction で組み合わせる workflow code は customer-owned code として必要だった。これは妥当で、transaction policy は Ashiba runtime ではなく application boundary の責務である。

### 2026-06-09: SQL 編集後の refresh

- 生成 SQL を手で狭めたあと、`feature query refresh` は `generated/query.meta.ts` を更新したが、editable な `query.ts` の parameter / result interface は書き換えなかった。
- これは `code is yours` の思想と合っている。Ashiba は customer-owned TypeScript を黙って所有しない。
- 一方で、ユーザーには「次にどの診断を見ればよいか」が分かりやすい必要がある。
- `feature tests check --fix` は generated mapper test asset を更新する。`check:drift` / generated mapper check は editable contract のずれを示すべきである。
- これは「ORM なら scaffold 後も常に楽」という単純な主張への反証材料になる。Ashiba は変更を見える状態で検知できるが、追従作業そのものは実在する。
- より鋭い摩擦として、action scaffold された mutation query では、`feature tests check --fix` が action plan の DDL write columns と full returning shape を強く保持した。
- write columns を literal / `now()` に置き換えたり、`RETURNING` から列を外したりするカスタマイズは、現状では自然に追従しづらい。
- 今回の Create lane では、まず生成 mutation shape に近い形へ戻し、mapper cases が退屈に通る状態を優先した。

### 2026-06-09: DB-backed mapper fixture の品質

- DB-backed mapper tests により、mutation-adjacent な型で無効な generated probe values が見つかった。
- 具体的には、`jsonb` probe value が `metadata-1` や `[object Object]` になり、DB で valid JSON として扱えなかった。
- timestamp-like column でも、boundary value が `created_at-boundary-value` のような無効な `timestamptz` になりうる経路があった。
- これは mapper tests が scaffold 信頼前に検出すべき種類の問題であり、今回の dogfooding で見つかった価値のある不具合だった。
- example だけを手で直すのではなく、CLI generator 側で valid JSON と ISO timestamp を生成するよう修正した。

### 2026-06-09: Create flow 実装の観察

- Create flow には3つの query boundary が必要だった。
- `list-customers-for-ticket` は form 表示用。
- `create-ticket` は ticket insert 用。
- `create-ticket-message` は初回 customer message insert 用。
- feature workflow は小さく保てた。入力を validate し、選択 customer を取得し、2つの visible SQL boundary を実行し、2つの `RETURNING` row を返すだけである。
- web adapter は HTTP parsing、redirect、error rendering、transaction scope を所有する。
- これは Ashiba の位置づけと合っている。Ashiba は mutation work を消すわけではないが、SQL mapping boilerplate を減らしつつ、残る product workflow code を見える場所に残す。
- ORM scaffold と比べたとき、今回の主な手作業は SQL mapping boilerplate ではなかった。validation、redirect / error shape、transaction composition といった product workflow code だった。
- この手作業は ORM を使っても消えない。

### 2026-06-09: Generator fix 後の drift と mapper tests

- invalid な `jsonb` mapper probe は example patch ではなく CLI generator 側で修正した。
- CLI smoke test に、`timestamptz` と `jsonb` column の generated mapper probe が DB-valid であることを確認する regression を追加した。
- `feature tests check --fix` で example の mapping cases を再生成した。
- `check:drift` は green になった。
- ただし、`tickets.metadata` を `INSERT` から省略して DB default を使っているため、意図的な warning は残っている。
- route-level E2E は mapper tests が証明しない business effect を確認している。つまり、`POST /tickets` が ticket と初回 customer message を作り、既存 read path から見えることを確認した。

### 2026-06-09: CUD test boundary の整理

- CUD を「generated mapper test だけで保証する」と言うのは過剰である。
- 一方で、CUD をサポートしないわけでもない。
- 方針としては、CUD の保証を層に分ける。
- generated mapper test は DB-to-TypeScript の result contract を見る。
  - `SELECT` result rows
  - `INSERT ... RETURNING`
  - `UPDATE ... RETURNING`
  - `DELETE ... RETURNING`
- TypeScript-to-DB の parameter construction、affected rows、persisted DB state、transaction、rollback、constraint、default、trigger、read-after-write は route / integration / traditional DB-backed test で見る。
- これにより、TS -> DB mapping が壊れた場合も route/integration test で検出できる。
- CUD のすべてを ZTD に背負わせるのではなく、ZTD は result contract に強く使い、mutation semantics は traditional に寄せる。
- example の route-level E2E に、Create後のDB行を直接確認するテストを追加した。
- 同じく route-level E2E に、初回message insertをDB triggerで失敗させ、先に実行されたticket insertがtransaction rollbackされることを確認するテストを追加した。

### 2026-06-09: optimistic update の観察

- `tickets.version_key integer not null default 1` を追加した。
- `ashiba.config.json` に `mutation.optimisticLock.versionColumn = "version_key"` と `scaffold = "when-column-exists"` を追加した。
- `update-ticket-status` は visible SQL として、`where ticket_id = :ticket_id and version_key = :expected_version_key` を持つ。
- 更新成功時は `version_key = version_key + 1` し、`returning ticket_id, status, updated_at, version_key` を返す。
- query boundary は 0 rows を例外化しない。これは SQL 実行結果として自然である。
- application-owned workflow の `updateTicketStatus` が 0 rows を `OptimisticConcurrencyConflict` に変換する。
- route-level E2E で、成功時に `version_key` が進むことと、stale version で 409 を返して DB 状態を変えないことを確認した。
- `feature import` が update SQL にも `optionalConditionCompression: true` を付けると adapter 側で失敗した。これは non-select imported query では不要なので、CLI generator 側で付けないように修正した。

### 2026-06-09: feature root / subsystem 構造の見直し

- `support-inbox` を feature と呼ぶのは誤りだった。実態は subsystem / feature group / product area であり、reviewable feature は `list-tickets`、`create-ticket`、`update-ticket-status` である。
- example は `src/features/support-inbox` を configured `featureRoot` とし、その直下に use-case feature boundary を置く構造へ変更した。
- CLI に `subsystem` という新概念はまだ追加しない。まずは既存の `featureRoot` 設定で subsystem 配下を feature root として扱う。
- この変更により、`support-inbox` は親グループ、`create-ticket` 等は Ashiba CLI が扱う feature として整理できる。
- dogfooding中に、project check の contract mapper lane が configured `featureRoot` を generated mapper check へ渡しておらず、`mapperQueries=0` になる漏れを発見した。CLI 側で `featureRoot` を渡すよう修正し、smoke test に regression を追加した。

## 検証結果

2026-06-09 時点:

- `pnpm --filter @ashiba-ts/cli test -- tests/smoke.test.ts` passed
- `pnpm --filter @ashiba-ts/cli typecheck` passed
- `pnpm --filter @ashiba-ts/cli build` passed
- `pnpm --dir examples/hono-pg-support-inbox verify` passed
- `pnpm --dir examples/hono-pg-support-inbox ashiba:verify` passed

`ashiba:verify` / `check:drift` では warning が2件残る。

- `ASHIBA_PROJECT_INSERT_DEFAULT_COLUMN_OMITTED`
- 対象は `public.tickets.version_key` と `public.tickets.metadata`
- 今回の demo では DB default を意図的に使っているため許容する

## 改善点

### 対応済み

- `json/jsonb` の generated mapper probe が invalid JSON になりうる問題を CLI generator 側で修正した。
- timestamp-like column の generated probe が DB-valid な ISO timestamp になるよう修正した。
- TypeScript case renderer が object property key を整形するとき、SQL string 内の JSON 文字列まで誤って書き換える問題を修正した。
- CLI smoke test に regression を追加した。
- example 側では route-level E2E を追加し、mapper test だけでは証明できない mutation の business effect を確認した。
- `insert` scaffold に `--returning all|minimal` を追加した。`minimal` を選ぶと `RETURNING` は primary key のみに絞られ、generated mapper cases / `analysis.json` / `feature tests check --fix` でもその shape が維持される。
- `ashiba init` の generated SQL client に、query model source hash、statement kind、root query shape、optional-condition compression、safe-sort insertion status を logger metadata として渡す処理を追加した。
- Generated feature README と generated TEST_PLAN に、CUD の mapper test が `RETURNING` result contract を証明し、TS -> DB / transaction / persisted state は route / integration / traditional DB-backed test で見る、という役割分担を追加した。
- `ashiba init` の generated `withPgTransaction` コメント、example README、feature README に transaction composition の説明を追加した。同じ `FeatureQueryExecutor` を application-owned transaction callback 内で複数 query boundary に渡す、という形を明示した。
- example README と feature README に、既存 feature へ `feature query scaffold` で `create-ticket` / `create-ticket-message` を追加し、ヘッダー + 明細の初回作成を組み立てる導線を追加した。
- example に optimistic update lane を追加した。`version_key` を DDL/config/SQL/UI に出し、stale version を route-level E2E で 409 として検証した。
- update scaffold は config の optimistic lock column を見て、該当列がある場合に `expected_version_key` と `version_key = version_key + 1` を生成するようにした。
- example の feature root を `src/features/support-inbox` に変更し、`list-tickets`、`create-ticket`、`update-ticket-status` を個別の reviewable feature boundary として整理した。
- project check / check-contract が configured `featureRoot` を generated mapper check に渡すようにし、subsystem配下のfeature boundaryでも mapper coverage が落ちないようにした。

### 今後の改善候補

- P1: CLI に `subsystem` 概念を optional で入れるかは継続検討する。現時点では configured `featureRoot` で subsystem 配下を feature root として扱えるため、example 側はこの方式を採用する。
- P1: 既存 feature に mutation query を追加する exercise は、必要になったら追加する。Create flow 自体は README / feature README でヘッダー + 明細の scaffold recipe として説明済み。
- P1: optimistic update exercise は追加価値がある。SQL上で `version_key` 条件を見せ、stale update を AI にテストさせる課題にできる。
- P1: 生成後に `RETURNING` をさらに業務都合の shape へ調整する導線はまだ弱い。`--returning minimal` は primary key だけを返す初期 scaffold option であり、任意の returned columns を指定する機能ではない。
- P1: write columns を SQL-side default / literal / `now()` に寄せる mutation customization の導線はまだ弱い。これは params、query.ts、analysis.json、mapper cases、drift check に影響するため、設計してから入れる。
- P1: lightweight app logger scaffold は検討価値がある。ただし万人向け初期生成としては重くなりやすいので、現時点では no-op hook + richer metadata に留める。
- P2: `feature query refresh` 後の CLI output は、editable `query.ts` を上書きしないことと、次に確認すべき drift / mapper diagnostics をもっと明示した方がよい。
- P2: update / delete lane は別途必要。CUD 全体の比較材料にするなら、特に update は schema 変更後の追従体験を示しやすい。

## 暫定評価

今回の Create / optimistic Update lane では、Ashiba が CUD でも成立することは確認できた。

ただし、Ashiba の価値は「CRUD scaffold が一発で終わる」ことではない。むしろ、scaffold 後に SQL、DTO、mapper tests、drift check、route-level tests を通じて、変更の影響範囲を見える形で保てることにある。

ORM と比べるなら、初期 scaffold だけではなく、定義変更後、SQL 変更後、RETURNING shape 変更後、test 更新後の体験まで比較すべきである。
