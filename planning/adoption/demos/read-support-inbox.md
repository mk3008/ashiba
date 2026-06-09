# R demo: Customer support inbox

## 位置づけ

この demo は、Ashiba の read-heavy / R 特化 demo である。

目的は、Ashiba が web アプリで本当に使えることを、複雑な一覧画面を通じて示すことである。CUD の能力をこの demo で証明しようとしない。CUD は将来、別 demo lane として設計する。

## Issue

Ashiba の価値は、単なる CRUD では伝わりにくい。

Prisma、Drizzle、sqlc はそれぞれ CRUD や単純 query の導入体験が強い。Ashiba が最初に見せるべきなのは、複雑で長く保守される read query を、SQL 資産として読めるまま TypeScript web アプリで使い続ける体験である。

一方で、R 特化 demo だけを出すと「Ashiba は CUD ができないのではないか」という疑問が出る可能性がある。そのため、この demo は R lane の代表として位置づけ、CUD は別途計画することを明記する。

## Customer

- TypeScript web アプリで PostgreSQL を使う開発者。
- SQL をレビューし、EXPLAIN し、長期保守したいチーム。
- Prisma / Drizzle / sqlc を比較していて、SQL-first な実用 web app 例を見たい人。
- AI に SQL や周辺コードを変更させた後、人間がレビューできる導線を欲しいチーム。

## Customer Value

ユーザーは、Ashiba が read-heavy な実務画面で次を実現できることを確認できる。

- SQL ファイルを中心に、主要ロジックを一望できる。
- optional filters を SQL の全貌を壊さず扱える。
- safe sort により、業務固有の並び替えを安全な sort surface として扱える。
- DTO、Mapper、Accessor、Mapper Test、Metadata、Drift Check により、SQL と TypeScript の境界を保守できる。
- AI に変更させても、人間が SQL と生成物差分をレビューできる。

## Demo Theme

テーマは **顧客サポート受信箱** とする。

ユーザーストーリー:

CS リーダーが、顧客待ち、VIP、SLA 期限切れ、日本語案件などで ticket を絞り込み、priority、SLA、last customer reply などの業務優先順位で並び替える。

## Implementation

現在の実装パス:

```text
examples/hono-pg-support-inbox/
```

実装ログ:

```text
examples/hono-pg-support-inbox/DOGFOODING.md
```

この実装は、Hono + PostgreSQL + `pg` + Ashiba driver adapter の read-heavy demo である。
UI は日本語固定で始めているが、表示文言は `src/demo/copy.ts` に集め、将来の英語対応をしやすくしている。

## Scope In

- Hono + PostgreSQL + Ashiba の web app demo。
- 一覧画面を主役にする。
- 主役となる `listTickets.sql` を 1 本置く。
- detail query は補助として 1 本まで置く。
- PostgreSQL の CTE と window function を使う。
- JSONB は schema に保持するが、今回の主役 filter にはしない。
- safe optional condition を使う。
- safe sort を使う。
- generated DTO / Mapper / Accessor / Metadata を commit する。
- Mapper Test を含める。
- Drift Check を含める。
- README に AI edit exercise を含める。

## Scope Out

- CUD の包括的な証明。
- transaction boundary の説明。
- mutation safety の説明。
- write-heavy workflow。
- ORM runtime 的な relation loading / unit of work / change tracking。
- multi-DB 訴求。
- すべてのテストやパフォーマンス問題の自動解決。

## Demo Requirements

### App behavior

- `/tickets` で support inbox を表示できる。
- filter なしで ticket queue を表示できる。
- VIP customer のみで filter できる。
- customer / agent waiting 系の status で filter できる。
- SLA expired / due soon を filter できる。
- language / channel で filter できる。
- tag filter で AI edit exercise の題材を示せる。
- safe sort により、許可された sort key のみ指定できる。
- 許可されない sort key は SQL 断片として受け取らない。

### SQL requirements

- `listTickets.sql` は demo の主役である。
- SQL は SQL ファイルとして読める形にする。
- SQL は Ashiba 専用の隠れた断片組み立てを前提にしない。
- 確認には bind parameters や検証用値が必要になり得ることを README に書く。
- latest message の取得に window function を使う。
- queue shaping に CTE を使う。
- ticket metadata は JSONB として持つが、この demo の中心要件にはしない。
- optional condition は safe optional condition として扱う。
- sort は safe sort profile / whitelist で制御する。

### Generated artifacts

- DTO を生成して commit する。
- Mapper を生成して commit する。
- Accessor を生成して commit する。
- Metadata を生成して commit する。
- 生成物は black box ではなく、customer-owned code として読めることを README に書く。

### Verification

- Mapper Test を実行できる。
- Drift Check を実行できる。
- SQL / DDL / Metadata / DTO / Mapper の前提ずれが検出できる。
- request parsing の最低限の unit test を用意する。
- HTTP route の e2e test を用意し、主要 filter を実DBつきで確認する。
- README に実行コマンドをまとめる。

### AI edit exercise

README に 5-10 分でできる演習を入れる。

例:

- `lang = 'ja'` filter を追加する。
- `last_customer_reply` sort を追加する。
- DDL に列を足す、または SQL result shape を変えて Drift / Mapper Test の壊れ方を見る。

演習の狙い:

- AI に変更させても、主要レビュー対象が `listTickets.sql` と generated artifact diff に絞られることを示す。
- 「書く体験」ではなく「読む、確認する、検証する体験」を示す。

## Suggested Repository Shape

```text
examples/
  hono-pg-support-inbox/
    README.md
    package.json
    tsconfig.json
    .env.example
    docker-compose.yml
    db/
      001_extensions.sql
      010_schema.sql
      020_seed.sql
    src/
      server.ts
      app.ts
      routes/
        tickets.ts
      features/
        supportQueue/
          listTickets.sql
          getTicketDetail.sql
          sorts.ts
          service.ts
      generated/
        dto/
        mapper/
        accessor/
        metadata/
    test/
      mapper/
        supportQueue.mapper.test.ts
      drift/
        drift-check.test.ts
      http/
        tickets.e2e.test.ts
    scripts/
      generate.ts
      drift-check.ts
```

## Acceptance Criteria

- この demo が R / read-heavy lane として明記されている。
- CUD はこの demo の scope out として明記され、将来別 lane で扱うことが分かる。
- `listTickets.sql` が demo の主役として定義されている。
- optional filters、safe optional condition、safe sort が demo の中心要件になっている。
- generated DTO / Mapper / Accessor / Metadata を commit する方針が明記されている。
- Mapper Test と Drift Check が verification に含まれている。
- AI edit exercise が README 要件に含まれている。
- PostgreSQL-first の demo であり、multi-DB 訴求ではないことが分かる。

## Verification Method

- この planning document を確認する。
- R demo と CUD future lane が分離されていることを確認する。
- demo 実装後は、README の quickstart、web app 起動、SQL 確認、filter / sort 操作、Mapper Test、Drift Check、AI edit exercise を実行して確認する。

## Open Questions

- CUD demo lane はどの題材にするか。
- CUD demo では insert / update / delete のどれを主役にするか。
- mutation safety、transaction boundary、affected rows、business constraint をどの範囲まで扱うか。
- R demo と CUD demo を同じ example app にするか、別 example にするか。
- support inbox の UI は最小 HTML でよいか、React などを使うか。
