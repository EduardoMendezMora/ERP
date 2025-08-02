// ===== CONFIGURACIÓN DE APIs =====
const API_CONFIG = {
    CLIENTS: 'https://sheetdb.io/api/v1/qu62bagiwlgqy',
    INVOICES: 'https://sheetdb.io/api/v1/qu62bagiwlgqy',
    PAYMENTS: 'https://sheetdb.io/api/v1/a7oekivxzreg7'
};

// ===== CONFIGURACIÓN ULTRAMSG =====
const ULTRAMSG_CONFIG = {
    TOKEN: 'wp98xs1qrfhqg9ya',
    INSTANCE_ID: 'instance112077',
    BASE_URL: 'https://api.ultramsg.com'
};

// ===== CONFIGURACIÓN DE GRUPOS WHATSAPP =====
const GRUPOS_CLIENTES = {
    // Mapeo de ID Cliente → ID Grupo WhatsApp (solo para casos especiales)
    // El sistema lee automáticamente el campo "idGrupoWhatsapp" de la base de datos
    // Solo agrega aquí IDs si necesitas sobrescribir el valor de la BD
};

// ===== VARIABLES GLOBALES =====
let currentClient = null;
let clientInvoices = [];
let unassignedPayments = [];
let assignedPayments = [];
let currentClientId = null;
let currentReceiptData = null;

// Variables para los modales de asignación
let currentPaymentForAssignment = null;
let currentInvoiceForAssignment = null;
let selectedInvoiceForPayment = null;
let selectedPaymentForInvoice = null;

// Estado de control de secciones
let sectionVisibility = {
    unassigned: true,
    overdue: true,
    upcoming: true,
    assigned: true,
    paid: true
};

// ===== FUNCIONES DE DEBUGGING =====
function debugClientState() {
    console.log('🔍 === ESTADO COMPLETO DE VARIABLES ===');
    console.log('📋 Variables de Cliente:');
    console.log('  currentClient (local):', typeof currentClient !== 'undefined' ? currentClient : 'undefined');
    console.log('  window.currentClient:', window.currentClient);
    console.log('  currentClientId:', currentClientId);
    console.log('  window.currentClientId:', window.currentClientId);

    console.log('📊 Variables de Datos:');
    console.log('  clientInvoices length:', clientInvoices?.length || 0);
    console.log('  window.clientInvoices length:', window.clientInvoices?.length || 0);
    console.log('  unassignedPayments length:', unassignedPayments?.length || 0);
    console.log('  assignedPayments length:', assignedPayments?.length || 0);

    console.log('🎛️ Control de Secciones:');
    console.log('  sectionVisibility:', sectionVisibility);

    // Verificar estado del DOM
    console.log('🖥️ Estado del DOM:');
    const clientNameEl = document.getElementById('clientName');
    const mainContentEl = document.getElementById('mainContent');
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('errorState');

    console.log('  clientName element:', clientNameEl ? clientNameEl.textContent : 'No encontrado');
    console.log('  mainContent visible:', mainContentEl ? mainContentEl.style.display !== 'none' : 'No encontrado');
    console.log('  loading visible:', loadingEl ? loadingEl.style.display !== 'none' : 'No encontrado');
    console.log('  error visible:', errorEl ? errorEl.style.display !== 'none' : 'No encontrado');

    console.log('========================================');
}

function forceClientSync() {
    console.log('🔄 Forzando sincronización de variables de cliente...');

    // Intentar sincronizar desde cualquier fuente disponible
    const client = window.currentClient || currentClient;

    if (client) {
        currentClient = client;
        window.currentClient = client;
        console.log('✅ Cliente sincronizado:', client.Nombre, '(ID:', client.ID, ')');
        return true;
    } else {
        console.log('❌ No hay cliente disponible para sincronizar');
        return false;
    }
}

