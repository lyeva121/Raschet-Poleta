let rowsData = [];
const tableBody = document.getElementById('table_body');

// Инициализация 10 строк по умолчанию
function initDefaultRows() {
    tableBody.innerHTML = '';
    rowsData = [];
    for (let i = 0; i < 10; i++) {
        addTableRow(i === 0);
    }
}

function addTableRow(isFirst = false) {
    const tr = document.createElement('tr');

    tr.innerHTML = `
        <td class="col-ppm"><input type="text" class="cell-point" style="text-align: left;"></td>
        <td class="col-equal-8"><input type="number" class="cell-zmpu" ${isFirst ? 'disabled class="disabled-cell"' : ''} style="text-align: center;"></td>
        <td class="col-equal-8"><input type="number" class="cell-dist" ${isFirst ? 'disabled class="disabled-cell"' : ''} style="text-align: center;"></td>
        <td class="col-equal-8"><input type="number" class="cell-wdir" style="text-align: center;"></td>
        <td class="col-equal-8"><input type="number" class="cell-wspeed" style="text-align: center;"></td>
        <td class="col-equal-8 cell-mk-lbl" style="text-align: center; font-size: 13px;">${isFirst ? '—' : ''}</td>
        <td class="col-time cell-time-lbl" style="text-align: center; font-size: 13px;">${isFirst ? '—' : ''}</td>
        <td class="col-note"><input type="text" class="cell-note" style="text-align: left;"></td>
    `;
    tableBody.appendChild(tr);
    rowsData.push(tr);
}

function validateAngle(val, name) {
    if (val < 0 || val > 359) {
        alert(`Ошибка: ${name} должен быть в диапазоне 0–359`);
        return false;
    }
    return true;
}

function removeWind() {
    rowsData.forEach((row, i) => {
        row.querySelector('.cell-wdir').value = '';
        row.querySelector('.cell-wspeed').value = '';
        
        const mkCell = row.querySelector('.cell-mk-lbl');
        const timeCell = row.querySelector('.cell-time-lbl');
        mkCell.style.backgroundColor = '';
        mkCell.style.fontWeight = 'normal';
        timeCell.style.backgroundColor = '';
        timeCell.style.fontWeight = 'normal';

        if (i === 0) {
            mkCell.innerText = '—';
            timeCell.innerText = '—';
        } else {
            mkCell.innerText = '';
            timeCell.innerText = '';
        }
    });
    document.getElementById('result_label').style.display = 'none';
}

function calculateMk(zmpu, wind_dir, wind_speed, speed) {
    let angle = (wind_dir + 180 - zmpu) * Math.PI / 180;
    let correction = (wind_speed / speed) * Math.sin(angle) * 57.3;
    let res = Math.round(zmpu - correction);
    return (res % 360 + 360) % 360; 
}

function calculateTime(distance, zmpu, wind_dir, wind_speed, speed) {
    let angle = (wind_dir + 180 - zmpu) * Math.PI / 180;
    let headwind = wind_speed * Math.cos(angle);
    let ground_speed = speed + headwind;
    return ground_speed > 0 ? (distance / ground_speed) : 0;
}

