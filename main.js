// ===== VARIABLES PARA MODALES DE ASIGNACIÓN =====
let selectedInvoiceForPayment = null;
let selectedPaymentForInvoice = null;

// ===== INICIALIZACIÓN DE LA APLICACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado, iniciando aplicación...');
    console.log('🎯 Sistema de Facturas v2.0 - Con distribución múltiple de pagos');

    // Cargar preferencias de secciones
    loadSectionPreferences();
    updateControlUI();

    // Inicializar aplicación
    initializeApp();
});

async function initializeApp() {
    console.log('=== INICIALIZANDO PÁGINA DE FACTURAS ===');

    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('cliente');

    if (!clientId) {
        showError('No se especificó un cliente válido en la URL');
        return;
    }

    currentClientId = clientId;
    console.log('🎯 Cliente ID desde URL:', clientId);

    await loadData();
}

async function loadData() {
    try {
        showLoading(true);

        console.log('📋 Cargando datos del cliente y facturas...');
        await loadClientAndInvoices(currentClientId);

        console.log('💰 Cargando pagos no asignados...');
        await loadUnassignedPayments(currentClientId);

        console.log('✅ Cargando pagos asignados...');
        await loadAssignedPayments(currentClientId);

        console.log('🎨 Renderizando página...');
        renderPage();

        showLoading(false);

        console.log('✅ Aplicación cargada exitosamente');

    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        showError('Error al cargar los datos: ' + error.message);
    }
}

async function retryLoad() {
    document.getElementById('errorState').style.display = 'none';
    await loadData();
}

// ===== FUNCIÓN PRINCIPAL DE RENDERIZADO =====
function renderPage() {
    if (!currentClient) {
        showError('No se pudo cargar la información del cliente');
        return;
    }

    console.log('🎨 Renderizando página completa...');

    // Actualizar información del cliente
    const clientDisplayName = `${currentClient.Nombre} (ID: ${currentClient.ID})`;
    document.getElementById('clientName').textContent = clientDisplayName;
    document.getElementById('clientNameDetail').textContent = currentClient.Nombre || 'Sin nombre';
    document.getElementById('clientIdDetail').textContent = `ID: ${currentClient.ID}`;

    // Renderizar detalles del cliente
    renderClientDetails();

    // Renderizar pagos no asignados PRIMERO
    renderUnassignedPaymentsSection();

    // Separar facturas por estado (ya filtradas sin pendientes)
    const overdueInvoices = clientInvoices.filter(inv => inv.Estado === 'Vencido');
    const paidInvoices = clientInvoices.filter(inv => inv.Estado === 'Pagado');

    // Actualizar estadísticas (sin pendientes)
    updateStatsWithoutPending(overdueInvoices, paidInvoices);

    // Renderizar facturas vencidas
    renderInvoicesSection('overdue', overdueInvoices);

    // Renderizar facturas pagadas
    renderInvoicesSection('paid', paidInvoices);

    // Renderizar pagos aplicados DESPUÉS de las facturas
    renderAssignedPaymentsSection();

    // Ocultar sección de facturas pendientes (no se usan)
    document.getElementById('pendingSection').style.display = 'none';

    // Actualizar contadores y visibilidad de secciones
    updateSectionCounts();
    updateSectionVisibility();

    // Mostrar contenido
    document.getElementById('mainContent').style.display = 'block';

    console.log('✅ Página renderizada exitosamente');
}

// ===== FUNCIONES PARA MODALES DE ASIGNACIÓN =====
function openAssignPaymentModal(paymentReference, bankSource) {
    const payment = unassignedPayments.find(p => p.Referencia === paymentReference && p.BankSource === bankSource);
    if (!payment) {
        showToast('Pago no encontrado', 'error');
        return;
    }

    currentPaymentForAssignment = payment;

    // Filtrar facturas pendientes y vencidas para mostrar en el modal
    const availableInvoices = clientInvoices.filter(inv =>
        inv.Estado === 'Pendiente' || inv.Estado === 'Vencido'
    );

    if (availableInvoices.length === 0) {
        showToast('No hay facturas pendientes para asignar este pago', 'warning');
        return;
    }

    // Crear y mostrar modal dinámicamente
    showAssignPaymentModal(payment, availableInvoices);
}

