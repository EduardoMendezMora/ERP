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

// Estado de control de secciones - TODAS VISIBLES POR DEFECTO
let sectionVisibility = {
    unassigned: true,    // Inicialmente visible
    overdue: true,       // Inicialmente visible
    upcoming: true,      // Inicialmente visible
    assigned: true,      // Inicialmente visible
    paid: true           // Inicialmente visible
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
        // ✅ CORRECCIÓN: Manejar zona horaria correctamente
        // Si la fecha viene como string (ej: '2025-08-05'), crear fecha en zona local
        if (typeof date === 'string') {
            // Para fechas en formato YYYY-MM-DD, crear en zona local
            if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = date.split('-').map(Number);
                date = new Date(year, month - 1, day); // month - 1 porque getMonth() es 0-based
            } else {
                date = new Date(date);
            }
        }
        
        // Asegurar que la fecha se interprete en zona local
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        const formattedDate = `${day}/${month}/${year}`; // DD/MM/YYYY para Google Sheets
        
        console.log('📅 [DEBUG] formatDateForStorage:', {
            input: date,
            year,
            month: date.getMonth() + 1,
            day: date.getDate(),
            formatted: formattedDate
        });
        
        return formattedDate;
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

// ✅ NUEVA FUNCIÓN: Para fechas de pagos manuales (zona horaria local)
function formatDateForManualPayment(dateInput) {
    try {
        let date;
        
        // Si es string en formato YYYY-MM-DD, crear fecha en zona local
        if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateInput.split('-').map(Number);
            date = new Date(year, month - 1, day); // month - 1 porque getMonth() es 0-based
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            date = new Date(dateInput);
        }
        
        // Asegurar que se use la zona horaria local
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        const formattedDate = `${day}/${month}/${year}`;
        
        console.log('📅 [DEBUG] formatDateForManualPayment:', {
            input: dateInput,
            date: date,
            year,
            month: date.getMonth() + 1,
            day: date.getDate(),
            formatted: formattedDate
        });
        
        return formattedDate;
    } catch (error) {
        console.error('Error al formatear fecha para pago manual:', error);
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

// ===== FUNCIÓN UNIVERSAL PARA PARSEAR MONTOS (MANEJA FORMATO 1.000.000,00) =====
function parseAmount(amount) {
    if (!amount) return 0;
    
    // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
    console.log(`🔍 [DEBUG PARSE AMOUNT] === PARSEO UNIVERSAL ${amount} ===`);
    console.log(`🔍 [DEBUG PARSE AMOUNT] Amount original: ${amount} (tipo: ${typeof amount})`);
    
    let result = 0;
    
    // Si es un número, usarlo directamente
    if (typeof amount === 'number') {
        result = amount;
        console.log(`🔍 [DEBUG PARSE AMOUNT] Es número, usando directamente: ${result}`);
    } else if (typeof amount === 'string') {
        // Limpiar el string de caracteres no numéricos excepto punto y coma
        const cleanAmount = amount.toString().trim().replace(/[^\d.,]/g, '');
        console.log(`🔍 [DEBUG PARSE AMOUNT] String limpio: "${cleanAmount}"`);
        
        if (cleanAmount.includes(',')) {
            // Formato: "1.000.000,00" -> 1000000.00
            const normalizedValue = cleanAmount.replace(/\./g, '').replace(',', '.');
            result = parseFloat(normalizedValue) || 0;
            console.log(`🔍 [DEBUG PARSE AMOUNT] Con coma decimal: "${cleanAmount}" -> "${normalizedValue}" -> ${result}`);
        } else {
            // Formato: "1000000" o "1.000.000" -> 1000000
            const normalizedValue = cleanAmount.replace(/\./g, '');
            result = parseFloat(normalizedValue) || 0;
            console.log(`🔍 [DEBUG PARSE AMOUNT] Sin coma decimal: "${cleanAmount}" -> "${normalizedValue}" -> ${result}`);
        }
    } else {
        // Otros tipos: intentar conversión directa
        result = parseFloat(amount) || 0;
        console.log(`🔍 [DEBUG PARSE AMOUNT] Otro tipo, conversión directa: ${result}`);
    }
    
    // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
    console.log(`🔍 [DEBUG PARSE AMOUNT] Resultado final: ${result}`);
    console.log(`🔍 [DEBUG PARSE AMOUNT] === FIN DEBUG PARSE AMOUNT ===`);
    
    return result;
}

// ===== FUNCIÓN PARA PARSEAR MONTOS (MANEJA TANTO FLOAT COMO STRING) =====
function parsePaymentAmount(paymentAmount, bankSource) {
    if (!paymentAmount) return 0;
    
    // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
    console.log(`🔍 [DEBUG PARSE] === PARSEO ${bankSource} ${paymentAmount} ===`);
    console.log(`🔍 [DEBUG PARSE] Amount original: ${paymentAmount} (tipo: ${typeof paymentAmount})`);
    console.log(`🔍 [DEBUG PARSE] BankSource: "${bankSource}"`);
    
    // Usar la nueva función universal
    const result = parseAmount(paymentAmount);
    
    // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
    console.log(`🔍 [DEBUG PARSE] Resultado final: ${result}`);
    console.log(`🔍 [DEBUG PARSE] === FIN DEBUG PARSE ===`);
    
    return result;
}

// ===== FUNCIÓN CORREGIDA PARA PARSEAR MONTOS BAC (DEPRECATED - BACKEND YA DEVUELVE FLOAT) =====
function parsePaymentAmountFixed(paymentAmount, bankSource) {
    // Esta función ya no es necesaria, el backend devuelve Float directamente
    console.log(`⚠️ [DEPRECATED] parsePaymentAmountFixed ya no es necesaria, usando parsePaymentAmount`);
    return parsePaymentAmount(paymentAmount, bankSource);
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
    console.log(`🔄 toggleSection llamado con: ${sectionKey}`);
    console.log(`📊 Estado anterior:`, sectionVisibility[sectionKey]);
    
    sectionVisibility[sectionKey] = !sectionVisibility[sectionKey];
    
    console.log(`📊 Estado nuevo:`, sectionVisibility[sectionKey]);
    console.log(`🎛️ sectionVisibility completo:`, sectionVisibility);
    
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
    // Ocultar todo primero - todas las secciones cerradas por defecto
    Object.keys(sectionVisibility).forEach(key => {
        sectionVisibility[key] = false;
    });

    updateSectionVisibility();
    updateControlUI();
    saveSectionPreferences();
}

function updateSectionVisibility() {
    console.log('🔄 updateSectionVisibility ejecutándose...');
    
    const sectionMap = {
        'unassigned': 'unassignedPaymentsSection',
        'overdue': 'overdueSection',
        'upcoming': 'upcomingSection',
        'assigned': 'assignedPaymentsSection',
        'paid': 'paidSection'
    };

    Object.entries(sectionVisibility).forEach(([key, visible]) => {
        const sectionElement = document.getElementById(sectionMap[key]);
        console.log(`  📋 ${key}: buscando elemento ${sectionMap[key]} - ${sectionElement ? '✅ Encontrado' : '❌ No encontrado'}`);
        
        if (sectionElement) {
            const oldDisplay = sectionElement.style.display;
            sectionElement.style.display = visible ? 'block' : 'none';
            
            // Agregar efecto visual para hacer el cambio más evidente
            if (visible) {
                sectionElement.style.opacity = '0';
                sectionElement.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    sectionElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    sectionElement.style.opacity = '1';
                    sectionElement.style.transform = 'translateY(0)';
                }, 10);
            } else {
                sectionElement.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                sectionElement.style.opacity = '0';
                sectionElement.style.transform = 'translateY(-10px)';
            }
            
            console.log(`    Display: ${oldDisplay} → ${sectionElement.style.display}`);
        }
    });
}

