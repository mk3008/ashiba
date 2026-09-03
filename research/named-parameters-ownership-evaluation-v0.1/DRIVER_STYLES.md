# Driver binding styles

Three stable output classes cover the useful target concern:

| Style | Rendering | Repeated logical value | Assessment |
| --- | --- | --- | --- |
| Indexed/reusable | `$1`, `$2`; `:1`, `:2` variants | one position, reused | supported by indexed metadata |
| Anonymous positional | `?` | repeat token and repeat value | supported by anonymous metadata |
| Native named | `@name`, `:name` | driver reuses name | no lowering package is needed |

SQLite supports anonymous, indexed, and named forms; JDBC/ODBC-style APIs commonly bind positional values; Oracle and DB2 add numeric/named forms but do not require SQL semantic analysis. Rendering is a driver-binding concern, not a DBMS adapter responsibility. No counterexample found that requires schema or SQL grammar analysis.

Native named drivers should consume canonical named SQL directly. This makes `NamedRendering` unnecessary for the retained lowering core.
