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
                <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-scroll-text-icon lucide-scroll-text"><path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/></svg>
                <span>System Logs</span></h2>
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
            <div class="flex items-center gap-2">
                <button id="reloadLogBtn" class="px-3 py-2 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-800 flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
                    </svg>
                    <span>Reload</span>
                </button>
                <button id="downloadLogBtn" class="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-800 flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span>Download</span>
                </button>
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
                    Showing last ${data.line_count} of ${data.total_lines} lines
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