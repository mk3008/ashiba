# Adoption demos

このディレクトリは、Ashiba の普及に使う demo 企画を管理する場所です。

demo は 1 つだけで Ashiba 全体を証明しようとしない。Ashiba の価値は read-heavy query、CUD、migration review、drift recovery、AI review など複数の利用場面に分かれるため、用途ごとに demo を分けて管理する。

## Demo lanes

| Lane | 目的 | 状態 |
|---|---|---|
| R / read-heavy | 複雑な検索、optional filters、safe sort、SQL asset、Mapper Test、Drift Check を見せる。 | planning |
| CUD / mutation | 作成、更新、削除、業務制約、transaction boundary、affected rows、mutation review を見せる。 | future |
| Migration / drift | DDL 変更、SQL 変更、generated artifacts、repair flow を見せる。 | future |
| AI review | AI に変更させ、人間が SQL と生成物差分をレビューする体験を見せる。 | future |

## Current focus

最初の demo は `read-support-inbox.md` とする。

これは R 特化の demo であり、Ashiba が CUD に向かないことを意味しない。むしろ、最初に read-heavy query で Ashiba の「SQLを資産として残す」「safe optional condition と safe sort を driver adapter の責務として扱う」「生成物と検査で保守する」という価値を見せる。

CUD については、別 lane として改めて要件を定義する。
