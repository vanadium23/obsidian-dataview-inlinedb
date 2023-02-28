// function renderInlineDb
//      executeQuery
//      generateColumns
//      renderTable
//      setupEvents


const { update } = app.plugins.plugins["metaedit"].api;
// const { index, value } = app.plugins.plugins["dataview"].api;

async function updateValue(event) {
    const target = event.target;
    const filepath = target.dataset.file;
    const property = target.dataset.property;
    await update(property, target.value, filepath);
}

async function openFile(event) {
    const target = event.target;
    const filepath = target.dataset.file;
    await app.workspace.openLinkText('', filepath);
}

function setupEvents(table) {
    table.querySelectorAll('.inlinedb-input').forEach((x) => x.addEventListener('blur', updateValue));
    table.querySelectorAll('.inlinedb-select').forEach((x) => x.addEventListener('change', updateValue));
    table.querySelectorAll('.internal-link').forEach((x) => x.addEventListener('click', openFile));
}

function generateColumns(headers, rows, configColumns = {}, try_to_guess = true) {
    const columns = {};
    // first header is always file
    columns[headers[0]] = {"type": "file"};
    if (try_to_guess && this.app.plugins.plugins["metaedit"].settings.AutoProperties.enabled) {
        for (const property of this.app.plugins.plugins["metaedit"].settings.AutoProperties.properties) {
            columns[property.name] = {
                "type": "choices",
                "choices": property.choices,
            };
        }
    }
    for (const header in configColumns) {
        if (typeof configColumns[header] === "string") {
            columns[header] = {
                "type": configColumns[header]
            };
        } else {
            columns[header] = configColumns[header];
        }
    }
    for (const header of headers) {
        if (!!!columns[header]) {
            columns[header] = {
                "type": "unknown",
            }
        }
    }

    if (try_to_guess) {
        for (const value of rows) {
            for (const [index, v] of value.entries()) {
                const header = headers[index];
                if (columns[header].type != "unknown") {
                    continue;
                }
                if (isDate(v)) {
                    columns[header] = {
                        "type": "date"
                    };
                } else if (v !== null) {
                    columns[header] = {
                        "type": "text",
                    }
                }
            }
        }
    }
    console.log(columns);
    return columns;
}


function renderSelect(property, value, file, choices) {
    let options = '';
    for (const choice of choices) {
        const selected = (value == choice) ? "selected" : "";
        options += `<option ${selected}>${choice}</option>`
    }
    return `<select class="inlinedb-select" data-property="${property}" data-file="${file.path}">${options}</select>`
}

function isDateTime(v) {
    return v && v.isLuxonDateTime;
}


function isDate(v) {
    if (!isDateTime(v)) {
        return false;
    }
    return v.c.hour === 0 && v.c.minute === 0 && v.c.second === 0 && v.c.millisecond === 0;
}

function renderTable(headers, rows, columns) {
    let theader = '';
    for (const h of headers) {
        theader += `<th class="table-view-th">${h}</th>`;
    }


    let tbody = '';
    for (const value of rows) {
        tbody += '<tr>';
        const file = value[0];
        let i = 0;
        for (const v of value) {
            let elem = "";
            switch (columns[headers[i]].type) {
                case "file":
                    elem = `<span class="cm-hmd-internal-link internal-link" data-file="${file.path}">${v.fileName()}</span>`;
                    break;
                case "choice":
                    elem = renderSelect(headers[i], v, file, columns[headers[i]].choices);
                    break;
                case "date":
                    elem = `<input class="inlinedb-input" type="date" value="${v ? v.toISODate() : ''}" data-property="${headers[i]}" data-file="${file.path}">`
                    break;
                case "text":
                    elem = `<input class="inlinedb-input" type="text" value="${v || ''}" data-property="${headers[i]}" data-file="${file.path}">`
                    break;
                default:
                    elem = `<span>${v || "-"}</span>`;
                    break;
            }
            tbody += `<td>${elem}</td>`
            i++;
        }
        tbody += '</tr>';
    }
    return `<thead class="table-view-thead">${theader}</thead><tbody class="table-view-tbody">${tbody}</tbody>`;
}


async function renderInlineDb(input) {
    let headers, rows;
    if (input.query) {
        const result = await dv.query(input.query);
        headers = result.value.headers;
        rows = result.value.values;
    } else {
        headers = input.headers;
        rows = input.values;
    }
    const columns = generateColumns(headers, rows, input.columns, input.try_to_guess);
    const table = createEl('table', { cls: "dataview table-view-table" });
    table.innerHTML = renderTable(headers, rows, columns);
    await dv.el('div', table);
    setupEvents(table);
}

try {
    await renderInlineDb(input);
} catch (error) {
    console.error(error);
    dv.el('span', error);
}