function validateSystemState() {
    console.log('🔍 Validando estado del sistema...');

    const issues = [];

    // Verificar cliente
    if (!window.currentClient && !currentClient) {
        issues.push('❌ No hay cliente cargado');
    } else if (window.currentClient !== currentClient) {
        issues.push('⚠️ Variables de cliente desincronizadas');
    }

    // Verificar ID de cliente
    if (!window.currentClientId && !currentClientId) {
        issues.push('❌ No hay ID de cliente');
    }

    // Verificar datos
    if (!Array.isArray(clientInvoices)) {
        issues.push('❌ clientInvoices no es un array');
    }

    if (!Array.isArray(unassignedPayments)) {
        issues.push('❌ unassignedPayments no es un array');
    }

    if (!Array.isArray(assignedPayments)) {
        issues.push('❌ assignedPayments no es un array');
    }

    if (issues.length === 0) {
        console.log('✅ Sistema en estado válido');
        return true;
    } else {
        console.log('⚠️ Problemas detectados:');
        issues.forEach(issue => console.log('  ', issue));
        return false;
    }
}

// ===== FUNCIONES DE FECHA =====
function parseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        console.warn('parseDate: valor vacío o no es string:', dateStr);
        return null;
    }
    // Intentar parsear la fecha
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length < 3) {
        console.warn('parseDate: formato de fecha no reconocido:', dateStr);
        return null;
    }
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
        console.warn('parseDate: fecha inválida:', dateStr);
        return null;
    }
    return new Date(year, month, day);
}

