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
                background-image: url('https://raw.githubusercontent.com/strushechka05-gif/veter/refs/heads/main/ohotfon.png');
                background-repeat: repeat;
                background-position: top left;
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

    // Подсчёт баллов по истории
function calculateScore(historyText) {
    if (!historyText) return 0;
    const text = historyText;
    // Разбиваем на предложения по . ! ? и другим разделителям
    const sentences = text.split(/[.!?]\s*/).filter(s => s.trim().length > 0);
    let totalScore = 0;
    for (const sentence of sentences) {
        if (/(поднял[а]?)/i.test(sentence)) {
            // Ищем прилагательные в этом предложении
            const regex = /(упитанн\S*|обычн\S*|хил\S*)\s+(\S+)/gi;
            let match;
            while ((match = regex.exec(sentence)) !== null) {
                const adj = match[1];
                if (adj.includes('упитанн')) totalScore += 4;
                else if (adj.includes('обычн')) totalScore += 2;
                else if (adj.includes('хил')) totalScore += 1;
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

    // ---------- ВКЛАДКА 1: Отпись охотничьего патруля (с историей) ----------
    function createPatrolReportTab() {
        const div = document.createElement('div');
        div.style.display = 'block';
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgMain;
        div.style.border = '1px solid ' + COLORS.border;
        div.style.fontFamily = FONT_FAMILY;

        const times = ['Дневной', 'Послеполуденный', 'Вечерний'];

        div.innerHTML = `
            <div style="background-color: ${COLORS.bgTabActive}; padding: 4px; margin-bottom: 10px; font-weight: bold; text-align: center; color: ${COLORS.textDark};">Отпись охотничьего патруля</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; font-size: 13px;">
                <span>Время:</span>
                <select id="patrol_time" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                    ${times.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <span>Дата:</span>
                <input type="date" id="patrol_date" value="${getTodayISO()}" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                <span>Локация:</span>
                <select id="patrol_location" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                    <option value="Шумный поток">Шумный поток</option>
                    <option value="Чаща леса">Чаща леса</option>
                </select>
                <span>Носильщики:</span>
                <input type="text" id="patrol_carriers" placeholder="Имя1, Имя2 (опционально)" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
            </div>
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
        const carriersInput = div.querySelector('#patrol_carriers');

        // Функция создания строки участника (имя + история)
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

        // Инициализация: три пустые строки
        for (let i = 0; i < 3; i++) {
            container.appendChild(createMemberRow());
        }

        addBtn.onclick = () => {
            container.appendChild(createMemberRow());
        };

        // Обработчик кнопки "Сформировать отчёт"
        div.querySelector('#patrol_submit').onclick = async (e) => {
            e.preventDefault();
            warningDiv.style.display = 'none';

            const time = timeSelect.value;
            const dateISO = dateInput.value;
            if (!dateISO) { showWarning('Укажите дату'); return; }
            const date = formatDateForReport(dateISO);

            const rows = container.querySelectorAll('div');
            const members = [];
            let hasError = false;

            for (const row of rows) {
                const nameInput = row.querySelector('input[placeholder="Имя"]');
                const historyInput = row.querySelector('textarea');
                if (!nameInput || !historyInput) continue;

                const name = nameInput.value.trim();
                const history = historyInput.value.trim();

                // Пропускаем строки, где оба поля пустые
                if (!name && !history) continue;

                if (!name) {
                    showWarning('Имя не может быть пустым.');
                    hasError = true;
                    break;
                }

                // Проверяем имя через API
                const formatted = await formatNameWithId(name);
                if (formatted === null) {
                    showWarning(`Игрок "${name}" не найден в системе! Проверьте имя.`);
                    hasError = true;
                    break;
                }

                // Подсчитываем баллы по истории
                const score = calculateScore(history);

                members.push({ formatted, score });
            }

            if (hasError) return;

            if (members.length === 0) {
                showWarning('Добавьте хотя бы одного участника.');
                return;
            }

            // Проверяем носильщиков
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
    carriersFormatted = `\n[b]Носильщики:[/b] ${formattedCarriers.join(', ')}`;
} else {
    carriersFormatted = `\n[b]Носильщики:[/b] —.`;
}

            const location = locationSelect.value;

            const membersStr = members.map(m => `${m.formatted} — ${m.score}`).join(', ');
let report = `[b]${time}, ${date}.[/b]\n`;
report += `[b]Ходили:[/b] ${membersStr}\n`;
report += `[b]Локация:[/b] ${location}`;
report += carriersFormatted;

            insertReport(report);
        };

        function showWarning(msg) {
            warningDiv.textContent = msg;
            warningDiv.style.display = 'block';
        }

        return div;
    }

    // ---------- ВКЛАДКА 2: Отмена охотничьего патруля (без изменений) ----------
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

    // ---------- ВКЛАДКА 3: Отпись охотничьего состязания (без изменений) ----------
    function createContestReportTab() {
        const div = document.createElement('div');
        div.style.display = 'none';
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgMain;
        div.style.border = '1px solid ' + COLORS.border;
        div.style.fontFamily = FONT_FAMILY;

        const types = ['Командное', 'Одиночное'];
        const rewards = ['медаль', 'баллы'];

        div.innerHTML = `
            <div style="background-color: ${COLORS.bgTabActive}; padding: 4px; margin-bottom: 10px; font-weight: bold; text-align: center; color: ${COLORS.textDark};">Отпись охотничьего состязания</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; font-size: 13px;">
                <span>Вид:</span>
                <select id="contest_type" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                    ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <span>Дата:</span>
                <input type="date" id="contest_date" value="${getTodayISO()}" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                <span>Победители (имена через запятую):</span>
                <input type="text" id="contest_winners" placeholder="Имя1, Имя2" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                <span>Награда:</span>
                <select id="contest_reward" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                    ${rewards.map(r => `<option value="${r}">${r}</option>`).join('')}
                </select>
                <span>Участники (имена через запятую):</span>
                <input type="text" id="contest_participants" placeholder="Имя1, Имя2, Имя3" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
                <span>Носильщики:</span>
                <input type="text" id="contest_carriers" placeholder="Имя1, Имя2 (опционально)" style="width: 100%; padding: 4px; font-family: ${FONT_FAMILY};">
            </div>
            <div id="contest_warning" style="color: ${COLORS.warning}; font-size: 12px; margin-top: 8px; text-align: center; display: none;"></div>
            <button id="contest_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgTabActive}; color:${COLORS.textDark}; border:none; cursor:pointer; font-family:${FONT_FAMILY}; font-weight:bold;">Сформировать отчёт</button>
        `;

        const warningDiv = div.querySelector('#contest_warning');
        const typeSelect = div.querySelector('#contest_type');
        const dateInput = div.querySelector('#contest_date');
        const winnersInput = div.querySelector('#contest_winners');
        const rewardSelect = div.querySelector('#contest_reward');
        const participantsInput = div.querySelector('#contest_participants');
        const carriersInput = div.querySelector('#contest_carriers');

        div.querySelector('#contest_submit').onclick = async (e) => {
            e.preventDefault();
            warningDiv.style.display = 'none';

            const type = typeSelect.value;
            const dateISO = dateInput.value;
            if (!dateISO) { showWarning('Укажите дату'); return; }
            const date = formatDateForReport(dateISO);

            const winnersRaw = winnersInput.value.trim();
            if (!winnersRaw) { showWarning('Укажите победителей'); return; }
            const winnerNames = winnersRaw.split(',').map(s => s.trim()).filter(s => s);
            if (winnerNames.length === 0) { showWarning('Введите хотя бы одного победителя'); return; }

            const reward = rewardSelect.value;
            const formattedWinners = [];
            for (const w of winnerNames) {
                const formatted = await formatNameWithId(w);
                if (formatted === null) {
                    showWarning(`Победитель "${w}" не найден в системе!`);
                    return;
                }
                formattedWinners.push(`${formatted} (${reward})`);
            }

            const participantsRaw = participantsInput.value.trim();
            if (!participantsRaw) { showWarning('Укажите участников'); return; }
            const participantNames = participantsRaw.split(',').map(s => s.trim()).filter(s => s);
            if (participantNames.length === 0) { showWarning('Введите хотя бы одного участника'); return; }
            const formattedParticipants = [];
            for (const p of participantNames) {
                const formatted = await formatNameWithId(p);
                if (formatted === null) {
                    showWarning(`Участник "${p}" не найден в системе!`);
                    return;
                }
                formattedParticipants.push(formatted);
            }

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
    carriersFormatted = `\n[b]Носильщики:[/b] ${formattedCarriers.join(', ')}`;
} else {
    carriersFormatted = `\n[b]Носильщики:[/b] —.`;
}

            let report = `[b]${type}, ${date}.[/b]\n`;
            report += `[b]Победители:[/b] ${formattedWinners.join(', ')}\n`;
            report += `[b]Участники:[/b] ${formattedParticipants.join(', ')}`;
            if (carriersFormatted) report += carriersFormatted;

            insertReport(report);
        };

        function showWarning(msg) {
            warningDiv.textContent = msg;
            warningDiv.style.display = 'block';
        }

        return div;
    }

    // ---------- ВКЛАДКА 4: Отмена охотничьего состязания (без изменений) ----------
    function createContestCancelTab() {
        const div = document.createElement('div');
        div.style.display = 'none';
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgMain;
        div.style.border = '1px solid ' + COLORS.border;
        div.style.fontFamily = FONT_FAMILY;

        const types = ['Командное', 'Одиночное'];

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
                warningDiv.textContent = 'Укажите дату';
                warningDiv.style.display = 'block';
                return;
            }
            const date = formatDateForReport(dateISO);
            const report = `[b]${type}, ${date}.[/b]\n[b]Отмена.[/b]`;
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
                <div class="hunt-tab-btn active" data-tab="patrol" style="padding: 6px 12px; background: ${COLORS.bgTabActive}; color: ${COLORS.textDark}; cursor: pointer; margin-right: 4px;">Отпись патруля</div>
                <div class="hunt-tab-btn" data-tab="patrol_cancel" style="padding: 6px 12px; background: ${COLORS.bgTabInactive}; color: #D1AD88; cursor: pointer; margin-right: 4px;">Отмена патруля</div>
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
        addBackgroundStyle(); // добавляем фон
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
