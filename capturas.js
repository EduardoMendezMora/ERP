// ===== CAPTURAS.JS - LÓGICA PARA CLIENTES CON DEUDAS ALTAS =====

// Variables globales
let allClients = [];
let allInvoices = [];
let allPayments = [];
let filteredClients = [];

// Configuración de rangos de deuda
const DEBT_RANGES = {
    CRITICAL: 400000,  // > ₡400,000
    HIGH: 300000,      // ₡300,000 - ₡400,000
    MEDIUM: 200000     // ₡200,000 - ₡300,000
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando página de capturas...');
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    try {
        showLoading(true);
        
        // Cargar todos los datos necesarios
        await Promise.all([
            loadClients(),
            loadInvoices(),
            loadPayments()
        ]);
        
        // Calcular deudas de todos los clientes
        const clientsWithDebt = calculateClientDebts();
        
        // Ordenar por deuda (mayor a menor)
        clientsWithDebt.sort((a, b) => b.totalDebt - a.totalDebt);
        
        // Tomar los 5 peores deudores (cambiado de 10 a 5)
        filteredClients = clientsWithDebt.slice(0, 5);
        
        // Si no hay clientes con deuda, mostrar todos los clientes (para debug)
        if (filteredClients.length === 0) {
            console.log('⚠️ No hay clientes con deuda, mostrando todos los clientes para debug...');
            filteredClients = allClients.slice(0, 5).map(client => ({
                ...client,
                totalDebt: 0,
                overdueInvoices: 0,
                totalFines: 0,
                averageDaysOverdue: 0,
                lastInvoiceDate: 'N/A',
                debtLevel: 'low',
                clientId: client.ID || client.ID_Cliente
            }));
        }
        
        // Renderizar resultados
        renderStats();
        renderClients();
        
        showLoading(false);
        
        console.log(`✅ Carga completada: ${filteredClients.length} clientes mostrados`);
        
    } catch (error) {
        console.error('❌ Error al inicializar:', error);
        showToast('Error al cargar datos: ' + error.message, 'error');
        showLoading(false);
    }
}

// ===== CARGA DE DATOS =====
async function loadClients() {
    console.log('📋 Cargando clientes...');
    console.log('🔗 URL:', API_CONFIG.CLIENTS);
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
        
        const response = await fetch(API_CONFIG.CLIENTS, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('📡 Respuesta:', response.status, response.statusText);
        
        if (!response.ok) throw new Error(`Error al cargar clientes: ${response.status}`);
        
        const rawData = await response.json();
        console.log(`📊 Datos crudos recibidos: ${rawData.length} registros`);
        
        // Filtrar solo registros que sean clientes (no facturas)
        allClients = rawData.filter(client => 
            client.ID && client.Nombre && 
            !client.NumeroFactura && 
            !client.MontoBase
        );
        
        console.log(`✅ ${allClients.length} clientes válidos después del filtrado`);
        
        if (allClients.length === 0) {
            console.warn('⚠️ No se encontraron clientes válidos. Verificando datos crudos...');
            console.log('📋 Muestra de datos crudos:', rawData.slice(0, 3));
        } else {
            console.log('📋 Primeros 3 clientes:', allClients.slice(0, 3));
        }
    } catch (error) {
        console.error('❌ Error al cargar clientes:', error);
        throw error;
    }
}

