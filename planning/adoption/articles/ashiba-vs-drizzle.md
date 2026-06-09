# Ashiba vs Drizzle

## If you know SQL, why not use SQL?

「SQLを知っているなら、SQLを使えばよい」

しかし、そこには現実的な問題がありました。

SQL をただの文字列として書くと、型の支援を失いやすい。Mapper を手で書かなければならない。parameter の扱いに気を配らなければならない。migration は別で管理しなければならない。schema 変更によって DTO やアプリケーションコードが静かに壊れないことを祈るしかない。

Drizzle は、SQL を TypeScript の開発体験へ近づける道を選びました。

Ashibaは、別の道を選びます。

もし、SQLがチームが読み、レビューし、チューニングし、デバッグし、保守しづ付けるものなら、SQLはSQL-like DSLであってはいけない。

AshibaはSQLをSQLのまま残し、その周辺のTypeScript支援を生成します。

## DrizzleはSQLをTypeScriptを取り込んだ

生SQLには、現実的なつらさがありました。

* SQL文字列はTypeScriptの型から孤立しやすい
* 結果のmappingは反復的で、間違いやすい
* parameterや動的queryの扱いには注意が必要
* schema変更がアプリケーションコードを静かに壊すことがある
* migrationとアプリケーションコードがずれることがある
* チームは、より統合された開発体験を求めていた

Drizzleは、DB開発の流れをTypeScript側へ寄せることで、それらの問題に向き合いました。

DrizzleはTypeScript開発者に、SQLに近いAPI、schema定義、migration、driver連携、軽量なORM runtimeを提供します。DBアクセスをTypeScript codebaseの中に置きたいなら、Drizzleはよい選択肢です。

しかし、Ashibaは別の問いを立てます。

同じ問題を、SQLを手放さずに解決できないのかと。

## Ashiba は SQL を SQL のまま残す

Ashiba は、SQL そのものをアプリケーションが所有するソースコードとして残したいチームのための TypeScript generator です。

SQL-like API ではありません。

隠れた query DSL でもありません。

触ってはいけない生成コードでもありません。

中心にあるのは、SQL ファイルそのものです。

Ashiba が重視する SQL は、Ashiba 専用の断片組み立てを前提にしない、DB で実行可能な完成した SQL です。

もちろん、これは「どの SQL クライアントにも何も補助なく貼れば必ずそのまま動く」という意味ではありません。確認には、適切な bind parameters、検証用の値、または SQL クライアント側で実行できる形への最小限の置換が必要になることがあります。

重要なのは、SQL の全貌が見えることです。

レビューできること。EXPLAIN できること。チューニングできること。既存 SQL から業務知識を読み取れること。Ashiba 専用の隠れた断片組み立てを通さなければ意味を持たない SQL にしないこと。

Ashiba は、その SQL の周辺にある退屈な TypeScript 支援を生成します。

- DTO
- Mapper
- Accessor
- Mapper Test
- Metadata

そして、次のような検査や制御につなげます。

- Drift Check
- SQL と DDL の対応確認
- SQL、DTO、Mapper、Metadata の前提ずれの検出
- named parameter binding
- safe optional filters
- safe sort
- reviewable migration support

目的は、速い ORM runtime を作ることではありません。

目的は、SQL そのものを十分に使える状態にして、ORM runtime object layer を DB アクセスの中心に置かなくてもよい構成を作ることです。

## 本当の違い

Drizzle と Ashiba は、どちらも SQL を重視しています。

しかし、中心に置くものが違います。

| 問い | Drizzle | Ashiba |
|---|---|---|
| DB アクセスの中心 | TypeScript schema と query builder | SQL ファイル、DDL、生成物、検査 |
| 開発者が主に書くもの | SQL-like TypeScript API | DB ネイティブな SQL ファイル |
| 型支援の得方 | Drizzle schema と query builder から得る | DTO、Mapper、Metadata、Mapper Test を生成・検査して得る |
| runtime の立場 | Drizzle ORM が DB アクセス経路に入る | ORM runtime object layer を中心に置かない |
| SQL の扱い | TypeScript の式として組み立てる | SQL ファイルとして読める単位に残す |
| 中心となる約束 | TypeScript を SQL に近づける | SQL を SQL のまま残し、足場だけを生成する |

