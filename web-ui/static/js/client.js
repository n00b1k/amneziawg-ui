// static/js/client.js
import { getElement, showTempMessage, escapeHtml } from './ui.js';
import * as api from './api.js';
import { loadServers } from './server.js'; // для обновления списка после изменений

// Вспомогательные переменные для QR-кода
let currentQRServerId, currentQRClientId, currentQRClientName, currentEditingClientName;
let currentCleanConfig = '', currentFullConfig = '', currentConfigType = 'clean';

// ----- Модальные окна клиентов -----
export function addClient(serverId) {
    showClientModal(serverId);
}

export function editClient(serverId, clientId) {
    const server = window.amneziaServers?.find(s => s.id === serverId);
    if (server) {
        const client = server.clients?.find(c => c.id === clientId);
        if (client) {
            showClientModal(serverId, client);
            return;
        }
    }
    api.getServerInfo(serverId)
        .then(serverInfo => {
            const client = serverInfo.clients?.find(c => c.id === clientId);
            if (client) showClientModal(serverId, client);
            else showTempMessage('Client not found', 'error');
        })
        .catch(err => {
            console.error(err);
            showTempMessage('Error loading client', 'error');
        });
}

export function deleteClient(serverId, clientId) {
    if (!confirm('Are you sure you want to delete this client?')) return;
    api.deleteClient(serverId, clientId)
        .then(() => {
            showTempMessage('Client deleted', 'success');
            loadServers();
        })
        .catch(err => alert('Error deleting client: ' + err.message));
}

export function suspendClient(serverId, clientId) {
    api.suspendClient(serverId, clientId)
        .then(() => {
            showTempMessage('Client suspended', 'success');
            loadServers();
        })
        .catch(err => alert('Error suspending client: ' + err.message));
}

export function activateClient(serverId, clientId) {
    api.activateClient(serverId, clientId)
        .then(() => {
            showTempMessage('Client activated', 'success');
            loadServers();
        })
        .catch(err => alert('Error activating client: ' + err.message));
}

export function downloadClientConfig(serverId, clientId) {
    api.downloadClientConfig(serverId, clientId);
}

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.qr-code-btn');
    if (!btn) return;
    e.preventDefault();
    const serverId = btn.dataset.serverId;
    const clientId = btn.dataset.clientId;
    const clientName = btn.dataset.clientName;
    if (serverId && clientId && clientName) {
        // Проверка, чтобы не открывать модалку дважды
        if (document.getElementById('qrModal')) return;
        window.amneziaApp.showClientQRCode(serverId, clientId, clientName);
    }
});

