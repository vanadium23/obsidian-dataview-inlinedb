// function renderInlineDb
//      executeQuery
//      generateColumns
//      renderTable
//      setupEvents

const { update } = app.plugins.plugins["metaedit"].api;
const { value: dvValue, index: dvIndex } = app.plugins.plugins["dataview"].api;

const ColumnType = {
    Unknown: 'unknown',
    Readonly: 'readonly',
    File: 'file',
    Choice: 'choice',
    Date: 'date',
    Number: 'number',
    Text: 'text',
    Boolean: 'boolean',
};

async function updateValue(event) {
    const target = event.target;
    const filepath = target.dataset.file;
    const property = target.dataset.property;
    await update(property, target.value, filepath);
}

async function updateBooleanValue(event) {
    const target = event.target;
    const filepath = target.dataset.file;
    const property = target.dataset.property;
    await update(property, target.checked, filepath);
}

async function openFile(event) {
    const target = event.target;
    const filepath = target.dataset.file;
    await app.workspace.openLinkText('', filepath);
}

function setupEvents(table) {
    table.querySelectorAll('.inlinedb-input').forEach((x) => x.addEventListener('blur', updateValue));
    table.querySelectorAll('.inlinedb-select').forEach((x) => x.addEventListener('change', updateValue));
    table.querySelectorAll('.inlinedb-checkbox').forEach((x) => x.addEventListener('change', updateBooleanValue));
    table.querySelectorAll('.internal-link').forEach((x) => x.addEventListener('click', openFile));
}

function generateColumns(headers, rows, configColumns = {}, try_to_guess = true) {
    const columns = {};
    // first header is always file
    columns[headers[0]] = { "type": ColumnType.File };
    if (try_to_guess && this.app.plugins.plugins["metaedit"].settings.AutoProperties.enabled) {
        for (const property of this.app.plugins.plugins["metaedit"].settings.AutoProperties.properties) {
            columns[property.name] = {
                "type": ColumnType.Choice,
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
                "type": ColumnType.Unknown,
            }
        }
    }

    if (try_to_guess) {
        for (const value of rows) {
            const file = value[0];
            const fileMetadata = dvIndex.pages.get(file.path);
            for (const [index, v] of value.entries()) {
                const header = headers[index];
                if (columns[header].type != ColumnType.Unknown) {
                    continue;
                }
                // set as read only fields, that are note part of metadata
                if (v !== null && !!!fileMetadata.fields.get(header)) {
                    columns[header] = {
                        "type": ColumnType.Readonly,
                    }
                    continue;
                }
                if (dvValue.isDate(v)) {
                    columns[header] = {
                        "type": ColumnType.Date,
                    };
                } else if (dvValue.isLink(v)) {
                    columns[header] = {
                        "type": ColumnType.File,
                    }
                } else if (dvValue.isNumber(v)) {
                    columns[header] = {
                        "type": ColumnType.Number,
                    }
                } else if (dvValue.isString(v)) {
                    columns[header] = {
                        "type": ColumnType.Text,
                    }
                } else if (dvValue.isBoolean(v)) {
                    columns[header] = {
                        "type": ColumnType.Boolean,
                    }
                }
            }
        }
    }
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

function renderTable(headers, aliases, rows, columns) {
    let theader = '';
	if(!aliases)
		aliases = headers;
    for (const a of aliases) {
        theader += `<th class="table-view-th">${a}</th>`;
    }


    let tbody = '';
    for (const value of rows) {
        tbody += '<tr>';
        const file = value[0];
        let i = 0;
        for (const v of value) {
            let elem = "";
            switch (columns[headers[i]].type) {
                case ColumnType.File:
                    elem = `<span class="cm-hmd-internal-link internal-link" data-file="${file.path}">${v.fileName()}</span>`;
                    break;
                case ColumnType.Choice:
                    elem = renderSelect(headers[i], v, file, columns[headers[i]].choices);
                    break;
                case ColumnType.Date:
                    elem = `<input class="inlinedb-input" type="date" value="${v ? v.toISODate() : ''}" data-property="${headers[i]}" data-file="${file.path}">`
                    break;
                case ColumnType.Text:
                    elem = `<input class="inlinedb-input" type="text" value="${v || ''}" data-property="${headers[i]}" data-file="${file.path}">`
                    break;
                case ColumnType.Number:
                    elem = `<input class="inlinedb-input" type="number" value="${v || ''}" data-property="${headers[i]}" data-file="${file.path}">`
                    break;
                case ColumnType.Boolean:
                    elem = `<input class="inlinedb-checkbox" type="checkbox" ${v && 'checked'} data-property="${headers[i]}" data-file="${file.path}">`
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
    let headers, rows, aliases;
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
	if (input.aliases)
		aliases = input.aliases;
    table.innerHTML = renderTable(headers, aliases, rows, columns);
    await dv.el('div', table);
    setupEvents(table);
}

try {
    await renderInlineDb(input);
} catch (error) {
    console.error(error);
    dv.el('span', error);
}
