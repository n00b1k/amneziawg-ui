// static/js/server.js
import { getElement, escapeHtml, showTempMessage } from './ui.js';
import * as api from './api.js';
import { loadServerClients } from './client.js';

// Колбэк для обновления клиентов (будет установлен из main.js)
let refreshClientsCallback = null;

export function setRefreshClientsCallback(callback) {
    refreshClientsCallback = callback;
}

// Загрузка и отображение списка серверов
export async function loadServers() {
    try {
        const servers = await api.getServers();
        window.amneziaServers = servers;
        renderServers(servers);
    } catch (error) {
        console.error('Error loading servers:', error);
        const serversList = getElement('serversList');
        if (serversList) serversList.innerHTML = '<div class="text-center py-8 text-red-500">Failed to load servers</div>';
    }
}

function renderServers(servers) {
    const serversList = getElement('serversList');
    if (!serversList) return;
    if (servers.length === 0) {
        serversList.innerHTML = '<div class="text-center py-8 text-gray-500">No servers created yet. Create your first server above.</div>';
        return;
    }

    serversList.innerHTML = servers.map(server => `
        <div class="bg-white rounded-lg shadow-md p-6" data-server-id="${server.id}">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <div class="flex items-center gap-2">
                        <h3 class="text-lg font-semibold server-name-display" data-server-id="${server.id}">${escapeHtml(server.name)}</h3>
                        <button class="edit-server-name-btn text-gray-500 hover:text-blue-500" data-server-id="${server.id}" title="Rename server">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                    </div>
                    <p class="text-sm text-gray-600">
                        ID: ${server.id} | Port: ${server.port} | Subnet: ${server.subnet}
                        ${server.obfuscation_enabled ? '| <svg class="inline-block w-3 h-3 align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock-icon lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Obfuscated' : ''}
                        ${server.public_ip ? `| <svg class="inline-block w-4 h-4 align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevrons-left-right-ellipsis-icon lucide-chevrons-left-right-ellipsis"><path d="M12 12h.01"/><path d="M16 12h.01"/><path d="m17 7 5 5-5 5"/><path d="m7 7-5 5 5 5"/><path d="M8 12h.01"/></svg> Public IP: ${server.public_ip}` : ''}
                    </p>
                    <div class="server-interface-traffic text-xs text-gray-500 mt-1"><svg class="inline-block w-4 h-4 align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-satellite-dish-icon lucide-satellite-dish"><path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/></svg> Loading interface traffic...</div>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="px-3 py-1 rounded-full text-sm ${server.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${server.status}</span>
                    <button onclick="window.amneziaApp.deleteServer('${server.id}')" class="bg-red-500 text-white px-3 py-1.5 rounded shadow hover:bg-red-800 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
            <div class="flex flex-row gap-2">
                <button onclick="window.amneziaApp.startServer('${server.id}')" class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-800 inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 w-4 h-4 mr-1">
                        <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
                    </svg>
                    Start
                </button>
                <button onclick="window.amneziaApp.stopServer('${server.id}')" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-800 inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 w-4 h-4 mr-1">
                        <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clip-rule="evenodd" />
                    </svg>
                    Stop
                </button>
                <button onclick="window.amneziaApp.addClient('${server.id}')" class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-800 inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-plus-icon lucide-copy-plus w-4 h-4 mr-1"><line x1="15" x2="15" y1="12" y2="18"/><line x1="12" x2="18" y1="15" y2="15"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    Add Client
                </button>
                <button onclick="window.amneziaApp.showServerConfig('${server.id}')" class="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-800 inline-flex items-center gap-2">                
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-icon lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
                    Show Config
                </button>
            </div>
            <div id="clients-${server.id}">
                <p class="text-gray-500 text-sm">Loading clients...</p>
            </div>
        </div>
    `).join('');

    if (typeof loadServerClients === 'function') {
        servers.forEach(server => loadServerClients(server.id));
    }

    // Обновляем клиенты для каждого сервера через колбэк
    if (refreshClientsCallback) {
        servers.forEach(server => refreshClientsCallback(server.id));
    }
    // Загружаем трафик интерфейсов
    loadAllServerTraffic();
}

