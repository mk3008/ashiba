# V4 environment correction

The first B2 dispatch resolved its relative paths against the repository root
rather than the isolated PR worktree and therefore made no candidate changes.
It is retained as an environment/path failure, not counted as a treatment
result. A new fresh B2 dispatch received absolute worktree paths and produced
the retained `probes/b2/candidate/` evidence.

The MySQL 8.4 disposable container was running on `127.0.0.1:33306` throughout
the completed probes. B2's later unverified result is not rewritten as an
environment failure: its own candidate required `MYSQL_URL` instead of using
the fixture endpoint.