// ----- QR-код -----
export function showClientQRCode(serverId, clientId, clientName) {
    currentQRServerId = serverId;
    currentQRClientId = clientId;
    currentQRClientName = clientName;
    const modalHtml = `
        <div id="qrModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div class="relative p-8 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-2xl rounded-2xl bg-white">
                <div class="flex flex-col">
                    <div class="flex justify-between items-center w-full mb-6">
                        <h3 class="text-xl font-bold text-gray-900">QR Code for ${escapeHtml(clientName)}</h3>
                        <button onclick="window.amneziaApp.closeQRModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div class="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
                        <div class="flex justify-between">
                            <div><span class="font-medium">Created:</span> <span id="createdAt">Loading...</span></div>
                            <div><span class="font-medium">Auto-suspend:</span> <span id="suspendAt">Not set</span></div>
                        </div>
                    </div>
                    <div id="qrTooLargeWarning" class="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 hidden">
                        <p class="text-sm text-yellow-700"><strong>Config too large for QR code!</strong><br>Use "Download Config File" instead.</p>
                    </div>
                    <div class="flex flex-col lg:flex-row gap-8 mb-6">
                        <div class="lg:w-2/5">
                            <div id="qrCodeContainer" class="bg-white p-6 rounded-xl border-2 border-gray-100">
                                <div id="qrcode" class="flex justify-center mb-4"></div>
                                <p class="text-center text-sm text-gray-500">Scan with AmneziaWG / AmneziaVPN app</p>
                            </div>
                            <div class="mt-4 text-center">
                                <button onclick="window.amneziaApp.downloadQRCode()" id="downloadQRBtn" class="bg-blue-500 text-white px-5 py-2.5 rounded text-sm font-medium hover:bg-blue-800">Download QR Code Image</button>
                            </div>
                        </div>
                        <div class="lg:w-3/5">
                            <div class="flex items-center justify-between mb-2">
                                <label class="text-sm font-medium text-gray-700">Configuration preview</label>
                                <div class="flex space-x-2">
                                    <button onclick="window.amneziaApp.toggleConfigView()" class="bg-yellow-500 text-white border px-3 py-1.5 rounded hover:bg-yellow-800">Toggle View</button>
                                    <button onclick="window.amneziaApp.copyConfigText()" class="bg-blue-500 text-white px-4 py-1.5 rounded hover:bg-blue-800">Copy Config</button>
                                </div>
                            </div>
                            <textarea id="configText" rows="12" class="w-full px-4 py-3 border-2 rounded-xl text-sm font-mono bg-gray-50" readonly placeholder="Loading configuration..."></textarea>
                            <div class="flex justify-between mt-3"><span id="configType" class="text-xs font-medium text-blue-500">Clean Config</span><span id="configLength" class="text-xs text-gray-500"></span></div>
                        </div>
                    </div>
                    <div class="flex justify-end space-x-4 pt-6 border-t">
                        <button onclick="window.amneziaApp.downloadClientConfig('${serverId}', '${clientId}')" class="bg-green-500 text-white px-6 py-3 rounded text-sm font-medium hover:bg-green-800">Download Config File (.conf)</button>
                        <button onclick="window.amneziaApp.closeQRModal()" class="bg-gray-500 text-white px-6 py-3 rounded text-sm font-medium hover:bg-gray-800">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    fetchAndGenerateQRCode();
}

export function closeQRModal() {
    const modal = document.getElementById('qrModal');
    if (modal) modal.remove();
}

export function toggleConfigView() {
    const textarea = document.getElementById('configText');
    const typeSpan = document.getElementById('configType');
    if (!textarea) return;
    if (currentConfigType === 'clean') {
        textarea.value = currentFullConfig;
        currentConfigType = 'full';
        if (typeSpan) typeSpan.textContent = 'Full Config';
    } else {
        textarea.value = currentCleanConfig;
        currentConfigType = 'clean';
        if (typeSpan) typeSpan.textContent = 'Clean Config';
    }
}

export function copyConfigText() {
    const textarea = document.getElementById('configText');
    if (textarea) {
        textarea.select();
        navigator.clipboard.writeText(textarea.value).then(() => showTempMessage('Configuration copied!', 'success'));
    }
}

export function downloadQRCode() {
    const qrDiv = document.getElementById('qrcode');
    const canvas = qrDiv?.querySelector('canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `${currentQRClientName.replace(/[^a-z0-9]/gi, '_')}_qr_code.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}

async function fetchAndGenerateQRCode() {
    try {
        const data = await api.getClientConfigBoth(currentQRServerId, currentQRClientId);
        currentCleanConfig = data.clean_config || '';
        currentFullConfig = data.full_config || '';
        currentConfigType = 'clean';

        const createdAtSpan = document.getElementById('createdAt');
        if (createdAtSpan && data.created_at) {
            const d = new Date(data.created_at * 1000);
            createdAtSpan.textContent = d.toLocaleString();
        }
        const suspendAtSpan = document.getElementById('suspendAt');
        if (suspendAtSpan && data.suspend_at) {
            const d = new Date(data.suspend_at * 1000);
            suspendAtSpan.textContent = d.toLocaleString();
        }

        const textarea = document.getElementById('configText');
        const lengthSpan = document.getElementById('configLength');
        const typeSpan = document.getElementById('configType');
        if (textarea) textarea.value = currentCleanConfig;
        if (lengthSpan) lengthSpan.textContent = `Length: ${currentCleanConfig.length} chars`;
        if (typeSpan) typeSpan.textContent = 'Clean Config';

        const isTooLarge = currentCleanConfig.length > 2000;
        const warning = document.getElementById('qrTooLargeWarning');
        const qrContainer = document.getElementById('qrCodeContainer');
        const qrDiv = document.getElementById('qrcode');
        const downloadBtn = document.getElementById('downloadQRBtn');
        if (isTooLarge) {
            if (warning) warning.classList.remove('hidden');
            if (qrContainer) qrContainer.classList.add('hidden');
            if (downloadBtn) downloadBtn.classList.add('hidden');
        } else {
            if (warning) warning.classList.add('hidden');
            if (qrContainer) qrContainer.classList.remove('hidden');
            if (downloadBtn) downloadBtn.classList.remove('hidden');
            if (qrDiv) {
                qrDiv.innerHTML = '';
                new QRCode(qrDiv, {
                    text: currentCleanConfig,
                    width: 300,
                    height: 300,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M,
                    margin: 1
                });
            }
        }
    } catch (error) {
        console.error(error);
        showTempMessage('Failed to generate QR code: ' + error.message, 'error');
        closeQRModal();
    }
}

