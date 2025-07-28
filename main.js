// ===== MAIN.JS - CONTROLADOR PRINCIPAL =====
// Este archivo coordina la aplicación sin duplicar funciones de otros módulos

// ===== INICIALIZACIÓN DE LA APLICACIÓN =====
async function initializeApp() {
    console.log('🚀 Inicializando aplicación de facturas...');

    try {
        // Obtener ID del cliente desde la URL
        const urlParams = new URLSearchParams(window.location.search);
        const clientId = urlParams.get('clientId') || urlParams.get('id') || urlParams.get('cliente');

        console.log('🔍 Parámetros de URL encontrados:', window.location.search);
        console.log('🆔 ID del cliente extraído:', clientId);

        if (!clientId) {
            // Redirigir automáticamente a la página de clientes si no hay parámetro
            window.location.href = '/clientes.html'; // Ajusta la ruta si tu archivo de clientes tiene otro nombre o ubicación
            return;
        }

        if (!clientId) {
            console.error('❌ No se encontró ID de cliente en la URL');
            console.error('📋 Parámetros disponibles:', [...urlParams.entries()]);
            throw new Error('No se proporcionó un ID de cliente en la URL. Use ?cliente=123456 o ?clientId=123456');
        }

        // ✅ Establecer ID del cliente globalmente
        currentClientId = clientId;
        window.currentClientId = clientId;

        console.log('🆔 Cliente ID obtenido:', clientId);

        // Cargar preferencias de sección guardadas
        loadSectionPreferences();

        // Mostrar loading
        showLoading(true);

        // Cargar datos del cliente y facturas
        await loadClientAndInvoices(clientId);

        // Cargar pagos no asignados y asignados
        await Promise.all([
            loadUnassignedPayments(clientId),
            loadAssignedPayments(clientId)
        ]);

        // Renderizar la página completa
        renderPage();

        // Mostrar contenido principal
        document.getElementById('mainContent').style.display = 'block';
        showLoading(false);

        console.log('✅ Aplicación inicializada correctamente');

    } catch (error) {
        console.error('❌ Error al inicializar aplicación:', error);
        showError(error.message);
        showLoading(false);
    }
}

// ===== FUNCIÓN PRINCIPAL DE RENDERIZADO =====
function renderPage() {
    console.log('🎨 Renderizando página completa...');

    try {
        // Actualizar nombre del cliente en header
        updateClientHeader();

        // Renderizar detalles del cliente
        renderClientDetails();

        // Clasificar facturas por estado
        const overdueInvoices = clientInvoices.filter(inv => inv.Estado === 'Vencido');
        const paidInvoices = clientInvoices.filter(inv => inv.Estado === 'Pagado');

        // Actualizar estadísticas
        updateStatsWithoutPending(overdueInvoices, paidInvoices);

        // Renderizar secciones de facturas
        renderInvoicesSection('overdue', overdueInvoices);
        renderInvoicesSection('paid', paidInvoices);

        // Renderizar secciones de pagos
        renderUnassignedPaymentsSection();
        renderAssignedPaymentsSection();

        // Actualizar contadores de secciones
        updateSectionCounts();

        // Aplicar visibilidad de secciones
        updateSectionVisibility();
        updateControlUI();

        console.log('✅ Página renderizada completamente');

    } catch (error) {
        console.error('❌ Error al renderizar página:', error);
        showToast('Error al renderizar la página: ' + error.message, 'error');
    }
}

// ===== FUNCIÓN PARA ACTUALIZAR HEADER DEL CLIENTE =====
function updateClientHeader() {
    // ✅ Usar la variable sincronizada correctamente
    const client = window.currentClient || currentClient;

    if (!client) {
        console.error('❌ No hay cliente disponible para actualizar header');
        return;
    }

    // Actualizar nombre en header
    const clientNameElement = document.getElementById('clientName');
    if (clientNameElement) {
        clientNameElement.textContent = `Cliente: ${client.Nombre}`;
    }

    // Actualizar detalles del cliente
    const clientNameDetailElement = document.getElementById('clientNameDetail');
    const clientIdDetailElement = document.getElementById('clientIdDetail');

    if (clientNameDetailElement) {
        clientNameDetailElement.textContent = client.Nombre;
    }

    if (clientIdDetailElement) {
        clientIdDetailElement.textContent = `ID: ${client.ID}`;
    }
}