async function loadInvoices() {
    console.log('📋 Cargando facturas...');
    console.log('🔗 URL:', API_CONFIG.INVOICES);
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
        
        const response = await fetch(API_CONFIG.INVOICES, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('📡 Respuesta:', response.status, response.statusText);
        
        if (!response.ok) throw new Error(`Error al cargar facturas: ${response.status}`);
        
        const allData = await response.json();
        console.log(`📊 Datos crudos recibidos: ${allData.length} registros`);
        
        // Filtrar solo registros que sean facturas
        allInvoices = allData.filter(item => 
            item.NumeroFactura && 
            (item.MontoBase || item.Monto) && 
            (item.ID_Cliente || item.ID)
        );
        
        // Si no se encontraron facturas con el filtro estricto, intentar con filtro más flexible
        if (allInvoices.length === 0) {
            console.log('🔄 Intentando filtro más flexible para facturas...');
            allInvoices = allData.filter(item => 
                item.NumeroFactura && 
                (item.MontoBase || item.Monto || item.MontoTotal || item.Total)
            );
            console.log(`✅ ${allInvoices.length} facturas encontradas con filtro flexible`);
        }
        
        // Si aún no se encuentran, mostrar todos los datos para debug
        if (allInvoices.length === 0) {
            console.log('🔄 Mostrando todos los datos para análisis...');
            console.log('📋 Todos los datos recibidos:', allData);
            
            // Intentar identificar qué campos podrían ser facturas
            if (allData.length > 0) {
                const sample = allData[0];
                console.log('🔍 Campos disponibles en los datos:', Object.keys(sample));
                
                // Buscar cualquier campo que contenga "factura" o "monto"
                const possibleInvoiceFields = Object.keys(sample).filter(key => 
                    key.toLowerCase().includes('factura') || 
                    key.toLowerCase().includes('monto') || 
                    key.toLowerCase().includes('total') ||
                    key.toLowerCase().includes('invoice')
                );
                console.log('🎯 Campos que podrían ser facturas:', possibleInvoiceFields);
            }
        }
        
        console.log(`✅ ${allInvoices.length} facturas cargadas`);
        
        if (allInvoices.length === 0) {
            console.warn('⚠️ No se encontraron facturas válidas. Verificando datos crudos...');
            console.log('📋 Muestra de datos crudos:', allData.slice(0, 3));
            
            // Analizar estructura de los datos
            if (allData.length > 0) {
                console.log('🔍 Análisis de estructura de datos:');
                const sample = allData[0];
                console.log('  Campos disponibles:', Object.keys(sample));
                console.log('  Campos que podrían ser facturas:');
                Object.keys(sample).forEach(key => {
                    if (key.toLowerCase().includes('factura') || key.toLowerCase().includes('monto') || key.toLowerCase().includes('total')) {
                        console.log(`    - ${key}: ${sample[key]}`);
                    }
                });
            }
        } else {
            console.log('📋 Primeras 3 facturas:', allInvoices.slice(0, 3));
        }
    } catch (error) {
        console.error('❌ Error al cargar facturas:', error);
        throw error;
    }
}