// ----- Сохранение клиента (модалка добавления/редактирования) -----
async function showClientModal(serverId, client = null) {
    const isEdit = !!client;
    const modalTitle = isEdit ? 'Edit Client' : 'Add New Client';
    const clientName = client ? client.name : '';
    const applyISettings = client ? (client.apply_i_settings || false) : false;
    const iSettings = client ? (client.i_settings || {}) : {};
    currentEditingClientName = clientName
    const allowedIpsValue = client && client.allowed_ips ? client.allowed_ips : '0.0.0.0/0, ::/0';

    let serverInfo = null;
    try {
        serverInfo = await api.getServerInfo(serverId);
    } catch(e) {
        showTempMessage('Failed to load server info', 'error');
        return;
    }

    const defaultISettings = serverInfo.default_i_settings || {};
    const createdHtml = (client && client.created_at) ? `
        <div class="bg-gray-50 p-3 rounded mb-4">
            <div class="flex justify-between">
                <div><span class="text-xs text-gray-500">Created at:</span> <span class="text-sm font-mono">${new Date(client.created_at * 1000).toLocaleString()}</span></div>
                <div class="text-xs text-gray-400">${Math.floor((Date.now() - client.created_at * 1000) / 86400000)} days ago</div>
            </div>
        </div>
    ` : '';

    let suspendAtValue = '';
    if (client && client.suspend_at) {
        const d = new Date(client.suspend_at * 1000);
        suspendAtValue = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    const modalHtml = `
        <div id="clientModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div class="relative p-8 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-2xl rounded-2xl bg-white max-h-[90vh] overflow-y-auto">
                <div class="flex flex-col">
                    <div class="flex justify-between items-center w-full mb-6">
                        <h3 class="text-xl font-bold text-gray-900">${modalTitle}</h3>
                        <button onclick="window.amneziaApp.closeClientModal()" class="text-gray-400 hover:text-gray-600"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </div>
                    ${createdHtml}
                    <form id="clientForm" class="space-y-6">
                        <input type="hidden" id="serverId" value="${serverId}">
                        <input type="hidden" id="clientId" value="${client ? client.id : ''}">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
                            <input type="text" id="clientName" value="${escapeHtml(clientName)}" required class="w-full px-4 py-3 border-2 rounded-xl"}>
                        </div>
                        ${isEdit ? `<div class="pt-4 border-t"><label class="block text-sm font-medium text-gray-700 mb-2">Auto-suspend at</label><input type="datetime-local" id="suspendAt" value="${suspendAtValue}" class="w-full px-4 py-3 border-2 rounded-xl"><p class="text-xs text-gray-500 mt-1">Leave empty to disable auto-suspension.</p></div>` : ''}

                        <!-- AllowedIPs Field -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Allowed IPs (Client-side routing)</label>
                            <input
                            type="text"
                            id="allowedIps"
                            value="${escapeHtml(allowedIpsValue)}"
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm"
                            placeholder="0.0.0.0/0, ::/0"
                            />
                            <p class="text-xs text-gray-500 mt-1">
                            Comma-separated list of IP ranges to route through the VPN.<br />
                            Default: 0.0.0.0/0, ::/0 (all traffic)<br />
                            Example: 10.0.0.0/24, 192.168.1.0/24
                            </p>
                        </div>

                        <div class="pt-4 border-t">
                            <div class="flex items-center mb-4">
                                <input type="checkbox" id="applyISettings" ${applyISettings ? 'checked' : ''} class="h-4 w-4 text-blue-600">
                                <label class="ml-3 text-sm font-medium text-gray-700">Apply I-settings (AmneziaWG 1.5)</label>
                            </div>
                            <div id="iSettingsSection" style="display: ${applyISettings ? 'block' : 'none'};" class="mt-4 p-4 bg-gray-50 rounded border space-y-4">
                                <h4 class="text-sm font-medium">I-settings (optional)</h4>
                                ${[1,2,3,4,5].map(i => `
                                    <div><label for="i${i}">I${i}</label><input type="text" id="i${i}" value="${escapeHtml(iSettings[`i${i}`] || '')}" class="w-full px-3 py-2 border rounded-md text-sm" placeholder="${defaultISettings[`i${i}`] ? 'Server default: ' + defaultISettings[`i${i}`].substring(0,50)+'...' : 'leave empty'}"></div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="flex justify-end space-x-4 pt-6 border-t">
                            <button type="button" onclick="window.amneziaApp.closeClientModal()" class="bg-gray-500 text-white px-6 py-3 rounded hover:bg-gray-800">Cancel</button>
                            <button type="submit" class="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-800">${isEdit ? 'Update Client' : 'Add Client'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const form = document.getElementById('clientForm');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); saveClient(); });
    const chk = document.getElementById('applyISettings');
    if (chk) chk.addEventListener('change', (e) => {
        const section = document.getElementById('iSettingsSection');
        if (section) section.style.display = e.target.checked ? 'block' : 'none';
    });
}

