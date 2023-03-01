
## [[example tables#Blog example]]

```dataviewjs
const query = `table start_date, draft from "blog"`;
await dv.view('inlinedb', {query: query});
```

---

## [[example tables#Recipe example]]


```dataviewjs
const query = `table cuisine, needsStove, rating from "recipes"`;
const columns = {
	'rating': {
		"type": "choice",
		"choices": [1,2,3,4,5],
	}
}
await dv.view('inlinedb', {query: query, columns: columns});
```