function formatDateForDisplay(dateString) {
    const date = parseDate(dateString);
    if (!date) return dateString || 'Fecha inválida';

    try {
        return date.toLocaleDateString('es-CR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

function formatDateForStorage(date) {
    try {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`; // DD/MM/YYYY para Google Sheets
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return '';
    }
}

function formatDateForInput(dateString) {
    const date = parseDate(dateString);
    if (!date) return '';

    try {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error al formatear fecha para input:', error);
        return '';
    }
}

// ===== FUNCIONES DE CÁLCULO DE MULTAS =====
function calculateFinesUntilDate(invoice, targetDate) {
    const dueDateStr = invoice.FechaVencimiento;
    if (!dueDateStr) return 0;

    const dueDate = parseDate(dueDateStr);
    const paymentDate = parseDate(targetDate);

    if (!dueDate || !paymentDate) return 0;

    // Normalizar fechas (sin horas)
    dueDate.setHours(0, 0, 0, 0);
    paymentDate.setHours(0, 0, 0, 0);

    // Si el pago es antes o el día del vencimiento, no hay multas
    if (paymentDate <= dueDate) return 0;

    // Solo calcular multas para facturas de arrendamiento (NO manuales)
    const isManualInvoice = invoice.TipoFactura === 'Manual' ||
        invoice.NumeroFactura?.startsWith('MAN-') ||
        invoice.ConceptoManual;

    if (isManualInvoice) return 0;

    // Calcular días de atraso hasta la fecha del pago
    const diffTime = paymentDate.getTime() - dueDate.getTime();
    const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return daysLate * 2000; // ₡2,000 por día
}

function calculateDaysOverdue(dueDateString, referenceDate = new Date()) {
    const dueDate = parseDate(dueDateString);
    if (!dueDate) return 0;

    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (today <= dueDate) return 0;

    const diffTime = today.getTime() - dueDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// ===== FUNCIONES DE DETECCIÓN DE CLIENTES =====
function isClientIdInObservations(observations, clientId) {
    if (!observations || !clientId) return false;

    const obsText = observations.toString().trim();
    const targetId = clientId.toString();

    console.log(`🔍 Buscando ID "${targetId}" en observaciones: "${obsText}"`);

    // Patrones para buscar el ID del cliente
    const patterns = [
        // ID exacto como palabra completa
        new RegExp(`\\b${targetId}\\b`, 'i'),

        // ID con prefijos comunes
        new RegExp(`(?:cliente|client|id|código|codigo)[-:\\s]*${targetId}\\b`, 'i'),

        // ID al inicio de línea o después de espacios
        new RegExp(`(?:^|\\s)${targetId}(?:\\s|$)`, 'i'),

        // ID entre delimitadores
        new RegExp(`[-_#:]${targetId}[-_#:\\s]`, 'i'),

        // Formato "ID: 123456"
        new RegExp(`id[-:\\s]+${targetId}`, 'i')
    ];

    // Verificar cada patrón
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        if (pattern.test(obsText)) {
            console.log(`🎯 ID ${targetId} encontrado en observaciones con patrón ${i + 1}`);
            return true;
        }
    }

    return false;
}

function testClientIdDetection(clientId, observationsText) {
    console.log('🧪 Probando detección de ID de cliente:');
    console.log(`   Cliente ID: ${clientId}`);
    console.log(`   Observaciones: "${observationsText}"`);
    console.log(`   Resultado: ${isClientIdInObservations(observationsText, clientId) ? '✅ DETECTADO' : '❌ NO DETECTADO'}`);
}

// ===== FUNCIONES DE PARSEO DE MONTOS =====
function parsePaymentAmount(paymentAmount, bankSource) {
    if (!paymentAmount) return 0;

    let cleanAmount = paymentAmount.toString().trim();

    if (bankSource === 'BAC') {
        // BAC usa formato europeo: 105.000.00 (puntos como separadores de miles)
        const parts = cleanAmount.split('.');

        if (parts.length > 2) {
            // Formato: 105.000.00 -> unir los primeros como miles y el último como decimales
            const integerPart = parts.slice(0, -1).join('');
            const decimalPart = parts[parts.length - 1];
            cleanAmount = integerPart + '.' + decimalPart;
        } else if (parts.length === 2 && parts[1].length <= 2) {
            // Formato: 105.00 (ya correcto)
            cleanAmount = cleanAmount;
        } else if (parts.length === 2 && parts[1].length > 2) {
            // Formato: 105.000 (es separador de miles, no decimal)
            cleanAmount = parts.join('');
        }

        console.log(`💰 BAC Amount: "${paymentAmount}" -> "${cleanAmount}" = ${parseFloat(cleanAmount)}`);
    } else {
        // BN y HuberBN usan formato normal con comas como separadores de miles
        cleanAmount = cleanAmount.replace(/,/g, '');
    }

    return parseFloat(cleanAmount) || 0;
}

// ===== FUNCIONES DE BANCO =====
function getBankDisplayName(bankSource) {
    switch (bankSource) {
        case 'BAC': return 'BAC Credomatic';
        case 'BN': return 'Banco Nacional de Costa Rica';
        case 'HuberBN': return 'Huber - Banco Nacional';
        default: return bankSource;
    }
}

function getBankBadgeClass(bankSource) {
    switch (bankSource) {
        case 'BAC': return 'bank-bac';
        case 'BN': return 'bank-bn';
        case 'HuberBN': return 'bank-huberbn';
        default: return 'bank-bac';
    }
}

// ===== FUNCIONES DE WHATSAPP =====
function getWhatsAppDestination(client) {
    console.log('🔍 Buscando destinatario para cliente:', client.ID, client.Nombre);

    // 1. PRIORIDAD: Buscar campo idGrupoWhatsapp en la base de datos
    if (client.idGrupoWhatsapp && client.idGrupoWhatsapp.includes('@g.us')) {
        console.log('✅ Encontrado grupo en BD (idGrupoWhatsapp):', client.idGrupoWhatsapp);
        return {
            type: 'group',
            id: client.idGrupoWhatsapp,
            name: `Grupo ${client.Nombre}`
        };
    }

    // 2. Buscar en grupos configurados por ID (override de BD)
    if (GRUPOS_CLIENTES[client.ID]) {
        console.log('✅ Encontrado grupo configurado (override):', GRUPOS_CLIENTES[client.ID]);
        return {
            type: 'group',
            id: GRUPOS_CLIENTES[client.ID],
            name: `Grupo ${client.Nombre}`
        };
    }

    // 3. Buscar campo grupoWhatsApp alternativo (compatibilidad)
    if (client.grupoWhatsApp && client.grupoWhatsApp.includes('@g.us')) {
        console.log('✅ Encontrado grupo en BD (grupoWhatsApp):', client.grupoWhatsApp);
        return {
            type: 'group',
            id: client.grupoWhatsApp,
            name: `Grupo ${client.Nombre}`
        };
    }

    // 4. FALLBACK: Número personal
    if (client.numeroTelefono) {
        console.log('⚠️ NO SE ENCONTRÓ GRUPO - Usando número personal como fallback:', client.numeroTelefono);
        return {
            type: 'personal',
            id: formatPhoneForWhatsApp(client.numeroTelefono),
            name: client.Nombre
        };
    }

    console.log('❌ No se encontró destinatario válido');
    return null;
}

function formatPhoneForWhatsApp(phone) {
    // Remover todos los caracteres no numéricos
    const cleanPhone = phone.toString().replace(/\D/g, '');

    // Si ya tiene código de país (506), usarlo tal como está
    if (cleanPhone.startsWith('506')) {
        return cleanPhone;
    }

    // Si es un número de 8 dígitos, agregar código de país de Costa Rica
    if (cleanPhone.length === 8) {
        return '506' + cleanPhone;
    }

    // Si ya tiene un código de país diferente, usarlo tal como está
    return cleanPhone;
}

function addClientGroup(clientId, groupId) {
    GRUPOS_CLIENTES[clientId] = groupId;
    console.log(`✅ Grupo agregado: Cliente ${clientId} → ${groupId}`);
}

function listConfiguredGroups() {
    console.log('📋 Grupos configurados:');
    if (Object.keys(GRUPOS_CLIENTES).length === 0) {
        console.log('  (ningún grupo configurado manualmente)');
    } else {
        Object.entries(GRUPOS_CLIENTES).forEach(([clientId, groupId]) => {
            console.log(`  Cliente ${clientId}: ${groupId}`);
        });
    }
}

// ===== FUNCIONES DE NÚMEROS A PALABRAS =====
function numberToWords(num) {
    if (num === 0) return 'cero';

    const ones = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const hundreds = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    function convertHundreds(n) {
        let result = '';

        if (n >= 100) {
            if (n === 100) {
                result += 'cien';
            } else {
                result += hundreds[Math.floor(n / 100)];
            }
            n %= 100;
            if (n > 0) result += ' ';
        }

        if (n >= 20) {
            result += tens[Math.floor(n / 10)];
            n %= 10;
            if (n > 0) result += ' y ' + ones[n];
        } else if (n >= 10) {
            result += teens[n - 10];
        } else if (n > 0) {
            result += ones[n];
        }

        return result;
    }

    function convertThousands(n) {
        if (n >= 1000000) {
            const millions = Math.floor(n / 1000000);
            let result = '';
            if (millions === 1) {
                result += 'un millón';
            } else {
                result += convertHundreds(millions) + ' millones';
            }
            n %= 1000000;
            if (n > 0) result += ' ';
            return result + convertThousands(n);
        }

        if (n >= 1000) {
            const thousands = Math.floor(n / 1000);
            let result = '';
            if (thousands === 1) {
                result += 'mil';
            } else {
                result += convertHundreds(thousands) + ' mil';
            }
            n %= 1000;
            if (n > 0) result += ' ';
            return result + convertHundreds(n);
        }

        return convertHundreds(n);
    }

    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let result = convertThousands(integerPart);

    if (decimalPart > 0) {
        result += ' con ' + convertHundreds(decimalPart) + ' céntimos';
    }

    return result.trim();
}

// ===== FUNCIONES DE UI Y NOTIFICACIONES =====
function showToast(message, type = 'info') {
    // Remover toast existente si hay uno
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Mostrar el toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Ocultar y remover el toast después de 4 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    const mainContent = document.getElementById('mainContent');
    const errorState = document.getElementById('errorState');

    if (show) {
        loading.style.display = 'block';
        mainContent.style.display = 'none';
        errorState.style.display = 'none';
    } else {
        loading.style.display = 'none';
    }
}

function showError(message) {
    const loading = document.getElementById('loading');
    const mainContent = document.getElementById('mainContent');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');

    loading.style.display = 'none';
    mainContent.style.display = 'none';
    errorState.style.display = 'block';

    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

function showLoadingOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

// ===== FUNCIONES DE CONTROL DE SECCIONES =====
function toggleSection(sectionKey) {
    sectionVisibility[sectionKey] = !sectionVisibility[sectionKey];
    updateSectionVisibility();
    updateControlUI();
    saveSectionPreferences();
}

function toggleAllSections(show) {
    Object.keys(sectionVisibility).forEach(key => {
        sectionVisibility[key] = show;
    });
    updateSectionVisibility();
    updateControlUI();
    saveSectionPreferences();
}

function showOnlyActive() {
    // Ocultar todo primero
    Object.keys(sectionVisibility).forEach(key => {
        sectionVisibility[key] = false;
    });

    // Mostrar solo secciones con contenido
    if (unassignedPayments.length > 0) {
        sectionVisibility.unassigned = true;
    }

    const overdueInvoices = clientInvoices.filter(inv => inv.Estado === 'Vencido');
    if (overdueInvoices.length > 0) {
        sectionVisibility.overdue = true;
    }

    const upcomingInvoices = getUpcomingInvoices(clientInvoices, 2);
    if (upcomingInvoices.length > 0) {
        sectionVisibility.upcoming = true;
    }

    updateSectionVisibility();
    updateControlUI();
    saveSectionPreferences();
}

function updateSectionVisibility() {
    const sectionMap = {
        'unassigned': 'unassignedPaymentsSection',
        'overdue': 'overdueSection',
        'upcoming': 'upcomingSection',
        'assigned': 'assignedPaymentsSection',
        'paid': 'paidSection'
    };

    Object.entries(sectionVisibility).forEach(([key, visible]) => {
        const sectionElement = document.getElementById(sectionMap[key]);
        if (sectionElement) {
            sectionElement.style.display = visible ? 'block' : 'none';
        }
    });
}

function updateControlUI() {
    Object.entries(sectionVisibility).forEach(([key, visible]) => {
        const controlItem = document.getElementById(`control-${key}`);
        const controlToggle = document.getElementById(`toggle-${key}`);

        if (controlItem && controlToggle) {
            if (visible) {
                controlItem.classList.add('active');
                controlToggle.classList.add('active');
            } else {
                controlItem.classList.remove('active');
                controlToggle.classList.remove('active');
            }
        }
    });
}

function updateSectionCounts() {
    // Actualizar contadores en los controles
    const overdueInvoices = clientInvoices.filter(inv => inv.Estado === 'Vencido');
    const paidInvoices = clientInvoices.filter(inv => inv.Estado === 'Pagado');
    const upcomingInvoices = getUpcomingInvoices(clientInvoices, 2);

    const counts = {
        'unassigned': `${unassignedPayments.length} pagos pendientes`,
        'overdue': `${overdueInvoices.length} facturas vencidas`,
        'upcoming': `${upcomingInvoices.length} próximas facturas`,
        'assigned': `${assignedPayments.length} pagos aplicados`,
        'paid': `${paidInvoices.length} facturas pagadas`
    };

    Object.entries(counts).forEach(([key, text]) => {
        const countElement = document.getElementById(`control-count-${key}`);
        if (countElement) {
            countElement.textContent = text;
        }
    });
}

function saveSectionPreferences() {
    try {
        localStorage.setItem('invoices_section_visibility', JSON.stringify(sectionVisibility));
    } catch (error) {
        console.warn('No se pudo guardar preferencias de sección:', error);
    }
}

function loadSectionPreferences() {
    try {
        const saved = localStorage.getItem('invoices_section_visibility');
        if (saved) {
            sectionVisibility = { ...sectionVisibility, ...JSON.parse(saved) };
        }
    } catch (error) {
        console.warn('No se pudieron cargar preferencias de sección:', error);
    }
}

// ===== FUNCIONES DE ARCHIVO HELPERS =====
async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Obtener solo la parte base64 (sin el prefijo data:type;base64,)
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = () => reject(new Error('Error al convertir archivo a base64'));
        reader.readAsDataURL(blob);
    });
}

// ===== FUNCIONES DE GENERACIÓN DE NÚMEROS =====
function generateInvoiceNumber() {
    // Generar número de factura único: MAN-YYYYMMDD-XXXXX
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');

    return `MAN-${year}${month}${day}-${random}`;
}

// ===== FUNCIONES DE NAVEGACIÓN =====
function goBackToClients() {
    window.location.href = 'https://arrendautos.app/clientes.html';
}

// ===== FUNCIONES DE HELPER PARA ASIGNACIONES =====
function findAssociatedPayment(invoiceNumber) {
    const payment = assignedPayments.find(p => p.RelatedInvoice?.NumeroFactura === invoiceNumber);
    if (payment) {
        return {
            reference: payment.Referencia,
            bank: payment.BankSource
        };
    }
    return null;
}

// ===== SINCRONIZACIÓN AUTOMÁTICA DE VARIABLES =====
function ensureVariableSync() {
    // Sincronizar variables críticas automáticamente
    if (typeof currentClient !== 'undefined' && currentClient && !window.currentClient) {
        window.currentClient = currentClient;
        console.log('🔄 Auto-sincronizando window.currentClient');
    }

    if (typeof currentClientId !== 'undefined' && currentClientId && !window.currentClientId) {
        window.currentClientId = currentClientId;
        console.log('🔄 Auto-sincronizando window.currentClientId');
    }

    if (Array.isArray(clientInvoices) && clientInvoices.length > 0 && (!window.clientInvoices || window.clientInvoices.length === 0)) {
        window.clientInvoices = clientInvoices;
        console.log('🔄 Auto-sincronizando window.clientInvoices');
    }

    if (Array.isArray(unassignedPayments) && unassignedPayments.length > 0 && (!window.unassignedPayments || window.unassignedPayments.length === 0)) {
        window.unassignedPayments = unassignedPayments;
        console.log('🔄 Auto-sincronizando window.unassignedPayments');
    }

    if (Array.isArray(assignedPayments) && assignedPayments.length > 0 && (!window.assignedPayments || window.assignedPayments.length === 0)) {
        window.assignedPayments = assignedPayments;
        console.log('🔄 Auto-sincronizando window.assignedPayments');
    }
}

// Ejecutar sincronización automática cada 2 segundos
setInterval(ensureVariableSync, 2000);

// ===== EXPONER FUNCIONES AL SCOPE GLOBAL =====
window.API_CONFIG = API_CONFIG;
window.ULTRAMSG_CONFIG = ULTRAMSG_CONFIG;
window.GRUPOS_CLIENTES = GRUPOS_CLIENTES;

// Variables globales
window.currentClient = currentClient;
window.clientInvoices = clientInvoices;
window.unassignedPayments = unassignedPayments;
window.assignedPayments = assignedPayments;
window.currentClientId = currentClientId;
window.currentReceiptData = currentReceiptData;
window.sectionVisibility = sectionVisibility;

// Variables para modales de asignación
window.currentPaymentForAssignment = currentPaymentForAssignment;
window.currentInvoiceForAssignment = currentInvoiceForAssignment;
window.selectedInvoiceForPayment = selectedInvoiceForPayment;
window.selectedPaymentForInvoice = selectedPaymentForInvoice;

// Funciones de debugging
window.debugClientState = debugClientState;
window.forceClientSync = forceClientSync;
window.validateSystemState = validateSystemState;
window.ensureVariableSync = ensureVariableSync;

// Funciones de fecha
window.parseDate = parseDate;
window.formatDateForDisplay = formatDateForDisplay;
window.formatDateForStorage = formatDateForStorage;
window.formatDateForInput = formatDateForInput;

// Funciones de cálculo
window.calculateFinesUntilDate = calculateFinesUntilDate;
window.calculateDaysOverdue = calculateDaysOverdue;

// Funciones de detección
window.isClientIdInObservations = isClientIdInObservations;
window.testClientIdDetection = testClientIdDetection;

// Funciones de parseo
window.parsePaymentAmount = parsePaymentAmount;

// Funciones de banco
window.getBankDisplayName = getBankDisplayName;
window.getBankBadgeClass = getBankBadgeClass;

// Funciones de WhatsApp
window.getWhatsAppDestination = getWhatsAppDestination;
window.formatPhoneForWhatsApp = formatPhoneForWhatsApp;
window.addClientGroup = addClientGroup;
window.listConfiguredGroups = listConfiguredGroups;

// Funciones de UI
window.showToast = showToast;
window.showLoading = showLoading;
window.showError = showError;
window.showLoadingOverlay = showLoadingOverlay;

// Funciones de control de secciones
window.toggleSection = toggleSection;
window.toggleAllSections = toggleAllSections;
window.showOnlyActive = showOnlyActive;
window.updateSectionVisibility = updateSectionVisibility;
window.updateControlUI = updateControlUI;
window.updateSectionCounts = updateSectionCounts;
window.saveSectionPreferences = saveSectionPreferences;
window.loadSectionPreferences = loadSectionPreferences;

// Funciones de navegación
window.goBackToClients = goBackToClients;

// Funciones de helpers
window.numberToWords = numberToWords;
window.blobToBase64 = blobToBase64;
window.generateInvoiceNumber = generateInvoiceNumber;
window.findAssociatedPayment = findAssociatedPayment;

console.log('✅ utils.js cargado - Funciones utilitarias disponibles');

// Ejecutar sincronización inicial después de cargar
setTimeout(() => {
    ensureVariableSync();
    console.log('🔄 Sincronización inicial ejecutada');
}, 1000);