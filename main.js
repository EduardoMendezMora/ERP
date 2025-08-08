// ===== MAIN.JS - CONTROLADOR PRINCIPAL =====
// Este archivo coordina la aplicación sin duplicar funciones de otros módulos

// Variables globales para asignación
let currentPaymentSource = null;

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
        console.log('🔄 Iniciando carga de cliente y facturas...');
        await loadClientAndInvoices(clientId);
        console.log('✅ Cliente y facturas cargados');

        // Cargar pagos no asignados y asignados
        console.log('🔄 Iniciando carga de pagos...');
        try {
            await Promise.all([
                loadUnassignedPayments(clientId).catch(error => {
                    console.error('❌ Error en loadUnassignedPayments:', error);
                    return null;
                }),
                loadAssignedPayments(clientId).catch(error => {
                    console.error('❌ Error en loadAssignedPayments:', error);
                    return null;
                }),
                loadManualPayments().catch(error => {
                    console.error('❌ Error en loadManualPayments:', error);
                    return null;
                })
            ]);
            console.log('✅ Pagos cargados (con posibles errores manejados)');
        } catch (error) {
            console.error('❌ Error general en carga de pagos:', error);
        }

        // Renderizar la página completa
        console.log('🔄 Iniciando renderizado de página...');
        renderPage();
        console.log('✅ Página renderizada');

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
        const overdueInvoices = clientInvoices.filter(inv => isInvoiceOverdue(inv));
        const paidInvoices = clientInvoices.filter(inv => inv.Estado === 'Pagado');
        
        // Obtener las próximas 2 facturas por vencerse
        const upcomingInvoices = getUpcomingInvoices(clientInvoices, 2);

        // Actualizar estadísticas
        updateStatsWithoutPending(overdueInvoices, paidInvoices);

        // Renderizar secciones de facturas
        renderInvoicesSection('overdue', overdueInvoices);
        renderInvoicesSection('upcoming', upcomingInvoices);
        renderInvoicesSection('paid', paidInvoices);

        // Renderizar secciones de pagos
        renderUnassignedPaymentsSection();
        renderAssignedPaymentsSection();
        
        // Renderizar pagos manuales
        renderManualPayments();

        // Actualizar contadores de secciones
        updateSectionCounts();

        // Aplicar visibilidad de secciones - COMENTADO PARA MANTENER TODAS ABIERTAS
        // updateSectionVisibility();
        // updateControlUI();

        // Asegurar que todas las secciones estén abiertas
        console.log('🎛️ Aplicando estado de secciones: todas abiertas');
        toggleAllSections(true);

        console.log('✅ Página renderizada completamente');

    } catch (error) {
        console.error('❌ Error al renderizar página:', error);
        showToast('Error al renderizar la página: ' + error.message, 'error');
    }
}

// ===== FUNCIÓN PARA OBTENER FACTURAS PRÓXIMAS =====
function getUpcomingInvoices(invoices, limit = 2) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetear a inicio del día
    
    // Filtrar facturas pendientes que vencen en el futuro
    const futureInvoices = invoices.filter(inv => {
        if (inv.Estado !== 'Pendiente') return false;
        
        const dueDate = parseDate(inv.FechaVencimiento);
        if (!dueDate) return false;
        
        return dueDate > today;
    });
    
    // Ordenar por fecha de vencimiento (ascendente) y tomar las primeras 'limit'
    const sortedInvoices = futureInvoices.sort((a, b) => {
        const dateA = parseDate(a.FechaVencimiento);
        const dateB = parseDate(b.FechaVencimiento);
        
        if (dateA && dateB) {
            return dateA.getTime() - dateB.getTime();
        }
        return 0;
    });
    
    return sortedInvoices.slice(0, limit);
}

// Hacer la función disponible globalmente
window.getUpcomingInvoices = getUpcomingInvoices;

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