function calculateRoute() {
    const speedStr = document.getElementById('speed_entry').value;
    const speed = parseFloat(speedStr);
    if (isNaN(speed) || speed <= 0) {
        alert("Ошибка: Проверьте параметр скорости");
        return;
    }

    const sameWind = document.getElementById('same_wind_cb').checked;

    if (sameWind) {
        let tDir = "", tSpeed = "";
        for (let row of rowsData) {
            if (row.querySelector('.cell-point').value.trim()) {
                let d = row.querySelector('.cell-wdir').value.trim();
                let s = row.querySelector('.cell-wspeed').value.trim();
                if (d || s) { tDir = d; tSpeed = s; break; }
            }
        }
        if (tDir || tSpeed) {
            rowsData.forEach(row => {
                if (row.querySelector('.cell-point').value.trim()) {
                    if (!row.querySelector('.cell-wdir').value.trim()) row.querySelector('.cell-wdir').value = tDir;
                    if (!row.querySelector('.cell-wspeed').value.trim()) row.querySelector('.cell-wspeed').value = tSpeed;
                }
            });
        }
    } else {
        let cDir = "", cSpeed = "";
        rowsData.forEach(row => {
            if (row.querySelector('.cell-point').value.trim()) {
                let d = row.querySelector('.cell-wdir').value.trim();
                let s = row.querySelector('.cell-wspeed').value.trim();
                if (d || s) { cDir = d; cSpeed = s; }
                else if (cDir || cSpeed) {
                    row.querySelector('.cell-wdir').value = cDir;
                    row.querySelector('.cell-wspeed').value = cSpeed;
                }
            }
        });
    }

    let totalMin = 0, totalDist = 0;
    let activeWindDir = null, activeWindSpeed = null;

    for (let i = 0; i < rowsData.length; i++) {
        const row = rowsData[i];
        const pName = row.querySelector('.cell-point').value.trim();

        if (i === 0) {
            let wd = row.querySelector('.cell-wdir').value.trim();
            let ws = row.querySelector('.cell-wspeed').value.trim();
            if (wd) activeWindDir = parseFloat(wd);
            if (ws) activeWindSpeed = parseFloat(ws);
            continue;
        }

        if (!pName) continue;

        let zmpu = parseFloat(row.querySelector('.cell-zmpu').value);
        let dist = parseFloat(row.querySelector('.cell-dist').value);
        if (isNaN(zmpu) || isNaN(dist)) continue;

        if (!validateAngle(zmpu, "ЗМПУ")) return;

        let wdStr = row.querySelector('.cell-wdir').value.trim();
        let wsStr = row.querySelector('.cell-wspeed').value.trim();

        if (wdStr) {
            let val = parseFloat(wdStr);
            if (!validateAngle(val, "Направление ветра")) return;
            activeWindDir = val;
        }
        if (wsStr) activeWindSpeed = parseFloat(wsStr);

        if (activeWindDir === null || activeWindSpeed === null) {
            alert(`Ошибка: Не заданы параметры ветра для участка до ППМ '${pName}'`);
            return;
        }

        let mk = calculateMk(zmpu, activeWindDir, activeWindSpeed, speed);
        let fTime = calculateTime(dist, zmpu, activeWindDir, activeWindSpeed, speed);
        let minutes = Math.round(fTime * 60);

        totalMin += minutes;
        totalDist += dist;

        const formatTime = (m) => `${Math.floor(m/60)}:${String(m%60).padStart(2, '0')}`;

        const mkCell = row.querySelector('.cell-mk-lbl');
        const timeCell = row.querySelector('.cell-time-lbl');
        
        mkCell.innerText = mk + "\u00B0";
        timeCell.innerText = formatTime(minutes) + " / " + formatTime(totalMin);

        mkCell.style.setProperty('background-color', '#f0f0f0', 'important');
        mkCell.style.setProperty('font-weight', 'bold', 'important');
        
        timeCell.style.setProperty('background-color', '#f0f0f0', 'important');
        timeCell.style.setProperty('font-weight', 'bold', 'important');
    }

    const formatTotalTime = (m) => `${Math.floor(m/60)}:${String(m%60).padStart(2, '0')}`;
    const resLabel = document.getElementById('result_label');
    resLabel.style.display = 'block';
    resLabel.innerText = `Общее расстояние: ${Math.round(totalDist)} км\nОбщее время: ${formatTotalTime(totalMin)}`;
}

