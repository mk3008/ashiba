# VSA minimal ticket app

This fixture is intentionally self-contained. Keep SQL visible in feature-local
files and use the Ashiba named-parameter package only. Compile each canonical
SQL file at application initialization and cache the resulting binding; do not
add generated binding files, source hashes, or a freshness command. The
application owns pool, transaction, mapping, and finite reviewed SQL choices.
