-- Keep this review comment.
with used as (select 1 as id), unused as (select 2 as id)
select * from used;