async function loadPayments() {
    console.log('📋 Cargando pagos...');
    const sheets = ['BAC', 'BN', 'HuberBN'];
    allPayments = [];
    
    for (const sheet of sheets) {
        try {
            const url = `${API_CONFIG.PAYMENTS}?sheet=${sheet}`;
            console.log(`🔗 Consultando ${sheet}:`, url);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
            
            const response = await fetch(url, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log(`📡 Respuesta ${sheet}:`, response.status, response.statusText);
            
            if (response.ok) {
                const sheetPayments = await response.json();
                const paymentsWithBank = Array.isArray(sheetPayments) ? 
                    sheetPayments.map(p => ({ ...p, banco: sheet })) : [];
                allPayments.push(...paymentsWithBank);
                console.log(`✅ ${sheet}: ${paymentsWithBank.length} pagos cargados`);
            } else {
                console.warn(`❌ ${sheet}: Error ${response.status}`);
            }
        } catch (error) {
            console.warn(`❌ Error al cargar pagos de ${sheet}:`, error);
        }
    }
    
    console.log(`✅ Total: ${allPayments.length} pagos cargados`);
    console.log('📋 Primeros 3 pagos:', allPayments.slice(0, 3));
}

// ===== CÁLCULO DE DEUDAS =====
function calculateClientDebts() {
    console.log('🧮 Calculando deudas de clientes...');
    console.log(`📊 Datos disponibles:`);
    console.log(`  - Clientes: ${allClients.length}`);
    console.log(`  - Facturas: ${allInvoices.length}`);
    console.log(`  - Pagos: ${allPayments.length}`);
    
    const clientsWithDebt = [];
    
    for (const client of allClients) {
        const clientId = client.ID || client.ID_Cliente;
        if (!clientId) {
            console.log(`⚠️ Cliente sin ID:`, client);
            continue;
        }
        
        // Obtener facturas del cliente
        const clientInvoices = allInvoices.filter(inv => 
            inv.ID_Cliente && inv.ID_Cliente.toString() === clientId.toString()
        );
        
        // Obtener pagos del cliente
        const clientPayments = allPayments.filter(payment => {
            // Caso 1: ID_Cliente coincide directamente
            if (payment.ID_Cliente && payment.ID_Cliente.toString() === clientId.toString()) {
                return true;
            }
            // Caso 2: ID_Cliente está en Observaciones (búsqueda simple)
            if (payment.Observaciones && payment.Observaciones.toString().includes(clientId.toString())) {
                return true;
            }
            return false;
        });
        
        // Calcular deuda total
        const debtInfo = calculateTotalDebt(clientInvoices, clientPayments);
        
        // Incluir TODOS los clientes con deuda, sin importar el monto
        if (debtInfo.totalDebt > 0) {
            clientsWithDebt.push({
                ...client,
                ...debtInfo,
                clientId: clientId
            });
            console.log(`💰 Cliente ${client.Nombre} (${clientId}): ₡${debtInfo.totalDebt.toLocaleString('es-CR')}`);
        }
    }
    
    console.log(`✅ ${clientsWithDebt.length} clientes con deuda calculada`);
    return clientsWithDebt;
}

function calculateTotalDebt(invoices, payments) {
    let totalDebt = 0;
    let overdueInvoices = 0;
    let totalFines = 0;
    let averageDaysOverdue = 0;
    let lastInvoiceDate = null;
    
    // Calcular deuda de facturas
    for (const invoice of invoices) {
        if (invoice.Estado === 'Pagado') continue;
        
        const baseAmount = parseFloat(invoice.MontoBase || 0);
        const fines = parseFloat(invoice.MontoMultas || 0);
        const invoiceTotal = baseAmount + fines;
        
        totalDebt += invoiceTotal;
        totalFines += fines;
        
        if (invoice.Estado === 'Vencido') {
            overdueInvoices++;
        }
        
        // Calcular días de atraso promedio
        if (invoice.DiasAtraso) {
            averageDaysOverdue += parseInt(invoice.DiasAtraso);
        }
        
        // Obtener fecha de última factura
        const invoiceDate = parseDate(invoice.FechaCreacion);
        if (invoiceDate && (!lastInvoiceDate || invoiceDate > lastInvoiceDate)) {
            lastInvoiceDate = invoiceDate;
        }
    }
    
    // Restar pagos aplicados
    for (const payment of payments) {
        const paymentAmount = parsePaymentAmount(payment.Créditos, payment.banco);
        const assignments = parseTransactionAssignments(payment.FacturasAsignadas || '');
        const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
        
        totalDebt -= assignedAmount;
    }
    
    // Asegurar que la deuda no sea negativa
    totalDebt = Math.max(0, totalDebt);
    
    // Calcular promedio de días de atraso
    const totalInvoices = invoices.filter(inv => inv.Estado !== 'Pagado').length;
    averageDaysOverdue = totalInvoices > 0 ? Math.round(averageDaysOverdue / totalInvoices) : 0;
    
    return {
        totalDebt,
        overdueInvoices,
        totalFines,
        averageDaysOverdue,
        lastInvoiceDate: lastInvoiceDate ? formatDateForDisplay(lastInvoiceDate) : 'N/A',
        debtLevel: getDebtLevel(totalDebt)
    };
}

function getDebtLevel(debt) {
    if (debt > DEBT_RANGES.CRITICAL) return 'critical';
    if (debt > DEBT_RANGES.HIGH) return 'high';
    if (debt > DEBT_RANGES.MEDIUM) return 'medium';
    return 'low';
}

// ===== FILTRADO Y BÚSQUEDA =====
function filterClientsByMinAmount(clients) {
    // Ya no filtramos por monto mínimo, solo aplicamos búsqueda si es necesario
    return clients;
}

function filterClientsBySearch(clients, searchTerm) {
    if (!searchTerm.trim()) return clients;
    
    const term = searchTerm.toLowerCase();
    return clients.filter(client => 
        (client.Nombre || '').toLowerCase().includes(term) ||
        (client.ID || '').toString().toLowerCase().includes(term) ||
        (client.Placa || '').toLowerCase().includes(term)
    );
}

// ===== RENDERIZADO =====
function renderStats() {
    const totalDebt = filteredClients.reduce((sum, client) => sum + client.totalDebt, 0);
    const criticalCount = filteredClients.filter(c => c.debtLevel === 'critical').length;
    const highCount = filteredClients.filter(c => c.debtLevel === 'high').length;
    const mediumCount = filteredClients.filter(c => c.debtLevel === 'medium').length;
    
    document.getElementById('totalDebt').textContent = `₡${totalDebt.toLocaleString('es-CR')}`;
    document.getElementById('criticalCount').textContent = criticalCount;
    document.getElementById('highCount').textContent = highCount;
    document.getElementById('mediumCount').textContent = mediumCount;
    document.getElementById('totalClients').textContent = filteredClients.length;
}

function renderClients() {
    const searchTerm = document.getElementById('searchInput').value;
    const displayClients = filterClientsBySearch(filteredClients, searchTerm);
    
    const clientsGrid = document.getElementById('clientsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (displayClients.length === 0) {
        clientsGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    clientsGrid.style.display = 'grid';
    
    clientsGrid.innerHTML = displayClients.map(client => `
        <div class="client-card ${client.debtLevel}" onclick="viewClientInvoices('${client.clientId}')">
            <div class="client-header">
                <div class="client-info">
                    <h3>${client.Nombre || 'Sin nombre'}</h3>
                    <div class="client-id">ID: ${client.clientId}</div>
                </div>
                <div>
                    <div class="debt-amount debt-${client.debtLevel}">
                        ₡${client.totalDebt.toLocaleString('es-CR')}
                    </div>
                    <div class="debt-label">
                        ${getDebtLevelLabel(client.debtLevel)}
                    </div>
                </div>
            </div>
            
            <div class="client-details">
                <div class="detail-item">
                    <div class="detail-label">Placa</div>
                    <div class="detail-value">${client.Placa || 'Sin placa'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Facturas Vencidas</div>
                    <div class="detail-value">${client.overdueInvoices}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Multas Acumuladas</div>
                    <div class="detail-value">₡${client.totalFines.toLocaleString('es-CR')}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Días Atraso Prom.</div>
                    <div class="detail-value">${client.averageDaysOverdue} días</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Última Factura</div>
                    <div class="detail-value">${client.lastInvoiceDate}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Teléfono</div>
                    <div class="detail-value">${client.numeroTelefono || 'Sin teléfono'}</div>
                </div>
            </div>
            
            <div class="client-actions">
                <button class="btn btn-primary" onclick="event.stopPropagation(); viewClientInvoices('${client.clientId}')">
                    📋 Ver Facturas
                </button>
            </div>
        </div>
    `).join('');
}

function getDebtLevelLabel(level) {
    switch (level) {
        case 'critical': return 'CRÍTICO';
        case 'high': return 'ALTO';
        case 'medium': return 'MEDIO';
        default: return 'BAJO';
    }
}

// ===== NAVEGACIÓN =====
function viewClientInvoices(clientId) {
    window.location.href = `https://arrendautos.app/facturas.html?clientId=${clientId}`;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Filtro por monto mínimo (ahora opcional para búsqueda personalizada)
    document.getElementById('minAmount').addEventListener('input', function() {
        const minAmount = parseInt(this.value) || 0;
        if (minAmount > 0) {
            // Si se especifica un monto mínimo, filtrar por ese monto
            const allClientsWithDebt = calculateClientDebts();
            const filteredByAmount = allClientsWithDebt.filter(c => c.totalDebt >= minAmount);
            filteredClients = filteredByAmount.sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 5);
        } else {
            // Si no hay monto mínimo, mostrar los 5 peores
            const allClientsWithDebt = calculateClientDebts();
            filteredClients = allClientsWithDebt.sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 5);
        }
        renderStats();
        renderClients();
    });
    
    // Búsqueda
    document.getElementById('searchInput').addEventListener('input', function() {
        renderClients();
    });
}