// ===== FUNCIÓN DE REINTENTO DE CARGA =====
async function retryLoad() {
    console.log('🔄 Reintentando cargar datos...');

    // Ocultar error y mostrar loading
    document.getElementById('errorState').style.display = 'none';

    // Reinicializar la aplicación
    await initializeApp();
}

// ===== MODALES DE ASIGNACIÓN DE PAGOS =====
function openAssignPaymentModal(paymentReference, bankSource) {
    console.log('💰 Abriendo modal de asignación de pago:', paymentReference);

    // Encontrar el pago
    const payment = unassignedPayments.find(p =>
        p.Referencia === paymentReference && p.BankSource === bankSource
    );

    if (!payment) {
        showToast('Pago no encontrado', 'error');
        return;
    }

    currentPaymentForAssignment = payment;

    // Crear y mostrar modal si no existe
    if (!document.getElementById('assignPaymentModal')) {
        createAssignPaymentModal();
    }

    renderAssignPaymentModal(payment);
    document.getElementById('assignPaymentModal').classList.add('show');
}

function openAssignInvoiceModal(invoiceNumber) {
    console.log('📄 Abriendo modal de asignación de factura:', invoiceNumber);

    // Encontrar la factura
    const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceNumber);

    if (!invoice) {
        showToast('Factura no encontrada', 'error');
        return;
    }

    currentInvoiceForAssignment = invoice;

    // Crear y mostrar modal si no existe
    if (!document.getElementById('assignInvoiceModal')) {
        createAssignInvoiceModal();
    }

    renderAssignInvoiceModal(invoice);
    document.getElementById('assignInvoiceModal').classList.add('show');
}

