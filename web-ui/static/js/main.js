// AmneziaWG Web UI - Main Application JavaScript
import * as ui from './ui.js';
import * as api from './api.js'
import * as server from './server.js';
import * as client from './client.js';
import * as logs from './logs.js';


class AmneziaApp {
    constructor() {
        this.socket = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log("AmneziaWG Web UI initializing...");
            this.setupEventListeners();
            this.setupSocketIO();
            this.loadInitialData();
            this.loadDefaultISettings();
            server.setRefreshClientsCallback((serverId) => {
                client.loadServerClients(serverId);
            });
            logs.createLogsSection();
        });
    }


    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Отключаем WebSocket перед выходом
            if (this.socket && this.socket.connected) {
                this.socket.disconnect();
            }
            
            // Перенаправляем на logout
            window.location.href = '/logout';
        }
}

    toggleForm() {
        const container = ui.getElement('serverFormContainer');
        const icon = ui.getElement('toggleIcon');
        
        if (container && icon) {
            if (container.classList.contains('hidden')) {
                container.classList.remove('hidden');
                icon.textContent = '▲';
            } else {
                container.classList.add('hidden');
                icon.textContent = '▼';
            }
        }
    }

    setupEventListeners() {
        // Server form submission
        const serverForm = ui.getElement('serverForm');
        if (serverForm) {
            serverForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createServer();
            });
        }

        // Random parameters button
        const randomParamsBtn = ui.getElement('randomParamsBtn');
        if (randomParamsBtn) {
            randomParamsBtn.addEventListener('click', () => {
                this.generateRandomParams();
            });
        }

        // Refresh IP button
        const refreshIpBtn = ui.getElement('refreshIpBtn');
        if (refreshIpBtn) {
            refreshIpBtn.addEventListener('click', () => {
                this.refreshPublicIp();
            });
        }

        // Obfuscation toggle
        const obfuscationCheckbox = ui.getElement('enableObfuscation');
        if (obfuscationCheckbox) {
            obfuscationCheckbox.addEventListener('change', (e) => {
                this.toggleObfuscationParams(e.target.checked);
            });
            // Initialize visibility
            this.toggleObfuscationParams(obfuscationCheckbox.checked);
        }

        const awg2Checkbox = ui.getElement('enableAwg2');
        if (awg2Checkbox) {
            awg2Checkbox.addEventListener('change', (e) => {
                this.toggleAwg2Fields(e.target.checked);
            });
            this.toggleAwg2Fields(awg2Checkbox.checked);
        }

        // Form validation listeners
        this.setupFormValidation();
        
        // Add toggle button listener
        const toggleBtn = ui.getElement('toggleFormBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleForm();
            });
        }
    }

    setupFormValidation() {
        const nameElement = ui.getElement('serverName');
        const portElement = ui.getElement('serverPort');
        const subnetElement = ui.getElement('serverSubnet');
        
        if (nameElement) {
            nameElement.addEventListener('input', () => {
                ui.hideError('nameError');
            });
        }
        
        if (portElement) {
            portElement.addEventListener('input', () => {
                ui.hideError('portError');
            });
        }
        
        if (subnetElement) {
            subnetElement.addEventListener('input', () => {
                ui.hideError('subnetError');
            });
        }
    }


    toggleObfuscationParams(show) {
        const obfuscationParams = ui.getElement('obfuscationParams');
        if (obfuscationParams) {
            obfuscationParams.style.display = show ? 'block' : 'none';
        }
    }

    toggleAwg2Fields(show) {
        const s3Field = document.getElementById('awg2FieldS3');
        const s4Field = document.getElementById('awg2FieldS4');
        
        if (s3Field) s3Field.style.display = show ? 'block' : 'none';
        if (s4Field) s4Field.style.display = show ? 'block' : 'none';
    }

    updateTrafficDisplay(trafficData) {
        if (!trafficData) return;
        
        // Handle client traffic
        if (trafficData.client_traffic) {
            for (const serverId in trafficData.client_traffic) {
                if (trafficData.client_traffic.hasOwnProperty(serverId)) {
                    const clientsContainer = ui.getElement(`clients-${serverId}`);
                    if (clientsContainer) {
                        const serverTraffic = trafficData.client_traffic[serverId];
                        
                        for (const clientId in serverTraffic) {
                            if (serverTraffic.hasOwnProperty(clientId)) {
                                const clientTrafficData = serverTraffic[clientId];
                                this.updateClientTrafficElement(clientId, clientTrafficData, clientsContainer);
                            }
                        }
                    }
                }
            }
        }
        
        // Handle server interface traffic
        if (trafficData.server_traffic) {
            for (const serverId in trafficData.server_traffic) {
                if (trafficData.server_traffic.hasOwnProperty(serverId)) {
                    this.updateServerTrafficElement(serverId, trafficData.server_traffic[serverId]);
                }
            }
        }
    }

    updateClientTrafficElement(clientId, clientData, container) {
        const clientElement = container.querySelector(`[data-client-id="${clientId}"]`);
        if (clientElement) {
            // Update traffic numbers
            const trafficSpan = clientElement.querySelector('.client-traffic');
            if (trafficSpan) {
                trafficSpan.innerHTML = `🔽 ${clientData.received} &nbsp; 🔼 ${clientData.sent}`;
            }
            
            // Update handshake
            const handshakeSpan = clientElement.querySelector('.client-handshake');
            if (handshakeSpan) {
                const handshakeDisplay = clientData.last_handshake !== 'Never'
                    ? `🕒 ${clientData.last_handshake}`
                    : '🕒 Never';
                handshakeSpan.innerHTML = handshakeDisplay;
                handshakeSpan.title = `Last Handshake: ${clientData.last_handshake}`;
            }
            
            // Update endpoint
            const endpointSpan = clientElement.querySelector('.client-endpoint');
            if (endpointSpan) {
                if (clientData.endpoint) {
                    endpointSpan.innerHTML = `🌐 ${clientData.endpoint}`;
                    endpointSpan.title = `Endpoint: ${clientData.endpoint}`;
                    endpointSpan.classList.remove('hidden');
                } else {
                    endpointSpan.classList.add('hidden');
                }
            }
        }
    }

    updateServerTrafficElement(serverId, trafficData) {
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

    loadAllServerTraffic() {
        api.getAllServersTraffic()
            .then(trafficData => {
                for (const serverId in trafficData) {
                    if (trafficData.hasOwnProperty(serverId)) {
                        this.updateServerTrafficElement(serverId, trafficData[serverId]);
                    }
                }
            })
            .catch(error => {
                console.error('Error loading server traffic:', error);
            });
    }

    setupSocketIO() {
        // Get the current host and protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;
        const port = window.location.port;

        let socketUrl;
        if (port && port !== '' && port !== '80' && port !== '443') {
            // For custom ports, explicitly specify the URL with port
            socketUrl = `${protocol}//${hostname}:${port}`;
        } else {
            socketUrl = `${protocol}//${hostname}`;
        }

        console.log('Connecting to Socket.IO at:', socketUrl);

        this.socket = io(socketUrl, {
            path: '/socket.io',
            transports: ['polling', 'websocket'],
            upgrade: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });

        this.socket.on('connect', () => {
            console.log("✅ Connected to server via WebSocket");
            ui.updateStatus('Connected to AmneziaWG Web UI');
        });

        this.socket.on('disconnect', () => {
            console.log("❌ Disconnected from server");
            ui.updateStatus('Disconnected from AmneziaWG Web UI');
        });

        this.socket.on('connect_error', (error) => {
            console.error("❌ WebSocket connection error:", error);
            ui.updateStatus('Connection error - retrying...');
        });

        this.socket.on('status', (data) => {
            console.log("Status update:", data);
            if (data.public_ip) {
                ui.updatePublicIp(data.public_ip);
            }
        });

        this.socket.on('server_status', (data) => {
            console.log("Server status update:", data);
            server.loadServers();
        });

        this.socket.on('traffic_update', (data) => {
            if (this.socket.connected) {
                this.updateTrafficDisplay(data);
            }
        });
    }


    async refreshPublicIp() {
        try {
            const data = await api.refreshPublicIp();
            ui.updatePublicIp(data.public_ip);
            await server.loadServers();
        } catch (error) { console.error(error); }
    }

    generateRandomParams() {
        // Generate random values within recommended ranges
        const jcElement = ui.getElement('paramJc');
        const s1Element = ui.getElement('paramS1');
        const s2Element = ui.getElement('paramS2');
        const s3Element = ui.getElement('paramS3');
        const s4Element = ui.getElement('paramS4');
        const h1Element = ui.getElement('paramH1');
        const h2Element = ui.getElement('paramH2');
        const h3Element = ui.getElement('paramH3');
        const h4Element = ui.getElement('paramH4');
        
        if (jcElement) jcElement.value = Math.floor(Math.random() * 9) + 4; // 4-12
        if (s1Element) s1Element.value = Math.floor(Math.random() * 136) + 15; // 15-150
        if (s2Element) s2Element.value = Math.floor(Math.random() * 136) + 15; // 15-150
        if (s3Element) s3Element.value = Math.floor(Math.random() * 256) + 1; // 1-256
        if (s4Element) s4Element.value = Math.floor(Math.random() * 32) + 1; // 1-32
        
        // Generate unique H values
        const hValues = new Set();
        while (hValues.size < 4) {
            hValues.add(Math.floor(Math.random() * 1000000) + 1000);
        }
        const hArray = Array.from(hValues);
        
        if (h1Element) h1Element.value = hArray[0];
        if (h2Element) h2Element.value = hArray[1];
        if (h3Element) h3Element.value = hArray[2];
        if (h4Element) h4Element.value = hArray[3];
    }

    showFormStatus(message, type) {
        const statusDiv = ui.getElement('formStatus');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `text-sm mt-2 ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
            statusDiv.classList.remove('hidden');
            
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 5000);
        }
    }

    validateObfuscationParamsJS(params, mtu) {
        let errors = [];

        // Jmin < Jmax ≤ mtu
        if (!(params.Jmin < params.Jmax && params.Jmax <= mtu)) {
            errors.push(`Jmin (${params.Jmin}) must be less than Jmax (${params.Jmax}), and Jmax ≤ MTU (${mtu})`);
        }
        // Jmax > Jmin < mtu
        if (!(params.Jmax > params.Jmin && params.Jmin < mtu)) {
            errors.push(`Jmax (${params.Jmax}) must be greater than Jmin (${params.Jmin}), and Jmin < MTU (${mtu})`);
        }
        // S1 ≤ (mtu - 148) and in the range from 15 to 150
        if (!(params.S1 <= (mtu - 148) && params.S1 >= 15 && params.S1 <= 150)) {
            errors.push(`S1 (${params.S1}) must be in [15, 150] and ≤ (MTU - 148) (${mtu - 148})`);
        }
        // S2 ≤ (mtu - 92) and in the range from 15 to 150
        if (!(params.S2 <= (mtu - 92) && params.S2 >= 15 && params.S2 <= 150)) {
            errors.push(`S2 (${params.S2}) must be in [15, 150] and ≤ (MTU - 92) (${mtu - 92})`);
        }
        // S1 + 56 ≠ S2
        if (params.S1 + 56 === params.S2) {
            errors.push(`S1 + 56 (${params.S1 + 56}) must not equal S2 (${params.S2})`);
        }
        if (params.S4 > 32) {
            errors.push(`S4 (${params.S4}) must be in range [0, 32]`);
        }

        return errors;
    }

    validateForm() {
        let isValid = true;

        // Reset errors
        ui.hideError('nameError');
        ui.hideError('portError');
        ui.hideError('subnetError');
        ui.hideError('mtuError');
        ui.hideError('dnsError');

        // Validate name
        const nameElement = ui.getElement('serverName');
        const name = nameElement ? nameElement.value.trim() : '';
        if (!name) {
            ui.showError('nameError', 'Server name is required');
            isValid = false;
        }

        // Validate port
        const portElement = ui.getElement('serverPort');
        const port = portElement ? parseInt(portElement.value) : 0;
        if (!port || port < 1 || port > 65535) {
            ui.showError('portError', 'Port must be between 1 and 65535');
            isValid = false;
        }

        // Validate subnet
        const subnetElement = ui.getElement('serverSubnet');
        const subnet = subnetElement ? subnetElement.value : '';
        const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
        if (!subnet || !subnetRegex.test(subnet)) {
            ui.showError('subnetError', 'Valid subnet is required (e.g., 10.0.0.0/24)');
            isValid = false;
        }

        // Validate MTU
        const mtuElement = ui.getElement('serverMTU');
        const mtu = mtuElement ? parseInt(mtuElement.value) : 0;
        if (!mtu || mtu < 1280 || mtu > 1440) {
            ui.showError('mtuError', 'MTU must be between 1280 and 1440');
            isValid = false;
        }

        // Validate DNS
        const dnsElement = ui.getElement('serverDNS');
        const dns = dnsElement ? dnsElement.value.trim() : '';
        const dnsServers = dns.split(',').map(s => s.trim()).filter(s => s);
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

        if (!dns || dnsServers.length === 0) {
            ui.showError('dnsError', 'At least one DNS server is required');
            isValid = false;
        } else {
            for (const dnsServer of dnsServers) {
                if (!ipRegex.test(dnsServer)) {
                    ui.showError('dnsError', `Invalid DNS server IP: ${dnsServer}`);
                    isValid = false;
                    break;
                }
            }
        }

        return isValid;
    }

    // Add DNS input validation listener
    setupFormValidation() {
        const nameElement = ui.getElement('serverName');
        const portElement = ui.getElement('serverPort');
        const subnetElement = ui.getElement('serverSubnet');
        const mtuElement = ui.getElement('serverMTU');
        const dnsElement = ui.getElement('serverDNS');

        if (nameElement) {
            nameElement.addEventListener('input', () => {
                ui.hideError('nameError');
            });
        }

        if (portElement) {
            portElement.addEventListener('input', () => {
                ui.hideError('portError');
            });
        }

        if (subnetElement) {
            subnetElement.addEventListener('input', () => {
                ui.hideError('subnetError');
            });
        }

        if (mtuElement) {
            mtuElement.addEventListener('input', () => {
                ui.hideError('mtuError');
            });
        }

        if (dnsElement) {
            dnsElement.addEventListener('input', () => {
                ui.hideError('dnsError');
            });
        }
    }


    async createServer() {
        console.log("Creating server...");

        if (!this.validateForm()) {
            console.log("Form validation failed");
            this.showFormStatus('Please fix the form errors above', 'error');
            return;
        }

        // Safely get form values with fallbacks
        const nameElement = ui.getElement('serverName');
        const publicIpElement = ui.getElement('serverPublicIp');
        const portElement = ui.getElement('serverPort');
        const subnetElement = ui.getElement('serverSubnet');
        const mtuElement = ui.getElement('serverMTU');
        const dnsElement = ui.getElement('serverDNS');
        const obfuscationElement = ui.getElement('enableObfuscation');
        const awg2Element = ui.getElement('enableAwg2');
        const autoStartElement = ui.getElement('autoStart');

        const formData = {
            name: nameElement ? nameElement.value.trim() : 'New Server',
            public_ip: publicIpElement ? publicIpElement.value.trim() : '',
            port: portElement ? parseInt(portElement.value) : 51820,
            subnet: subnetElement ? subnetElement.value : '10.0.0.0/24',
            mtu: mtuElement ? parseInt(mtuElement.value) : 1420,
            dns: dnsElement ? dnsElement.value.trim() : '8.8.8.8,1.1.1.1',
            obfuscation: obfuscationElement ? obfuscationElement.checked : true,
            awg2: awg2Element ? awg2Element.checked : true,
            auto_start: autoStartElement ? autoStartElement.checked : true
        };

        console.log("Form data:", formData);

        // Add obfuscation parameters if enabled
        if (formData.obfuscation) {
            if (formData.obfuscation && formData.awg2) {
                formData.obfuscation_params = {
                    Jc: parseInt(ui.getElement('paramJc')?.value || '8'),
                    Jmin: parseInt(ui.getElement('paramJmin')?.value || '8'),
                    Jmax: parseInt(ui.getElement('paramJmax')?.value || '80'),
                    S1: parseInt(ui.getElement('paramS1')?.value || '50'),
                    S2: parseInt(ui.getElement('paramS2')?.value || '60'),
                    S3: parseInt(ui.getElement('paramS3')?.value || '0'),
                    S4: parseInt(ui.getElement('paramS4')?.value || '0'),
                    // Handle H1-H4 as strings to support ranges
                    H1: ui.getElement('paramH1')?.value || '1000',
                    H2: ui.getElement('paramH2')?.value || '2000',
                    H3: ui.getElement('paramH3')?.value || '3000',
                    H4: ui.getElement('paramH4')?.value || '4000',
                };
            } else {
                formData.obfuscation_params = {
                    Jc: parseInt(ui.getElement('paramJc')?.value || '8'),
                    Jmin: parseInt(ui.getElement('paramJmin')?.value || '8'),
                    Jmax: parseInt(ui.getElement('paramJmax')?.value || '80'),
                    S1: parseInt(ui.getElement('paramS1')?.value || '50'),
                    S2: parseInt(ui.getElement('paramS2')?.value || '60'),
                    // Handle H1-H4 as strings to support ranges
                    H1: ui.getElement('paramH1')?.value || '1000',
                    H2: ui.getElement('paramH2')?.value || '2000',
                    H3: ui.getElement('paramH3')?.value || '3000',
                    H4: ui.getElement('paramH4')?.value || '4000',
                };
            }

            const obfErrors = this.validateObfuscationParamsJS(formData.obfuscation_params, formData.mtu);
            if (obfErrors.length > 0) {
                // You can display all errors in a single error element, or one by one
                ui.showError('obfuscationError', obfErrors.join(' '));
                return;
            } else {
                ui.hideError('obfuscationError');
            }
        }

        // Disable button and show loading
        this.setCreateButtonState(true);

        try {
            const newServer = await api.createServer(formData);
            ui.showTempMessage(`Server "${newServer.name}" created!`, 'success');
            const form = ui.getElement('serverForm');
            if (form) form.reset();
            await server.loadServers();
        } catch (err) {
            this.showFormStatus('Error creating server: ' + error.message, 'error');
        }
    }

    setCreateButtonState(loading) {
        const createButton = ui.getElement('createButton');
        if (createButton) {
            createButton.disabled = loading;
            createButton.textContent = loading ? 'Creating...' : 'Create Server';
            createButton.classList.toggle('opacity-50', loading);
        }
    }

    loadInitialData() {
        server.loadServers();
        this.loadPublicIp();
    }

    loadPublicIp() {
        api.getSystemStatus()
            .then(data => { ui.updatePublicIp(data.public_ip); })
            .catch(error => console.error(error));
    }


    loadServerClients(serverId) {
        Promise.all([
            api.getServerClients(serverId),
            api.getServerTraffic(serverId)
        ]).then(([clients, traffic]) => {
            const clientsContainer = ui.getElement(`clients-${serverId}`);
            if (clientsContainer) {
                clientsContainer.innerHTML = amneziaApp.renderServerClients(serverId, clients, traffic);
            }
        }).catch(error => {
            console.error(`Error loading clients or traffic for server ${serverId}:`, error);
        });
    }

    showServerError(message) {
        const serversList = ui.getElement('serversList');
        if (serversList) {
            serversList.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    ${message}
                </div>
            `;
        }
    }


    showClientModal(serverId, client = null) {
        const modalTitle = client ? 'Edit Client' : 'Add New Client';
        const clientName = client ? client.name : '';
        const applyISettings = client ? (client.apply_i_settings || false) : false;
        const iSettings = client ? (client.i_settings || {}) : {};
        
        // Get default I values from server info
        api.getServerInfo(serverId)
            .then(serverInfo => {
                this.showClientModalWithDefaults(serverId, modalTitle, clientName, applyISettings, iSettings, serverInfo.default_i_settings || {}, client);
            })
            .catch(error => {
                console.error('Error fetching server info:', error);
                // Show modal without defaults if fetch fails
                this.showClientModalWithDefaults(serverId, modalTitle, clientName, applyISettings, iSettings, {}, client);
            });
    }

    showClientModalWithDefaults(serverId, modalTitle, clientName, applyISettings, iSettings, defaultISettings, client) {
        // Determine if this is edit mode
        const isEditMode = !!client;
        
        // Format created_at if it exists
        let created_at_html = '';
        if (client && client.created_at) {
            const createdDate = new Date(client.created_at * 1000);
            created_at_html = `
                <div class="bg-gray-50 p-3 rounded-lg mb-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-xs text-gray-500">Created at:</span>
                            <span class="text-sm font-mono ml-2">${createdDate.toLocaleString()}</span>
                        </div>
                        <div class="text-xs text-gray-400">
                            ${Math.floor((Date.now() - createdDate) / (1000 * 60 * 60 * 24))} days ago
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Format suspend_at if it exists
        let suspend_at_value = '';
        if (client && client.suspend_at) {
            const suspendDate = new Date(client.suspend_at * 1000);

            // Format the date in local time for the input field
            const year = suspendDate.getFullYear();
            const month = String(suspendDate.getMonth() + 1).padStart(2, '0'); // Month is zero-based
            const day = String(suspendDate.getDate()).padStart(2, '0');
            const hours = String(suspendDate.getHours()).padStart(2, '0');
            const minutes = String(suspendDate.getMinutes()).padStart(2, '0');

            // Combine into the format required by datetime-local: YYYY-MM-DDTHH:mm
            suspend_at_value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        
        const modalHtml = `
            <div id="clientModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                <div class="relative p-8 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-2xl rounded-2xl bg-white max-h-[90vh] overflow-y-auto">
                    <div class="flex flex-col">
                        <div class="flex justify-between items-center w-full mb-6">
                            <h3 class="text-xl font-bold text-gray-900">${modalTitle}</h3>
                            <button onclick="amneziaApp.closeClientModal()"
                                    class="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        
                        ${created_at_html}
                        
                        <form id="clientForm" class="space-y-6">
                            <input type="hidden" id="serverId" value="${serverId}">
                            <input type="hidden" id="clientId" value="${client ? client.id : ''}">
                            
                            <div>
                                <label for="clientName" class="block text-sm font-medium text-gray-700 mb-2">
                                    Client Name
                                </label>
                                <input type="text" id="clientName" value="${clientName}"
                                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}"
                                    ${isEditMode ? 'readonly' : ''}
                                    required>
                            </div>
                            
                            <!-- Scheduled Suspension Section (only for edit mode) -->
                            ${isEditMode ? `
                            <div class="pt-4 border-t border-gray-200 flex items-center space-x-2">
                                <label for="suspendAt" class="block text-sm font-medium text-gray-700 mb-2 flex-1">
                                    Auto-suspend client at:
                                </label>
                                <button type="button" id="clearSuspendAt" onclick="document.getElementById('suspendAt').value = ''"
                                    class="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    Reset
                                </button>
                            </div>
                            <input type="datetime-local" id="suspendAt" value="${suspend_at_value}"
                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-1">
                            <p class="text-xs text-gray-500 mt-1">
                                Client will be automatically suspended at the specified date/time.<br>
                                Leave empty to disable auto-suspension (still need to activate client after suspension).
                            </p>
                            ` : ''}
                            
                            <div class="pt-4 border-t border-gray-200">
                                <div class="flex items-center mb-4">
                                    <input type="checkbox" id="applyISettings"
                                        ${applyISettings ? 'checked' : ''}
                                        class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                                    <label for="applyISettings" class="ml-3 block text-sm font-medium text-gray-700">
                                        Apply I-settings (AmneziaWG 1.5 protocol)
                                    </label>
                                </div>
                                <p class="text-sm text-gray-500 mb-4">
                                    Enable I1-I5 protocol settings for this client. If left empty, server defaults will be used.
                                </p>
                                
                                <div id="iSettingsSection" style="display: ${applyISettings ? 'block' : 'none'};"
                                    class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                                    <h4 class="text-sm font-medium text-gray-700 mb-3">I-settings (Optional - override server defaults)</h4>
                                    
                                    <div>
                                        <label for="i1" class="block text-sm font-medium text-gray-700 mb-1">
                                            I1 (Required if using I-settings):
                                        </label>
                                        <input type="text" id="i1" value="${iSettings.i1 || ''}"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="${defaultISettings.i1 ? 'Server default: ' + defaultISettings.i1.substring(0, 50) + '...' : 'Leave empty to skip'}">
                                        <p class="text-xs text-gray-500 mt-1">
                                            If I1 is empty, all I-settings will be ignored.
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <label for="i2" class="block text-sm font-medium text-gray-700 mb-1">
                                            I2 (Optional):
                                        </label>
                                        <input type="text" id="i2" value="${iSettings.i2 || ''}"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="${defaultISettings.i2 ? 'Server default: ' + defaultISettings.i2.substring(0, 50) + '...' : 'Leave empty to skip'}">
                                    </div>
                                    
                                    <div>
                                        <label for="i3" class="block text-sm font-medium text-gray-700 mb-1">
                                            I3 (Optional):
                                        </label>
                                        <input type="text" id="i3" value="${iSettings.i3 || ''}"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="${defaultISettings.i3 ? 'Server default: ' + defaultISettings.i3.substring(0, 50) + '...' : 'Leave empty to skip'}">
                                    </div>
                                    
                                    <div>
                                        <label for="i4" class="block text-sm font-medium text-gray-700 mb-1">
                                            I4 (Optional):
                                        </label>
                                        <input type="text" id="i4" value="${iSettings.i4 || ''}"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="${defaultISettings.i4 ? 'Server default: ' + defaultISettings.i4.substring(0, 50) + '...' : 'Leave empty to skip'}">
                                    </div>
                                    
                                    <div>
                                        <label for="i5" class="block text-sm font-medium text-gray-700 mb-1">
                                            I5 (Optional):
                                        </label>
                                        <input type="text" id="i5" value="${iSettings.i5 || ''}"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="${defaultISettings.i5 ? 'Server default: ' + defaultISettings.i5.substring(0, 50) + '...' : 'Leave empty to skip'}">
                                    </div>
                                    
                                    <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                        <p class="text-xs text-blue-700">
                                            <strong>Note:</strong> I-settings are client-only parameters. Empty values are omitted from generated configs.<br>
                                            If config becomes too large for QR code, use "Download Config File" instead.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex justify-end space-x-4 w-full pt-6 border-t border-gray-200">
                                <button type="button" onclick="amneziaApp.closeClientModal()"
                                        class="bg-gray-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-600 transition-colors duration-200">
                                    Cancel
                                </button>
                                <button type="submit"
                                        class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 shadow hover:shadow-lg">
                                    ${client ? 'Update Client' : 'Add Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Close any existing modal first
        this.closeClientModal();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Setup form submission
        const form = document.getElementById('clientForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveClient();
            });
        }
        
        // Setup I-settings toggle
        const applyISettingsCheckbox = document.getElementById('applyISettings');
        if (applyISettingsCheckbox) {
            applyISettingsCheckbox.addEventListener('change', (e) => {
                const iSettingsSection = document.getElementById('iSettingsSection');
                if (iSettingsSection) {
                    iSettingsSection.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
    }


    loadDefaultISettings() {
        api.getDefaults()
        .then(data => {
            // Установка значений в поля формы
            const mtuInput = ui.getElement('serverMTU');
            if (mtuInput && data.mtu) {
                mtuInput.value = data.mtu;
            }
            
            const subnetInput = ui.getElement('serverSubnet');
            if (subnetInput && data.subnet) {
                subnetInput.value = data.subnet;
            }
            
            const portInput = ui.getElement('serverPort');
            if (portInput && data.port) {
                portInput.value = data.port;
            }
            
            const dnsInput = ui.getElement('serverDNS');
            if (dnsInput && data.dns) {
                dnsInput.value = data.dns;
            }
            
            console.log('Defaults loaded:', data);
        })
        .catch(error => {
            console.error('Error loading defaults:', error);
        });
    }


    showServerConfig(serverId) {
        api.getServerInfo(serverId)
            .then(serverInfo => {
                this.displayServerConfigModal(serverInfo);
            })
            .catch(error => {
                console.error('Error fetching server info:', error);
                alert('Error loading server configuration: ' + error.message);
            });
    }

    showRawServerConfig(serverId) {
        api.getServerInfo(serverId)
            .then(config => {
                this.displayRawConfigModal(config);
            })
            .catch(error => {
                console.error('Error fetching server config:', error);
                alert('Error loading server configuration: ' + error.message);
            });
    }

    downloadServerConfig(serverId) {
        api.downloadServerConfig(serverId);
    }

    displayServerConfigModal(serverInfo) {
        const modalHtml = `
            <div id="configModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                    <div class="mt-3">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-medium text-gray-900">Server Configuration: ${serverInfo.name}</h3>
                            <button onclick="amneziaApp.closeModal()" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div class="bg-gray-50 p-3 rounded">
                                <h4 class="font-semibold text-sm text-gray-700 mb-2">Basic Information</h4>
                                <div class="space-y-1 text-sm">
                                    <div><span class="font-medium">Interface:</span> ${serverInfo.interface}</div>
                                    <div><span class="font-medium">Port:</span> ${serverInfo.port}</div>
                                    <div><span class="font-medium">Subnet:</span> ${serverInfo.subnet}</div>
                                    <div><span class="font-medium">Server IP:</span> ${serverInfo.server_ip}</div>
                                    <div><span class="font-medium">Public IP:</span> ${serverInfo.public_ip}</div>
                                    <div><span class="font-medium">Status:</span>
                                        <span class="px-2 py-1 rounded-full text-xs ${
                                            serverInfo.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }">${serverInfo.status}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-gray-50 p-3 rounded">
                                <h4 class="font-semibold text-sm text-gray-700 mb-2">Configuration</h4>
                                <div class="space-y-1 text-sm">
                                    <div><span class="font-medium">Protocol:</span> ${serverInfo.protocol}</div>
                                    <div><span class="font-medium">Obfuscation:</span> ${serverInfo.obfuscation_enabled ? 'Enabled' : 'Disabled'}</div>
                                    <div><span class="font-medium">Clients:</span> ${serverInfo.clients_count}</div>
                                    <div><span class="font-medium">DNS:</span> ${serverInfo.dns.join(', ')}</div>
                                    <div><span class="font-medium">MTU:</span> ${serverInfo.mtu}</div>
                                    <div class="truncate"><span class="font-medium">Public Key:</span>
                                        <span class="font-mono text-xs">${serverInfo.public_key}</span>
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
                                        <div class="font-mono">${value}</div>
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
                                        <div class="font-mono truncate" title="${value}">
                                            ${value ? value.substring(0, 20) + '...' : 'empty'}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <p class="text-xs text-purple-600 mt-2">
                                These defaults are used for new clients when "Apply I-settings" is enabled.
                            </p>
                        </div>
                        ` : ''}

                        <div class="mb-4">
                            <h4 class="font-semibold text-sm text-gray-700 mb-2">Configuration Preview</h4>
                            <pre class="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-40 overflow-y-auto">${serverInfo.config_preview}</pre>
                        </div>

                        <div class="flex justify-end space-x-3 pt-4 border-t">
                            <button onclick="amneziaApp.showRawServerConfig('${serverInfo.id}')"
                                    class="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">
                                View Full Config
                            </button>
                            <button onclick="amneziaApp.downloadServerConfig('${serverInfo.id}')"
                                    class="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">
                                Download Config
                            </button>
                            <button onclick="amneziaApp.closeModal()"
                                    class="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    displayRawConfigModal(config) {
        // Encode the config for safe passing through HTML attribute
        const encodedConfig = encodeURIComponent(JSON.stringify(config));
        const modalHtml = `
            <div id="rawConfigModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
                    <div class="mt-3">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-medium text-gray-900">Raw Configuration: ${config.server_name}</h3>
                            <button onclick="amneziaApp.closeModal()" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <div class="mb-4">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-sm text-gray-600">Config path: ${config.config_path}</span>
                                <button onclick="amneziaApp.copyToClipboard(decodeURIComponent('${encodedConfig}'))"
                                        class="bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600">
                                    Copy JSON
                                </button>
                            </div>
                            <pre class="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto max-h-96 overflow-y-auto">${config.config_content}</pre>
                        </div>

                        <div class="flex justify-end space-x-3 pt-4 border-t">
                            <button onclick="amneziaApp.downloadServerConfig('${config.server_id}')"
                                    class="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">
                                Download Config
                            </button>
                            <button onclick="amneziaApp.closeModal()"
                                    class="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Close any existing modal first
        this.closeModal();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    closeModal() {
        const existingModal = document.getElementById('configModal') || document.getElementById('rawConfigModal');
        if (existingModal) {
            existingModal.remove();
        }
    }


    async fetchAndGenerateQRCode() {
        try {
            const configBothUrl = `/api/servers/${this.qrServerId}/clients/${this.qrClientId}/config-both`;
            const response = await fetch(configBothUrl);
            
            if (response.ok) {
                const data = await response.json();
                this.currentCleanConfig = data.clean_config || '';
                this.currentFullConfig = data.full_config || '';
                this.currentConfigType = 'clean';
                
                // Update date information in the modal
                if (data.created_at) {
                    const createdDate = new Date(data.created_at * 1000);
                    const formattedCreatedDate = createdDate.toLocaleString('en-GB', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    const createdAtSpan = document.getElementById('createdAt');
                    if (createdAtSpan) createdAtSpan.textContent = formattedCreatedDate;
                } else {
                    const createdAtSpan = document.getElementById('createdAt');
                    if (createdAtSpan) createdAtSpan.textContent = 'Unknown';
                }
                
                if (data.suspend_at) {
                    const suspendDate = new Date(data.suspend_at * 1000);
                    const formattedSuspendDate = suspendDate.toLocaleString('en-GB', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    const suspendAtSpan = document.getElementById('suspendAt');
                    if (suspendAtSpan) suspendAtSpan.textContent = formattedSuspendDate;
                } else {
                    const suspendAtSpan = document.getElementById('suspendAt');
                    if (suspendAtSpan) suspendAtSpan.textContent = 'Not set';
                }
            } else {
                const configUrl = `/api/servers/${this.qrServerId}/clients/${this.qrClientId}/config`;
                const configResponse = await fetch(configUrl);
                if (!configResponse.ok) {
                    throw new Error('Failed to fetch config');
                }
                const configText = await configResponse.text();
                this.currentCleanConfig = configText;
                this.currentFullConfig = configText;
                this.currentConfigType = 'clean';
            }
            
            // Update UI elements
            const configTextArea = document.getElementById('configText');
            const configLengthSpan = document.getElementById('configLength');
            const configTypeLabel = document.getElementById('configType');
            
            if (configTextArea) configTextArea.value = this.currentCleanConfig;
            if (configLengthSpan) configLengthSpan.textContent = `Length: ${this.currentCleanConfig.length} chars`;
            if (configTypeLabel) configTypeLabel.textContent = 'Clean Config';
            
            // Get DOM elements
            const qrWarning = document.getElementById('qrTooLargeWarning');
            const qrContainer = document.getElementById('qrCodeContainer');
            const qrCodeText = document.getElementById('qrCodeText');
            const downloadQRBtn = document.getElementById('downloadQRBtn');
            const qrDiv = document.getElementById('qrcode');
            
            // Check if config is too large for QR code
            const isTooLarge = this.currentCleanConfig.length > 2000;
            
            if (isTooLarge) {
                // Show size warning BEFORE attempting QR generation
                this.showSizeWarning(qrWarning, qrContainer, qrCodeText, downloadQRBtn, qrDiv);
                return; // Stop here, don't try to generate QR code
            }
            else {
                // Config is small enough, try to generate QR code
                this.generateQRCode(qrWarning, qrContainer, qrCodeText, downloadQRBtn, qrDiv);
            }
        } catch (error) {
            console.error('Error fetching config for QR code:', error);
            ui.showTempMessage('Failed to generate QR code: ' + error.message, 'error');
            this.closeQRModal();
        }
    }

    // Helper method to show size warning
    showSizeWarning(qrWarning, qrContainer, qrCodeText, downloadQRBtn, qrDiv) {
        // Hide QR code section
        if (qrContainer) qrContainer.classList.add('hidden');
        if (qrCodeText) qrCodeText.classList.add('hidden');
        if (downloadQRBtn) downloadQRBtn.classList.add('hidden');
        if (qrDiv) qrDiv.innerHTML = '';
        
        // Show warning with size information
        if (qrWarning) {
            qrWarning.classList.remove('hidden');
            const warningText = qrWarning.querySelector('p');
            if (warningText) {
                warningText.innerHTML =
                    `<strong>Config too large for QR code!</strong><br>
                    Configuration size: ${this.currentCleanConfig.length} characters (max: 2000).<br>
                    Please use "Download Config File" instead.`;
            }
        }
    }

    // Helper method to generate QR code
    generateQRCode(qrWarning, qrContainer, qrCodeText, downloadQRBtn, qrDiv) {
        // Show QR code section
        if (qrWarning) qrWarning.classList.add('hidden');
        if (qrContainer) qrContainer.classList.remove('hidden');
        if (qrCodeText) qrCodeText.classList.remove('hidden');
        if (downloadQRBtn) downloadQRBtn.classList.remove('hidden');
        
        // Clear previous QR code
        if (qrDiv) {
            qrDiv.innerHTML = '';
            
            try {
                // Generate new QR code
                new QRCode(qrDiv, {
                    text: this.currentCleanConfig,
                    width: 300,
                    height: 300,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M,
                    margin: 1
                });
                
                console.log('QR code generated successfully');
                
            } catch (qrError) {
                console.error('QR code generation error:', qrError);
                
                // Show error in warning box
                if (qrWarning) {
                    qrWarning.classList.remove('hidden');
                    const warningText = qrWarning.querySelector('p');
                    if (warningText) {
                        warningText.innerHTML =
                            `<strong>Failed to generate QR code!</strong><br>
                            ${qrError.message}<br>
                            Please use "Download Config File" instead.`;
                    }
                    
                    // Hide QR code section again
                    if (qrContainer) qrContainer.classList.add('hidden');
                    if (qrCodeText) qrCodeText.classList.add('hidden');
                    if (downloadQRBtn) downloadQRBtn.classList.add('hidden');
                }
            }
        }
    }

    updateConfigTypeLabel() {
        const configTypeLabel = document.getElementById('configType');
        if (configTypeLabel) {
            configTypeLabel.textContent = this.currentConfigType === 'clean' ? 'Clean Config' : 'Full Config';
        }
    }


    copyToClipboard(text) {
        // Decode base64 text if it's the JSON data
        try {
            const decodedText = atob(text);
            const jsonData = JSON.parse(decodedText);
            text = jsonData.config_content || decodedText;
        } catch (e) {
            // If it's not base64 JSON, use the text as is
        }

        navigator.clipboard.writeText(text).then(() => {
            // Show a temporary notification
            ui.showTempMessage('Configuration copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            ui.showTempMessage('Failed to copy to clipboard', 'error');
        });
    }
}

// Initialize the application
const app = new AmneziaApp();
window.amneziaApp = {
    // Из server.js
    deleteServer: server.deleteServer,
    startServer: server.startServer,
    stopServer: server.stopServer,

     // Из client.js
    addClient: client.addClient,
    editClient: client.editClient,
    deleteClient: client.deleteClient,
    suspendClient: client.suspendClient,
    activateClient: client.activateClient,
    downloadClientConfig: client.downloadClientConfig,
    showClientQRCode: client.showClientQRCode,
    closeQRModal: client.closeQRModal,
    saveClient: client.saveClient,
    closeClientModal: client.closeClientModal,
    toggleConfigView: client.toggleConfigView,
    copyConfigText: client.copyConfigText,
    downloadQRCode: client.downloadQRCode,

    // Логи
    toggleLogsSection: () => logs.toggleLogsSection(),
    reloadCurrentLog: () => logs.reloadCurrentLog(),
    downloadCurrentLog: () => logs.downloadCurrentLog(),
    switchLogTab: (index) => logs.switchLogTab(index),

    // Из main.js (оставшиеся методы)
    showServerConfig: (serverId) => app.showServerConfig(serverId),
    showRawServerConfig: (serverId) => app.showRawServerConfig(serverId),
    downloadServerConfig: (serverId) => app.downloadServerConfig(serverId),
    closeModal: () => app.closeModal(),
    copyToClipboard: (text) => app.copyToClipboard(text),

    createServer: () => app.createServer(),
    refreshPublicIp: () => app.refreshPublicIp(),
    toggleForm: () => app.toggleForm(),
    generateRandomParams: () => app.generateRandomParams(),
    logout: () => app.logout()
};