// --- НОВАЯ ФУНКЦИЯ ДЛЯ ГЕНЕРАЦИИ СТРОГОГО PDF (15 СМ) ---
function generatePDF() {
    // Проверяем, выполнен ли расчет перед генерацией
    let totalDist = 0;
    let totalMin = 0;
    let hasCalculatedData = false;
    
    // Массив для хранения цепочки изменений ветра
    let windSegments = [];
    let lastWDir = null;
    let lastWSpeed = null;

    let tableRowsHtml = "";

    for (let i = 0; i < rowsData.length; i++) {
        const row = rowsData[i];
        const pName = row.querySelector('.cell-point').value.trim();
        if (!pName) continue;

        let dist = i === 0 ? "—" : row.querySelector('.cell-dist').value ? Math.round(parseFloat(row.querySelector('.cell-dist').value)) : "";
        let mk = row.querySelector('.cell-mk-lbl').innerText;
        let time = row.querySelector('.cell-time-lbl').innerText;
        let note = row.querySelector('.cell-note').value.trim();

        let wDirStr = row.querySelector('.cell-wdir').value.trim();
        let wSpeedStr = row.querySelector('.cell-wspeed').value.trim();

        if (wDirStr && wSpeedStr) {
            let wd = parseFloat(wDirStr);
            let ws = parseFloat(wSpeedStr);
            if (wd !== lastWDir || ws !== lastWSpeed) {
                windSegments.push({ point: pName, dir: wd, speed: ws });
                lastWDir = wd;
                lastWSpeed = ws;
            }
        }

        if (i > 0 && dist !== "—" && dist !== "") {
            totalDist += parseFloat(dist);
            // Извлекаем минуты текущего участка из строки вида "XX:XX / YY:YY"
            if (time && time.includes("/")) {
                let currentSegmentTimeStr = time.split("/")[0].trim();
                let parts = currentSegmentTimeStr.split(":");
                totalMin += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                hasCalculatedData = true;
            }
        }

        tableRowsHtml += `
            <tr>
                <td class="text-left">${pName}</td>
                <td>${dist}</td>
                <td>${mk}</td>
                <td>${time}</td>
                <td class="text-left">${note}</td>
            </tr>
        `;
    }

    if (!hasCalculatedData) {
        alert("Ошибка: Сначала нажмите кнопку 'РАСЧЁТ', чтобы сформировать данные для PDF.");
        return;
    }

    // Формирование строки ветра точно по вашему примеру
    let windText = "";
    if (windSegments.length > 0) {
        windText = `Ветер ${windSegments[0].dir}\u00B0 ${windSegments[0].speed} км/ч`;
        for (let k = 1; k < windSegments.length; k++) {
            windText += `, после ${windSegments[k].point} ${windSegments[k].dir}\u00B0 ${windSegments[k].speed} км/ч`;
        }
    }

    const formatTotalTime = (m) => `${Math.floor(m/60)}:${String(m%60).padStart(2, '0')}`;

    // Сборка структуры печатного контейнера шириной ровно 15см
    const printArea = document.getElementById('pdf_print_area');
    printArea.innerHTML = `
        <div class="pdf-title">Расчёт маршрута</div>
        <table class="pdf-table">
            <thead>
                <tr>
                    <th style="width: 25%;">ППМ</th>
                    <th style="width: 15%;">Расстояние</th>
                    <th style="width: 15%;">МК</th>
                    <th style="width: 20%;">Время</th>
                    <th style="width: 25%;">Примечание</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHtml}
            </tbody>
        </table>
        <div class="pdf-results">Общее расстояние: ${Math.round(totalDist)} км\nОбщее время: ${formatTotalTime(totalMin)}\n${windText}</div>
    `;

    // Вызов системного диалога печати / сохранения в PDF
    window.print();
}

function saveRoute() {
    let data = {
        speed: document.getElementById('speed_entry').value,
        rows: rowsData.map(row => ({
            point: row.querySelector('.cell-point').value,
            zmpu: row.querySelector('.cell-zmpu').value,
            distance: row.querySelector('.cell-dist').value,
            note: row.querySelector('.cell-note').value
        }))
    };
    let blob = new Blob([JSON.stringify(data, null, 4)], {type: "application/json"});
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "route.json";
    a.click();
}