function updateControlUI() {
    console.log('🔄 updateControlUI ejecutándose...');
    
    Object.entries(sectionVisibility).forEach(([key, visible]) => {
        const controlItem = document.getElementById(`control-${key}`);
        const controlToggle = document.getElementById(`toggle-${key}`);

        console.log(`  🎛️ ${key}: control-${key} ${controlItem ? '✅' : '❌'}, toggle-${key} ${controlToggle ? '✅' : '❌'}`);

        if (controlItem && controlToggle) {
            const wasActive = controlItem.classList.contains('active');
            
            if (visible) {
                controlItem.classList.add('active');
                controlToggle.classList.add('active');
                // Agregar efecto visual más dramático
                controlItem.style.transform = 'scale(1.05)';
                controlItem.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.3)';
                controlItem.style.backgroundColor = '#e6f3ff';
                controlItem.style.borderColor = '#007aff';
                setTimeout(() => {
                    controlItem.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease, border-color 0.3s ease';
                    controlItem.style.transform = 'scale(1)';
                    controlItem.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.15)';
                }, 300);
            } else {
                controlItem.classList.remove('active');
                controlToggle.classList.remove('active');
                // Agregar efecto visual más dramático
                controlItem.style.transform = 'scale(0.95)';
                controlItem.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.1)';
                controlItem.style.backgroundColor = '#f9f9f9';
                controlItem.style.borderColor = '#e5e5e7';
                setTimeout(() => {
                    controlItem.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease, border-color 0.3s ease';
                    controlItem.style.transform = 'scale(1)';
                    controlItem.style.boxShadow = 'none';
                }, 300);
            }
            
            const isActive = controlItem.classList.contains('active');
            console.log(`    Active: ${wasActive} → ${isActive}`);
        }
    });
}