短く言えば、こうです。

Drizzle は、SQL を TypeScript へ持ち込みます。

Ashiba は、SQL を SQL のまま残します。

この違いは好みだけの話ではありません。

SQL が SQL ファイルとして残っていれば、SQL クライアントで確認し、EXPLAIN し、レビューし、チューニングし、別の SQL を書くときの参考にできます。

SQL は、単なる問い合わせ文字列ではありません。

テーブルをどう結合し、どの条件で絞り込み、どの粒度で集計し、どの形で返すのかを示す、実行可能なビジネスロジックです。

ER 図や外部キー制約だけでは表現しきれない業務上の判断、例外、集計、表示要件が、SQL には具体的な形で現れます。

Ashiba は、その SQL を TypeScript ロジックの中に溶かさず、プロダクト資産として読める単位に残します。

## なぜ Ashiba を選ぶのか

Ashiba を選ぶ理由は、Drizzle より強い ORM が欲しいからではありません。

Ashiba は、万能 ORM ではありません。

Ashiba を選ぶ理由は、SQL そのものをアプリケーションの中心資産として残したいからです。

次のようなチームなら、Ashiba を選ぶ理由があります。

- code review で最終的に「SQL を見せて」となることが多い。
- SQL ファイルを、見えるアプリケーションコードとして残したい。
- SQL クライアントや EXPLAIN を普通に使いたい。
- DB 固有機能、Window Function、CTE、ロック句、JSON 演算子、チューニング済み SQL をそのまま保守したい。
- SQL に刻まれた結合、条件、集計、表示要件を、プロダクトの知識として再利用したい。
- SQL は書きたいが、DTO、Mapper、Accessor、Mapper Test、Metadata を毎回手で整えたくない。
- schema drift を runtime 前に見える場所で検出したい。
- 生成物をライブラリ側のブラックボックスではなく、アプリケーション側の所有物として確認、調整、テストしたい。
- ORM runtime object layer ではなく、SQL ファイルと TypeScript の足場を中心にしたい。
- AI に補助させても、最後は人間が読める SQL と検査可能な生成物に戻したい。

この条件に当てはまるなら、Ashiba は Drizzle とは違う価値を持ちます。

Drizzle が弱いからではありません。

あなたのチームが守りたい中心資産が、TypeScript の query builder ではなく SQL そのものだからです。

## Drizzle のままでよい場合

一方で、次のような場合は Drizzle のままでよいでしょう。

- TypeScript-first な ORM が欲しい。
- schema 定義を TypeScript に置きたい。
- SQL-like query builder が好き。
- SQL を TypeScript の式として書き、IDE 支援を最大化したい。
- DB アクセスを TypeScript 内で compose したい。
- ORM runtime が DB アクセス経路に入ることを問題にしていない。
- Drizzle Kit、Drizzle Studio、Drizzle ecosystem を開発ワークフローとして使いたい。
- SQL ファイルを長期的にレビューし続ける成果物として扱う必要がない。

Drizzle は、コンパクトな TypeScript database toolkit が欲しいチームにとって強い選択肢です。

SQL そのものを、長期的にレビューし続ける成果物として扱う必要がないなら、Drizzle は十分に合理的です。

## "ORM が悪い" という話ではない

言いたいことは、ORM が悪いという話ではありません。

多くの ORM は、SQL だけではアプリケーション開発に足りなかったから存在しています。

Ashiba は、その事実を真剣に受け止めます。

しかし、SQL を SQL-like DSL で包むことを前提にはしません。

Ashiba は、SQL そのものをもう一度実用的にすることを目指します。

Drizzle は、SQL を TypeScript へ持ち込むことで現実の問題に向き合いました。

Ashiba は、同じ問題を、SQL を SQL のまま残したまま解決しようとします。

## Conclusion

SQL-like な TypeScript ORM / query builder が欲しいなら、Drizzle は強い選択肢です。

しかし、SQL そのものを、チームが読み、レビューし、チューニングし、デバッグし、長期的に残すコードにしたいなら、Ashiba を試してみてください。

SQL を知っているなら、なぜ SQL をそのまま残さないのでしょうか。
