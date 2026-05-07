// static/js/logs.js
import { getElement, escapeHtml } from './ui.js';
import * as api from './api.js';

let availableLogs = [];
let currentLogIndex = 0;


export function createLogsSection() {
    // Ищем футер (копирайт)
    const footer = document.querySelector('.text-center.text-gray-400.text-sm');
    if (!footer) {
        // fallback – просто добавим в конец body
        document.body.insertAdjacentHTML('beforeend', getLogsHtml());
        return;
    }

    // Вставляем блок логов перед футером
    const logsHtml = getLogsHtml();
    footer.insertAdjacentHTML('beforebegin', logsHtml);

    // Привязываем обработчик клика на заголовок
    const header = document.getElementById('logsHeader');
    if (header) header.addEventListener('click', () => toggleLogsSection());
}


function getLogsHtml() {
    return `
        <div class="mt-8 bg-white rounded-lg shadow-md">
            <div class="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50" id="logsHeader">
                <h2 class="text-xl font-bold text-gray-800">📋 System Logs</h2>
                <button class="text-gray-600 hover:text-gray-800">
                    <span id="logsToggleIcon">▼</span>
                </button>
            </div>
            <div id="logsContainer" class="hidden p-4 border-t border-gray-200">
                <div id="logTabs" class="mb-4"></div>
                <div id="logContent" class="mt-4"></div>
            </div>
        </div>
    `;
}


export async function toggleLogsSection() {
    const container = getElement('logsContainer');
    const icon = getElement('logsToggleIcon');
    if (container && icon) {
        if (container.classList.contains('hidden')) {
            container.classList.remove('hidden');
            icon.textContent = '▲';
            await loadLogsList();
        } else {
            container.classList.add('hidden');
            icon.textContent = '▼';
        }
    }
}

async function loadLogsList() {
    try {
        const logs = await api.getLogsList();
        renderLogTabs(logs);
    } catch (error) {
        console.error('Error loading logs list:', error);
        const tabsContainer = getElement('logTabs');
        if (tabsContainer) tabsContainer.innerHTML = '<div class="text-red-500 p-4">Error loading logs</div>';
    }
}

function renderLogTabs(logs) {
    const tabsContainer = getElement('logTabs');
    const contentContainer = getElement('logContent');
    if (!tabsContainer || !contentContainer) return;

    if (logs.length === 0) {
        tabsContainer.innerHTML = '<div class="text-gray-500 p-4">No log files available</div>';
        contentContainer.innerHTML = '';
        return;
    }

    availableLogs = logs;
    tabsContainer.innerHTML = `
        <div class="flex flex-wrap border-b border-gray-200">
            ${logs.map((log, idx) => `
                <button class="log-tab px-4 py-2 text-sm font-medium focus:outline-none transition-colors duration-200 ${idx === 0 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}"
                        data-log-index="${idx}">
                    ${escapeHtml(log.name)} <span class="ml-1 text-xs text-gray-400">(${log.size_human})</span>
                </button>
            `).join('')}
            <div class="flex-1"></div>
            <div class="flex space-x-2">
                <button id="reloadLogBtn" class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">🔄 Reload</button>
                <button id="downloadLogBtn" class="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">💾 Download</button>
            </div>
        </div>
    `;

    document.querySelectorAll('.log-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.logIndex);
            switchLogTab(idx);
        });
    });
    document.getElementById('reloadLogBtn')?.addEventListener('click', () => reloadCurrentLog());
    document.getElementById('downloadLogBtn')?.addEventListener('click', () => downloadCurrentLog());

    if (logs.length) {
        currentLogIndex = 0;
        loadLogContent(logs[0].path);
    }
}

async function switchLogTab(index) {
    if (!availableLogs || index >= availableLogs.length) return;
    currentLogIndex = index;
    const log = availableLogs[index];

    document.querySelectorAll('.log-tab').forEach((tab, i) => {
        if (i === index) {
            tab.classList.add('border-b-2', 'border-blue-500', 'text-blue-600');
            tab.classList.remove('text-gray-500', 'hover:text-gray-700');
        } else {
            tab.classList.remove('border-b-2', 'border-blue-500', 'text-blue-600');
            tab.classList.add('text-gray-500', 'hover:text-gray-700');
        }
    });
    await loadLogContent(log.path);
}

async function loadLogContent(logPath) {
    const contentContainer = getElement('logContent');
    if (!contentContainer) return;
    contentContainer.innerHTML = '<div class="flex justify-center items-center h-64"><div class="text-gray-500">Loading logs...</div></div>';

    try {
        const data = await api.getLogContent(logPath, 100);
        if (data.error) {
            contentContainer.innerHTML = `<div class="text-red-500 p-4">Error: ${data.error}</div>`;
            return;
        }
        const logType = availableLogs[currentLogIndex]?.type || 'info';
        const formattedLines = formatLogLines(data.lines, logType);
        contentContainer.innerHTML = `
            <div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <div class="text-xs text-gray-400 mb-2 pb-2 border-b border-gray-700">
                    📄 Showing last ${data.line_count} of ${data.total_lines} lines
                </div>
                <pre class="font-mono text-xs leading-relaxed" style="white-space: pre-wrap; word-wrap: break-word;">${formattedLines}</pre>
            </div>
        `;
    } catch (error) {
        contentContainer.innerHTML = `<div class="text-red-500 p-4">Error loading log content: ${error.message}</div>`;
    }
}

function formatLogLines(logText, logType) {
    const lines = logText.split('\n');
    const formatted = [];
    for (let line of lines) {
        if (!line.trim()) { formatted.push(''); continue; }
        let escaped = escapeHtml(line);
        if (logType === 'error') {
            escaped = escaped
                .replace(/error/gi, '<span class="text-red-400">$&</span>')
                .replace(/fatal/gi, '<span class="text-red-600 font-bold">$&</span>')
                .replace(/warning/gi, '<span class="text-yellow-400">$&</span>');
        } else if (logType === 'access') {
            escaped = escaped
                .replace(/\b(200|201|204)\b/g, '<span class="text-green-400">$&</span>')
                .replace(/\b(301|302|304)\b/g, '<span class="text-blue-400">$&</span>')
                .replace(/\b(400|401|403|404|405)\b/g, '<span class="text-yellow-400">$&</span>')
                .replace(/\b(500|502|503|504)\b/g, '<span class="text-red-400">$&</span>');
        } else {
            escaped = escaped
                .replace(/ERROR/gi, '<span class="text-red-400">$&</span>')
                .replace(/WARNING/gi, '<span class="text-yellow-400">$&</span>')
                .replace(/INFO/gi, '<span class="text-blue-400">$&</span>')
                .replace(/DEBUG/gi, '<span class="text-gray-400">$&</span>');
        }
        escaped = escaped.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '<span class="text-cyan-400">$&</span>');
        escaped = escaped.replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/g, '<span class="text-purple-400">$&</span>');
        formatted.push(escaped);
    }
    return formatted.join('\n');
}

export async function reloadCurrentLog() {
    if (availableLogs && currentLogIndex !== undefined) {
        await loadLogContent(availableLogs[currentLogIndex].path);
    }
}

export function downloadCurrentLog() {
    if (availableLogs && currentLogIndex !== undefined) {
        api.downloadLog(availableLogs[currentLogIndex].path);
    }
}