// ===== UTILIDADES =====
function showLoading(show) {
    const loading = document.getElementById('loading');
    const clientsGrid = document.getElementById('clientsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (show) {
        loading.style.display = 'block';
        clientsGrid.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        loading.style.display = 'none';
    }
}

function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff3b30' : type === 'success' ? '#34c759' : '#007aff'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== FUNCIONES DE PARSEO (importadas de utils.js) =====
function parseTransactionAssignments(assignmentsString) {
    if (!assignmentsString || assignmentsString.trim() === '') return [];
    
    try {
        return assignmentsString.split(';')
            .filter(assignment => assignment.trim() !== '')
            .map(assignment => {
                const [invoiceNumber, amount] = assignment.split(':');
                return {
                    invoiceNumber: invoiceNumber.trim(),
                    amount: parseFloat(amount || 0)
                };
            })
            .filter(assignment => assignment.invoiceNumber && assignment.amount > 0);
    } catch (error) {
        console.error('Error al parsear asignaciones de transacción:', error);
        return [];
    }
}

function parsePaymentAmount(paymentAmount, bankSource) {
    if (!paymentAmount) return 0;
    
    const cleanValue = paymentAmount.toString().trim().replace(/[^\d.,]/g, '');
    
    if (bankSource === 'BAC') {
        // BAC usa formato europeo: punto como separador de miles, coma como decimal
        if (cleanValue.includes(',')) {
            const normalizedValue = cleanValue.replace(/\./g, '').replace(',', '.');
            return parseFloat(normalizedValue);
        } else {
            const normalizedValue = cleanValue.replace(/\./g, '');
            return parseFloat(normalizedValue);
        }
    } else if (bankSource === 'BN') {
        // BN usa formato americano: coma como separador de miles, punto como decimal
        if (cleanValue.includes(',')) {
            const normalizedValue = cleanValue.replace(/,/g, '');
            return parseFloat(normalizedValue);
        } else {
            return parseFloat(cleanValue);
        }
    } else {
        // Otros bancos - usar lógica general
        if (cleanValue.includes(',')) {
            return parseFloat(cleanValue.replace(',', '.'));
        } else {
            return parseFloat(cleanValue);
        }
    }
}