// ===== CREACIÓN DE MODALES DE ASIGNACIÓN =====
function createAssignPaymentModal() {
    const modalHTML = `
        <div class="modal-overlay" id="assignPaymentModal" onclick="closeAssignPaymentModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 900px;">
                <div class="modal-header">
                    <h3>💰 Asignar Pago a Factura</h3>
                    <button class="modal-close" onclick="closeAssignPaymentModal()">✕</button>
                </div>
                
                <div class="modal-body">
                    <!-- Tabs para navegación -->
                    <div class="modal-tabs">
                        <button class="tab-btn active" onclick="switchPaymentTab('payment')" id="tab-payment">
                            💳 Pago Seleccionado
                        </button>
                        <button class="tab-btn" onclick="switchPaymentTab('transactions')" id="tab-transactions">
                            🏦 Transacciones Bancarias
                        </button>
                    </div>
                    
                    <!-- Tab de pago seleccionado -->
                    <div id="tab-content-payment" class="tab-content active">
                        <div id="paymentInfoForAssignment"></div>
                        <div id="invoiceOptionsForPayment"></div>
                    </div>
                    
                    <!-- Tab de transacciones bancarias -->
                    <div id="tab-content-transactions" class="tab-content">
                        <div id="transactionsInfo"></div>
                        <div id="transactionsList"></div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeAssignPaymentModal()">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" id="confirmAssignPaymentBtn" onclick="confirmAssignPayment()" disabled>
                            ✅ Asignar Pago
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function createAssignInvoiceModal() {
    const modalHTML = `
        <div class="modal-overlay" id="assignInvoiceModal" onclick="closeAssignInvoiceModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 900px;">
                <div class="modal-header">
                    <h3>📄 Asignar Factura a Pago</h3>
                    <button class="modal-close" onclick="closeAssignInvoiceModal()">✕</button>
                </div>
                
                <div class="modal-body">
                    <!-- Tabs para navegación -->
                    <div class="modal-tabs">
                        <button class="tab-btn active" onclick="switchInvoiceTab('invoice')" id="tab-invoice">
                            📄 Factura Seleccionada
                        </button>
                        <button class="tab-btn" onclick="switchInvoiceTab('transactions')" id="tab-transactions">
                            🏦 Transacciones Bancarias
                        </button>
                    </div>
                    
                    <!-- Tab de factura seleccionada -->
                    <div id="tab-content-invoice" class="tab-content active">
                        <div id="invoiceInfoForAssignment"></div>
                        <div id="paymentOptionsForInvoice"></div>
                    </div>
                    
                    <!-- Tab de transacciones bancarias -->
                    <div id="tab-content-transactions" class="tab-content">
                        <div id="transactionsInfo"></div>
                        <div id="transactionsList"></div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeAssignInvoiceModal()">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" id="confirmAssignInvoiceBtn" onclick="confirmAssignInvoice()" disabled>
                            ✅ Asignar Factura
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ===== RENDERIZADO DE MODALES DE ASIGNACIÓN =====
function renderAssignPaymentModal(payment) {
    const totalAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
    const assignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
    const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
    const availableAmount = totalAmount - assignedAmount;

    // Información del pago
    document.getElementById('paymentInfoForAssignment').innerHTML = `
        <div style="background: #e6f3ff; border: 2px solid #007aff; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #007aff;">💳 ${payment.Referencia} - ${getBankDisplayName(payment.BankSource)}</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 0.9rem;">
                <div><strong>Monto Total:</strong><br>₡${totalAmount.toLocaleString('es-CR')}</div>
                <div><strong>Disponible:</strong><br>₡${availableAmount.toLocaleString('es-CR')}</div>
                <div><strong>Fecha:</strong><br>${formatDateForDisplay(payment.Fecha)}</div>
            </div>
        </div>
    `;

    // Opciones de facturas
    const eligibleInvoices = clientInvoices.filter(inv =>
        inv.Estado === 'Pendiente' || inv.Estado === 'Vencido'
    );

    if (eligibleInvoices.length === 0) {
        document.getElementById('invoiceOptionsForPayment').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #86868b;">
                <h4>No hay facturas pendientes o vencidas</h4>
                <p>Todas las facturas del cliente están pagadas.</p>
            </div>
        `;
        return;
    }

    const invoiceOptionsHTML = eligibleInvoices.map(invoice => {
        const baseAmount = parseFloat(invoice.MontoBase || 0);
        const fines = parseFloat(invoice.MontoMultas || 0);
        const totalAmount = parseFloat(invoice.MontoTotal || baseAmount);
        const difference = Math.abs(totalAmount - availableAmount);
        const isExactMatch = difference < 0.01;
        const isCloseMatch = difference < 1000;

        return `
            <div class="invoice-option ${isExactMatch ? 'exact-match' : ''}" 
                 onclick="selectInvoiceForPayment('${invoice.NumeroFactura}')"
                 id="invoice-option-${invoice.NumeroFactura}">
                <div class="invoice-option-header">
                    <div>
                        <strong>${invoice.NumeroFactura}</strong>
                        <span class="status-badge status-${invoice.Estado.toLowerCase()}">${invoice.Estado}</span>
                    </div>
                    <div style="text-align: right; font-weight: 600;">
                        ₡${totalAmount.toLocaleString('es-CR')}
                        ${isExactMatch ? '<div style="color: #34c759; font-size: 0.8rem;">✅ Coincidencia exacta</div>' : ''}
                        ${!isExactMatch && isCloseMatch ? `<div style="color: #ff9500; font-size: 0.8rem;">≈ Diferencia: ₡${difference.toLocaleString('es-CR')}</div>` : ''}
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #666; margin-top: 4px;">
                    ${invoice.ConceptoManual || invoice.SemanaDescripcion || 'N/A'}<br>
                    Vencimiento: ${formatDateForDisplay(invoice.FechaVencimiento)}
                    ${fines > 0 ? ` | Multas: ₡${fines.toLocaleString('es-CR')}` : ''}
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('invoiceOptionsForPayment').innerHTML = `
        <h4 style="margin-bottom: 12px;">📋 Seleccione la factura a pagar:</h4>
        ${invoiceOptionsHTML}
    `;
}

function renderAssignInvoiceModal(invoice) {
    const baseAmount = parseFloat(invoice.MontoBase || 0);
    const fines = parseFloat(invoice.MontoMultas || 0);
    const totalAmount = parseFloat(invoice.MontoTotal || baseAmount);

    // Información de la factura
    document.getElementById('invoiceInfoForAssignment').innerHTML = `
        <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #856404;">📄 ${invoice.NumeroFactura}</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 0.9rem;">
                <div><strong>Monto Base:</strong><br>₡${baseAmount.toLocaleString('es-CR')}</div>
                <div><strong>Multas:</strong><br>₡${fines.toLocaleString('es-CR')}</div>
                <div><strong>Total:</strong><br>₡${totalAmount.toLocaleString('es-CR')}</div>
            </div>
            <div style="margin-top: 8px; font-size: 0.85rem; color: #666;">
                ${invoice.ConceptoManual || invoice.SemanaDescripcion || 'N/A'}<br>
                Vencimiento: ${formatDateForDisplay(invoice.FechaVencimiento)}
            </div>
        </div>
    `;

    // Opciones de pagos
    if (unassignedPayments.length === 0) {
        document.getElementById('paymentOptionsForInvoice').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #86868b;">
                <h4>No hay pagos disponibles</h4>
                <p>Todos los pagos están asignados a otras facturas.</p>
            </div>
        `;
        return;
    }

    const paymentOptionsHTML = unassignedPayments.map(payment => {
        const paymentAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
        const assignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
        const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
        const availableAmount = paymentAmount - assignedAmount;

        if (availableAmount <= 0) return ''; // Skip pagos completamente asignados

        const difference = Math.abs(totalAmount - availableAmount);
        const isExactMatch = difference < 0.01;
        const isCloseMatch = difference < 1000;

        return `
            <div class="payment-option ${isExactMatch ? 'exact-match' : ''}" 
                 onclick="selectPaymentForInvoice('${payment.Referencia}', '${payment.BankSource}')"
                 id="payment-option-${payment.Referencia}-${payment.BankSource}">
                <div class="payment-option-header">
                    <div>
                        <strong>${payment.Referencia}</strong>
                        <span class="bank-badge ${getBankBadgeClass(payment.BankSource)}">${payment.BankSource}</span>
                    </div>
                    <div style="text-align: right; font-weight: 600;">
                        ₡${availableAmount.toLocaleString('es-CR')} disponible
                        ${isExactMatch ? '<div style="color: #34c759; font-size: 0.8rem;">✅ Coincidencia exacta</div>' : ''}
                        ${!isExactMatch && isCloseMatch ? `<div style="color: #ff9500; font-size: 0.8rem;">≈ Diferencia: ₡${difference.toLocaleString('es-CR')}</div>` : ''}
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #666; margin-top: 4px;">
                    ${getBankDisplayName(payment.BankSource)} | ${formatDateForDisplay(payment.Fecha)}
                    ${assignedAmount > 0 ? ` | Total: ₡${paymentAmount.toLocaleString('es-CR')} (₡${assignedAmount.toLocaleString('es-CR')} asignado)` : ''}
                </div>
            </div>
        `;
    }).filter(html => html !== '').join('');

    if (paymentOptionsHTML === '') {
        document.getElementById('paymentOptionsForInvoice').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #86868b;">
                <h4>No hay pagos con saldo disponible</h4>
                <p>Todos los pagos están completamente asignados.</p>
            </div>
        `;
        return;
    }

    document.getElementById('paymentOptionsForInvoice').innerHTML = `
        <h4 style="margin-bottom: 12px;">💳 Seleccione el pago a aplicar:</h4>
        ${paymentOptionsHTML}
    `;
}

// ===== FUNCIONES DE SELECCIÓN EN MODALES =====
function selectInvoiceForPayment(invoiceNumber) {
    // Remover selección previa
    document.querySelectorAll('.invoice-option').forEach(el => el.classList.remove('selected'));

    // Seleccionar nueva opción
    const selectedElement = document.getElementById(`invoice-option-${invoiceNumber}`);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }

    selectedInvoiceForPayment = invoiceNumber;

    // Habilitar botón de confirmar
    const confirmBtn = document.getElementById('confirmAssignPaymentBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
    }
}

function selectPaymentForInvoice(paymentReference, bankSource) {
    // Remover selección previa
    document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('selected'));

    // Seleccionar nueva opción
    const selectedElement = document.getElementById(`payment-option-${paymentReference}-${bankSource}`);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }

    selectedPaymentForInvoice = { reference: paymentReference, bankSource: bankSource };

    // Habilitar botón de confirmar
    const confirmBtn = document.getElementById('confirmAssignInvoiceBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
    }
}

