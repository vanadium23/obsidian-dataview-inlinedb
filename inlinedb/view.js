// function renderInlineDb
//      executeQuery
//      generateColumns
//      renderTable
//      setupEvents


const { update } = this.app.plugins.plugins["metaedit"].api;

let autoprops = {};
if (this.app.plugins.plugins["metaedit"].settings.AutoProperties.enabled) {
    for (const property of this.app.plugins.plugins["metaedit"].settings.AutoProperties.properties) {
        autoprops[property.name] = property.choices;
    }
}

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
    table.querySelectorAll('.some').forEach((x) => x.addEventListener('blur', updateValue));
    table.querySelectorAll('.select').forEach((x) => x.addEventListener('change', updateValue));
    table.querySelectorAll('.internal-link').forEach((x) => x.addEventListener('click', openFile));
}

function generateColumns(headers, rows, configColumns = {}, try_to_guess = true) {
    const columns = {};
    for (const header of headers) {
        if (configColumns && configColumns[header]) {
            if (typeof configColumns[header] === "string") {
                columns[header] = {
                    "type": configColumns[header]
                };
            } else {
                columns[header] = configColumns[header];
            }
        } else {
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
                if (v && v.type == "file") {
                    columns[header] = {
                        "type": "file",
                    }
                } else if (autoprops[header]) {
                    columns[header] = {
                        "type": "choice",
                        "choices": autoprops[header],
                    };
                } else if (isDate(v)) {
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
    return columns;
}


function renderSelect(property, value, file) {
    let choices = '';
    for (const choice of autoprops[property]) {
        const selected = (value == choice) ? "selected" : "";
        choices += `<option ${selected}>${choice}</option>`
    }
    return `<select class="select" data-property="${property}" data-file="${file.path}">${choices}</select>`
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
                    elem = renderSelect(headers[i], v, file);
                    break;
                case "date":
                    elem = `<input class="some" type="date" value="${v ? v.toISODate() : ''}" data-property="${headers[i]}" data-file="${file.path}">`
                    break;
                case "text":
                    elem = `<input class="some" type="text" value="${v || ''}" data-property="${headers[i]}" data-file="${file.path}">`
                    break;
                default:
                    elem = `<span>${v}</span>`;
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