function updateSectionCounts() {
    // Actualizar contadores en los controles
    const cancelledInvoices = clientInvoices.filter(inv => inv.Estado === 'Cancelado');
    const upcomingInvoices = getUpcomingInvoices(clientInvoices, 2);

    const counts = {
        'unassigned': `${unassignedPayments.length} pagos pendientes`,
        'overdue': `${cancelledInvoices.length} facturas canceladas`,
        'upcoming': `${upcomingInvoices.length} próximas facturas`,
        'assigned': `${assignedPayments.length} pagos aplicados`,
        'paid': `${cancelledInvoices.length} facturas canceladas`
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
        // Limpiar preferencias existentes para usar el nuevo comportamiento por defecto
        // (todas las secciones visibles)
        localStorage.removeItem('invoices_section_visibility');
        
        // Usar el estado por defecto (todas las secciones visibles)
        console.log('🎛️ Usando estado por defecto: todas las secciones visibles');
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

// ===== FUNCIÓN DE DEBUG PARA VERIFICAR FACTURAS =====
function debugInvoices() {
    console.log('🔍 === DEBUG DE FACTURAS ===');
    
    if (!Array.isArray(clientInvoices)) {
        console.log('❌ clientInvoices no es un array');
        return;
    }
    
    console.log(`📋 Total de facturas: ${clientInvoices.length}`);
    
    // Agrupar por estado
    const byStatus = {
        'Pendiente': [],
        'Cancelado': []
    };
    
    clientInvoices.forEach(inv => {
        const status = inv.Estado || 'Sin Estado';
        if (byStatus[status]) {
            byStatus[status].push(inv);
        }
    });
    
    console.log('📊 Facturas por estado:');
    Object.entries(byStatus).forEach(([status, invoices]) => {
        console.log(`  ${status}: ${invoices.length} facturas`);
        
        if (status === 'Pendiente') {
            console.log('    Detalles de facturas pendientes:');
            invoices.forEach(inv => {
                const dueDate = parseDate(inv.FechaVencimiento);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const isFuture = dueDate && dueDate > today;
                const isToday = dueDate && dueDate.getTime() === today.getTime();
                const isPast = dueDate && dueDate < today;
                
                console.log(`      - ${inv.NumeroFactura}: ${inv.FechaVencimiento} (${isFuture ? 'FUTURA' : isToday ? 'HOY' : isPast ? 'PASADA' : 'SIN FECHA'})`);
            });
        }
    });
    
    // Probar función getUpcomingInvoices
    const upcoming = getUpcomingInvoices(clientInvoices, 2);
    console.log(`📅 Próximas facturas (getUpcomingInvoices): ${upcoming.length}`);
    upcoming.forEach(inv => {
        console.log(`  - ${inv.NumeroFactura}: ${inv.FechaVencimiento}`);
    });
    
    console.log('================================');
}

// ===== FUNCIÓN DE DEBUG PARA VERIFICAR CONTROLES DE SECCIÓN =====
function debugSectionControls() {
    console.log('🔍 === DEBUG DE CONTROLES DE SECCIÓN ===');
    
    // Verificar elementos del DOM
    const sections = ['unassigned', 'overdue', 'upcoming', 'assigned', 'paid'];
    
    sections.forEach(section => {
        const controlItem = document.getElementById(`control-${section}`);
        const controlToggle = document.getElementById(`toggle-${section}`);
        const sectionElement = document.getElementById(`${section}Section`);
        const countElement = document.getElementById(`control-count-${section}`);
        
        console.log(`📋 Sección: ${section}`);
        console.log(`  control-${section}:`, controlItem ? '✅ Encontrado' : '❌ No encontrado');
        console.log(`  toggle-${section}:`, controlToggle ? '✅ Encontrado' : '❌ No encontrado');
        console.log(`  ${section}Section:`, sectionElement ? '✅ Encontrado' : '❌ No encontrado');
        console.log(`  control-count-${section}:`, countElement ? '✅ Encontrado' : '❌ No encontrado');
        
        if (controlItem) {
            console.log(`  Clase active:`, controlItem.classList.contains('active') ? '✅ Sí' : '❌ No');
            console.log(`  onclick:`, controlItem.getAttribute('onclick'));
        }
        
        if (controlToggle) {
            console.log(`  Toggle active:`, controlToggle.classList.contains('active') ? '✅ Sí' : '❌ No');
        }
        
        if (sectionElement) {
            console.log(`  Display:`, sectionElement.style.display);
        }
    });
    
    // Verificar estado de sectionVisibility
    console.log('🎛️ Estado de sectionVisibility:', sectionVisibility);
    
    // Verificar funciones globales
    console.log('🔧 Funciones globales:');
    console.log('  toggleSection:', typeof window.toggleSection);
    console.log('  toggleAllSections:', typeof window.toggleAllSections);
    console.log('  showOnlyActive:', typeof window.showOnlyActive);
    console.log('  updateSectionVisibility:', typeof window.updateSectionVisibility);
    console.log('  updateControlUI:', typeof window.updateControlUI);
    
    console.log('================================');
}

// ===== FUNCIÓN DE DEBUG PARA VERIFICAR ESTADO VISUAL DE CONTROLES =====
function debugControlVisualState() {
    console.log('🔍 === DEBUG ESTADO VISUAL DE CONTROLES ===');
    
    const sections = ['unassigned', 'overdue', 'upcoming', 'assigned', 'paid'];
    
    sections.forEach(section => {
        const controlItem = document.getElementById(`control-${section}`);
        const controlToggle = document.getElementById(`toggle-${section}`);
        
        if (controlItem && controlToggle) {
            const computedStyle = window.getComputedStyle(controlItem);
            const toggleComputedStyle = window.getComputedStyle(controlToggle);
            
            console.log(`📋 Control: ${section}`);
            console.log(`  Clase active: ${controlItem.classList.contains('active')}`);
            console.log(`  Background: ${computedStyle.backgroundColor}`);
            console.log(`  Border: ${computedStyle.borderColor}`);
            console.log(`  Transform: ${computedStyle.transform}`);
            console.log(`  Box-shadow: ${computedStyle.boxShadow}`);
            console.log(`  Toggle background: ${toggleComputedStyle.backgroundColor}`);
            console.log(`  Toggle transform: ${toggleComputedStyle.transform}`);
            console.log('  ---');
        }
    });
    
    console.log('================================');
}

// Hacer la función disponible globalmente
window.debugControlVisualState = debugControlVisualState;

// ===== FUNCIÓN PARA MOSTRAR SOLO SECCIONES ACTIVAS POR DEFECTO =====
function showDefaultActiveSections() {
    console.log('🎛️ Configurando secciones - TODAS OCULTAS POR DEFECTO...');
    
    // Mantener todas las secciones ocultas
    Object.keys(sectionVisibility).forEach(key => {
        sectionVisibility[key] = false;
    });
    
    // NO mostrar automáticamente ninguna sección
    // El usuario debe activarlas manualmente con los controles
    
    // Aplicar cambios visuales
    updateSectionVisibility();
    updateControlUI();
    updateSectionCounts();
    
    console.log('🎛️ Estado final de secciones (todas ocultas):', sectionVisibility);
    console.log('💡 Usa los controles para mostrar las secciones que necesites');
}

// ===== FUNCIÓN DE DEBUG PARA PROBAR CONTROLES =====
function testControls() {
    console.log('🧪 === PRUEBA DE CONTROLES ===');
    console.log('📋 Estado inicial:', sectionVisibility);
    
    const sections = ['unassigned', 'overdue', 'upcoming', 'assigned', 'paid'];
    
    sections.forEach((section, index) => {
        setTimeout(() => {
            console.log(`\n🔄 Probando control: ${section}`);
            console.log(`   Estado antes: ${sectionVisibility[section]}`);
            
            // Simular clic en el control
            toggleSection(section);
            
            console.log(`   Estado después: ${sectionVisibility[section]}`);
            console.log(`   ✅ Control ${section} ${sectionVisibility[section] ? 'ACTIVADO' : 'DESACTIVADO'}`);
        }, index * 1000); // Probar cada control cada segundo
    });
    
    console.log('\n💡 Observa los cambios visuales en la página');
    console.log('💡 Los controles deberían cambiar de color y las secciones aparecer/desaparecer');
}

// ===== FUNCIÓN DE DEBUG PARA VERIFICAR EVENTOS DE CLIC =====
function debugClickEvents() {
    console.log('🔍 === DEBUG DE EVENTOS DE CLIC ===');
    
    const sections = ['unassigned', 'overdue', 'upcoming', 'assigned', 'paid'];
    
    sections.forEach(section => {
        const controlItem = document.getElementById(`control-${section}`);
        
        if (controlItem) {
            console.log(`📋 Control ${section}:`);
            console.log(`  Elemento encontrado: ✅`);
            console.log(`  onclick atributo: "${controlItem.getAttribute('onclick')}"`);
            console.log(`  Clase active: ${controlItem.classList.contains('active')}`);
            
            // Verificar si la función está disponible
            console.log(`  toggleSection disponible: ${typeof window.toggleSection}`);
            
            // Agregar event listener adicional para debug
            controlItem.addEventListener('click', (e) => {
                console.log(`🖱️ CLIC DETECTADO en control-${section}`);
                console.log(`  Evento original:`, e);
                console.log(`  Función toggleSection disponible: ${typeof window.toggleSection}`);
                
                // Intentar llamar la función manualmente
                if (typeof window.toggleSection === 'function') {
                    console.log(`  Llamando toggleSection('${section}')...`);
                    window.toggleSection(section);
                } else {
                    console.log(`  ❌ toggleSection no está disponible`);
                }
            });
            
            console.log(`  ✅ Event listener de debug agregado`);
        } else {
            console.log(`❌ Control ${section}: Elemento no encontrado`);
        }
        console.log('  ---');
    });
    
    console.log('💡 Ahora haz clic en los controles y observa los logs');
}

// ===== FUNCIÓN PARA CONFIGURAR EVENT LISTENERS =====
function setupControlEventListeners() {
    console.log('🔧 Configurando event listeners para controles...');
    
    const sections = ['unassigned', 'overdue', 'upcoming', 'assigned', 'paid'];
    
    sections.forEach(section => {
        const controlItem = document.getElementById(`control-${section}`);
        
        if (controlItem) {
            // Agregar event listener que tomará precedencia sobre onclick
            controlItem.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log(`🖱️ CLIC en control-${section} (event listener)`);
                toggleSection(section);
            }, true); // Usar capture phase para tomar precedencia
            
            console.log(`✅ Event listener configurado para control-${section}`);
        } else {
            console.log(`❌ No se pudo configurar event listener para control-${section}`);
        }
    });
    
    console.log('🎛️ Todos los event listeners configurados');
}