// ===== FUNCIONES DE CONFIRMACIÓN DE ASIGNACIÓN =====
async function confirmAssignPayment() {
    if (!currentPaymentForAssignment || !selectedInvoiceForPayment) {
        showToast('Seleccione una factura para asignar el pago', 'error');
        return;
    }

    const confirmBtn = document.getElementById('confirmAssignPaymentBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Asignando...';

    try {
        await assignPaymentToInvoice(
            currentPaymentForAssignment.Referencia,
            currentPaymentForAssignment.BankSource,
            selectedInvoiceForPayment
        );

        closeAssignPaymentModal();

    } catch (error) {
        console.error('❌ Error al confirmar asignación:', error);

        // Restaurar botón
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✅ Asignar Pago';
    }
}

async function confirmAssignInvoice() {
    if (!currentInvoiceForAssignment || !selectedPaymentForInvoice) {
        showToast('Seleccione un pago para asignar a la factura', 'error');
        return;
    }

    const confirmBtn = document.getElementById('confirmAssignInvoiceBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Asignando...';

    try {
        await assignPaymentToInvoice(
            selectedPaymentForInvoice.reference,
            selectedPaymentForInvoice.bankSource,
            currentInvoiceForAssignment.NumeroFactura
        );

        closeAssignInvoiceModal();

    } catch (error) {
        console.error('❌ Error al confirmar asignación:', error);

        // Restaurar botón
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✅ Asignar Factura';
    }
}

// ===== FUNCIONES DE CIERRE DE MODALES =====
function closeAssignPaymentModal() {
    const modal = document.getElementById('assignPaymentModal');
    if (modal) {
        modal.classList.remove('show');
        currentPaymentForAssignment = null;
        selectedInvoiceForPayment = null;
    }
}

function closeAssignInvoiceModal() {
    const modal = document.getElementById('assignInvoiceModal');
    if (modal) {
        modal.classList.remove('show');
        currentInvoiceForAssignment = null;
        selectedPaymentForInvoice = null;
    }
}

// ===== EVENT LISTENERS PRINCIPALES =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando aplicación...');

    // Cargar preferencias de sección
    loadSectionPreferences();

    // Inicializar aplicación
    initializeApp();

    // Event listeners para controles de sección
    document.addEventListener('click', function(event) {
        // Manejo de clics en controles de sección
        if (event.target.closest('.control-item')) {
            const controlItem = event.target.closest('.control-item');
            const sectionKey = controlItem.id.replace('control-', '');
            if (sectionVisibility.hasOwnProperty(sectionKey)) {
                toggleSection(sectionKey);
            }
        }
    });
});