// Управление серверами
export async function deleteServer(serverId) {
    if (!confirm('Are you sure you want to delete this server and all its clients?')) return;
    try {
        await api.deleteServer(serverId);
        showTempMessage('Server deleted', 'success');
        await loadServers();
    } catch (error) {
        console.error(error);
        alert('Error deleting server: ' + error.message);
    }
}

export async function startServer(serverId) {
    try {
        await api.startServer(serverId);
        await loadServers();
    } catch (error) {
        console.error(error);
        alert('Error starting server: ' + error.message);
    }
}

export async function stopServer(serverId) {
    try {
        await api.stopServer(serverId);
        await loadServers();
    } catch (error) {
        console.error(error);
        alert('Error stopping server: ' + error.message);
    }
}

// Трафик интерфейсов серверов
export async function loadAllServerTraffic() {
    try {
        const trafficData = await api.getAllServersTraffic();
        for (const serverId in trafficData) {
            updateServerTrafficElement(serverId, trafficData[serverId]);
        }
    } catch (error) {
        console.error('Error loading server traffic:', error);
    }
}

export function updateServerTrafficElement(serverId, trafficData) {
    const serverCard = document.querySelector(`[data-server-id="${serverId}"]`);
    if (serverCard && trafficData) {
        let trafficElement = serverCard.querySelector('.server-interface-traffic');
        if (!trafficElement) {
            const serverHeader = serverCard.querySelector('.flex.justify-between.items-center.mb-4 > div');
            if (serverHeader) {
                const trafficDiv = document.createElement('div');
                trafficDiv.className = 'server-interface-traffic text-xs text-gray-500 mt-1';
                serverHeader.appendChild(trafficDiv);
                trafficElement = trafficDiv;
            }
        }
        if (trafficElement) {
            trafficElement.innerHTML = `📡 Interface: 🔽 ${trafficData.rx} &nbsp; 🔼 ${trafficData.tx}`;
            trafficElement.title = `Interface RX: ${trafficData.rx}, TX: ${trafficData.tx}`;
        }
    }
}


export function initRenameServer() {
    document.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-server-name-btn');
        if (!editBtn) return;
        const serverId = editBtn.dataset.serverId;
        const displaySpan = document.querySelector(`.server-name-display[data-server-id="${serverId}"]`);
        if (!displaySpan) return;
        const oldName = displaySpan.innerText;

        // Заменяем текст на поле ввода
        const input = document.createElement('input');
        input.type = 'text';
        input.value = oldName;
        input.className = 'text-lg font-semibold border border-gray-300 rounded px-2 py-1';
        displaySpan.replaceWith(input);
        input.focus();

        const saveRename = async () => {
            const newName = input.value.trim();
            if (newName && newName !== oldName) {
                try {
                    await api.updateServerName(serverId, newName);
                    showTempMessage('Server renamed successfully', 'success');
                    await loadServers(); // перезагружаем список
                } catch (err) {
                    showTempMessage('Rename failed: ' + err.message, 'error');
                    // восстанавливаем старый текст
                    const newSpan = document.createElement('h3');
                    newSpan.className = 'text-lg font-semibold server-name-display';
                    newSpan.setAttribute('data-server-id', serverId);
                    newSpan.innerText = oldName;
                    input.replaceWith(newSpan);
                }
            } else {
                // отмена – возвращаем текст без изменений
                const newSpan = document.createElement('h3');
                newSpan.className = 'text-lg font-semibold server-name-display';
                newSpan.setAttribute('data-server-id', serverId);
                newSpan.innerText = oldName;
                input.replaceWith(newSpan);
            }
        };

        input.addEventListener('blur', saveRename);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveRename();
            }
        });
    });
}