function triggerOpenRoute() { document.getElementById('file_input').click(); }

function openRoute(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = JSON.parse(e.target.result);
        newRoute();
        document.getElementById('speed_entry').value = data.speed || '';
        const rData = data.rows || [];
        
        while (rowsData.length < rData.length) addTableRow();

        rData.forEach((item, i) => {
            rowsData[i].querySelector('.cell-point').value = item.point || '';
            rowsData[i].querySelector('.cell-note').value = item.note || '';
            if (i !== 0) {
                rowsData[i].querySelector('.cell-zmpu').disabled = false;
                rowsData[i].querySelector('.cell-zmpu').classList.remove('disabled-cell');
                rowsData[i].querySelector('.cell-zmpu').value = item.zmpu || '';
                rowsData[i].querySelector('.cell-dist').disabled = false;
                rowsData[i].querySelector('.cell-dist').classList.remove('disabled-cell');
                rowsData[i].querySelector('.cell-dist').value = item.distance || '';
            }
        });
    };
    reader.readAsText(file);
}

function reverseRoute() {
    let speed = document.getElementById('speed_entry').value;
    let sameWind = document.getElementById('same_wind_cb').checked;
    
    let activeData = [];
    rowsData.forEach(row => {
        if (row.querySelector('.cell-point').value.trim()) {
            activeData.push({
                point: row.querySelector('.cell-point').value.trim(),
                zmpu: row.querySelector('.cell-zmpu').value,
                distance: row.querySelector('.cell-dist').value,
                wind_dir: row.querySelector('.cell-wdir').value,
                wind_speed: row.querySelector('.cell-wspeed').value,
                note: row.querySelector('.cell-note').value
            });
        }
    });

    if (activeData.length < 2) { alert("Ошибка: Недостаточно ППМ"); return; }

    let revPoints = [...activeData].reverse();
    let newZmpu = [], newDist = [], newWdir = [], newWspeed = [];

    for (let i = activeData.length - 1; i > 0; i--) {
        let val = parseFloat(activeData[i].zmpu);
        newZmpu.push(!isNaN(val) ? String(Math.round((val + 180) % 360)) : "");
        newDist.push(activeData[i].distance);
        newWdir.push(activeData[i].wind_dir);
        newWspeed.push(activeData[i].wind_speed);
    }

    newRoute();
    document.getElementById('speed_entry').value = speed;
    document.getElementById('same_wind_cb').checked = sameWind;

    while (rowsData.length < revPoints.length) addTableRow();

    revPoints.forEach((item, i) => {
        rowsData[i].querySelector('.cell-point').value = item.point;
        rowsData[i].querySelector('.cell-note').value = item.note;
        if (i > 0) {
            rowsData[i].querySelector('.cell-zmpu').disabled = false;
            rowsData[i].querySelector('.cell-zmpu').classList.remove('disabled-cell');
            rowsData[i].querySelector('.cell-zmpu').value = newZmpu[i-1];
            rowsData[i].querySelector('.cell-dist').disabled = false;
            rowsData[i].querySelector('.cell-dist').classList.remove('disabled-cell');
            rowsData[i].querySelector('.cell-dist').value = newDist[i-1];
            rowsData[i].querySelector('.cell-wdir').value = newWdir[i-1];
            rowsData[i].querySelector('.cell-wspeed').value = newWspeed[i-1];
        } else {
            rowsData[i].querySelector('.cell-wdir').value = item.wind_dir;
            rowsData[i].querySelector('.cell-wspeed').value = item.wind_speed;
        }
    });
}

function newRoute() {
    document.getElementById('speed_entry').value = '';
    document.getElementById('same_wind_cb').checked = false;
    initDefaultRows();
    document.getElementById('result_label').style.display = 'none';
}

initDefaultRows();