export function closeClientModal() {
    const modal = document.getElementById('clientModal');
    if (modal) modal.remove();
}

export async function saveClient() {
    const serverId = document.getElementById('serverId').value;
    const clientId = document.getElementById('clientId').value;
    const clientName = document.getElementById('clientName')?.value.trim();
    const applyISettings = document.getElementById('applyISettings')?.checked || false;
    const allowedIps = document.getElementById('allowedIps').value.trim() || '0.0.0.0/0, ::/0';

    if (!clientName) {
        showTempMessage('Client name is required', 'error');
        return;
    }

    const data = { name: clientName, apply_i_settings: applyISettings, allowed_ips: allowedIps };
    if (applyISettings) {
        const iSettings = {};
        for (let i = 1; i <= 5; i++) {
            const val = document.getElementById(`i${i}`)?.value.trim();
            if (val) iSettings[`i${i}`] = val;
        }
        data.i_settings = iSettings;
    }

    //if (currentEditingClientName != '')
        if (clientId && clientName !== currentEditingClientName) {
            await fetch(`/api/servers/${serverId}/clients/${clientId}/name`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: clientName })
            });
        }

    try {
        if (clientId) {
            await api.updateClientISettings(serverId, clientId, data);
            await api.updateClientAllowedIPs(serverId, clientId, allowedIps);
            const suspendAtInput = document.getElementById('suspendAt');
            let suspendAtUTC = null;
            if (suspendAtInput && suspendAtInput.value) {
                const localDate = new Date(suspendAtInput.value);
                suspendAtUTC = localDate.toISOString();
            }
            if (suspendAtUTC !== undefined) await api.setClientSuspendTime(serverId, clientId, suspendAtUTC);
            showTempMessage('Client updated successfully', 'success');
        } else {
            await api.addClient(serverId, data);
            showTempMessage('Client added successfully', 'success');
        }
        closeClientModal();
        loadServers();
    } catch (error) {
        console.error(error);
        showTempMessage(`Error saving client: ${error.message}`, 'error');
    }
}

// Загрузка клиентов для отображения (используется из server.js)
export async function loadServerClients(serverId) {
    try {
        const [clients, traffic] = await Promise.all([
            api.getServerClients(serverId),
            api.getServerTraffic(serverId)
        ]);
        const container = getElement(`clients-${serverId}`);
        if (container) container.innerHTML = renderServerClients(serverId, clients, traffic);
    } catch (error) {
        console.error(`Error loading clients for ${serverId}:`, error);
    }
}

