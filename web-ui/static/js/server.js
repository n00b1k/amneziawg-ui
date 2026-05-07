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
                    <button onclick="window.amneziaApp.deleteServer('${server.id}')" class="bg-red-500 text-white px-3 py-1.5 rounded-lg shadow hover:shadow-md flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        Delete
                    </button>
                </div>
            </div>
            <div class="space-x-2 mb-4">
                <button onclick="window.amneziaApp.startServer('${server.id}')" class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">Start</button>
                <button onclick="window.amneziaApp.stopServer('${server.id}')" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Stop</button>
                <button onclick="window.amneziaApp.addClient('${server.id}')" class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Add Client</button>
                <button onclick="window.amneziaApp.showServerConfig('${server.id}')" class="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600">Show Config</button>
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