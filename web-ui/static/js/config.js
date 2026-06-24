// static/js/config.js
import { getElement, showTempMessage, escapeHtml } from './ui.js';
import * as api from './api.js';

// Модальное окно с информацией о сервере
export async function showServerConfig(serverId) {
    try {
        const serverInfo = await api.getServerInfo(serverId);
        displayServerConfigModal(serverInfo);
    } catch (error) {
        console.error('Error fetching server info:', error);
        alert('Error loading server configuration: ' + error.message);
    }
}

export async function showRawServerConfig(serverId) {
    try {
        const config = await api.getServerConfig(serverId);
        displayRawConfigModal(config);
    } catch (error) {
        console.error('Error fetching server config:', error);
        alert('Error loading server configuration: ' + error.message);
    }
}

export function downloadServerConfig(serverId) {
    api.downloadServerConfig(serverId);
}

export function closeModal() {
    const modal = document.getElementById('configModal') || document.getElementById('rawConfigModal');
    if (modal) modal.remove();
}

export function copyToClipboard(text) {
    // Decode base64 text if it's the JSON data
    try {
        const decodedText = atob(text);
        const jsonData = JSON.parse(decodedText);
        text = jsonData.config_content || decodedText;
    } catch (e) {
        // If it's not base64 JSON, use the text as is
    }

    navigator.clipboard.writeText(text).then(() => {
        showTempMessage('Configuration copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showTempMessage('Failed to copy to clipboard', 'error');
    });
}

// Вспомогательные функции отображения модалок
function displayServerConfigModal(serverInfo) {
    const modalHtml = `
        <div id="configModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-medium text-gray-900">Server Configuration: ${escapeHtml(serverInfo.name)}</h3>
                        <button onclick="window.amneziaApp.closeModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div class="bg-gray-50 p-3 rounded">
                            <h4 class="font-semibold text-sm text-gray-700 mb-2">Basic Information</h4>
                            <div class="space-y-1 text-sm">
                                <div><span class="font-medium">Interface:</span> ${escapeHtml(serverInfo.interface)}</div>
                                <div><span class="font-medium">Port:</span> ${serverInfo.port}</div>
                                <div><span class="font-medium">Subnet:</span> ${escapeHtml(serverInfo.subnet)}</div>
                                <div><span class="font-medium">Server IP:</span> ${escapeHtml(serverInfo.server_ip)}</div>
                                <div><span class="font-medium">Public IP:</span> ${escapeHtml(serverInfo.public_ip)}</div>
                                <div><span class="font-medium">Status:</span>
                                    <span class="px-2 py-1 rounded-full text-xs ${serverInfo.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${serverInfo.status}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-gray-50 p-3 rounded">
                            <h4 class="font-semibold text-sm text-gray-700 mb-2">Configuration</h4>
                            <div class="space-y-1 text-sm">
                                <div><span class="font-medium">Protocol:</span> ${escapeHtml(serverInfo.protocol)}</div>
                                <div><span class="font-medium">Obfuscation:</span> ${serverInfo.obfuscation_enabled ? 'Enabled' : 'Disabled'}</div>
                                <div><span class="font-medium">Clients:</span> ${serverInfo.clients_count}</div>
                                <div><span class="font-medium">DNS:</span> ${escapeHtml(serverInfo.dns.join(', '))}</div>
                                <div><span class="font-medium">MTU:</span> ${serverInfo.mtu}</div>
                                <div><span class="font-medium">Allowed IPs:</span> ${escapeHtml(serverInfo.allowed_ips)}</div>
                                <div class="truncate"><span class="font-medium">Public Key:</span>
                                    <span class="font-mono text-xs">${escapeHtml(serverInfo.public_key)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${serverInfo.obfuscation_enabled ? `
                    <div class="bg-blue-50 p-3 rounded mb-4">
                        <h4 class="font-semibold text-sm text-blue-700 mb-2">Obfuscation Parameters</h4>
                        <div class="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                            ${Object.entries(serverInfo.obfuscation_params).map(([key, value]) => `
                                <div class="text-center">
                                    <div class="font-medium">${key}</div>
                                    <div class="font-mono">${escapeHtml(value)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    ${serverInfo.default_i_settings ? `
                    <div class="bg-purple-50 p-3 rounded mb-4">
                        <h4 class="font-semibold text-sm text-purple-700 mb-2">Default I-settings (AmneziaWG 1.5)</h4>
                        <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                            ${Object.entries(serverInfo.default_i_settings).map(([key, value]) => `
                                <div class="text-center">
                                    <div class="font-medium">${key}</div>
                                    <div class="font-mono truncate" title="${escapeHtml(value)}">
                                        ${value ? value.substring(0, 20) + '...' : 'empty'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <p class="text-xs text-purple-600 mt-2">These defaults are used for new clients when "Apply I-settings" is enabled.</p>
                    </div>
                    ` : ''}

                    <div class="mb-4">
                        <h4 class="font-semibold text-sm text-gray-700 mb-2">Configuration Preview</h4>
                        <pre class="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-40 overflow-y-auto">${escapeHtml(serverInfo.config_preview)}</pre>
                    </div>

                    ${serverInfo.clients && serverInfo.clients.length ? `
                    <div class="mb-4">
                        <h4 class="font-semibold text-sm text-gray-700 mb-2">Clients</h4>
                        <div class="bg-gray-50 p-3 rounded overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="text-left text-gray-600">
                                        <th class="pb-1">Name</th>
                                        <th class="pb-1">IP</th>
                                        <th class="pb-1">AllowedIPs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${serverInfo.clients.map(client => `
                                        <tr class="border-t border-gray-200">
                                            <td class="py-1">${escapeHtml(client.name)}</td>
                                            <td class="py-1">${escapeHtml(client.client_ip)}</td>
                                            <td class="py-1 font-mono text-xs">${escapeHtml(client.allowed_ips || '0.0.0.0/0, ::/0')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    <div class="flex justify-end space-x-3 pt-4 border-t">
                        <button onclick="window.amneziaApp.showRawServerConfig('${serverInfo.id}')"
                                class="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-800">View Full Config</button>
                        <button onclick="window.amneziaApp.downloadServerConfig('${serverInfo.id}')"
                                class="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-800">Download Config</button>
                        <button onclick="window.amneziaApp.closeModal()"
                                class="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function displayRawConfigModal(config) {
    //const configContent = config.config_content || '';
    const configContent = typeof config.config_content === 'string' ? config.config_content : JSON.stringify(config.config_content, null, 2);
    const encodedConfig = encodeURIComponent(JSON.stringify(config));
    const modalHtml = `
        <div id="rawConfigModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-medium text-gray-900">Raw Configuration: ${escapeHtml(config.server_name)}</h3>
                        <button onclick="window.amneziaApp.closeModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="mb-4">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm text-gray-600">Config path: ${escapeHtml(config.config_path)}</span>
                            <button onclick="window.amneziaApp.copyToClipboard(decodeURIComponent('${encodedConfig}'))"
                                    class="bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600">Copy JSON</button>
                        </div>
                        <pre class="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto max-h-96 overflow-y-auto">${escapeHtml(config.config_content)}</pre>
                    </div>

                    <div class="flex justify-end space-x-3 pt-4 border-t">
                        <button onclick="window.amneziaApp.downloadServerConfig('${config.server_id}')"
                                class="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">Download Config</button>
                        <button onclick="window.amneziaApp.closeModal()"
                                class="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    console.log('config:', config);
    console.log('config.config_content type:', typeof config.config_content);

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}