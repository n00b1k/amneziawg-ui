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
                    <h3 class="text-lg font-semibold">${escapeHtml(server.name)}</h3>
                    <p class="text-sm text-gray-600">
                        ID: ${server.id} | Port: ${server.port} | Subnet: ${server.subnet}
                        ${server.obfuscation_enabled ? '| 🔒 Obfuscated' : ''}
                        ${server.public_ip ? `| 🌐 Public IP: ${server.public_ip}` : ''}
                    </p>
                    <div class="server-interface-traffic text-xs text-gray-500 mt-1">📡 Loading interface traffic...</div>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="px-3 py-1 rounded-full text-sm ${server.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${server.status}</span>
                    <button onclick="window.amneziaApp.deleteServer('${server.id}')" class="bg-red-500 text-white px-3 py-1.5 rounded shadow hover:shadow-md flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
            <div class="flex flex-row gap-2">
                <button onclick="window.amneziaApp.startServer('${server.id}')" class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 w-4 h-4 mr-1">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                    Start
                </button>
                <button onclick="window.amneziaApp.stopServer('${server.id}')" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 w-4 h-4 mr-1">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                    </svg>
                    Stop
                </button>
                <button onclick="window.amneziaApp.addClient('${server.id}')" class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-plus-icon lucide-copy-plus w-4 h-4 mr-1"><line x1="15" x2="15" y1="12" y2="18"/><line x1="12" x2="18" y1="15" y2="15"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    Add Client
                </button>
                <button onclick="window.amneziaApp.showServerConfig('${server.id}')" class="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600 inline-flex items-center gap-1">                
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
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