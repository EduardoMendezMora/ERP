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
        
        // Tomar los 10 peores deudores (o todos si hay menos de 10)
        filteredClients = clientsWithDebt.slice(0, 10);
        
        // Renderizar resultados
        renderStats();
        renderClients();
        
        showLoading(false);
        
    } catch (error) {
        console.error('❌ Error al inicializar:', error);
        showToast('Error al cargar datos: ' + error.message, 'error');
        showLoading(false);
    }
}

// ===== CARGA DE DATOS =====
async function loadClients() {
    console.log('📋 Cargando clientes...');
    const response = await fetch(API_CONFIG.CLIENTS);
    if (!response.ok) throw new Error('Error al cargar clientes');
    
    allClients = await response.json();
    console.log(`✅ ${allClients.length} clientes cargados`);
}

async function loadInvoices() {
    console.log('📋 Cargando facturas...');
    const response = await fetch(API_CONFIG.INVOICES);
    if (!response.ok) throw new Error('Error al cargar facturas');
    
    allInvoices = await response.json();
    console.log(`✅ ${allInvoices.length} facturas cargadas`);
}

async function loadPayments() {
    console.log('📋 Cargando pagos...');
    const sheets = ['BAC', 'BN', 'HuberBN'];
    allPayments = [];
    
    for (const sheet of sheets) {
        try {
            const response = await fetch(`${API_CONFIG.PAYMENTS}?sheet=${sheet}`);
            if (response.ok) {
                const sheetPayments = await response.json();
                const paymentsWithBank = Array.isArray(sheetPayments) ? 
                    sheetPayments.map(p => ({ ...p, banco: sheet })) : [];
                allPayments.push(...paymentsWithBank);
            }
        } catch (error) {
            console.warn(`Error al cargar pagos de ${sheet}:`, error);
        }
    }
    
    console.log(`✅ ${allPayments.length} pagos cargados`);
}

// ===== CÁLCULO DE DEUDAS =====
function calculateClientDebts() {
    console.log('🧮 Calculando deudas de clientes...');
    
    const clientsWithDebt = [];
    
    for (const client of allClients) {
        const clientId = client.ID || client.ID_Cliente;
        if (!clientId) continue;
        
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
            // Caso 2: ID_Cliente está en Observaciones
            if (payment.Observaciones && isClientIdInObservations(payment.Observaciones, clientId)) {
                return true;
            }
            return false;
        });
        
        // Calcular deuda total
        const debtInfo = calculateTotalDebt(clientInvoices, clientPayments);
        
        if (debtInfo.totalDebt > 0) {
            clientsWithDebt.push({
                ...client,
                ...debtInfo,
                clientId: clientId
            });
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
        if (invoice.Estado === 'Cancelado') continue;
        
        const baseAmount = parseAmount(invoice.MontoBase || 0);
        const fines = parseAmount(invoice.MontoMultas || 0);
        const invoiceTotal = baseAmount + fines;
        
        totalDebt += invoiceTotal;
        totalFines += fines;
        
        if (invoice.Estado === 'Pendiente' && invoice.DiasAtraso > 0) {
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
        
        // CALCULAR MONTO DISPONIBLE (descontando asignaciones previas)
        const previouslyAssignedAmount = assignedAmount;
        const availableAmount = paymentAmount - previouslyAssignedAmount;
        
        // SOLO RESTAR EL MONTO REALMENTE DISPONIBLE
        const amountToSubtract = Math.max(0, availableAmount);
        
        // Log de debugging para casos problemáticos
        if (assignedAmount > paymentAmount) {
            console.warn(`⚠️ Pago ${payment.Referencia || 'N/A'}: Asignaciones (₡${assignedAmount.toLocaleString('es-CR')}) exceden monto real (₡${paymentAmount.toLocaleString('es-CR')}). Solo restando ₡${amountToSubtract.toLocaleString('es-CR')} disponible`);
        }
        
        // Log detallado para debugging
        console.log(`💰 Pago ${payment.Referencia || 'N/A'}: Total=${paymentAmount.toLocaleString('es-CR')}, Asignado=${assignedAmount.toLocaleString('es-CR')}, Disponible=${availableAmount.toLocaleString('es-CR')}, Restando=${amountToSubtract.toLocaleString('es-CR')}`);
        
        totalDebt -= amountToSubtract;
    }
    
    // Asegurar que la deuda no sea negativa
    totalDebt = Math.max(0, totalDebt);
    
    // Calcular promedio de días de atraso
    const totalInvoices = invoices.filter(inv => inv.Estado !== 'Cancelado').length;
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
            const allClientsWithDebt = allClients.filter(c => c.totalDebt > 0);
            const filteredByAmount = allClientsWithDebt.filter(c => c.totalDebt >= minAmount);
            filteredClients = filteredByAmount.sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 10);
        } else {
            // Si no hay monto mínimo, mostrar los 10 peores
            const allClientsWithDebt = allClients.filter(c => c.totalDebt > 0);
            filteredClients = allClientsWithDebt.sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 10);
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

console.log('✅ capturas.js cargado - Sistema de capturas listo'); 