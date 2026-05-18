import * as ui from './ui.js';

export function generateRandomParams() {
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

export function validateForm() {
    let isValid = true;

    // Reset errors
    ui.hideError('nameError');
    ui.hideError('portError');
    ui.hideError('subnetError');
    ui.hideError('mtuError');
    ui.hideError('dnsError');

    const name = ui.getElement('serverName')?.value.trim();
    if (!name) {
        ui.showError('nameError', 'Server name is required');
        isValid = false;
    }

    const port = parseInt(ui.getElement('serverPort')?.value);
    if (!port || port < 1 || port > 65535) {
        ui.showError('portError', 'Port must be between 1 and 65535');
        isValid = false;
    }

    const subnet = ui.getElement('serverSubnet')?.value;
    const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!subnet || !subnetRegex.test(subnet)) {
        ui.showError('subnetError', 'Valid subnet is required (e.g., 10.0.0.0/24)');
        isValid = false;
    }

    const mtu = parseInt(ui.getElement('serverMTU')?.value);
    if (!mtu || mtu < 1280 || mtu > 1440) {
        ui.showError('mtuError', 'MTU must be between 1280 and 1440');
        isValid = false;
    }


    const dns = ui.getElement('serverDNS')?.value.trim();
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

export function validateObfuscationParams(params, mtu) {
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

export function collectObfuscationParams(formData) {
    const params = {
        Jc: parseInt(ui.getElement('paramJc')?.value || '8'),
        Jmin: parseInt(ui.getElement('paramJmin')?.value || '8'),
        Jmax: parseInt(ui.getElement('paramJmax')?.value || '80'),
        S1: parseInt(ui.getElement('paramS1')?.value || '50'),
        S2: parseInt(ui.getElement('paramS2')?.value || '60'),
        H1: ui.getElement('paramH1')?.value || '1000',
        H2: ui.getElement('paramH2')?.value || '2000',
        H3: ui.getElement('paramH3')?.value || '3000',
        H4: ui.getElement('paramH4')?.value || '4000'
    };
    if (formData.awg2) {
        params.S3 = parseInt(ui.getElement('paramS3')?.value || '0');
        params.S4 = parseInt(ui.getElement('paramS4')?.value || '0');
    }
    return params;
}

export function getServerFormData() {
    return {
        name: ui.getElement('serverName')?.value.trim() || 'New Server',
        public_ip: ui.getElement('serverPublicIp')?.value.trim() || '',
        port: parseInt(ui.getElement('serverPort')?.value) || 51820,
        subnet: ui.getElement('serverSubnet')?.value || '192.168.99.0/24',
        mtu: parseInt(ui.getElement('serverMTU')?.value) || 1420,
        dns: ui.getElement('serverDNS')?.value.trim() || '1.1.1.1,9.9.9.9',
        obfuscation: ui.getElement('enableObfuscation')?.checked ?? true,
        awg2: ui.getElement('enableAwg2')?.checked ?? true,
        auto_start: ui.getElement('autoStart')?.checked ?? true
    };
}