function openAssignInvoiceModal(invoiceNumber, paymentSource = null) {
    console.log('📄 Abriendo modal de asignación de factura:', invoiceNumber, 'con fuente de pago:', paymentSource);

    // Encontrar la factura
    const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceNumber);

    if (!invoice) {
        showToast('Factura no encontrada', 'error');
        return;
    }

    currentInvoiceForAssignment = invoice;
    currentPaymentSource = paymentSource; // Variable global para la fuente del pago

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
        const baseAmount = parseAmount(invoice.MontoBase || 0);
        const fines = parseAmount(invoice.MontoMultas || 0);
        const totalAmount = parseAmount(invoice.MontoTotal || baseAmount);
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
            const baseAmount = parseAmount(invoice.MontoBase || 0);
        const fines = parseAmount(invoice.MontoMultas || 0);
        const totalAmount = parseAmount(invoice.MontoTotal || baseAmount);

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

    // Combinar pagos bancarios y manuales sin asignar
    const allUnassignedPayments = [
        ...unassignedPayments,
        ...manualPayments.filter(p => {
            const available = parseAmount(p.Disponible || p.Créditos || 0);
            return available > 0; // Si tiene monto disponible, está sin asignar
        })
    ];

    // Opciones de pagos
    if (allUnassignedPayments.length === 0) {
        document.getElementById('paymentOptionsForInvoice').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #86868b;">
                <h4>No hay pagos disponibles</h4>
                <p>Todos los pagos están asignados a otras facturas.</p>
            </div>
        `;
        return;
    }

    const paymentOptionsHTML = allUnassignedPayments.map(payment => {
        // Determinar si es un pago manual o bancario
        const isManualPayment = payment.TipoPago === 'Manual' || !payment.BankSource;
        
        // Calcular monto disponible
        let availableAmount;
        if (isManualPayment) {
            availableAmount = parseAmount(payment.Disponible || payment.Créditos || 0);
        } else {
            availableAmount = calculateAvailableAmount(payment);
        }

        if (availableAmount <= 0) return ''; // Skip pagos completamente asignados

        const difference = Math.abs(totalAmount - availableAmount);
        const isExactMatch = difference < 0.01;
        const isCloseMatch = difference < 1000;

        // Determinar fuente y clase del badge
        const paymentSource = isManualPayment ? 'PagosManuales' : payment.BankSource;
        const badgeClass = isManualPayment ? 'manual-payment-badge' : getBankBadgeClass(payment.BankSource);
        const displayName = isManualPayment ? '💰 Pago Manual' : getBankDisplayName(payment.BankSource);

        return `
            <div class="payment-option ${isExactMatch ? 'exact-match' : ''}" 
                 onclick="selectPaymentForInvoice('${payment.Referencia}', '${paymentSource}')"
                 id="payment-option-${payment.Referencia}-${paymentSource}">
                <div class="payment-option-header">
                    <div>
                        <strong>${payment.Referencia}</strong>
                        <span class="bank-badge ${badgeClass}">${isManualPayment ? '💰 Manual' : payment.BankSource}</span>
                    </div>
                    <div style="text-align: right; font-weight: 600;">
                        ₡${availableAmount.toLocaleString('es-CR')} disponible
                        ${isExactMatch ? '<div style="color: #34c759; font-size: 0.8rem;">✅ Coincidencia exacta</div>' : ''}
                        ${!isExactMatch && isCloseMatch ? `<div style="color: #ff9500; font-size: 0.8rem;">≈ Diferencia: ₡${difference.toLocaleString('es-CR')}</div>` : ''}
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #666; margin-top: 4px;">
                    ${displayName} | ${formatDateForDisplay(payment.Fecha)}
                    ${isManualPayment ? 
                        ` | Pago manual creado` : 
                        (payment.Disponible && payment.Disponible.trim() !== '' ? 
                            ` | Saldo disponible del backend` : 
                            ` | Total: ₡${parsePaymentAmount(payment.Créditos, payment.BankSource).toLocaleString('es-CR')} (₡${parseAssignedInvoices(payment.FacturasAsignadas || '').reduce((sum, a) => sum + a.amount, 0).toLocaleString('es-CR')} asignado)`
                        )
                    }
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
        // ===== NUEVO: USAR SISTEMA DE TRANSACCIONES BANCARIAS =====
        // Mapear el banco al nombre de la hoja correcto
        const sheetName = currentPaymentForAssignment.BankSource === 'BN' ? 'BN' :
                         currentPaymentForAssignment.BankSource === 'HuberBN' ? 'HuberBN' :
                         currentPaymentForAssignment.BankSource === 'AutosubastasBAC' ? 'AutosubastasBAC' :
                         currentPaymentForAssignment.BankSource === 'AutosubastasBN' ? 'AutosubastasBN' : 'BAC';
        
        // Obtener el monto del pago
        const paymentAmount = parsePaymentAmountByBank(currentPaymentForAssignment.Créditos, sheetName);
        
        await assignTransactionToInvoice(
            currentPaymentForAssignment.Referencia,
            sheetName,
            selectedInvoiceForPayment,
            paymentAmount // Pasar el monto esperado
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
    console.log('🔍 Validando asignación de factura:', {
        currentInvoiceForAssignment,
        selectedPaymentForInvoice,
        selectedTransaction: window.selectedTransaction,
        currentPaymentSource
    });

    // Verificar si hay una transacción seleccionada o un pago manual
    if (!window.selectedTransaction && !selectedPaymentForInvoice) {
        showToast('Seleccione una transacción bancaria o pago manual para asignar a la factura', 'error');
        return;
    }

    if (!currentInvoiceForAssignment) {
        showToast('No hay factura seleccionada para asignar', 'error');
        return;
    }

    const confirmBtn = document.getElementById('confirmAssignInvoiceBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Asignando...';
    
    // Mostrar mensaje de progreso
    showToast('Iniciando asignación de factura...', 'info');

    try {
        // Si hay un pago manual seleccionado
        if (selectedPaymentForInvoice && selectedPaymentForInvoice.bankSource === 'PagosManuales') {
            console.log('🎯 Asignando pago manual a factura:', {
                payment: selectedPaymentForInvoice,
                invoice: currentInvoiceForAssignment.NumeroFactura
            });

            // Encontrar el pago manual
            const manualPayment = manualPayments.find(p => p.Referencia === selectedPaymentForInvoice.reference);
            if (!manualPayment) {
                throw new Error('Pago manual no encontrado');
            }

            // Asignar pago manual a la factura
            await assignManualPaymentToInvoice(
                selectedPaymentForInvoice.reference,
                currentInvoiceForAssignment.NumeroFactura,
                parseAmount(manualPayment.Disponible || 0)
            );

        } else if (window.selectedTransaction) {
            // Asignar transacción bancaria (código existente)
            console.log('🎯 Asignando transacción a factura:', {
                transaction: window.selectedTransaction,
                invoice: currentInvoiceForAssignment.NumeroFactura
            });
            
            // Actualizar mensaje de progreso
            confirmBtn.textContent = '⏳ Procesando transacción...';
            showToast('Procesando transacción bancaria...', 'info');

            // Mapear el banco al nombre de la hoja correcto (igual que en transacciones.html)
            const sheetName = window.selectedTransaction.bank === 'BN' ? 'BN' :
                             window.selectedTransaction.bank === 'HuberBN' ? 'HuberBN' :
                             window.selectedTransaction.bank === 'AutosubastasBAC' ? 'AutosubastasBAC' :
                             window.selectedTransaction.bank === 'AutosubastasBN' ? 'AutosubastasBN' : 'BAC';
            
            await assignTransactionToInvoice(
                window.selectedTransaction.reference,
                sheetName,
                currentInvoiceForAssignment.NumeroFactura
                // No pasar expectedAmount para que use el disponible del backend
            );
        } else if (selectedPaymentForInvoice && selectedPaymentForInvoice.bankSource !== 'PagosManuales') {
            // NUEVO: Asignar pago bancario con saldo disponible
            console.log('🎯 Asignando pago bancario con saldo disponible:', {
                payment: selectedPaymentForInvoice,
                invoice: currentInvoiceForAssignment.NumeroFactura
            });
            
            // Actualizar mensaje de progreso
            confirmBtn.textContent = '⏳ Procesando pago bancario...';
            showToast('Procesando pago bancario con saldo disponible...', 'info');

            // Encontrar el pago en unassignedPayments
            const payment = unassignedPayments.find(p => 
                p.Referencia === selectedPaymentForInvoice.reference && 
                p.BankSource === selectedPaymentForInvoice.bankSource
            );
            
            if (!payment) {
                throw new Error('Pago bancario no encontrado');
            }

            // Usar la función existente para asignar pagos bancarios
            await assignPaymentToInvoice(
                selectedPaymentForInvoice.reference,
                selectedPaymentForInvoice.bankSource,
                currentInvoiceForAssignment.NumeroFactura
            );
        } else {
            // No se seleccionó ninguna opción válida
            throw new Error('No se seleccionó un pago válido para asignar. Por favor, seleccione una transacción bancaria o pago manual.');
        }

        closeAssignInvoiceModal();
        
        // Mensaje de éxito
        showToast('✅ Factura asignada exitosamente', 'success');

    } catch (error) {
        console.error('❌ Error al confirmar asignación:', error);
        showToast('Error al asignar la factura: ' + error.message, 'error');

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
        window.selectedTransaction = null; // Limpiar transacción seleccionada
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
        window.selectTransaction = selectTransaction;
        window.filterTransactions = filterTransactions;
        window.clearTransactionSearch = clearTransactionSearch;
        window.assignTransactionToInvoice = assignTransactionToInvoice;

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
        // Cargar transacciones desde todas las hojas (BAC, BN, HuberBN)
        const sheets = ['BAC', 'BN', 'HuberBN'];
        let allTransactions = [];
        
        for (const sheet of sheets) {
            try {
                console.log(`📋 Consultando transacciones en ${sheet}...`);
                const apiUrl = `https://sheetdb.io/api/v1/a7oekivxzreg7?sheet=${sheet}`;
                const response = await fetch(apiUrl);
                
                if (response.ok) {
                    const sheetTransactions = await response.json();
                    const transactionsWithBank = Array.isArray(sheetTransactions) ? 
                        sheetTransactions.map(t => ({ ...t, banco: sheet })) : [];
                    
                    allTransactions.push(...transactionsWithBank);
                    console.log(`✅ ${sheet}: ${transactionsWithBank.length} transacciones cargadas`);
                } else if (response.status !== 404) {
                    console.warn(`Error al cargar transacciones de ${sheet}:`, response.status);
                }
            } catch (error) {
                console.warn(`No se pudieron cargar transacciones de ${sheet}:`, error);
            }
        }
        
        console.log('📊 Total transacciones cargadas:', allTransactions.length);
        
        // Filtrar transacciones pendientes de conciliar
        // NO mostrar las que tienen ID_Cliente, Observaciones o están conciliadas
        // Solo mostrar desde el 10/07/2025
        // NUEVO: NO mostrar las que tienen Disponible = 0 (ya no tienen saldo disponible)
        const cutoffDate = new Date('2025-07-10');
        cutoffDate.setHours(0, 0, 0, 0);
        
        const pendingTransactions = allTransactions.filter(t => {
            // NUEVO: Si tiene Disponible = 0, ya no tiene saldo disponible para asignar
            if (t.Disponible !== undefined && t.Disponible !== null) {
                const disponible = parseFloat(t.Disponible);
                if (!isNaN(disponible) && disponible <= 0) {
                    console.log(`🚫 Transacción ${t.Referencia} excluida: Disponible = ${t.Disponible} (sin saldo disponible)`);
                    return false;
                }
            }
            
            // Si tiene Disponible > 0, mostrar la transacción (puede tener asignaciones previas pero aún tiene saldo)
            if (t.Disponible !== undefined && t.Disponible !== null) {
                const disponible = parseFloat(t.Disponible);
                if (!isNaN(disponible) && disponible > 0) {
                    console.log(`✅ Transacción ${t.Referencia} incluida: Disponible = ${t.Disponible} (tiene saldo disponible)`);
                    return true;
                }
            }
            
            // Si no tiene Disponible definido, usar la lógica anterior
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
            
            // Solo mostrar las que no están conciliadas, son desde la fecha límite y tienen saldo disponible
            return true;
        });
        
        console.log('📋 Transacciones pendientes:', pendingTransactions.length);
        
        // Mostrar información
        transactionsInfo.innerHTML = `
            <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px 0; color: #007aff;">🏦 Transacciones Pendientes de Conciliar</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 0.9rem;">
                    <div><strong>Total:</strong> ${allTransactions.length} transacciones</div>
                    <div><strong>Pendientes:</strong> ${pendingTransactions.length} transacciones</div>
                    <div><strong>Conciliadas:</strong> ${allTransactions.length - pendingTransactions.length} transacciones</div>
                </div>
            </div>
            
            <!-- Campo de búsqueda -->
            <div style="margin-bottom: 16px;">
                <div style="position: relative;">
                    <input type="text" 
                           id="transactionSearch" 
                           placeholder="🔍 Buscar transacciones por referencia, descripción o monto..."
                           style="width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.3s ease;"
                           onkeyup="filterTransactions(this.value)"
                           onfocus="this.style.borderColor='#007aff'"
                           onblur="this.style.borderColor='#e0e0e0'">
                    <button onclick="clearTransactionSearch()" 
                            style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #666; cursor: pointer; font-size: 16px;"
                            title="Limpiar búsqueda">
                        ✕
                    </button>
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
                const creditValue = transaction.Créditos || '0';
                const bank = transaction.banco || 'BAC';
                
                // Debug: mostrar el valor original
                console.log('🔍 Valor original:', creditValue, 'Banco:', bank, 'Tipo:', typeof creditValue);
                
                // Limpiar el valor de espacios y caracteres extraños
                const cleanValue = creditValue.toString().trim().replace(/[^\d.,]/g, '');
                
                // Convertir a número según el banco usando la función centralizada
                let totalAmount = parsePaymentAmountByBank(creditValue, bank);
                
                // Verificar que sea un número válido
                if (isNaN(totalAmount)) {
                    totalAmount = 0;
                }
                
                // ===== NUEVO: CALCULAR MONTO DISPONIBLE =====
                let availableAmount = totalAmount;
                
                // Si tiene campo Disponible del backend, usarlo
                if (transaction.Disponible !== undefined && transaction.Disponible !== null && transaction.Disponible !== '') {
                    const disponible = parseFloat(transaction.Disponible);
                    if (!isNaN(disponible)) {
                        availableAmount = disponible;
                        console.log(`💰 Usando Disponible del backend: ₡${availableAmount.toLocaleString('es-CR')}`);
                    }
                } else {
                    // Calcular dinámicamente basado en FacturasAsignadas
                    const assignments = parseAssignedInvoices(transaction.FacturasAsignadas || '');
                    const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
                    availableAmount = Math.max(0, totalAmount - assignedAmount);
                    console.log(`💰 Calculando disponible: Total=${totalAmount}, Asignado=${assignedAmount}, Disponible=${availableAmount}`);
                }
                
                console.log('💰 Monto total:', totalAmount, 'Disponible:', availableAmount);
                
                const date = transaction.Fecha || 'Sin fecha';
                const reference = transaction.Referencia || 'Sin referencia';
                
                // Formatear el monto disponible
                const formattedAvailableAmount = availableAmount.toLocaleString('es-CR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                // Formatear el monto total para mostrar en detalles
                const formattedTotalAmount = totalAmount.toLocaleString('es-CR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                // Obtener descripción de la transacción
                const description = transaction.Descripción || transaction.Descripcion || transaction.Description || transaction.Detalle || transaction.Concepto || 'Sin descripción';
                
                // Mostrar indicador si es pago parcial
                const isPartialPayment = availableAmount < totalAmount;
                const partialIndicator = isPartialPayment ? 
                    `<div style="background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-top: 4px;">
                        Pago parcial - Total: ₡${formattedTotalAmount}
                    </div>` : '';
                
                return `
                    <div class="transaction-item" 
                         style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; margin-bottom: 8px; background: white; cursor: pointer; transition: all 0.3s ease;"
                         onclick="selectTransaction('${reference}', '${bank}', ${availableAmount}, '${description}')"
                         onmouseover="this.style.borderColor='#007aff'; this.style.boxShadow='0 2px 8px rgba(0,122,255,0.1)'"
                         onmouseout="this.style.borderColor='#e0e0e0'; this.style.boxShadow='none'">
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
                                ${partialIndicator}
                            </div>
                            <div style="text-align: right; margin-left: 12px;">
                                <strong style="color: #007aff; font-size: 1.1rem;">₡${formattedAvailableAmount}</strong>
                                <div style="font-size: 0.8rem; color: #666; margin-top: 2px;">disponible</div>
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

// ===== FUNCIÓN PARA SELECCIONAR TRANSACCIONES =====
function selectTransaction(reference, bank, amount, description) {
    console.log('🎯 Transacción seleccionada:', { reference, bank, amount, description });
    
    const clickedItem = event.target.closest('.transaction-item');
    const isCurrentlySelected = clickedItem.style.background === 'rgb(230, 243, 255)' || 
                               clickedItem.style.backgroundColor === 'rgb(230, 243, 255)';
    
    // Si ya está seleccionada, deseleccionar
    if (isCurrentlySelected) {
        console.log('🔄 Deseleccionando transacción:', reference);
        
        // Remover selección
        clickedItem.style.background = 'white';
        clickedItem.style.borderColor = '#e0e0e0';
        
        // Limpiar transacción seleccionada
        window.selectedTransaction = null;
        
        // Remover información de selección
        const transactionsInfo = document.getElementById('transactionsInfo');
        if (transactionsInfo) {
            const selectionDiv = transactionsInfo.querySelector('div[style*="background: #e6f3ff"]');
            if (selectionDiv) {
                selectionDiv.remove();
            }
        }
        
        // Deshabilitar botón de confirmar
        const confirmPaymentBtn = document.getElementById('confirmAssignPaymentBtn');
        const confirmInvoiceBtn = document.getElementById('confirmAssignInvoiceBtn');
        
        if (confirmPaymentBtn) {
            confirmPaymentBtn.disabled = true;
            confirmPaymentBtn.textContent = '✅ Asignar Pago';
        } else if (confirmInvoiceBtn) {
            confirmInvoiceBtn.disabled = true;
            confirmInvoiceBtn.textContent = '✅ Asignar Factura';
        }
        
        showToast(`❌ Transacción ${reference} deseleccionada`, 'warning');
        return;
    }
    
    // Remover selección anterior
    document.querySelectorAll('.transaction-item').forEach(item => {
        item.style.background = 'white';
        item.style.borderColor = '#e0e0e0';
    });
    
    // Marcar como seleccionada
    clickedItem.style.background = '#e6f3ff';
    clickedItem.style.borderColor = '#007aff';
    
    // Guardar la transacción seleccionada
    window.selectedTransaction = {
        reference: reference,
        bank: bank,
        amount: amount,
        description: description
    };
    
    // Mostrar información de la transacción seleccionada
    const transactionsInfo = document.getElementById('transactionsInfo');
    if (transactionsInfo) {
        const currentInfo = transactionsInfo.innerHTML;
        const selectionInfo = `
            <div style="background: #e6f3ff; border: 2px solid #007aff; border-radius: 8px; padding: 12px; margin-top: 12px;">
                <h5 style="margin: 0 0 8px 0; color: #007aff;">✅ Transacción Seleccionada</h5>
                <div style="font-size: 0.9rem;">
                    <strong>Referencia:</strong> ${reference}<br>
                    <strong>Banco:</strong> ${bank}<br>
                    <strong>Monto:</strong> ₡${amount.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>
                    <strong>Descripción:</strong> ${description}
                </div>
            </div>
        `;
        
        // Agregar la información de selección al final
        transactionsInfo.innerHTML = currentInfo + selectionInfo;
    }
    
    // Habilitar botón de confirmar según el modal activo
    const confirmPaymentBtn = document.getElementById('confirmAssignPaymentBtn');
    const confirmInvoiceBtn = document.getElementById('confirmAssignInvoiceBtn');
    
    console.log('🔍 Buscando botones:', {
        confirmPaymentBtn: !!confirmPaymentBtn,
        confirmInvoiceBtn: !!confirmInvoiceBtn
    });
    
    if (confirmPaymentBtn) {
        // Modal de pagos
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.textContent = '✅ Asignar Transacción';
        console.log('✅ Botón de pagos habilitado');
    } else if (confirmInvoiceBtn) {
        // Modal de facturas
        confirmInvoiceBtn.disabled = false;
        confirmInvoiceBtn.textContent = '✅ Asignar Transacción';
        console.log('✅ Botón de facturas habilitado');
    } else {
        console.warn('⚠️ No se encontró ningún botón de confirmar');
    }
    
    // Verificación adicional - buscar cualquier botón de confirmar
    const allConfirmBtns = document.querySelectorAll('button[id*="confirmAssign"]');
    console.log('🔍 Todos los botones de confirmar encontrados:', allConfirmBtns.length);
    allConfirmBtns.forEach((btn, index) => {
        console.log(`  Botón ${index}:`, btn.id, 'disabled:', btn.disabled);
    });
    
    showToast(`✅ Transacción ${reference} seleccionada`, 'success');
}

// ===== FUNCIONES DE BÚSQUEDA DE TRANSACCIONES =====
function filterTransactions(searchTerm) {
    console.log('🔍 Buscando:', searchTerm);
    
    const transactionItems = document.querySelectorAll('.transaction-item');
    let visibleCount = 0;
    
    transactionItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        const search = searchTerm.toLowerCase();
        
        if (searchTerm === '' || text.includes(search)) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Actualizar contador
    const countElement = document.querySelector('small');
    if (countElement && countElement.textContent.includes('transacciones')) {
        const totalTransactions = document.querySelectorAll('.transaction-item').length;
        countElement.textContent = `Mostrando ${visibleCount} de ${totalTransactions} transacciones pendientes`;
    }
    
    console.log(`📊 Transacciones visibles: ${visibleCount}`);
}

function clearTransactionSearch() {
    const searchInput = document.getElementById('transactionSearch');
    if (searchInput) {
        searchInput.value = '';
        filterTransactions('');
    }
}

// ===== FUNCIÓN PARA ASIGNAR TRANSACCIONES BANCARIAS =====
async function assignTransactionToInvoice(transactionReference, bank, invoiceNumber, expectedAmount = null) {
    // Agregar timeout de 30 segundos para evitar que se quede colgado
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: La operación tardó demasiado tiempo')), 30000);
    });
    
    const assignmentPromise = (async () => {
        try {
            console.log(`🎯 Iniciando asignación de transacción: ${transactionReference} (${bank}) → Factura ${invoiceNumber}`);
            if (expectedAmount) {
                console.log(`💰 Monto esperado del modal: ₡${expectedAmount.toLocaleString('es-CR')}`);
            }

        // Encontrar la factura
        const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceNumber);
        if (!invoice) {
            throw new Error('Factura no encontrada');
        }

        // Obtener datos de la transacción desde todas las hojas de la API
        const sheets = ['BAC', 'BN', 'HuberBN'];
        let transaction = null;
        let foundInSheet = null;
        
        for (const sheet of sheets) {
            try {
                console.log(`🔍 Buscando transacción ${transactionReference} en ${sheet}...`);
                const apiUrl = `https://sheetdb.io/api/v1/a7oekivxzreg7?sheet=${sheet}`;
                const response = await fetch(apiUrl);
                
                if (response.ok) {
                    const sheetTransactions = await response.json();
                    const found = Array.isArray(sheetTransactions) ? 
                        sheetTransactions.find(t => t.Referencia === transactionReference) : null;
                    
                    if (found) {
                        transaction = { ...found, banco: sheet };
                        foundInSheet = sheet;
                        console.log(`✅ Transacción encontrada en ${sheet}`);
                        break;
                    }
                }
            } catch (error) {
                console.warn(`Error al buscar en ${sheet}:`, error);
            }
        }
        
        console.log('🔍 Total de hojas consultadas:', sheets.length);
        
        // ===== NUEVO: BUSCAR EN UNASSIGNEDPAYMENTS COMO RESPALDO =====
        if (!transaction) {
            console.log('🔍 Transacción no encontrada en API, buscando en unassignedPayments...');
            const localPayment = unassignedPayments.find(p => 
                p.Referencia === transactionReference && p.BankSource === bank
            );
            
            if (localPayment) {
                console.log('✅ Transacción encontrada en datos locales');
                // Convertir el formato de unassignedPayments al formato de transacciones
                transaction = {
                    Referencia: localPayment.Referencia,
                    Créditos: localPayment.Créditos,
                    Fecha: localPayment.Fecha,
                    banco: localPayment.BankSource,
                    FacturasAsignadas: localPayment.FacturasAsignadas || ''
                };
            } else {
                throw new Error(`Transacción ${transactionReference} no encontrada en ninguna hoja (BAC, BN, HuberBN) ni en datos locales`);
            }
        }

        // Parsear el monto de la transacción
        const creditValue = transaction.Créditos || '0';
        console.log('🔍 DEBUG PARSEO DE MONTO:');
        console.log('   - Valor original:', creditValue);
        console.log('   - Tipo de dato:', typeof creditValue);
        console.log('   - Banco de transacción (API):', transaction.banco);
        console.log('   - Banco de parámetro:', bank);
        
        // Usar el banco del parámetro si el de la API no está disponible
        const bankToUse = transaction.banco || bank;
        console.log('   - Banco a usar para parseo:', bankToUse);
        
        const totalAmount = parsePaymentAmountByBank(creditValue, bankToUse);
        
        console.log('   - Monto total parseado:', totalAmount);
        console.log('   - Es NaN:', isNaN(totalAmount));
        console.log('   - Es <= 0:', totalAmount <= 0);
        
        if (isNaN(totalAmount) || totalAmount <= 0) {
            throw new Error('Monto de transacción inválido');
        }

        // ===== NUEVO: CALCULAR MONTO DISPONIBLE =====
        let availableAmount = totalAmount;
        
        // Si tiene campo Disponible del backend, usarlo
        if (transaction.Disponible !== undefined && transaction.Disponible !== null && transaction.Disponible !== '') {
            const disponible = parseFloat(transaction.Disponible);
            if (!isNaN(disponible)) {
                availableAmount = disponible;
                console.log(`💰 Usando Disponible del backend: ₡${availableAmount.toLocaleString('es-CR')}`);
            }
        } else {
            // Calcular dinámicamente basado en FacturasAsignadas
            const assignments = parseAssignedInvoices(transaction.FacturasAsignadas || '');
            const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
            availableAmount = Math.max(0, totalAmount - assignedAmount);
            console.log(`💰 Calculando disponible: Total=${totalAmount}, Asignado=${assignedAmount}, Disponible=${availableAmount}`);
        }

        // ===== NUEVO: VALIDAR QUE LA TRANSACCIÓN TENGA SALDO DISPONIBLE =====
        if (availableAmount <= 0) {
            console.error('❌ ERROR: Transacción sin saldo disponible');
            console.error(`   - Total: ₡${totalAmount.toLocaleString('es-CR')}`);
            console.error(`   - Disponible: ₡${availableAmount.toLocaleString('es-CR')}`);
            throw new Error(`La transacción ${transactionReference} ya no tiene saldo disponible para asignar (₡${availableAmount.toLocaleString('es-CR')})`);
        }

        // ===== NUEVO: VALIDAR QUE EL MONTO COINCIDA (solo si se proporciona expectedAmount) =====
        if (expectedAmount && Math.abs(availableAmount - expectedAmount) > 0.01) {
            console.error('❌ ERROR: Monto disponible no coincide con el esperado');
            console.error(`   - Monto esperado: ₡${expectedAmount.toLocaleString('es-CR')}`);
            console.error(`   - Monto disponible: ₡${availableAmount.toLocaleString('es-CR')}`);
            console.error(`   - Diferencia: ₡${Math.abs(availableAmount - expectedAmount).toLocaleString('es-CR')}`);
            throw new Error(`El monto disponible de la transacción (₡${availableAmount.toLocaleString('es-CR')}) no coincide con el monto seleccionado (₡${expectedAmount.toLocaleString('es-CR')})`);
        }

        console.log(`💰 Monto total: ₡${totalAmount.toLocaleString('es-CR')}`);
        console.log(`💰 Monto disponible: ₡${availableAmount.toLocaleString('es-CR')}`);
        if (expectedAmount) {
            console.log(`✅ Monto validado correctamente`);
        }

        // ===== NUEVO: LEER HISTORIAL DE PAGOS DE LA FACTURA =====
        console.log('📋 Leyendo historial de pagos de la factura...');
        
        // Parsear pagos previos de la factura (formato: "REF:MONTO;REF:MONTO")
        const previousPayments = parseInvoicePayments(invoice.Pagos || '');
        const totalPreviousPayments = previousPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        console.log('📊 Historial de pagos:');
        console.log('   - Pagos previos:', previousPayments);
        console.log('   - Total pagos previos:', totalPreviousPayments);

        // Calcular multas hasta la fecha de la transacción
        const transactionDate = transaction.Fecha;
        const baseAmount = parseAmount(invoice.MontoBase || 0);
        const finesUntilTransaction = calculateFinesUntilDate(invoice, transactionDate);
        const totalOwed = baseAmount + finesUntilTransaction;
        const remainingBalance = totalOwed - totalPreviousPayments;

        console.log(`📊 Análisis de asignación:`);
        console.log(`   - Monto base: ₡${baseAmount.toLocaleString('es-CR')}`);
        console.log(`   - Multas hasta transacción: ₡${finesUntilTransaction.toLocaleString('es-CR')}`);
        console.log(`   - Total adeudado: ₡${totalOwed.toLocaleString('es-CR')}`);
        console.log(`   - Pagos previos: ₡${totalPreviousPayments.toLocaleString('es-CR')}`);
        console.log(`   - Saldo restante: ₡${remainingBalance.toLocaleString('es-CR')}`);
        console.log(`   - Monto disponible: ₡${availableAmount.toLocaleString('es-CR')}`);

        let amountToApply, newStatus, newBalance = 0;

        if (availableAmount >= remainingBalance) {
            // Pago completo del saldo restante
            amountToApply = remainingBalance;
            newStatus = 'Pagado';
            console.log('✅ Pago completo - Factura será marcada como PAGADA');
        } else {
            // Pago parcial
            amountToApply = availableAmount;
            newStatus = 'Pendiente'; // Mantener como Pendiente hasta que saldo llegue a 0
            newBalance = remainingBalance - amountToApply;
            console.log(`⚠️ Pago parcial - Saldo restante: ₡${newBalance.toLocaleString('es-CR')}`);
        }

        // ===== NUEVO: ACTUALIZAR CAMPO PAGOS DE LA FACTURA =====
        const newPayment = {
            reference: transactionReference,
            bank: bank,
            amount: amountToApply,
            date: transactionDate
        };
        
        const updatedPayments = [...previousPayments, newPayment];
        const formattedPayments = formatInvoicePayments(updatedPayments);
        
        console.log('📝 Actualizando pagos de la factura:', formattedPayments);

        // ===== NUEVO: ACTUALIZAR CAMPO FACTURASASIGNADAS DE LA TRANSACCIÓN =====
        const transactionAssignments = parseTransactionAssignments(transaction.FacturasAsignadas || '');
        const newAssignment = {
            invoiceNumber: invoiceNumber,
            amount: amountToApply
        };
        
        // Buscar si ya existe asignación para esta factura
        const existingIndex = transactionAssignments.findIndex(a => a.invoiceNumber === invoiceNumber);
        if (existingIndex > -1) {
            // Actualizar asignación existente
            transactionAssignments[existingIndex].amount += amountToApply;
        } else {
            // Agregar nueva asignación
            transactionAssignments.push(newAssignment);
        }
        
        const formattedAssignments = formatTransactionAssignments(transactionAssignments);
        console.log('📝 Actualizando asignaciones de transacción:', formattedAssignments);

        // Actualizar la factura
        const updateData = {
            Estado: newStatus,
            MontoMultas: finesUntilTransaction,
            MontoTotal: newStatus === 'Pagado' ? 0 : Math.round(newBalance), // Asegurar que sea número entero
            Pagos: formattedPayments
        };

        if (newStatus === 'Pagado') {
            updateData.FechaPago = transactionDate || '';
        }

        await updateInvoiceStatus(invoice.NumeroFactura, updateData);

        // Actualizar datos locales
        Object.assign(invoice, updateData);

        // ===== NUEVO: ACTUALIZAR TRANSACCIÓN EN LA API =====
        console.log('🔄 Iniciando actualización de transacción en API...');
        console.log('📋 Datos para actualizar:', {
            transactionReference,
            transactionBank: bank,
            formattedAssignments
        });
        
        await updateTransactionAssignments(transactionReference, bank, formattedAssignments);
        
        console.log('✅ Actualización de transacción completada');

        // Esperar un momento para que los datos se propaguen en la API
        console.log('⏳ Esperando propagación de datos en la API...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos de espera

        // Recargar datos y re-renderizar la página
        console.log('🔄 Recargando datos después de la asignación...');
        try {
            if (typeof reloadDataAndRender === 'function') {
                await reloadDataAndRender();
            } else {
                // Fallback: solo renderizar si no está disponible reloadDataAndRender
                if (typeof renderPage === 'function') {
                    renderPage();
                }
            }
        } catch (reloadError) {
            console.warn('⚠️ Error al recargar datos, pero la asignación fue exitosa:', reloadError);
            // No fallar por error de recarga
        }

        // Mostrar mensaje
        if (newStatus === 'Pagado') {
            showToast(`✅ Factura ${invoice.NumeroFactura} PAGADA completamente con transacción ${transactionReference}`, 'success');
        } else {
            showToast(`⚠️ Pago parcial aplicado a ${invoice.NumeroFactura}. Saldo: ₡${newBalance.toLocaleString('es-CR')}`, 'warning');
        }

        return true;

    } catch (error) {
        console.error('❌ Error en assignTransactionToInvoice:', error);
        showToast('Error al asignar la transacción: ' + error.message, 'error');
        
        // Restaurar el botón en caso de error
        const confirmBtn = document.getElementById('confirmAssignInvoiceBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '✅ Asignar Factura';
        }
        
        throw error;
    }
    })();
    
    // Ejecutar con timeout
    return Promise.race([assignmentPromise, timeoutPromise]);
}

// Función para sincronizar pagos existentes que no están en la API de transacciones
async function syncExistingPayments() {
    try {
        console.log('🔄 Sincronizando pagos existentes...');
        
        // Obtener todas las facturas con pagos
        const invoicesWithPayments = clientInvoices.filter(invoice => 
            invoice.Pagos && invoice.Pagos.trim() !== ''
        );
        
        console.log(`📋 Encontradas ${invoicesWithPayments.length} facturas con pagos`);
        
        for (const invoice of invoicesWithPayments) {
            const payments = parseInvoicePayments(invoice.Pagos);
            
            for (const payment of payments) {
                console.log(`🔄 Sincronizando pago ${payment.reference} para factura ${invoice.NumeroFactura}`);
                
                try {
                    // Buscar la transacción en la API
                    const transactionResponse = await fetch('https://sheetdb.io/api/v1/a7oekivxzreg7');
                    if (!transactionResponse.ok) continue;
                    
                    const transactions = await transactionResponse.json();
                    const transaction = transactions.find(t => t.Referencia === payment.reference);
                    
                    if (transaction) {
                        // Verificar si ya está actualizada
                        const currentAssignments = parseTransactionAssignments(transaction.FacturasAsignadas || '');
                        const hasAssignment = currentAssignments.some(a => a.invoiceNumber === invoice.NumeroFactura);
                        
                        if (!hasAssignment) {
                            console.log(`📝 Actualizando transacción ${payment.reference} con asignación a ${invoice.NumeroFactura}`);
                            
                            // Agregar la asignación
                            const newAssignments = [...currentAssignments, {
                                invoiceNumber: invoice.NumeroFactura,
                                amount: payment.amount
                            }];
                            
                            const formattedAssignments = formatTransactionAssignments(newAssignments);
                            
                            // Determinar el banco de la transacción
                            const bank = transaction.banco || 'BAC';
                            
                            // Actualizar la transacción
                            await updateTransactionAssignments(payment.reference, bank, formattedAssignments);
                            
                            console.log(`✅ Transacción ${payment.reference} sincronizada`);
                        } else {
                            console.log(`✅ Transacción ${payment.reference} ya está actualizada`);
                        }
                    } else {
                        console.warn(`⚠️ Transacción ${payment.reference} no encontrada en la API`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error sincronizando pago ${payment.reference}:`, error);
                }
            }
        }
        
        console.log('✅ Sincronización de pagos completada');
        
    } catch (error) {
        console.error('❌ Error en syncExistingPayments:', error);
    }
}

// ===== FUNCIONES AUXILIARES PARA MANEJO DE PAGOS =====

// Parsear pagos de una factura (formato: "REF:MONTO:FECHA" o "REF:MONTO" para compatibilidad)
function parseInvoicePayments(paymentsString) {
    if (!paymentsString || paymentsString.trim() === '') {
        return [];
    }
    
    try {
        return paymentsString.split(';')
            .filter(part => part.trim() !== '')
            .map(part => {
                const parts = part.split(':');
                const reference = parts[0]?.trim();
                const amount = parseFloat(parts[1]) || 0;
                const date = parts[2]?.trim() || new Date().toLocaleDateString('es-CR'); // Fecha por defecto si no existe
                
                return {
                    reference: reference,
                    amount: amount,
                    date: date
                };
            })
            .filter(payment => payment.reference && payment.amount > 0);
    } catch (error) {
        console.error('Error al parsear pagos de factura:', error);
        return [];
    }
}

// Formatear pagos de una factura para guardar en BD
function formatInvoicePayments(payments) {
    if (!payments || payments.length === 0) return '';
    
    return payments
        .filter(payment => payment.reference && payment.amount > 0)
        .map(payment => {
            // Formato: REF:MONTO:FECHA
            const date = payment.date || new Date().toLocaleDateString('es-CR');
            return `${payment.reference}:${payment.amount}:${date}`;
        })
        .join(';');
}

// Parsear asignaciones de una transacción (formato: "FAC-001:MONTO;FAC-002:MONTO")
function parseTransactionAssignments(assignmentsString) {
    if (!assignmentsString || assignmentsString.trim() === '') {
        return [];
    }
    
    try {
        return assignmentsString.split(';')
            .filter(part => part.trim() !== '')
            .map(part => {
                const [invoiceNumber, amountStr] = part.split(':');
                return {
                    invoiceNumber: invoiceNumber.trim(),
                    amount: parseFloat(amountStr) || 0
                };
            })
            .filter(assignment => assignment.invoiceNumber && assignment.amount > 0);
    } catch (error) {
        console.error('Error al parsear asignaciones de transacción:', error);
        return [];
    }
}

// Formatear asignaciones de una transacción para guardar en BD
function formatTransactionAssignments(assignments) {
    if (!assignments || assignments.length === 0) return '';
    
    return assignments
        .filter(assignment => assignment.invoiceNumber && assignment.amount > 0)
        .map(assignment => `${assignment.invoiceNumber}:${assignment.amount}`)
        .join(';');
}

// Actualizar asignaciones de una transacción en la API
async function updateTransactionAssignments(transactionReference, bank, formattedAssignments) {
    try {
        console.log('🔄 Actualizando asignaciones de transacción:', transactionReference);
        console.log('📋 Parámetros recibidos:', { transactionReference, bank, formattedAssignments });
        
        // Obtener el cliente correcto
        const client = window.currentClient || currentClient;
        if (!client) {
            console.error('❌ No hay cliente disponible para actualizar transacción');
            return;
        }
        
        console.log('👤 Cliente encontrado:', { ID: client.ID, ID_Cliente: client.ID_Cliente, Nombre: client.Nombre });
        
        // URL para actualizar la transacción
        const updateUrl = `https://sheetdb.io/api/v1/a7oekivxzreg7/Referencia/${encodeURIComponent(transactionReference)}?sheet=${bank}`;
        console.log('🌐 URL de actualización:', updateUrl);
        
        // Formatear fecha actual
        const today = new Date();
        const formattedDate = today.toLocaleDateString('es-CR'); // DD/MM/YYYY
        
        console.log('📅 Fecha formateada:', formattedDate);
        
        // ===== NUEVO: CALCULAR SALDO DISPONIBLE =====
        // Buscar la transacción para obtener el monto total
        const searchUrl = `https://sheetdb.io/api/v1/a7oekivxzreg7/search?Referencia=${encodeURIComponent(transactionReference)}&sheet=${bank}`;
        console.log('🔍 URL de búsqueda:', searchUrl);
        
        try {
            const searchResponse = await fetch(searchUrl);
            console.log('🔍 Respuesta de búsqueda:', {
                status: searchResponse.status,
                statusText: searchResponse.statusText,
                ok: searchResponse.ok
            });
            
            let paymentAmount = 0;
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                console.log('🔍 Datos encontrados:', searchData);
                
                if (searchData.length > 0) {
                    const transaction = searchData[0];
                    console.log('🔍 Transacción encontrada:', transaction);
                    
                    // Parsear el monto usando la lógica de utils.js
                    paymentAmount = parseAmount(transaction.Créditos);
                    console.log(`💰 Monto total de la transacción: ₡${paymentAmount.toLocaleString('es-CR')}`);
                } else {
                    console.warn('⚠️ No se encontró la transacción en la búsqueda');
                }
            } else {
                console.warn('⚠️ Error en la búsqueda de la transacción:', searchResponse.status);
                const errorText = await searchResponse.text();
                console.warn('Error detallado:', errorText);
            }
            
            // Calcular el total asignado
            const assignments = parseTransactionAssignments(formattedAssignments);
            console.log('📋 Asignaciones parseadas:', assignments);
            
            const totalAssignedAmount = assignments.reduce((sum, assignment) => sum + assignment.amount, 0);
            const availableAmount = Math.max(0, paymentAmount - totalAssignedAmount);
            
            console.log(`💰 Cálculo de saldo disponible:`);
            console.log(`   - Monto total del pago: ₡${paymentAmount.toLocaleString('es-CR')}`);
            console.log(`   - Total asignado: ₡${totalAssignedAmount.toLocaleString('es-CR')}`);
            console.log(`   - Saldo disponible: ₡${availableAmount.toLocaleString('es-CR')}`);
            
            const updateData = {
                FacturasAsignadas: formattedAssignments,
                ID_Cliente: client.ID || client.ID_Cliente,
                FechaAsignacion: formattedDate,
                Observaciones: `Conciliada con factura - ${formattedAssignments}`,
                Disponible: availableAmount.toString() // Guardar saldo disponible
            };
            
            console.log('📝 Datos a enviar:', updateData);
            console.log('📝 Campo "Disponible" a guardar:', updateData.Disponible);
            
            const response = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });
            
            console.log('📡 Respuesta del servidor:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });
            
            if (!response.ok) {
                console.warn('⚠️ No se pudo actualizar la transacción en la API:', response.status);
                const errorText = await response.text();
                console.warn('Error detallado:', errorText);
                console.warn('URL que falló:', updateUrl);
                console.warn('Datos que se intentaron enviar:', updateData);
            } else {
                const responseText = await response.text();
                console.log('✅ Transacción actualizada en la API');
                console.log('📄 Respuesta del servidor:', responseText);
            }
            
        } catch (searchError) {
            console.error('❌ Error en la búsqueda de la transacción:', searchError);
            throw searchError;
        }
        
    } catch (error) {
        console.error('❌ Error al actualizar transacción:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Parámetros que causaron el error:', { transactionReference, bank, formattedAssignments });
        
        // Mostrar mensaje de error al usuario
        showToast('Error al actualizar la transacción en el sistema: ' + error.message, 'error');
        
        // Lanzar el error para que se maneje en el nivel superior
        throw error;
    }
}

// ===== EXPORTAR FUNCIONES AL SCOPE GLOBAL =====
window.switchPaymentTab = switchPaymentTab;
window.loadTransactionsTab = loadTransactionsTab;
window.switchInvoiceTab = switchInvoiceTab;
window.selectTransaction = selectTransaction;
window.filterTransactions = filterTransactions;
window.clearTransactionSearch = clearTransactionSearch;
window.assignTransactionToInvoice = assignTransactionToInvoice;

// Nuevas funciones de manejo de pagos
window.parseInvoicePayments = parseInvoicePayments;
window.formatInvoicePayments = formatInvoicePayments;
window.parseTransactionAssignments = parseTransactionAssignments;
window.formatTransactionAssignments = formatTransactionAssignments;
window.updateTransactionAssignments = updateTransactionAssignments;
window.syncExistingPayments = syncExistingPayments;

// ===== FUNCIÓN AUXILIAR PARA PARSEAR MONTOS POR BANCO =====
function parsePaymentAmountByBank(creditValue, bank) {
    if (!creditValue) return 0;
    
    console.log(`🔍 PARSEO DETALLADO:`);
    console.log(`   - Valor original: "${creditValue}"`);
    console.log(`   - Banco: "${bank}"`);
    
    const cleanValue = creditValue.toString().trim().replace(/[^\d.,]/g, '');
    console.log(`   - Valor limpio: "${cleanValue}"`);
    
    // TODOS LOS BANCOS USAN FORMATO EUROPEO: punto como separador de miles, coma como decimal
    // Ejemplos: 100.000,00 o 100.000
    console.log(`   - Procesando como formato europeo (todos los bancos)`);
    
    if (cleanValue.includes(',')) {
        // Tiene decimales: 100.000,00 -> 100000.00
        const normalizedValue = cleanValue.replace(/\./g, '').replace(',', '.');
        console.log(`   - Con decimales: "${cleanValue}" -> "${normalizedValue}"`);
        return parseFloat(normalizedValue);
    } else {
        // No tiene decimales: 100.000 -> 100000
        const normalizedValue = cleanValue.replace(/\./g, '');
        console.log(`   - Sin decimales: "${cleanValue}" -> "${normalizedValue}"`);
        return parseFloat(normalizedValue);
    }
}