// ===== FUNCIONES DE BÚSQUEDA POR SECCIÓN =====

// Configuración de búsqueda por sección
const SEARCH_CONFIG = {
    unassigned: {
        inputId: 'searchUnassigned',
        clearId: 'clearSearchUnassigned',
        resultsId: 'searchResultsUnassigned',
        dataSource: 'unassignedPayments',
        searchFields: ['Referencia', 'BankSource', 'Monto', 'Observaciones'],
        placeholder: 'Buscar pagos por referencia, banco, monto...'
    },
    overdue: {
        inputId: 'searchOverdue',
        clearId: 'clearSearchOverdue',
        resultsId: 'searchResultsOverdue',
        dataSource: 'clientInvoices',
        searchFields: ['NumeroFactura', 'Concepto', 'FechaVencimiento', 'Monto'],
        filterFunction: (item) => item.Estado === 'Cancelado',
        placeholder: 'Buscar facturas por número, concepto, fecha...'
    },
    upcoming: {
        inputId: 'searchUpcoming',
        clearId: 'clearSearchUpcoming',
        resultsId: 'searchResultsUpcoming',
        dataSource: 'clientInvoices',
        searchFields: ['NumeroFactura', 'Concepto', 'FechaVencimiento', 'Monto'],
        filterFunction: (item) => {
            if (item.Estado !== 'Pendiente') return false;
            const dueDate = parseDate(item.FechaVencimiento);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return dueDate && dueDate > today;
        },
        placeholder: 'Buscar facturas por número, concepto, fecha...'
    },
    assigned: {
        inputId: 'searchAssigned',
        clearId: 'clearSearchAssigned',
        resultsId: 'searchResultsAssigned',
        dataSource: 'assignedPayments',
        searchFields: ['Referencia', 'BankSource', 'Monto', 'RelatedInvoice.NumeroFactura'],
        placeholder: 'Buscar pagos por referencia, banco, factura...'
    },
    paid: {
        inputId: 'searchPaid',
        clearId: 'clearSearchPaid',
        resultsId: 'searchResultsPaid',
        dataSource: 'clientInvoices',
        searchFields: ['NumeroFactura', 'Concepto', 'FechaVencimiento', 'Monto'],
        filterFunction: (item) => item.Estado === 'Cancelado',
        placeholder: 'Buscar facturas por número, concepto, fecha...'
    }
};