// ===== EXPONER FUNCIONES AL SCOPE GLOBAL =====
window.initializeApp = initializeApp;
window.renderPage = renderPage;
window.updateClientHeader = updateClientHeader;
window.retryLoad = retryLoad;
window.currentClient = currentClient;

// Funciones de modales de asignación
        window.openAssignPaymentModal = openAssignPaymentModal;
        window.openAssignInvoiceModal = openAssignInvoiceModal;
        window.closeAssignPaymentModal = closeAssignPaymentModal;
        window.closeAssignInvoiceModal = closeAssignInvoiceModal;
        window.switchPaymentTab = switchPaymentTab;
        window.loadTransactionsTab = loadTransactionsTab;
        window.switchInvoiceTab = switchInvoiceTab;

// Funciones de selección
window.selectInvoiceForPayment = selectInvoiceForPayment;
window.selectPaymentForInvoice = selectPaymentForInvoice;

// Funciones de confirmación
window.confirmAssignPayment = confirmAssignPayment;
window.confirmAssignInvoice = confirmAssignInvoice;

// ===== FUNCIONES PARA TABS DEL MODAL DE PAGOS =====
function switchPaymentTab(tabName) {
    console.log('🔄 Cambiando a tab de pagos:', tabName);
    
    // Ocultar todos los tabs del modal de pagos
    const modal = document.getElementById('assignPaymentModal');
    if (modal) {
        modal.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar tab seleccionado
        const tabContent = modal.querySelector(`#tab-content-${tabName}`);
        const tabBtn = modal.querySelector(`#tab-${tabName}`);
        
        if (tabContent && tabBtn) {
            tabContent.classList.add('active');
            tabBtn.classList.add('active');
            
            // Si es el tab de transacciones, cargar datos
            if (tabName === 'transactions') {
                loadTransactionsTab();
            }
        } else {
            console.error('❌ Elementos del tab de pagos no encontrados:', tabName);
        }
    }
}