function openAssignInvoiceModal(invoiceNumber) {
    const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceNumber);
    if (!invoice) {
        showToast('Factura no encontrada', 'error');
        return;
    }

    if (invoice.Estado === 'Pagado') {
        showToast('Esta factura ya está pagada', 'warning');
        return;
    }

    currentInvoiceForAssignment = invoice;

    if (unassignedPayments.length === 0) {
        showToast('No hay pagos disponibles para asignar a esta factura', 'warning');
        return;
    }

    // Crear y mostrar modal dinámicamente
    showAssignInvoiceModal(invoice, unassignedPayments);
}

function showAssignPaymentModal(payment, availableInvoices) {
    const modal = document.getElementById('assignPaymentModal');
    if (!modal) {
        createAssignPaymentModal();
        return showAssignPaymentModal(payment, availableInvoices);
    }

    // Calcular monto disponible del pago
    const totalAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
    const assignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
    const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
    const availableAmount = totalAmount - assignedAmount;

    // Llenar información del pago
    const paymentInfo = document.getElementById('assignPaymentInfo');

    paymentInfo.innerHTML = `
        <div style="background: #f0f8ff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <h4 style="margin: 0 0 8px 0; color: #007aff;">💰 ${payment.Referencia}</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 0.9rem;">
                <div><strong>Banco:</strong><br>${getBankDisplayName(payment.BankSource)}</div>
                <div><strong>Total:</strong><br>₡${totalAmount.toLocaleString('es-CR')}</div>
                <div><strong>Disponible:</strong><br><span style="color: #34c759; font-weight: 600;">₡${availableAmount.toLocaleString('es-CR')}</span></div>
            </div>
            <div style="margin-top: 8px; font-size: 0.85rem; color: #666;">
                <strong>Fecha:</strong> ${formatDateForDisplay(payment.Fecha)}
                ${assignments.length > 0 ? `<br><strong>Asignaciones previas:</strong> ${assignments.length} factura(s)` : ''}
            </div>
        </div>
    `;

    // Llenar lista de facturas
    const invoicesList = document.getElementById('availableInvoicesList');
    invoicesList.innerHTML = availableInvoices.map(invoice => {
        const baseAmount = parseFloat(invoice.MontoBase || 0);
        const totalAmount = parseFloat(invoice.MontoTotal || baseAmount);
        const status = invoice.Estado;

        // Verificar si puede pagarse con el monto disponible
        const canPayCompletely = availableAmount >= totalAmount;
        const matchClass = canPayCompletely ? 'exact-match' : '';

        return `
            <div class="invoice-option ${matchClass}" onclick="selectInvoiceForPayment('${invoice.NumeroFactura}')" data-invoice="${invoice.NumeroFactura}">
                <div class="invoice-option-header">
                    <strong>${invoice.NumeroFactura}</strong>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="status-badge status-${status.toLowerCase()}">${status}</span>
                        ${canPayCompletely ? '<span style="color: #34c759; font-size: 0.8rem;">✅ Pago completo</span>' : '<span style="color: #ff9500; font-size: 0.8rem;">⚠️ Pago parcial</span>'}
                    </div>
                </div>
                <div style="font-size: 0.9rem; color: #666; margin-top: 4px;">
                    ${invoice.ConceptoManual || invoice.SemanaDescripcion || 'N/A'}<br>
                    <strong>Total adeudado: ₡${totalAmount.toLocaleString('es-CR')}</strong><br>
                    Vence: ${formatDateForDisplay(invoice.FechaVencimiento)}
                </div>
            </div>
        `;
    }).join('');

    modal.classList.add('show');
}