// Función principal de búsqueda
function performSearch(sectionKey, searchTerm) {
    console.log(`🔍 Búsqueda en sección ${sectionKey}: "${searchTerm}"`);
    
    const config = SEARCH_CONFIG[sectionKey];
    if (!config) {
        console.error(`❌ Configuración no encontrada para sección: ${sectionKey}`);
        return;
    }
    
    // Obtener datos de la fuente correspondiente
    let dataSource;
    switch (config.dataSource) {
        case 'unassignedPayments':
            dataSource = unassignedPayments;
            break;
        case 'assignedPayments':
            dataSource = assignedPayments;
            break;
        case 'clientInvoices':
            dataSource = clientInvoices;
            break;
        default:
            console.error(`❌ Fuente de datos no válida: ${config.dataSource}`);
            return;
    }
    
    // Aplicar filtro inicial si existe
    let filteredData = dataSource;
    if (config.filterFunction) {
        filteredData = dataSource.filter(config.filterFunction);
    }
    
    // Realizar búsqueda
    const results = searchInData(filteredData, searchTerm, config.searchFields);
    
    // Actualizar UI
    updateSearchResults(sectionKey, results, searchTerm);
    updateSearchUI(sectionKey, searchTerm.length > 0);
    
    console.log(`✅ Búsqueda completada: ${results.length} resultados encontrados`);
    return results; // Retornar los resultados filtrados
}