// ===== FUNCIONES PARA TABS DEL MODAL DE FACTURAS =====
function switchInvoiceTab(tabName) {
    console.log('🔄 Cambiando a tab de facturas:', tabName);
    
    // Ocultar todos los tabs del modal de facturas
    const modal = document.getElementById('assignInvoiceModal');
    if (modal) {
        modal.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar tab seleccionado
        const tabContent = modal.querySelector(`#tab-content-${tabName}`);
        const tabBtn = modal.querySelector(`#tab-${tabName}`);
        
        if (tabContent && tabBtn) {
            tabContent.classList.add('active');
            tabBtn.classList.add('active');
            
            // Si es el tab de transacciones, cargar datos
            if (tabName === 'transactions') {
                loadTransactionsTab();
            }
        } else {
            console.error('❌ Elementos del tab de facturas no encontrados:', tabName);
        }
    }
}

// ===== FUNCIÓN PARA CARGAR TRANSACCIONES BANCARIAS =====
async function loadTransactionsTab() {
    console.log('🏦 Cargando transacciones bancarias...');
    
    const transactionsInfo = document.getElementById('transactionsInfo');
    const transactionsList = document.getElementById('transactionsList');
    
    if (!transactionsInfo || !transactionsList) {
        console.error('❌ Elementos del modal de transacciones no encontrados');
        return;
    }
    
    // Mostrar loading
    transactionsInfo.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="color: #007aff; font-size: 24px; margin-bottom: 10px;">⏳</div>
            <h4>Cargando transacciones bancarias...</h4>
            <p>Buscando transacciones pendientes de conciliar</p>
        </div>
    `;
    
    try {
        // Cargar transacciones desde la API
        const apiUrl = 'https://sheetdb.io/api/v1/a7oekivxzreg7';
        console.log('📡 Conectando a:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const transactions = await response.json();
        console.log('📊 Transacciones cargadas:', transactions.length);
        
        // Filtrar transacciones pendientes de conciliar
        // NO mostrar las que tienen ID_Cliente, Observaciones o están conciliadas
        // Solo mostrar desde el 10/07/2025
        const cutoffDate = new Date('2025-07-10');
        cutoffDate.setHours(0, 0, 0, 0);
        
        const pendingTransactions = transactions.filter(t => {
            // Si tiene ID_Cliente asignado, está conciliada
            if (t.ID_Cliente && t.ID_Cliente.trim() !== '' && t.ID_Cliente !== 'undefined') {
                return false;
            }
            
            // Si tiene Observaciones con contenido, está conciliada
            if (t.Observaciones && t.Observaciones.trim() !== '' && t.Observaciones !== 'undefined') {
                return false;
            }
            
            // Filtrar por fecha - solo desde 10/07/2025
            if (t.Fecha) {
                // Parsear fecha en formato DD/MM/YYYY
                const dateParts = t.Fecha.split('/');
                if (dateParts.length === 3) {
                    const day = parseInt(dateParts[0]);
                    const month = parseInt(dateParts[1]) - 1; // Meses en JS van de 0-11
                    const year = parseInt(dateParts[2]);
                    const transactionDate = new Date(year, month, day);
                    
                    if (transactionDate < cutoffDate) {
                        return false;
                    }
                }
            }
            
            // Solo mostrar las que no están conciliadas y son desde la fecha límite
            return true;
        });
        
        console.log('📋 Transacciones pendientes:', pendingTransactions.length);
        
        // Mostrar información
        transactionsInfo.innerHTML = `
            <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px 0; color: #007aff;">🏦 Transacciones Pendientes de Conciliar</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 0.9rem;">
                    <div><strong>Total:</strong> ${transactions.length} transacciones</div>
                    <div><strong>Pendientes:</strong> ${pendingTransactions.length} transacciones</div>
                    <div><strong>Conciliadas:</strong> ${transactions.length - pendingTransactions.length} transacciones</div>
                </div>
            </div>
        `;
        
        // Mostrar lista de transacciones
        if (pendingTransactions.length === 0) {
            transactionsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #86868b;">
                    <h4>✅ No hay transacciones pendientes</h4>
                    <p>Todas las transacciones han sido conciliadas.</p>
                </div>
            `;
        } else {
            const transactionsHTML = pendingTransactions.map(transaction => {
                // Parsear el monto correctamente
                let amount = 0;
                const creditValue = transaction.Créditos || '0';
                const bank = transaction.banco || 'BAC';
                
                // Debug: mostrar el valor original
                console.log('🔍 Valor original:', creditValue, 'Banco:', bank, 'Tipo:', typeof creditValue);
                
                // Limpiar el valor de espacios y caracteres extraños
                const cleanValue = creditValue.toString().trim().replace(/[^\d.,]/g, '');
                
                // Convertir a número según el banco
                if (bank === 'BAC') {
                    // BAC usa comas como separador decimal (ej: 20.000,00)
                    if (cleanValue.includes(',')) {
                        // Reemplazar punto por nada y coma por punto
                        const normalizedValue = cleanValue.replace(/\./g, '').replace(',', '.');
                        amount = parseFloat(normalizedValue);
                    } else {
                        amount = parseFloat(cleanValue);
                    }
                } else {
                    // Otros bancos usan punto como separador decimal
                    if (cleanValue.includes(',')) {
                        // Si tiene coma, reemplazarla por punto
                        amount = parseFloat(cleanValue.replace(',', '.'));
                    } else {
                        amount = parseFloat(cleanValue);
                    }
                }
                
                // Verificar que sea un número válido
                if (isNaN(amount)) {
                    amount = 0;
                }
                
                console.log('💰 Monto parseado:', amount);
                
                const date = transaction.Fecha || 'Sin fecha';
                const reference = transaction.Referencia || 'Sin referencia';
                
                // Formatear el monto
                const formattedAmount = amount.toLocaleString('es-CR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                // Obtener descripción de la transacción
                const description = transaction.Descripción || transaction.Descripcion || transaction.Description || transaction.Detalle || transaction.Concepto || 'Sin descripción';
                
                return `
                    <div class="transaction-item" style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; margin-bottom: 8px; background: white;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <strong style="color: #007aff;">${reference}</strong>
                                    <span style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #666;">${bank}</span>
                                </div>
                                <div style="color: #333; font-size: 0.9rem; margin-bottom: 4px; line-height: 1.3;">
                                    ${description}
                                </div>
                                <small style="color: #666;">${date}</small>
                            </div>
                            <div style="text-align: right; margin-left: 12px;">
                                <strong style="color: #007aff; font-size: 1.1rem;">₡${formattedAmount}</strong>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            transactionsList.innerHTML = `
                <div style="max-height: 500px; overflow-y: auto;">
                    ${transactionsHTML}
                </div>
                <div style="text-align: center; padding: 16px; color: #86868b;">
                    <small>Mostrando todas las ${pendingTransactions.length} transacciones pendientes</small>
                </div>
            `;
        }
        
        console.log('✅ Transacciones cargadas correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando transacciones:', error);
        transactionsInfo.innerHTML = `
            <div style="background: #fee; border: 1px solid #fcc; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px 0; color: #c33;">❌ Error al cargar transacciones</h4>
                <p style="margin: 0; color: #666;">${error.message}</p>
            </div>
        `;
        transactionsList.innerHTML = '';
    }
}

console.log('✅ main.js cargado - Controlador principal de la aplicación');