function showAssignInvoiceModal(invoice, availablePayments) {
    const modal = document.getElementById('assignInvoiceModal');
    if (!modal) {
        createAssignInvoiceModal();
        return showAssignInvoiceModal(invoice, availablePayments);
    }

    // Llenar información de la factura
    const invoiceInfo = document.getElementById('assignInvoiceInfo');
    const totalAmount = parseFloat(invoice.MontoTotal || invoice.MontoBase || 0);

    invoiceInfo.innerHTML = `
        <div style="background: #fff5f0; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <h4 style="margin: 0 0 8px 0; color: #ff9500;">📄 ${invoice.NumeroFactura}</h4>
            <p style="margin: 0; color: #666;">
                <strong>Concepto:</strong> ${invoice.ConceptoManual || invoice.SemanaDescripcion || 'N/A'}<br>
                <strong>Total adeudado:</strong> ₡${totalAmount.toLocaleString('es-CR')}<br>
                <strong>Vencimiento:</strong> ${formatDateForDisplay(invoice.FechaVencimiento)}
            </p>
        </div>
    `;

    // Llenar lista de pagos con información de monto disponible
    const paymentsList = document.getElementById('availablePaymentsList');
    paymentsList.innerHTML = availablePayments.map(payment => {
        const totalPaymentAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
        const assignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
        const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
        const availableAmount = totalPaymentAmount - assignedAmount;

        const isExactMatch = Math.abs(availableAmount - totalAmount) < 0.01;
        const canPayCompletely = availableAmount >= totalAmount;

        let matchClass = '';
        let statusText = '';

        if (isExactMatch) {
            matchClass = 'exact-match';
            statusText = '<span style="color: #34c759; font-size: 0.8rem;">✅ Coincide exactamente</span>';
        } else if (canPayCompletely) {
            statusText = '<span style="color: #34c759; font-size: 0.8rem;">✅ Pago completo</span>';
        } else if (availableAmount > 0) {
            statusText = '<span style="color: #ff9500; font-size: 0.8rem;">⚠️ Pago parcial</span>';
        } else {
            statusText = '<span style="color: #ff3b30; font-size: 0.8rem;">❌ Sin saldo</span>';
        }

        return `
            <div class="payment-option ${matchClass}" onclick="selectPaymentForInvoice('${payment.Referencia}', '${payment.BankSource}')" data-payment="${payment.Referencia}-${payment.BankSource}" ${availableAmount <= 0 ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
                <div class="payment-option-header">
                    <strong>${payment.Referencia}</strong>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="bank-badge ${getBankBadgeClass(payment.BankSource)}">
                            ${payment.BankSource}
                        </span>
                        ${statusText}
                    </div>
                </div>
                <div style="font-size: 0.9rem; color: #666; margin-top: 4px;">
                    <strong>Total: ₡${totalPaymentAmount.toLocaleString('es-CR')}</strong><br>
                    <strong>Disponible: ₡${availableAmount.toLocaleString('es-CR')}</strong><br>
                    Fecha: ${formatDateForDisplay(payment.Fecha)}
                    ${assignments.length > 0 ? `<br><small>Asignaciones previas: ${assignments.length}</small>` : ''}
                    ${payment.Descripción ? `<br>${payment.Descripción}` : ''}
                </div>
            </div>
        `;
    }).join('');

    modal.classList.add('show');
}