// Función para buscar en los datos
function searchInData(data, searchTerm, searchFields) {
    if (!searchTerm || searchTerm.trim() === '') {
        return data;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    return data.filter(item => {
        return searchFields.some(field => {
            const value = getNestedValue(item, field);
            if (value === null || value === undefined) return false;
            
            const stringValue = value.toString().toLowerCase();
            return stringValue.includes(term);
        });
    });
}

// Función para obtener valores anidados (ej: 'RelatedInvoice.NumeroFactura')
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

// Función para actualizar resultados de búsqueda
function updateSearchResults(sectionKey, results, searchTerm) {
    const config = SEARCH_CONFIG[sectionKey];
    const resultsElement = document.getElementById(config.resultsId);
    
    if (!resultsElement) return;
    
    if (searchTerm.trim() === '') {
        resultsElement.classList.remove('show');
        resultsElement.textContent = '';
        return;
    }
    
    // Mostrar resultados
    resultsElement.classList.add('show');
    
    if (results.length === 0) {
        resultsElement.innerHTML = `
            <span style="color: #ff3b30;">❌ No se encontraron resultados para "${searchTerm}"</span>
        `;
    } else {
        const totalItems = getTotalItemsForSection(sectionKey);
        resultsElement.innerHTML = `
            <span style="color: #007aff;">🔍 ${results.length} de ${totalItems} elementos encontrados para "${searchTerm}"</span>
        `;
    }
}

// Función para obtener el total de elementos en una sección
function getTotalItemsForSection(sectionKey) {
    const config = SEARCH_CONFIG[sectionKey];
    let dataSource;
    
    switch (config.dataSource) {
        case 'unassignedPayments':
            dataSource = unassignedPayments;
            break;
        case 'assignedPayments':
            dataSource = assignedPayments;
            break;
        case 'clientInvoices':
            dataSource = clientInvoices;
            break;
        default:
            return 0;
    }
    
    if (config.filterFunction) {
        return dataSource.filter(config.filterFunction).length;
    }
    
    return dataSource.length;
}

// Función para actualizar UI de búsqueda
function updateSearchUI(sectionKey, isSearching) {
    const config = SEARCH_CONFIG[sectionKey];
    const clearButton = document.getElementById(config.clearId);
    const sectionElement = document.getElementById(`${sectionKey}Section`);
    
    // Mostrar/ocultar botón de limpiar
    if (clearButton) {
        clearButton.style.display = isSearching ? 'block' : 'none';
    }
    
    // Agregar/quitar clase de búsqueda activa
    if (sectionElement) {
        if (isSearching) {
            sectionElement.classList.add('search-active');
        } else {
            sectionElement.classList.remove('search-active');
        }
    }
}

// Función para limpiar búsqueda
function clearSearch(sectionKey) {
    const config = SEARCH_CONFIG[sectionKey];
    const inputElement = document.getElementById(config.inputId);
    
    if (inputElement) {
        inputElement.value = '';
        inputElement.focus();
        filterSectionItems(sectionKey, '');
    }
}

// Función para configurar event listeners de búsqueda
function setupSearchEventListeners() {
    console.log('🔧 Configurando event listeners de búsqueda...');
    
    Object.keys(SEARCH_CONFIG).forEach(sectionKey => {
        const config = SEARCH_CONFIG[sectionKey];
        
        // Input de búsqueda
        const inputElement = document.getElementById(config.inputId);
        if (inputElement) {
            // Búsqueda en tiempo real con debounce
            let searchTimeout;
            let lastSearchTerm = '';
            
            inputElement.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                
                // Evitar búsquedas innecesarias
                if (searchTerm === lastSearchTerm) return;
                
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    lastSearchTerm = searchTerm;
                    filterSectionItems(sectionKey, searchTerm);
                }, 300); // 300ms de delay
            });
            
            // Búsqueda al presionar Enter
            inputElement.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    filterSectionItems(sectionKey, e.target.value);
                }
            });
            
            // Limpiar búsqueda al presionar Escape
            inputElement.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    clearSearch(sectionKey);
                }
            });
            
            console.log(`✅ Event listener configurado para búsqueda en ${sectionKey}`);
        }
        
        // Botón de limpiar
        const clearButton = document.getElementById(config.clearId);
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                clearSearch(sectionKey);
            });
        }
    });
    
    console.log('🎛️ Todos los event listeners de búsqueda configurados');
}

// Función para resaltar texto en resultados
function highlightText(text, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return text;
    }
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark style="background: #ffeb3b; padding: 1px 2px; border-radius: 2px;">$1</mark>');
}

// Función para debug de búsqueda
function debugSearch(sectionKey) {
    console.log(`🔍 === DEBUG DE BÚSQUEDA - ${sectionKey} ===`);
    
    const config = SEARCH_CONFIG[sectionKey];
    if (!config) {
        console.log('❌ Configuración no encontrada');
        return;
    }
    
    console.log('📋 Configuración:', config);
    
    // Verificar elementos del DOM
    const inputElement = document.getElementById(config.inputId);
    const clearButton = document.getElementById(config.clearId);
    const resultsElement = document.getElementById(config.resultsId);
    
    console.log('🖥️ Elementos del DOM:');
    console.log(`  Input: ${inputElement ? '✅' : '❌'}`);
    console.log(`  Clear: ${clearButton ? '✅' : '❌'}`);
    console.log(`  Results: ${resultsElement ? '✅' : '❌'}`);
    
    // Verificar datos
    let dataSource;
    switch (config.dataSource) {
        case 'unassignedPayments':
            dataSource = unassignedPayments;
            break;
        case 'assignedPayments':
            dataSource = assignedPayments;
            break;
        case 'clientInvoices':
            dataSource = clientInvoices;
            break;
    }
    
    console.log('📊 Datos disponibles:');
    console.log(`  Fuente: ${config.dataSource}`);
    console.log(`  Total: ${dataSource?.length || 0} elementos`);
    console.log(`  Campos de búsqueda: ${config.searchFields.join(', ')}`);
    
    if (config.filterFunction) {
        const filtered = dataSource?.filter(config.filterFunction) || [];
        console.log(`  Filtrados: ${filtered.length} elementos`);
    }
    
    console.log('================================');
}