// ===== FUNCIÓN DE FALLBACK =====
function isClientIdInObservations(observations, clientId) {
    // Verificar si existe la función en utils.js (que es más completa)
    if (typeof window.isClientIdInObservations === 'function' && window.isClientIdInObservations !== isClientIdInObservations) {
        return window.isClientIdInObservations(observations, clientId);
    }
    
    // Fallback simple: buscar el ID en las observaciones
    if (!observations || !clientId) return false;
    
    const obsText = observations.toString().trim();
    const targetId = clientId.toString();
    
    // Búsqueda simple y directa
    return obsText.includes(targetId);
}

// ===== FUNCIÓN DE DEBUG =====
function debugData() {
    console.log('🔍 === DEBUG DE DATOS ===');
    console.log('📊 Variables globales:');
    console.log('  allClients:', allClients?.length || 0);
    console.log('  allInvoices:', allInvoices?.length || 0);
    console.log('  allPayments:', allPayments?.length || 0);
    console.log('  filteredClients:', filteredClients?.length || 0);
    
    console.log('🔗 URLs de API:');
    console.log('  CLIENTS:', API_CONFIG?.CLIENTS);
    console.log('  INVOICES:', API_CONFIG?.INVOICES);
    console.log('  PAYMENTS:', API_CONFIG?.PAYMENTS);
    
    console.log('📋 Muestra de datos:');
    if (allClients?.length > 0) {
        console.log('  Primer cliente:', allClients[0]);
    }
    if (allInvoices?.length > 0) {
        console.log('  Primera factura:', allInvoices[0]);
    }
    if (allPayments?.length > 0) {
        console.log('  Primer pago:', allPayments[0]);
    }
    
    // Debug adicional para entender el problema
    console.log('🔍 === ANÁLISIS DETALLADO ===');
    
    // Verificar si hay datos crudos
    if (allClients?.length > 0) {
        console.log('📋 Tipos de registros en allClients:');
        const tipos = {};
        allClients.forEach(item => {
            const tipo = item.NumeroFactura ? 'Factura' : 'Cliente';
            tipos[tipo] = (tipos[tipo] || 0) + 1;
        });
        console.log('  Distribución:', tipos);
    }
    
    // Verificar clientes con deuda
    if (filteredClients?.length > 0) {
        console.log('💰 Clientes con deuda encontrados:');
        filteredClients.forEach((client, index) => {
            console.log(`  ${index + 1}. ${client.Nombre} (ID: ${client.clientId}) - ₡${client.totalDebt.toLocaleString('es-CR')}`);
        });
    } else {
        console.log('❌ No se encontraron clientes con deuda');
        
        // Intentar recalcular
        console.log('🔄 Intentando recalcular deudas...');
        const clientsWithDebt = calculateClientDebts();
        console.log(`  Clientes con deuda recalculados: ${clientsWithDebt.length}`);
        
        if (clientsWithDebt.length > 0) {
            console.log('  Top 5 recalculados:');
            clientsWithDebt.slice(0, 5).forEach((client, index) => {
                console.log(`    ${index + 1}. ${client.Nombre} - ₡${client.totalDebt.toLocaleString('es-CR')}`);
            });
        }
    }
    
    console.log('========================');
}