function createAssignPaymentModal() {
    const modalHTML = `
        <div class="modal-overlay" id="assignPaymentModal" onclick="closeAssignPaymentModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>💰 Asignar Pago a Factura</h3>
                    <button class="modal-close" onclick="closeAssignPaymentModal()">✕</button>
                </div>
               
                <div class="modal-body">
                    <div id="assignPaymentInfo"></div>
                   
                    <h4 style="margin-bottom: 12px; color: #1d1d1f;">Seleccione la factura a pagar:</h4>
                   
                    <div id="availableInvoicesList" style="max-height: 300px; overflow-y: auto; border: 1px solid #f2f2f7; border-radius: 8px; padding: 8px;">
                        <!-- Se llenará dinámicamente -->
                    </div>
                   
                    <div class="form-actions" style="margin-top: 24px;">
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
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>📄 Asignar Pago a Esta Factura</h3>
                    <button class="modal-close" onclick="closeAssignInvoiceModal()">✕</button>
                </div>
               
                <div class="modal-body">
                    <div id="assignInvoiceInfo"></div>
                   
                    <h4 style="margin-bottom: 12px; color: #1d1d1f;">Seleccione el pago a asignar:</h4>
                   
                    <div id="availablePaymentsList" style="max-height: 300px; overflow-y: auto; border: 1px solid #f2f2f7; border-radius: 8px; padding: 8px;">
                        <!-- Se llenará dinámicamente -->
                    </div>
                   
                    <div class="form-actions" style="margin-top: 24px;">
                        <button type="button" class="btn btn-secondary" onclick="closeAssignInvoiceModal()">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" id="confirmAssignInvoiceBtn" onclick="confirmAssignInvoice()" disabled>
                            ✅ Asignar Pago
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function selectInvoiceForPayment(invoiceNumber) {
    // Remover selección previa
    document.querySelectorAll('.invoice-option').forEach(el => el.classList.remove('selected'));

    // Seleccionar nueva factura
    const element = document.querySelector(`[data-invoice="${invoiceNumber}"]`);
    if (element) {
        element.classList.add('selected');
        selectedInvoiceForPayment = invoiceNumber;

        // Habilitar botón de confirmar
        const confirmBtn = document.getElementById('confirmAssignPaymentBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    }
}

function selectPaymentForInvoice(paymentReference, bankSource) {
    // Remover selección previa
    document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('selected'));

    // Seleccionar nuevo pago
    const element = document.querySelector(`[data-payment="${paymentReference}-${bankSource}"]`);
    if (element) {
        element.classList.add('selected');
        selectedPaymentForInvoice = { reference: paymentReference, bankSource: bankSource };

        // Habilitar botón de confirmar
        const confirmBtn = document.getElementById('confirmAssignInvoiceBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    }
}

async function confirmAssignPayment() {
    if (!currentPaymentForAssignment || !selectedInvoiceForPayment) {
        showToast('Debe seleccionar una factura', 'error');
        return;
    }

    const confirmBtn = document.getElementById('confirmAssignPaymentBtn');
    const originalText = confirmBtn.textContent;
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
        // Restaurar botón en caso de error
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

async function confirmAssignInvoice() {
    if (!currentInvoiceForAssignment || !selectedPaymentForInvoice) {
        showToast('Debe seleccionar un pago', 'error');
        return;
    }

    const confirmBtn = document.getElementById('confirmAssignInvoiceBtn');
    const originalText = confirmBtn.textContent;
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
        // Restaurar botón en caso de error
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

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

// ===== FUNCIONES DE NAVEGACIÓN Y UTILIDADES =====
function retryLoad() {
    document.getElementById('errorState').style.display = 'none';
    loadData();
}

// ===== EXPONER FUNCIONES AL SCOPE GLOBAL =====
// Funciones principales
window.initializeApp = initializeApp;
window.loadData = loadData;
window.retryLoad = retryLoad;
window.renderPage = renderPage;

// Funciones de asignación modal
window.openAssignPaymentModal = openAssignPaymentModal;
window.openAssignInvoiceModal = openAssignInvoiceModal;
window.closeAssignPaymentModal = closeAssignPaymentModal;
window.closeAssignInvoiceModal = closeAssignInvoiceModal;
window.selectInvoiceForPayment = selectInvoiceForPayment;
window.selectPaymentForInvoice = selectPaymentForInvoice;
window.confirmAssignPayment = confirmAssignPayment;
window.confirmAssignInvoice = confirmAssignInvoice;

// Variables de estado
window.currentPaymentForAssignment = currentPaymentForAssignment;
window.currentInvoiceForAssignment = currentInvoiceForAssignment;
window.selectedInvoiceForPayment = selectedInvoiceForPayment;
window.selectedPaymentForInvoice = selectedPaymentForInvoice;

console.log('✅ main.js cargado - Aplicación principal con distribución múltiple de pagos');
console.log('🎯 CARACTERÍSTICAS PRINCIPALES:');
console.log('   - Detección de clientes por ID directo Y observaciones');
console.log('   - Distribución múltiple de pagos entre facturas');
console.log('   - Cálculo automático de multas hasta fecha de pago');
console.log('   - Sistema de recibos con WhatsApp automatizado');
console.log('   - Control de visibilidad de secciones');
console.log('   - CRUD completo de facturas manuales');
console.log('');
console.log('🧪 FUNCIONES DE PRUEBA DISPONIBLES:');
console.log('   - testClientIdDetection(clientId, observationsText)');
console.log('   - addClientGroup(clientId, groupId)');
console.log('   - listConfiguredGroups()');
console.log('   - toggleSection(sectionName)');
console.log('   - showOnlyActive()');
console.log('');
console.log('📱 CONFIGURACIÓN WHATSAPP:');
console.log('   - Agregue ID de grupos en la columna "idGrupoWhatsapp" de la BD');
console.log('   - O configure manualmente con addClientGroup()');
console.log('');

// Mostrar estado inicial
if (typeof listConfiguredGroups === 'function') {
    listConfiguredGroups();
}