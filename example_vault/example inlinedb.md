
## [[example tables#Blog example]]

```dataviewjs
const query = `table start_date, draft from "blog"`;
await dv.view('inlinedb', {query: query});
```

---

## [[example tables#Recipe example]]


```dataviewjs
const query = `table cuisine, needsStove from "recipes"`;
const columns = {
	'cuisine': {
		"type": "choices",
		"choices": ["British", "American", "Italian"],
	}
}
await dv.view('inlinedb', {query: query, columns: columns});
```