// ===== FUNCIÓN DE RECARGA =====
function reloadData() {
    console.log('🔄 Recargando datos...');
    showToast('Recargando datos...', 'info');
    initializeApp();
}

// ===== FUNCIÓN DE ANÁLISIS DE DATOS =====
function analyzeDataStructure() {
    console.log('🔍 === ANÁLISIS DE ESTRUCTURA DE DATOS ===');
    
    if (allClients && allClients.length > 0) {
        console.log('📋 Estructura de clientes:');
        const clientSample = allClients[0];
        console.log('  Campos:', Object.keys(clientSample));
        console.log('  Muestra:', clientSample);
    }
    
    // Intentar cargar datos crudos de facturas
    fetch(API_CONFIG.INVOICES)
        .then(response => response.json())
        .then(data => {
            console.log('📋 Datos crudos de facturas:');
            console.log('  Total registros:', data.length);
            if (data.length > 0) {
                console.log('  Campos disponibles:', Object.keys(data[0]));
                console.log('  Primeros 3 registros:', data.slice(0, 3));
                
                // Buscar registros que podrían ser facturas
                const possibleInvoices = data.filter(item => 
                    item.NumeroFactura || 
                    item.Factura || 
                    item.NúmeroFactura ||
                    item.MontoBase ||
                    item.Monto ||
                    item.Total
                );
                console.log(`  Posibles facturas encontradas: ${possibleInvoices.length}`);
                if (possibleInvoices.length > 0) {
                    console.log('  Muestra de posibles facturas:', possibleInvoices.slice(0, 3));
                }
            }
        })
        .catch(error => {
            console.error('❌ Error al analizar datos:', error);
        });
    
    // Probar diferentes URLs para facturas
    console.log('🔄 Probando diferentes URLs para facturas...');
    
    const testUrls = [
        'https://sheetdb.io/api/v1/qu62bagiwlgqy?sheet=Facturas',
        'https://sheetdb.io/api/v1/qu62bagiwlgqy?sheet=facturas',
        'https://sheetdb.io/api/v1/qu62bagiwlgqy?sheet=Invoices',
        'https://sheetdb.io/api/v1/qu62bagiwlgqy?sheet=invoices',
        'https://sheetdb.io/api/v1/qu62bagiwlgqy'
    ];
    
    testUrls.forEach((url, index) => {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log(`📋 URL ${index + 1} (${url}): ${data.length} registros`);
                if (data.length > 0) {
                    console.log(`  Campos: ${Object.keys(data[0]).join(', ')}`);
                }
            })
            .catch(error => {
                console.log(`❌ URL ${index + 1} (${url}): Error - ${error.message}`);
            });
    });
}

console.log('✅ capturas.js cargado - Sistema de capturas listo'); 