// ===== FUNCIÓN DE PRUEBA PARA EL SISTEMA DE BÚSQUEDA =====
function testSearchSystem() {
    console.log('🧪 === PRUEBA DEL SISTEMA DE BÚSQUEDA ===');
    
    const sections = ['unassigned', 'overdue', 'upcoming', 'assigned', 'paid'];
    
    sections.forEach((sectionKey, index) => {
        setTimeout(() => {
            console.log(`\n🔍 Probando búsqueda en sección: ${sectionKey}`);
            
            // Verificar configuración
            const config = SEARCH_CONFIG[sectionKey];
            if (!config) {
                console.log(`❌ Configuración no encontrada para ${sectionKey}`);
                return;
            }
            
            // Verificar elementos del DOM
            const inputElement = document.getElementById(config.inputId);
            const clearButton = document.getElementById(config.clearId);
            const resultsElement = document.getElementById(config.resultsId);
            
            console.log(`  Input: ${inputElement ? '✅' : '❌'}`);
            console.log(`  Clear: ${clearButton ? '✅' : '❌'}`);
            console.log(`  Results: ${resultsElement ? '✅' : '❌'}`);
            
            // Simular búsqueda de prueba
            if (inputElement) {
                const testTerm = 'test';
                console.log(`  Simulando búsqueda: "${testTerm}"`);
                
                // Simular input
                inputElement.value = testTerm;
                inputElement.dispatchEvent(new Event('input'));
                
                // Verificar resultados después de un delay
                setTimeout(() => {
                    const results = filterSectionItems(sectionKey, testTerm);
                    console.log(`  Resultados encontrados: ${results?.length || 0}`);
                    
                    // Limpiar búsqueda
                    setTimeout(() => {
                        clearSearch(sectionKey);
                        console.log(`  ✅ Búsqueda en ${sectionKey} probada y limpiada`);
                    }, 1000);
                }, 500);
            }
        }, index * 2000); // Probar cada sección cada 2 segundos
    });
    
    console.log('\n💡 Observa los cambios visuales en la página');
    console.log('💡 Las barras de búsqueda deberían mostrar resultados y filtros');
}

// Función para mostrar estadísticas de búsqueda
function showSearchStats() {
    console.log('📊 === ESTADÍSTICAS DE BÚSQUEDA ===');
    
    Object.keys(SEARCH_CONFIG).forEach(sectionKey => {
        const config = SEARCH_CONFIG[sectionKey];
        const totalItems = getTotalItemsForSection(sectionKey);
        
        console.log(`📋 ${sectionKey.toUpperCase()}:`);
        console.log(`  Total elementos: ${totalItems}`);
        console.log(`  Campos de búsqueda: ${config.searchFields.join(', ')}`);
        console.log(`  Fuente de datos: ${config.dataSource}`);
        
        if (config.filterFunction) {
            console.log(`  Filtro aplicado: Sí`);
        } else {
            console.log(`  Filtro aplicado: No`);
        }
    });
    
    console.log('================================');
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

// ===== FUNCIONES DE FILTRADO VISUAL =====

// Función wrapper para filtrar elementos de sección
function filterSectionItems(sectionKey, searchTerm) {
    console.log(`🔍 filterSectionItems llamado: ${sectionKey}, "${searchTerm}"`);
    
    if (!searchTerm || searchTerm.trim() === '') {
        // Si no hay término de búsqueda, limpiar filtros y mostrar todo
        clearAllVisualFilters(sectionKey);
        return [];
    }
    
    // Realizar búsqueda usando la función existente
    const results = performSearch(sectionKey, searchTerm);
    
    // Aplicar filtros visuales
    applyVisualFilters(sectionKey, results, searchTerm);
    
    return results;
}

// Aplicar filtros visuales a los elementos
function applyVisualFilters(sectionKey, results, searchTerm) {
    console.log(`🎨 Aplicando filtros visuales para ${sectionKey}`);
    
    const sectionElement = document.getElementById(`${sectionKey}Section`);
    if (!sectionElement) {
        console.error(`❌ Sección no encontrada: ${sectionKey}Section`);
        return;
    }
    
    // Obtener todos los elementos de la sección
    const items = sectionElement.querySelectorAll('.invoice-card, .payment-card');
    
    items.forEach(item => {
        const itemText = item.textContent.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        if (itemText.includes(searchLower)) {
            // Elemento coincide con la búsqueda
            item.classList.add('highlight');
            item.classList.remove('filtered');
            
            // Resaltar texto
            highlightSearchTerms(item, searchTerm);
        } else {
            // Elemento no coincide
            item.classList.add('filtered');
            item.classList.remove('highlight');
        }
    });
}

// Limpiar todos los filtros visuales
function clearAllVisualFilters(sectionKey) {
    console.log(`🧹 Limpiando filtros visuales para ${sectionKey}`);
    
    const sectionElement = document.getElementById(`${sectionKey}Section`);
    if (!sectionElement) {
        console.error(`❌ Sección no encontrada: ${sectionKey}Section`);
        return;
    }
    
    // Obtener todos los elementos de la sección
    const items = sectionElement.querySelectorAll('.invoice-card, .payment-card');
    
    items.forEach(item => {
        item.classList.remove('filtered', 'highlight');
        restoreOriginalText(item);
    });
}

// Configurar búsqueda en tiempo real
function setupRealTimeSearch(sectionKey) {
    console.log(`⚡ Configurando búsqueda en tiempo real para ${sectionKey}`);
    
    const config = SEARCH_CONFIG[sectionKey];
    if (!config) {
        console.error(`❌ Configuración no encontrada para sección: ${sectionKey}`);
        return;
    }
    
    const input = document.getElementById(config.inputId);
    if (!input) {
        console.error(`❌ Input no encontrado: ${config.inputId}`);
        return;
    }
    
    // Configurar debounce para búsqueda en tiempo real
    let debounceTimer;
    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const searchTerm = e.target.value.trim();
            filterSectionItems(sectionKey, searchTerm);
        }, 300);
    });
}

