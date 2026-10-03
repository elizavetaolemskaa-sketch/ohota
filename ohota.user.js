// ==UserScript==
// @name         охота халоо
// @namespace    http://tampermonkey.net/
// @version      2026-06-20
// @description  try to take over the world!
// @author       миви как обычно feat дипсик
// @match        https://catwar.su/blog5504
// @match        https://catwar.net/blog5504
// @icon         https://www.google.com/s2/favicons?sz=64&domain=catwar.net
// @grant        none
// @updateURL    https://github.com/elizavetaolemskaa-sketch/ohota/raw/refs/heads/main/ohota.user.js
// @downloadURL  https://github.com/elizavetaolemskaa-sketch/ohota/raw/refs/heads/main/ohota.user.js
// ==/UserScript==

(function() {
    'use strict';

    const COLORS = {
        bgMain: '#F4EAE190',
        bgTabActive: '#6C5946',
        bgTabInactive: '#94715290',
        textDark: '#000000',
        border: '#1F1309',
        warning: '#8B0000',
        success: '#000000'
    };
    const FONT_FAMILY = 'Georgia, serif';

    // ---------- ФОНОВЫЙ СТИЛЬ ----------
    function addBackgroundStyle() {
        const style = document.createElement('style');
        style.textContent = `
            #hunt-helper-panel {
                background-image: url('https://e.radikal.host/2026/06/21/image80d7c346881d7002.png');
                background-repeat: repeat;
                background-position: top left;
            }
            #hunt-helper-panel input[type="radio"] {
                accent-color: #2E1A02;
            }
            #hunt-helper-panel input[type="checkbox"] {
                accent-color: #2E1A02;
            }
        `;
        document.head.appendChild(style);
    }

    // ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
    function getTodayISO() {
        return new Date().toISOString().split('T')[0];
    }

    function formatDateForReport(isoDate) {
        if (!isoDate) return '';
        const parts = isoDate.split('-');
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    async function convertNameToId(name) {
        if (!name || !name.trim()) return '';
        if (name.match(/^\d+$/)) return name;

        const formattedName = name.split(' ').map(word => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');

        try {
            const response = await fetch('/ajax/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    data: formattedName,
                    delimiter: ',',
                    template: '[link%id%]',
                    type_in: '0',
                    type_out: '0'
                })
            });
            const result = await response.text();
            const match = result.match(/\[link(\d+)\]/);
            return match ? match[1] : '';
        } catch (e) {
            console.error('Ошибка при конвертации имени:', e);
            return '';
        }
    }

    async function formatNameWithId(name) {
        const trimmed = name.trim();
        if (!trimmed) return '';
        const match = trimmed.match(/^(.+?)\s*\[(\d+)\]$/);
        if (match) {
            return trimmed;
        }
        const id = await convertNameToId(trimmed);
        if (id) {
            return `${trimmed} [${id}]`;
        } else {
            return null;
        }
    }

    // Подсчёт баллов по истории (с настраиваемыми весами)
    function calculateScore(historyText, weights) {
        if (!historyText) return 0;
        const w = weights || { thin: 1, normal: 2, fat: 4 };
        const text = historyText;
        const sentences = text.split(/[.!?]\s*/).filter(s => s.trim().length > 0);
        let totalScore = 0;
        for (const sentence of sentences) {
            if (/(поднял[а]?)/i.test(sentence)) {
                const regex = /(упитанн\S*|обычн\S*|хил\S*)\s+(\S+)/gi;
                let match;
                while ((match = regex.exec(sentence)) !== null) {
                    const adj = match[1];
                    if (adj.includes('упитанн')) totalScore += w.fat;
                    else if (adj.includes('обычн')) totalScore += w.normal;
                    else if (adj.includes('хил')) totalScore += w.thin;
                }
            }
        }
        return totalScore;
    }

    function insertReport(text) {
        const field = document.querySelector('#comment');
        if (field) {
            field.value = text;
        } else {
            alert('Поле ввода (#comment) не найдено. Проверьте селектор.');
        }
    }

   // ---------- ВКЛАДКА 1: Отпись охотничьего патруля ----------
    function createPatrolReportTab() {
        const div = document.createElement('div');
        div.style.display = 'block';
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgMain;
        div.style.border = '1px solid ' + COLORS.border;
        div.style.fontFamily = FONT_FAMILY;

        const times = ['Дневной', 'Послеполуденный', 'Вечерний'];
        const DEFAULT_LOCATIONS = ['Шумный поток'];

        // Загружаем сохранённые локации из localStorage
        let savedLocations = [];
        try {
            const stored = JSON.parse(localStorage.getItem('patrol_locations'));
            if (Array.isArray(stored) && stored.length > 0) savedLocations = stored;
            else savedLocations = [...DEFAULT_LOCATIONS];
        } catch (e) {
            savedLocations = [...DEFAULT_LOCATIONS];
        }

        div.innerHTML = `
            <div style="background-color: ${COLORS.bgTabActive}; padding: 4px; margin-bottom: 10px; font-weight: bold; text-align: center; color: ${COLORS.textDark};">Отпись охотничьего патруля</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: start; font-size: 13px;">
                <span style="padding-top: 6px;">Время:</span>
                <select id="patrol_time" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                    ${times.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <span style="padding-top: 6px;">Дата:</span>
                <input type="date" id="patrol_date" value="${getTodayISO()}" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                <span style="padding-top: 6px;">Локация:</span>
                <div>
                    <div style="display: flex; gap: 4px;">
                        <select id="patrol_location" style="flex: 1; padding: 4px; font-family: ${FONT_FAMILY};"></select>
                        <button type="button" id="patrol_location_del" title="Удалить выбранную локацию" style="background: #2E1A02; color: white; border: none; border-radius: 3px; cursor: pointer; padding: 2px 8px; font-size: 12px;">✕</button>
                    </div>
                    <div style="display: flex; gap: 4px; margin-top: 4px;">
                        <input type="text" id="patrol_new_location" placeholder="Новая локация" style="flex: 1; padding: 4px; font-family: ${FONT_FAMILY};">
                        <button type="button" id="patrol_location_add" title="Добавить локацию" style="background: ${COLORS.bgTabActive}; border: none; cursor: pointer; padding: 4px 10px; font-family: ${FONT_FAMILY}; font-weight: bold;">✚</button>
                    </div>
                </div>
                <span style="padding-top: 6px;">Носильщики:</span>
                <input type="text" id="patrol_carriers" placeholder="Имя1, Имя2 (опционально)" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                <span style="padding-top: 6px;">Информационные:</span>
                <input type="text" id="patrol_info" placeholder="Имя1, Имя2 (опционально)" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
            </div>
            <div style="margin-top: 6px;">
                <label style="font-size: 13px;">
                    <input type="checkbox" id="patrol_include_location" style="margin-right: 4px;"> Включать локацию в отчёт
                </label>
            </div>
            <div style="margin-top: 6px;">
                <label style="font-size: 13px;">
                    <input type="checkbox" id="patrol_include_info" style="margin-right: 4px;"> Включать информационные в отчёт
                </label>
            </div>

            <details style="margin-top: 10px; background: rgba(255,255,255,0.2); padding: 6px 8px; border: 1px solid ${COLORS.border};">
                <summary style="cursor: pointer; font-weight: bold; font-size: 13px;">⚙ Настройки баллов</summary>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px; font-size: 13px;">
                    <label style="display: flex; flex-direction: column; gap: 4px;">
                        Хилая
                        <input type="number" id="score_thin" value="1" min="0" step="1" style="padding: 4px; font-family: ${FONT_FAMILY};">
                    </label>
                    <label style="display: flex; flex-direction: column; gap: 4px;">
                        Обычная
                        <input type="number" id="score_normal" value="2" min="0" step="1" style="padding: 4px; font-family: ${FONT_FAMILY};">
                    </label>
                    <label style="display: flex; flex-direction: column; gap: 4px;">
                        Упитанная
                        <input type="number" id="score_fat" value="4" min="0" step="1" style="padding: 4px; font-family: ${FONT_FAMILY};">
                    </label>
                </div>
                <button id="score_reset" type="button" style="margin-top: 8px; padding: 4px 10px; background: #2E1A02; color: white; border: none; cursor: pointer; font-family: ${FONT_FAMILY}; font-weight: bold; font-size: 12px; border-radius: 3px;">Сбросить (1 / 2 / 4)</button>
            </details>

            <div style="margin-top: 10px;">
                <div style="font-weight: bold; font-size: 13px; margin-bottom: 5px;">Участники (имя и история добычи):</div>
                <div id="patrol_members_container"></div>
                <button id="patrol_add_member" style="margin-top: 5px; padding: 4px 10px; background: ${COLORS.bgTabActive}; border: none; cursor: pointer; font-family: ${FONT_FAMILY}; font-weight: bold;">✚ Добавить участника</button>
            </div>
            <div id="patrol_warning" style="color: ${COLORS.warning}; font-size: 12px; margin-top: 8px; text-align: center; display: none;"></div>
            <button id="patrol_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgTabActive}; color:${COLORS.textDark}; border:none; cursor:pointer; font-family:${FONT_FAMILY}; font-weight:bold;">Сформировать отчёт</button>
        `;

        const container = div.querySelector('#patrol_members_container');
        const addBtn = div.querySelector('#patrol_add_member');
        const warningDiv = div.querySelector('#patrol_warning');
        const timeSelect = div.querySelector('#patrol_time');
        const dateInput = div.querySelector('#patrol_date');
        const locationSelect = div.querySelector('#patrol_location');
        const newLocationInput = div.querySelector('#patrol_new_location');
        const addLocationBtn = div.querySelector('#patrol_location_add');
        const delLocationBtn = div.querySelector('#patrol_location_del');
        const carriersInput = div.querySelector('#patrol_carriers');
        const infoInput = div.querySelector('#patrol_info');
        const includeLocationCheck = div.querySelector('#patrol_include_location');
        const includeInfoCheck = div.querySelector('#patrol_include_info');

        // Элементы настроек баллов
        const scoreThinInput = div.querySelector('#score_thin');
        const scoreNormalInput = div.querySelector('#score_normal');
        const scoreFatInput = div.querySelector('#score_fat');
        const scoreResetBtn = div.querySelector('#score_reset');

        // ---------- ЛОКАЦИИ ----------
        function renderLocations() {
            const current = locationSelect.value;
            locationSelect.innerHTML = '';
            savedLocations.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc;
                opt.textContent = loc;
                locationSelect.appendChild(opt);
            });
            // Восстанавливаем выбор, если он ещё существует
            if (savedLocations.includes(current)) {
                locationSelect.value = current;
            }
        }

        function saveLocations() {
            localStorage.setItem('patrol_locations', JSON.stringify(savedLocations));
        }

        renderLocations();

        addLocationBtn.onclick = () => {
            const name = newLocationInput.value.trim();
            if (!name) { newLocationInput.focus(); return; }
            if (savedLocations.includes(name)) {
                alert('Такая локация уже есть в списке!');
                return;
            }
            savedLocations.push(name);
            saveLocations();
            renderLocations();
            locationSelect.value = name;
            newLocationInput.value = '';
        };

        // Добавление по Enter
        newLocationInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addLocationBtn.click();
            }
        });

        delLocationBtn.onclick = () => {
            if (savedLocations.length <= 1) {
                alert('Должна остаться хотя бы одна локация.');
                return;
            }
            const current = locationSelect.value;
            if (!confirm(`Удалить локацию "${current}"?`)) return;
            savedLocations = savedLocations.filter(l => l !== current);
            saveLocations();
            renderLocations();
        };

        // ---------- НАСТРОЙКИ БАЛЛОВ ----------
        scoreResetBtn.onclick = () => {
            scoreThinInput.value = 1;
            scoreNormalInput.value = 2;
            scoreFatInput.value = 4;
        };

        function getWeights() {
            const parseNum = (el, def) => {
                const v = parseInt(el.value, 10);
                return Number.isFinite(v) && v >= 0 ? v : def;
            };
            return {
                thin: parseNum(scoreThinInput, 1),
                normal: parseNum(scoreNormalInput, 2),
                fat: parseNum(scoreFatInput, 4)
            };
        }

        function createMemberRow(nameValue = '', historyValue = '') {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.style.marginBottom = '5px';
            row.style.alignItems = 'flex-start';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.placeholder = 'Имя';
            nameInput.value = nameValue;
            nameInput.style.flex = '0 0 150px';
            nameInput.style.padding = '4px';
            nameInput.style.fontFamily = FONT_FAMILY;

            const historyInput = document.createElement('textarea');
            historyInput.placeholder = 'Поднял(а) с земли хилого/обычного/упитанного зайца';
            historyInput.value = historyValue;
            historyInput.style.flex = '1';
            historyInput.style.padding = '4px';
            historyInput.style.fontFamily = FONT_FAMILY;
            historyInput.style.height = '40px';
            historyInput.style.resize = 'vertical';

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✕';
            removeBtn.style.background = '#2E1A02';
            removeBtn.style.color = 'white';
            removeBtn.style.border = 'none';
            removeBtn.style.borderRadius = '3px';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.padding = '2px 6px';
            removeBtn.style.fontSize = '12px';
            removeBtn.style.alignSelf = 'center';
            removeBtn.title = 'Удалить участника';

            row.appendChild(nameInput);
            row.appendChild(historyInput);
            row.appendChild(removeBtn);

            removeBtn.onclick = () => {
                if (container.children.length > 1) {
                    row.remove();
                } else {
                    nameInput.value = '';
                    historyInput.value = '';
                }
            };

            return row;
        }

        for (let i = 0; i < 3; i++) {
            container.appendChild(createMemberRow());
        }

        addBtn.onclick = () => {
            container.appendChild(createMemberRow());
        };

        div.querySelector('#patrol_submit').onclick = async (e) => {
            e.preventDefault();
            warningDiv.style.display = 'none';

            const time = timeSelect.value;
            const dateISO = dateInput.value;
            if (!dateISO) { showWarning('Укажите дату'); return; }
            const date = formatDateForReport(dateISO);

            const weights = getWeights();

            const rows = container.querySelectorAll('div');
            const members = [];
            let hasError = false;

            for (const row of rows) {
                const nameInput = row.querySelector('input[placeholder="Имя"]');
                const historyInput = row.querySelector('textarea');
                if (!nameInput || !historyInput) continue;

                const name = nameInput.value.trim();
                const history = historyInput.value.trim();

                if (!name && !history) continue;

                if (!name) {
                    showWarning('Имя не может быть пустым.');
                    hasError = true;
                    break;
                }

                const formatted = await formatNameWithId(name);
                if (formatted === null) {
                    showWarning(`Игрок "${name}" не найден в системе! Проверьте имя.`);
                    hasError = true;
                    break;
                }

                const score = calculateScore(history, weights);
                members.push({ formatted, score });
            }

            if (hasError) return;

            if (members.length === 0) {
                showWarning('Добавьте хотя бы одного участника.');
                return;
            }

            // Носильщики
            let carriersFormatted = '';
            const carriersRaw = carriersInput.value.trim();
            if (carriersRaw) {
                const carrierNames = carriersRaw.split(',').map(s => s.trim()).filter(s => s);
                const formattedCarriers = [];
                for (const c of carrierNames) {
                    const formatted = await formatNameWithId(c);
                    if (formatted === null) {
                        showWarning(`Носильщик "${c}" не найден в системе!`);
                        return;
                    }
                    formattedCarriers.push(formatted);
                }
                carriersFormatted = `[b]Носильщики:[/b] ${formattedCarriers.join(', ')}.`;
            } else {
                carriersFormatted = `[b]Носильщики:[/b] —.`;
            }

            const location = locationSelect.value;
            const includeLocation = includeLocationCheck.checked;
            const includeInfo = includeInfoCheck.checked;

            // Информационные (с ID)
            let infoFormatted = '';
            if (includeInfo) {
                const infoRaw = infoInput.value.trim();
                if (infoRaw) {
                    const infoNames = infoRaw.split(',').map(s => s.trim()).filter(s => s);
                    const formattedInfo = [];
                    for (const n of infoNames) {
                        const formatted = await formatNameWithId(n);
                        if (formatted === null) {
                            showWarning(`Игрок "${n}" не найден в системе!`);
                            return;
                        }
                        formattedInfo.push(formatted);
                    }
                    infoFormatted = `[b]Информационные:[/b] ${formattedInfo.join(', ')}.`;
                } else {
                    infoFormatted = `[b]Информационные:[/b] —.`;
                }
            }

            const membersStr = members.map(m => `${m.formatted} — ${m.score}`).join(', ');

            const reportLines = [];
            reportLines.push(`[b]${time}, ${date}.[/b]`);
            reportLines.push(`[b]Ходили:[/b] ${membersStr}.`);
            if (includeLocation) {
                reportLines.push(`[b]Локация:[/b] ${location}.`);
            }
            reportLines.push(carriersFormatted);
            if (includeInfo) {
                reportLines.push(infoFormatted);
            }

            const report = reportLines.join('\n');
            insertReport(report);
        };

        function showWarning(msg) {
            warningDiv.textContent = msg;
            warningDiv.style.display = 'block';
        }

        return div;
    }

    // ---------- ВКЛАДКА 2: Отмена охотничьего патруля ----------
    function createPatrolCancelTab() {
        const div = document.createElement('div');
        div.style.display = 'none';
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgMain;
        div.style.border = '1px solid ' + COLORS.border;
        div.style.fontFamily = FONT_FAMILY;

        const times = ['Дневной', 'Послеполуденный', 'Вечерний'];

        div.innerHTML = `
            <div style="background-color: ${COLORS.bgTabActive}; padding: 4px; margin-bottom: 10px; font-weight: bold; text-align: center; color: ${COLORS.textDark};">Отмена охотничьего патруля</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; font-size: 13px;">
                <span>Время:</span>
                <select id="patrol_cancel_time" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                    ${times.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <span>Дата:</span>
                <input type="date" id="patrol_cancel_date" value="${getTodayISO()}" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
            </div>
            <div id="patrol_cancel_warning" style="color: ${COLORS.warning}; font-size: 12px; margin-top: 8px; text-align: center; display: none;"></div>
            <button id="patrol_cancel_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgTabActive}; color:${COLORS.textDark}; border:none; cursor:pointer; font-family:${FONT_FAMILY}; font-weight:bold;">Сформировать отчёт</button>
        `;

        const warningDiv = div.querySelector('#patrol_cancel_warning');
        const timeSelect = div.querySelector('#patrol_cancel_time');
        const dateInput = div.querySelector('#patrol_cancel_date');

        div.querySelector('#patrol_cancel_submit').onclick = (e) => {
            e.preventDefault();
            warningDiv.style.display = 'none';

            const time = timeSelect.value;
            const dateISO = dateInput.value;
            if (!dateISO) {
                warningDiv.textContent = 'Укажите дату';
                warningDiv.style.display = 'block';
                return;
            }
            const date = formatDateForReport(dateISO);
            const report = `[b]${time}, ${date}.[/b]\n[b]Отмена.[/b]`;
            insertReport(report);
        };

        return div;
    }

    // ---------- ВКЛАДКА 3: Отпись охотничьего состязания ----------
    function createContestReportTab() {
        const div = document.createElement('div');
        div.style.display = 'none';
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgMain;
        div.style.border = '1px solid ' + COLORS.border;
        div.style.fontFamily = FONT_FAMILY;

        const currentDate = getTodayISO();
        const types = ['командное', 'одиночное', 'делегационное'];

        div.innerHTML = `
            <div style="background-color: ${COLORS.bgTabActive}; padding: 4px; margin-bottom: 10px; font-weight: bold; text-align: center; color: ${COLORS.textDark};">Отпись охотничьего состязания</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; font-size: 13px;">
                <span>Вид:</span>
                <select id="contest_type" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                    ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <span>Дата:</span>
                <input type="date" id="contest_date" value="${currentDate}" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
            </div>
            <div style="margin-top: 10px;">
                <div style="font-weight: bold; font-size: 13px; margin-bottom: 5px;">Победители (максимум 2, для делегационного — 3):</div>
                <div id="contest_winners_container"></div>
                <button id="contest_add_winner" style="margin-top: 5px; padding: 4px 10px; background: ${COLORS.bgTabActive}; border: none; cursor: pointer; font-family: ${FONT_FAMILY}; font-weight: bold;">✚ Добавить победителя</button>
            </div>
            <div style="margin-top: 10px;">
                <div style="font-weight: bold; font-size: 13px; margin-bottom: 5px;">Участники (имена через запятую):</div>
                <input type="text" id="contest_participants" placeholder="Имя1, Имя2, Имя3" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
            </div>
            <div style="margin-top: 10px;">
                <div style="font-weight: bold; font-size: 13px; margin-bottom: 5px;">Носильщики:</div>
                <input type="text" id="contest_carriers" placeholder="Имя1, Имя2 (опционально)" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
            </div>
            <div id="contest_info_block" style="margin-top: 10px; display: none;">
                <div style="font-weight: bold; font-size: 13px; margin-bottom: 5px;">Инофракционные:</div>
                <input type="text" id="contest_info" placeholder="Имя1, Имя2 (опционально)" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
            </div>
            <div id="contest_warning" style="color: ${COLORS.warning}; font-size: 12px; margin-top: 8px; text-align: center; display: none;"></div>
            <button id="contest_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgTabActive}; color:${COLORS.textDark}; border:none; cursor:pointer; font-family:${FONT_FAMILY}; font-weight:bold;">Сформировать отчёт</button>
        `;

        const winnersContainer = div.querySelector('#contest_winners_container');
        const addWinnerBtn = div.querySelector('#contest_add_winner');
        const warningDiv = div.querySelector('#contest_warning');
        const typeSelect = div.querySelector('#contest_type');
        const dateInput = div.querySelector('#contest_date');
        const participantsInput = div.querySelector('#contest_participants');
        const carriersInput = div.querySelector('#contest_carriers');
        const infoInput = div.querySelector('#contest_info');
        const infoBlock = div.querySelector('#contest_info_block');

        function getMaxWinners() {
            return typeSelect.value === 'делегационное' ? 3 : 2;
        }

        function createWinnerRow(nameValue = '', rewardValue = 'медаль', infoChecked = false) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.style.marginBottom = '5px';
            row.style.alignItems = 'center';
            row.style.flexWrap = 'wrap';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.placeholder = 'Имя победителя';
            nameInput.value = nameValue;
            nameInput.style.flex = '1';
            nameInput.style.minWidth = '120px';
            nameInput.style.padding = '4px';
            nameInput.style.fontFamily = FONT_FAMILY;

            const rewardGroup = document.createElement('div');
            rewardGroup.style.display = 'flex';
            rewardGroup.style.gap = '8px';
            rewardGroup.style.alignItems = 'center';
            rewardGroup.style.fontSize = '14px';

            const medalRadio = document.createElement('input');
            medalRadio.type = 'radio';
            medalRadio.name = `reward_${Date.now()}_${Math.random()}`;
            medalRadio.value = 'медаль';
            medalRadio.checked = (rewardValue === 'медаль');

            const medalLabel = document.createElement('label');
            medalLabel.textContent = 'медаль';
            medalLabel.style.marginRight = '4px';

            const pointsRadio = document.createElement('input');
            pointsRadio.type = 'radio';
            pointsRadio.name = medalRadio.name;
            pointsRadio.value = 'баллы';
            pointsRadio.checked = (rewardValue === 'баллы');

            const pointsLabel = document.createElement('label');
            pointsLabel.textContent = 'баллы';

            rewardGroup.appendChild(medalRadio);
            rewardGroup.appendChild(medalLabel);
            rewardGroup.appendChild(pointsRadio);
            rewardGroup.appendChild(pointsLabel);

            const infoLabel = document.createElement('label');
            infoLabel.style.display = 'none';
            infoLabel.style.alignItems = 'center';
            infoLabel.style.gap = '4px';
            infoLabel.style.fontSize = '14px';
            infoLabel.style.whiteSpace = 'nowrap';

            const infoCheckbox = document.createElement('input');
            infoCheckbox.type = 'checkbox';
            infoCheckbox.checked = infoChecked;
            infoCheckbox.style.accentColor = '#2E1A02';

            infoLabel.appendChild(infoCheckbox);
            infoLabel.appendChild(document.createTextNode('инофракционный'));

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✕';
            removeBtn.style.background = '#2E1A02';
            removeBtn.style.color = 'white';
            removeBtn.style.border = 'none';
            removeBtn.style.borderRadius = '3px';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.padding = '2px 6px';
            removeBtn.style.fontSize = '12px';
            removeBtn.title = 'Удалить строку';

            row.appendChild(nameInput);
            row.appendChild(rewardGroup);
            row.appendChild(infoLabel);
            row.appendChild(removeBtn);

            row._infoLabel = infoLabel;
            row._infoCheckbox = infoCheckbox;

            removeBtn.onclick = () => {
                if (winnersContainer.children.length > 1) {
                    row.remove();
                } else {
                    nameInput.value = '';
                    medalRadio.checked = true;
                    infoCheckbox.checked = false;
                }
            };

            return row;
        }

        // 
        function updateDelegationVisibility() {
            const isDelegation = typeSelect.value === 'делегационное';

            // Чекбоксы "инофракционный" у победителей
            const rows = winnersContainer.querySelectorAll('div');
            rows.forEach(row => {
                if (row._infoLabel) {
                    row._infoLabel.style.display = isDelegation ? 'flex' : 'none';
                }
            });

            // Блок Инофракционные
            infoBlock.style.display = isDelegation ? 'block' : 'none';
        }

        winnersContainer.appendChild(createWinnerRow());

        addWinnerBtn.onclick = () => {
            const maxWinners = getMaxWinners();
            if (winnersContainer.children.length >= maxWinners) {
                const isDelegation = typeSelect.value === 'делегационное';
                showWarning(isDelegation
                    ? 'Максимум может быть 3 победителя.'
                    : 'Максимум может быть 2 победителя.');
                return;
            }
            const newRow = createWinnerRow();
            winnersContainer.appendChild(newRow);
            updateDelegationVisibility();
        };

        typeSelect.addEventListener('change', updateDelegationVisibility);
        updateDelegationVisibility();

        div.querySelector('#contest_submit').onclick = async (e) => {
            e.preventDefault();
            warningDiv.style.display = 'none';

            const type = typeSelect.value;
            const dateISO = dateInput.value;
            if (!dateISO) { showWarning('Укажите дату'); return; }
            const date = formatDateForReport(dateISO);

            const isDelegation = type === 'делегационное';

            const winnerRows = winnersContainer.querySelectorAll('div');
            const winners = [];
            let hasError = false;

            for (const row of winnerRows) {
                const nameInput = row.querySelector('input[placeholder="Имя победителя"]');
                const rewardRadios = row.querySelectorAll('input[type="radio"]');
                const infoCheckbox = row.querySelector('input[type="checkbox"]');
                if (!nameInput || rewardRadios.length === 0 || !infoCheckbox) continue;

                const name = nameInput.value.trim();
                if (!name) continue;

                let reward = 'медаль';
                for (const radio of rewardRadios) {
                    if (radio.checked) {
                        reward = radio.value;
                        break;
                    }
                }

                const formatted = await formatNameWithId(name);
                if (formatted === null) {
                    showWarning(`Игрок "${name}" не найден.`);
                    hasError = true;
                    break;
                }

                const isInfo = isDelegation && infoCheckbox.checked;
                winners.push({ formatted, reward, isInfo });
            }

            if (hasError) return;

            if (winners.length === 0) {
                showWarning('Укажите хотя бы одного победителя.');
                return;
            }

            const formattedWinners = winners.map(w => {
                if (w.isInfo) {
                    return `${w.formatted} (баллы в союзную медаль)`;
                } else {
                    return `${w.formatted} (${w.reward})`;
                }
            });

            const participantsRaw = participantsInput.value.trim();
            if (!participantsRaw) { showWarning('Укажите участников.'); return; }
            const participantNames = participantsRaw.split(',').map(s => s.trim()).filter(s => s);
            if (participantNames.length === 0) { showWarning('Введите хотя бы одного участника.'); return; }
            const formattedParticipants = [];
            for (const p of participantNames) {
                const formatted = await formatNameWithId(p);
                if (formatted === null) {
                    showWarning(`Игрок "${p}" не найден!`);
                    return;
                }
                formattedParticipants.push(formatted);
            }

            // Носильщики
            let carriersFormatted = '';
            const carriersRaw = carriersInput.value.trim();
            if (carriersRaw) {
                const carrierNames = carriersRaw.split(',').map(s => s.trim()).filter(s => s);
                const formattedCarriers = [];
                for (const c of carrierNames) {
                    const formatted = await formatNameWithId(c);
                    if (formatted === null) {
                        showWarning(`Игрок "${c}" не найден!`);
                        return;
                    }
                    formattedCarriers.push(formatted);
                }
                carriersFormatted = `\n[b]Носильщики:[/b] ${formattedCarriers.join(', ')}.`;
            } else {
                carriersFormatted = `\n[b]Носильщики:[/b] —.`;
            }

            // Инофракционные
            let infoFormatted = '';
            if (isDelegation) {
                const infoRaw = infoInput.value.trim();
                if (infoRaw) {
                    const infoNames = infoRaw.split(',').map(s => s.trim()).filter(s => s);
                    const formattedInfo = [];
                    for (const n of infoNames) {
                        const formatted = await formatNameWithId(n);
                        if (formatted === null) {
                            showWarning(`Игрок "${n}" не найден!`);
                            return;
                        }
                        formattedInfo.push(formatted);
                    }
                    infoFormatted = `\n[b]Инофракционные:[/b] ${formattedInfo.join(', ')}.`;
                } else {
                    infoFormatted = `\n[b]Инофракционные:[/b] —.`;
                }
            }

            let report = `[b]Вид охотничьего состязания: ${type}, ${date}.[/b]\n`;
            report += `[b]Победители:[/b] ${formattedWinners.join(', ')}\n`;
            report += `[b]Участники:[/b] ${formattedParticipants.join(', ')}.`;
            report += carriersFormatted;
            report += infoFormatted;

            insertReport(report);
        };

        function showWarning(msg) {
            warningDiv.textContent = msg;
            warningDiv.style.display = 'block';
        }

        return div;
    }
        // ---------- ВКЛАДКА 4: Отмена охотничьего состязания ----------
    function createContestCancelTab() {
        const div = document.createElement('div');
        div.style.display = 'none';
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgMain;
        div.style.border = '1px solid ' + COLORS.border;
        div.style.fontFamily = FONT_FAMILY;

        const types = ['командное', 'одиночное', 'делегационное'];

        div.innerHTML = `
            <div style="background-color: ${COLORS.bgTabActive}; padding: 4px; margin-bottom: 10px; font-weight: bold; text-align: center; color: ${COLORS.textDark};">Отмена охотничьего состязания</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; font-size: 13px;">
                <span>Вид:</span>
                <select id="contest_cancel_type" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                    ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <span>Дата:</span>
                <input type="date" id="contest_cancel_date" value="${getTodayISO()}" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
            </div>
            <div id="contest_cancel_warning" style="color: ${COLORS.warning}; font-size: 12px; margin-top: 8px; text-align: center; display: none;"></div>
            <button id="contest_cancel_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgTabActive}; color:${COLORS.textDark}; border:none; cursor:pointer; font-family:${FONT_FAMILY}; font-weight:bold;">Сформировать отчёт</button>
        `;

        const warningDiv = div.querySelector('#contest_cancel_warning');
        const typeSelect = div.querySelector('#contest_cancel_type');
        const dateInput = div.querySelector('#contest_cancel_date');

        div.querySelector('#contest_cancel_submit').onclick = (e) => {
            e.preventDefault();
            warningDiv.style.display = 'none';

            const type = typeSelect.value;
            const dateISO = dateInput.value;
            if (!dateISO) {
                warningDiv.textContent = 'Укажите дату.';
                warningDiv.style.display = 'block';
                return;
            }
            const date = formatDateForReport(dateISO);
            const report = `[b]Вид охотничьего состязания: ${type}, ${date}.[/b]\n[b]Отмена.[/b]`;
            insertReport(report);
        };

        return div;
    }

    // ---------- ГЛАВНАЯ ПАНЕЛЬ ----------
    function createMainPanel() {
        const panel = document.createElement('div');
        panel.id = 'hunt-helper-panel';
        panel.style.cssText = `border: 1px solid ${COLORS.border}; margin: 20px 0 10px 0; padding: 10px; font-family: ${FONT_FAMILY}; color: ${COLORS.textDark}; background-color: ${COLORS.bgMain};`;

        panel.innerHTML = `
            <div class="panel-header" style="background-color: ${COLORS.bgTabActive}; padding: 8px 12px; margin: -10px -10px 10px -10px; font-size: 18px; font-weight: bold; text-align: center; color: ${COLORS.textDark};">Помощник охоты</div>
            <div class="tab-bar" style="display: flex; border-bottom: 1px solid ${COLORS.border}; margin-bottom: 10px;">
                <div class="hunt-tab-btn active" data-tab="patrol" style="padding: 6px 12px; background: ${COLORS.bgTabActive}; color: ${COLORS.textDark}; cursor: pointer; margin-right: 4px;">Отпись охоты</div>
                <div class="hunt-tab-btn" data-tab="patrol_cancel" style="padding: 6px 12px; background: ${COLORS.bgTabInactive}; color: #D1AD88; cursor: pointer; margin-right: 4px;">Отмена охоты</div>
                <div class="hunt-tab-btn" data-tab="contest" style="padding: 6px 12px; background: ${COLORS.bgTabInactive}; color: #D1AD88; cursor: pointer; margin-right: 4px;">Отпись состязания</div>
                <div class="hunt-tab-btn" data-tab="contest_cancel" style="padding: 6px 12px; background: ${COLORS.bgTabInactive}; color: #D1AD88; cursor: pointer;">Отмена состязания</div>
            </div>
            <div class="hunt-tab-content"></div>
        `;

        const content = panel.querySelector('.hunt-tab-content');
        const patrolTab = createPatrolReportTab();
        const patrolCancelTab = createPatrolCancelTab();
        const contestTab = createContestReportTab();
        const contestCancelTab = createContestCancelTab();

        const tabs = {
            patrol: patrolTab,
            patrol_cancel: patrolCancelTab,
            contest: contestTab,
            contest_cancel: contestCancelTab
        };

        content.appendChild(patrolTab);
        content.appendChild(patrolCancelTab);
        content.appendChild(contestTab);
        content.appendChild(contestCancelTab);

        const tabBtns = panel.querySelectorAll('.hunt-tab-btn');
        tabBtns.forEach(btn => {
            btn.onclick = () => {
                tabBtns.forEach(b => {
                    b.style.background = COLORS.bgTabInactive;
                    b.style.color = '#D1AD88';
                });
                btn.style.background = COLORS.bgTabActive;
                btn.style.color = COLORS.textDark;

                Object.values(tabs).forEach(tab => tab.style.display = 'none');
                const tabId = btn.dataset.tab;
                if (tabs[tabId]) tabs[tabId].style.display = 'block';
            };
        });

        patrolTab.style.display = 'block';
        patrolCancelTab.style.display = 'none';
        contestTab.style.display = 'none';
        contestCancelTab.style.display = 'none';

        return panel;
    }

    // ---------- ВСТАВКА ПАНЕЛИ ----------
    function insertPanel() {
        addBackgroundStyle();
        const panel = createMainPanel();
        const sendButton = document.querySelector('#send_comment');
        if (sendButton) {
            sendButton.parentNode.insertBefore(panel, sendButton.nextSibling);
            console.log('✅ Панель охоты вставлена после #send_comment');
        } else {
            const form = document.querySelector('form');
            if (form) {
                form.parentNode.insertBefore(panel, form.nextSibling);
                console.log('✅ Панель охоты вставлена после формы');
            } else {
                document.body.appendChild(panel);
                console.log('✅ Панель охоты вставлена в конец body');
            }
        }
    }

    // ---------- ЗАПУСК ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertPanel);
    } else {
        insertPanel();
    }

})();
