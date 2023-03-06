
## Blog example

```dataview
table start_date, draft from "blog"
```

## Inlinedb

```dataviewjs
await dv.view('inlinedb', {query: `table start_date, draft from "blog"`});
```