// Resaltar términos de búsqueda en el texto
function highlightSearchTerms(element, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return;
    
    const searchLower = searchTerm.toLowerCase();
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const textLower = text.toLowerCase();
        
        if (textLower.includes(searchLower)) {
            const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const highlightedText = text.replace(regex, '<mark class="search-highlight">$1</mark>');
            
            if (highlightedText !== text) {
                const span = document.createElement('span');
                span.innerHTML = highlightedText;
                textNode.parentNode.replaceChild(span, textNode);
            }
        }
    });
}

// Restaurar texto original
function restoreOriginalText(element) {
    const marks = element.querySelectorAll('mark.search-highlight');
    marks.forEach(mark => {
        const textNode = document.createTextNode(mark.textContent);
        mark.parentNode.replaceChild(textNode, mark);
    });
}

// ===== FUNCIÓN DE PRUEBA PARA VERIFICAR CONTROLES =====
function testSectionControls() {
    console.log('🧪 Iniciando prueba de controles de sección...');
    
    // Verificar que las funciones existen
    console.log('✅ toggleSection existe:', typeof toggleSection === 'function');
    console.log('✅ updateSectionVisibility existe:', typeof updateSectionVisibility === 'function');
    console.log('✅ updateControlUI existe:', typeof updateControlUI === 'function');
    
    // Verificar que los elementos existen
    const sections = ['unassigned', 'overdue', 'upcoming', 'assigned', 'paid'];
    sections.forEach(section => {
        const control = document.getElementById(`control-${section}`);
        const sectionElement = document.getElementById(`${section}Section`);
        console.log(`🎛️ ${section}: control ${control ? '✅' : '❌'}, section ${sectionElement ? '✅' : '❌'}`);
    });
    
    // Probar toggle de una sección
    console.log('🔄 Probando toggle de sección "upcoming"...');
    const initialState = sectionVisibility.upcoming;
    toggleSection('upcoming');
    const finalState = sectionVisibility.upcoming;
    console.log(`📊 Estado cambiado: ${initialState} → ${finalState}`);
    
    // Verificar que el cambio se aplicó visualmente
    const upcomingSection = document.getElementById('upcomingSection');
    const upcomingControl = document.getElementById('control-upcoming');
    console.log(`👁️ Sección visible: ${upcomingSection.style.display !== 'none'}`);
    console.log(`🎛️ Control activo: ${upcomingControl.classList.contains('active')}`);
    
    console.log('✅ Prueba de controles completada');
}

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
window.formatDateForManualPayment = formatDateForManualPayment;

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
window.debugInvoices = debugInvoices;
window.debugSectionControls = debugSectionControls;
window.debugControlVisualState = debugControlVisualState;
window.showDefaultActiveSections = showDefaultActiveSections;
window.testControls = testControls;
window.debugClickEvents = debugClickEvents;
window.setupControlEventListeners = setupControlEventListeners;
window.setupSearchEventListeners = setupSearchEventListeners;
window.performSearch = performSearch;
window.clearSearch = clearSearch;
window.debugSearch = debugSearch;
window.testSearchSystem = testSearchSystem;
window.showSearchStats = showSearchStats;
window.testSectionControls = testSectionControls;
window.manualTestControls = manualTestControls;

// Función para probar controles manualmente
function manualTestControls() {
    console.log('🧪 === PRUEBA MANUAL DE CONTROLES ===');
    
    // Probar cada sección
    const sections = ['unassigned', 'overdue', 'upcoming', 'assigned', 'paid'];
    
    sections.forEach((section, index) => {
        setTimeout(() => {
            console.log(`🔄 Probando sección: ${section}`);
            toggleSection(section);
            
            // Verificar estado después de 500ms
            setTimeout(() => {
                const isVisible = sectionVisibility[section];
                const sectionElement = document.getElementById(`${section}Section`);
                const controlElement = document.getElementById(`control-${section}`);
                
                console.log(`📊 ${section}: visible=${isVisible}, display=${sectionElement.style.display}, controlActive=${controlElement.classList.contains('active')}`);
            }, 100);
        }, index * 200);
    });
}

// Funciones de búsqueda por sección
window.filterSectionItems = filterSectionItems;
window.applyVisualFilters = applyVisualFilters;
window.clearAllVisualFilters = clearAllVisualFilters;
window.setupRealTimeSearch = setupRealTimeSearch;
window.highlightSearchTerms = highlightSearchTerms;
window.restoreOriginalText = restoreOriginalText;

console.log('✅ utils.js cargado - Funciones utilitarias disponibles');

// Ejecutar sincronización inicial después de cargar
setTimeout(() => {
    ensureVariableSync();
    console.log('🔄 Sincronización inicial ejecutada');
    
    // Configurar secciones activas por defecto
    showDefaultActiveSections();
    
    // Configurar event listeners para controles
    setupControlEventListeners();
    
    // Configurar event listeners de búsqueda
    setupSearchEventListeners();
    
    // Verificar que todo está funcionando (sin cambiar visibilidad)
    console.log('🔍 Verificando estado de controles...');
    console.log('📊 Estado actual de secciones:', sectionVisibility);
}, 1000);