function renderServerClients(serverId, clients, traffic = {}) {
    if (!clients.length) return '<p class="text-gray-500 text-sm">No clients yet.</p>';
    return `
        <h4 class="font-medium mb-2">Clients (${clients.length}):</h4>
        <div class="space-y-2">
            ${clients.map(client => {
                const clientData = traffic[client.id] || { received: '0 B', sent: '0 B', last_handshake: 'Never', endpoint: '' };
                const hasISettings = client.apply_i_settings;
                const isSuspended = client.status === 'suspended';
                const safeName = client.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
                const statusBadge = isSuspended ? '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full ml-2">Suspended</span>' : '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full ml-2">Active</span>';
                return `
                    <div class="flex justify-between items-center bg-gray-50 p-3 rounded hover:bg-gray-100 client-item" data-client-id="${client.id}">
                        <div class="flex items-center">
                            <div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mr-3">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                            </div>
                            <div>
                                <div class="flex items-center space-x-2">
                                    <span class="font-medium">${escapeHtml(client.name)}</span>
                                    <span class="text-sm text-gray-600">(id: ${client.id}) </span>
                                    <span class="text-sm text-gray-600">${client.client_ip}</span>
                                    <span class="text-xs text-gray-500 ml-2">AllowedIPs: ${escapeHtml(client.allowed_ips || '0.0.0.0/0, ::/0')}</span>
                                    ${hasISettings ? '<span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">I-settings</span>' : ''}
                                    ${statusBadge}
                                </div>
                                <div class="flex space-x-4 mt-1 text-xs text-gray-500">
                                    <span class="client-traffic"><svg class="inline-block w-4 h-4 align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-chevron-down-icon lucide-square-chevron-down"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m16 10-4 4-4-4"/></svg> ${clientData.received} &nbsp; <svg class="inline-block w-4 h-4 align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-chevron-up-icon lucide-square-chevron-up"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m8 14 4-4 4 4"/></svg> ${clientData.sent}</span>
                                    <span class="client-handshake" title="${clientData.last_handshake}"><svg class="inline-block w-4 h-4 align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock-icon lucide-clock"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${clientData.last_handshake !== 'Never' ? clientData.last_handshake : 'Never'}</span>
                                    <span class="client-endpoint ${!clientData.endpoint ? 'hidden' : ''}"><svg class="inline-block w-4 h-4 align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevrons-left-right-ellipsis-icon lucide-chevrons-left-right-ellipsis"><path d="M12 12h.01"/><path d="M16 12h.01"/><path d="m17 7 5 5-5 5"/><path d="m7 7-5 5 5 5"/><path d="M8 12h.01"/></svg> ${escapeHtml(clientData.endpoint || '')}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="window.amneziaApp.editClient('${serverId}', '${client.id}')" class="bg-orange-500 text-white px-3 py-1 rounded text-sm font-medium transition-all duration-200 shadow hover:bg-orange-800 flex items-center"
                                    title="Edit Client">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                Edit
                            </button>
                            <button class="qr-code-btn bg-purple-500 text-white px-3 py-1 rounded text-sm font-medium transition-all duration-200 shadow hover:bg-purple-800 flex items-center"
                                    data-server-id="${serverId}"
                                    data-client-id="${client.id}"
                                    data-client-name="${escapeHtml(client.name)}"
                                    title="Show QR Code">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                                </svg>
                                QR Code
                            </button>
                            <button onclick="window.amneziaApp.downloadClientConfig('${serverId}', '${client.id}')" class="bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 shadow hover:bg-blue-800 flex items-center"
                                    title="Download Client Config">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                Download
                            </button>
                            ${isSuspended ?
                                `<button onclick="window.amneziaApp.activateClient('${serverId}', '${client.id}')" class="bg-green-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 shadow hover:bg-green-800 flex items-center"
                                        title="Activate Client">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 w-4 h-4 mr-1">
                                        <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
                                    </svg>
                                    Activate
                                </button>` :
                                `<button onclick="window.amneziaApp.suspendClient('${serverId}', '${client.id}')" class="bg-yellow-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 shadow hover:bg-yellow-800 flex items-center"
                                        title="Suspend Client">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6 w-4 h-4 mr-1">
                                        <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clip-rule="evenodd" />
                                    </svg>
                                    Suspend
                                </button>`
                            }
                            <button onclick="window.amneziaApp.deleteClient('${serverId}', '${client.id}')" class="bg-red-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 shadow hover:bg-red-800 flex items-center" title="Delete Client">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}