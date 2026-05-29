import * as ui from './ui.js';
import * as api from './api.js'
import * as form from './form.js';

async function loadDefaultSettings() {
    try {
        const defaults = await api.getDefaults();
        const mtuInput = ui.getElement('serverMTU');
        if (mtuInput && defaults.mtu) mtuInput.value = defaults.mtu;
        const subnetInput = ui.getElement('serverSubnet');
        if (subnetInput && defaults.subnet) subnetInput.value = defaults.subnet;
        const portInput = ui.getElement('serverPort');
        if (portInput && defaults.port) portInput.value = defaults.port;
        const dnsInput = ui.getElement('serverDNS');
        if (dnsInput && defaults.dns) dnsInput.value = defaults.dns;
    } catch (error) {
        console.error('Error loading default settings:', error);
    }
}

async function loadExistingServers() {
    const container = document.getElementById('existingServersTable');
    if (!container) return;
    try {
        const servers = await api.getServers();
        if (!servers || servers.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">No servers created yet.</div>';
            return;
        }
        // Формируем таблицу 2 колонки
        let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
        for (let i = 0; i < servers.length; i++) {
            const s = servers[i];
            const info = `${s.name} (${s.subnet}, port:${s.port})`;
            html += `<div class="bg-gray-50 p-3 rounded shadow-sm text-sm">${ui.escapeHtml(info)}</div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        console.error('Failed to load existing servers:', err);
        container.innerHTML = '<div class="text-red-500 text-center py-4">Failed to load servers.</div>';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadDefaultSettings();
    await loadExistingServers();

    const serverForm = ui.getElement('serverForm');
    if (serverForm) serverForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createServer();
    });

    const randomBtn = ui.getElement('randomParamsBtn');
    if (randomBtn) randomBtn.addEventListener('click', form.generateRandomParams);

    // Валидация на ввод
    const nameEl = ui.getElement('serverName');
    if (nameEl) nameEl.addEventListener('input', () => ui.hideError('nameError'));
    const portEl = ui.getElement('serverPort');
    if (portEl) portEl.addEventListener('input', () => ui.hideError('portError'));
    const subnetEl = ui.getElement('serverSubnet');
    if (subnetEl) subnetEl.addEventListener('input', () => ui.hideError('subnetError'));
    const mtuEl = ui.getElement('serverMTU');
    if (mtuEl) mtuEl.addEventListener('input', () => ui.hideError('mtuError'));
    const dnsEl = ui.getElement('serverDNS');
    if (dnsEl) dnsEl.addEventListener('input', () => ui.hideError('dnsError'));

    const obfChk = ui.getElement('enableObfuscation');
    if (obfChk) {
        obfChk.addEventListener('change', (e) => toggleObfuscationParams(e.target.checked));
        toggleObfuscationParams(obfChk.checked);
    }
    const awg2Chk = ui.getElement('enableAwg2');
    if (awg2Chk) {
        awg2Chk.addEventListener('change', (e) => toggleAwg2Fields(e.target.checked));
        toggleAwg2Fields(awg2Chk.checked);
    }
});

function toggleObfuscationParams(show) {
    const div = ui.getElement('obfuscationParams');
    if (div) div.style.display = show ? 'block' : 'none';
}
function toggleAwg2Fields(show) {
    const s3 = document.getElementById('awg2FieldS3');
    const s4 = document.getElementById('awg2FieldS4');
    if (s3) s3.style.display = show ? 'block' : 'none';
    if (s4) s4.style.display = show ? 'block' : 'none';
}

async function createServer() {
    if (!form.validateForm()) {
        ui.showTempMessage('Please fix the form errors', 'error');
        return;
    }
    let formData = form.getServerFormData();
    if (formData.obfuscation) {
        const obfParams = form.collectObfuscationParams(formData);
        formData.obfuscation_params = obfParams;
        const errors = form.validateObfuscationParams(obfParams, formData.mtu);
        if (errors.length) {
            ui.showError('obfuscationError', errors.join(' '));
            return;
        } else {
            ui.hideError('obfuscationError');
        }
    }
    const btn = ui.getElement('createButton');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    try {
        await api.createServer(formData);
        ui.showTempMessage('Server created successfully! Redirecting...', 'success');
        setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (err) {
        ui.showTempMessage('Error: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Create Server';
    }
}