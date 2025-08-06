// ===== SISTEMA DE PAGOS MANUALES =====

// Variables globales para pagos manuales
let currentEditingManualPayment = null;
let currentDeletingManualPayment = null;
let manualPayments = [];

// ===== FUNCIONES PARA MODALES =====

function openManualPaymentModal() {
    const modal = document.getElementById('manualPaymentModal');
    modal.classList.add('show');

    // Establecer fecha actual por defecto
    const today = new Date();
    const dateInput = document.getElementById('manualPaymentDate');
    dateInput.value = today.toISOString().split('T')[0];

    // Generar referencia única por defecto
    const referenceInput = document.getElementById('manualPaymentReference');
    const timestamp = Date.now();
    referenceInput.value = `PAGO-MANUAL-${timestamp}`;

    // Focus en el primer campo
    setTimeout(() => {
        document.getElementById('manualPaymentAmount').focus();
    }, 100);
}

function closeManualPaymentModal() {
    const modal = document.getElementById('manualPaymentModal');
    modal.classList.remove('show');

    // Limpiar formulario
    document.getElementById('manualPaymentForm').reset();
}

function openEditManualPaymentModal(paymentReference) {
    console.log('✏️ Editando pago manual:', paymentReference);

    // Encontrar el pago manual
    const payment = manualPayments.find(p => p.Referencia === paymentReference);
    if (!payment) {
        showToast('Pago manual no encontrado', 'error');
        return;
    }

    currentEditingManualPayment = payment;

    // Llenar formulario de edición
    document.getElementById('editManualPaymentReference').value = payment.Referencia;
    document.getElementById('editManualPaymentAmount').value = payment.Créditos;
    document.getElementById('editManualPaymentDate').value = formatDateForInput(payment.Fecha);
    document.getElementById('editManualPaymentDescription').value = payment.Descripción || '';
    document.getElementById('editManualPaymentObservations').value = payment.Observaciones || '';

    // Mostrar modal
    document.getElementById('editManualPaymentModal').classList.add('show');
}

function closeEditManualPaymentModal() {
    document.getElementById('editManualPaymentModal').classList.remove('show');
    document.getElementById('editManualPaymentForm').reset();
    currentEditingManualPayment = null;
}

function openDeleteManualPaymentModal(paymentReference) {
    console.log('🗑️ Iniciando eliminación de pago manual:', paymentReference);

    // Encontrar el pago manual
    const payment = manualPayments.find(p => p.Referencia === paymentReference);
    if (!payment) {
        showToast('Pago manual no encontrado', 'error');
        return;
    }

    currentDeletingManualPayment = payment;

    // Llenar información del pago a eliminar
    const deleteInfo = document.getElementById('deleteManualPaymentInfo');
    const amount = parseAmount(payment.Créditos || 0);
    const date = formatDateForDisplay(payment.Fecha);

    deleteInfo.innerHTML = `
        <strong>${payment.Referencia}</strong><br>
        Monto: ₡${amount.toLocaleString('es-CR')}<br>
        Fecha: ${date}<br>
        ${payment.Descripción ? `Descripción: ${payment.Descripción}` : ''}
        ${payment.Observaciones ? `<br>Observaciones: ${payment.Observaciones}` : ''}
    `;

    // Mostrar modal de confirmación
    document.getElementById('deleteManualPaymentModal').classList.add('show');
}

function closeDeleteManualPaymentModal() {
    document.getElementById('deleteManualPaymentModal').classList.remove('show');
    currentDeletingManualPayment = null;
}

// ===== FUNCIONES CRUD =====

async function createManualPayment(paymentData) {
    try {
        // Preparar datos para la API con la estructura correcta
        const paymentPayload = {
            sheet: 'PagosManuales',
            Fecha: paymentData.date,
            Referencia: paymentData.reference,
            Descripción: paymentData.description || '',
            Créditos: parseFloat(paymentData.amount),
            Observaciones: paymentData.observations || '',
            ID_Cliente: currentClientId,
            Disponible: parseFloat(paymentData.amount), // Inicialmente todo disponible
            FacturasAsignadas: '',
            FechaAsignacion: ''
        };

        console.log('💰 Creando pago manual:', paymentPayload);

        const response = await fetch(API_CONFIG.PAYMENTS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Pago manual creado exitosamente:', result);

        // Recargar datos completos desde la API para mostrar el nuevo pago
        console.log('🔄 Recargando datos para mostrar el nuevo pago...');
        await loadManualPayments();
        
        // Re-renderizar la página con los datos actualizados
        if (typeof renderPage === 'function') {
            renderPage();
        }

        // Mostrar mensaje de éxito
        showToast(`✅ Pago manual ${paymentData.reference} creado exitosamente`, 'success');

        return result;

    } catch (error) {
        console.error('❌ Error al crear pago manual:', error);
        throw error;
    }
}

async function updateManualPayment(paymentData) {
    try {
        console.log('💾 Actualizando pago manual:', paymentData);

        const response = await fetch(`${API_CONFIG.PAYMENTS}/Referencia/${paymentData.Referencia}?sheet=PagosManuales`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(paymentData).toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        console.log('✅ Pago manual actualizado exitosamente');

        // Actualizar pago localmente
        const payment = manualPayments.find(p => p.Referencia === paymentData.Referencia);
        if (payment) {
            Object.assign(payment, paymentData);
        }

        return true;

    } catch (error) {
        console.error('❌ Error al actualizar pago manual:', error);
        throw error;
    }
}

async function deleteManualPayment(paymentReference) {
    try {
        console.log('🗑️ Eliminando pago manual:', paymentReference);

        const response = await fetch(`${API_CONFIG.PAYMENTS}/Referencia/${paymentReference}?sheet=PagosManuales`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        console.log('✅ Pago manual eliminado exitosamente');

        // Recargar datos completos desde la API para mostrar los cambios
        console.log('🔄 Recargando datos después de eliminar pago manual...');
        await loadManualPayments();
        
        // Re-renderizar la página con los datos actualizados
        if (typeof renderPage === 'function') {
            renderPage();
        }

        return true;

    } catch (error) {
        console.error('❌ Error al eliminar pago manual:', error);
        throw error;
    }
}

// ===== FUNCIONES DE CARGA =====

async function loadManualPayments() {
    console.log('📋 Cargando pagos manuales...');

    try {
        const response = await fetch(`${API_CONFIG.PAYMENTS}?sheet=PagosManuales`);
        if (!response.ok) {
            console.warn('Error al cargar pagos manuales:', response.status);
            manualPayments = [];
            return;
        }

        const data = await response.json();
        const allManualPayments = Array.isArray(data) ? data : [];

        // Filtrar pagos del cliente actual
        manualPayments = allManualPayments.filter(payment =>
            payment.ID_Cliente &&
            payment.Referencia &&
            payment.ID_Cliente.toString() === currentClientId.toString()
        );

        console.log(`📋 Pagos manuales cargados: ${manualPayments.length}`);

    } catch (error) {
        console.warn('No se pudieron cargar los pagos manuales:', error);
        manualPayments = [];
    }
}

// ===== FUNCIONES DE RENDERIZADO =====

function renderManualPayments() {
    // Renderizar pagos manuales sin asignar
    const unassignedManualPayments = manualPayments.filter(payment => 
        !payment.FacturasAsignadas || payment.FacturasAsignadas.trim() === ''
    );

    // Renderizar pagos manuales asignados
    const assignedManualPayments = manualPayments.filter(payment => 
        payment.FacturasAsignadas && payment.FacturasAsignadas.trim() !== ''
    );

    // Agregar pagos manuales a las secciones existentes
    renderUnassignedManualPayments(unassignedManualPayments);
    renderAssignedManualPayments(assignedManualPayments);
}

function renderUnassignedManualPayments(payments) {
    const container = document.getElementById('unassignedPayments');
    if (!container) return;

    // Obtener pagos bancarios existentes
    const existingPayments = container.innerHTML;

    // Crear HTML para pagos manuales
    const manualPaymentsHtml = payments.map(payment => {
        const amount = parseAmount(payment.Créditos || 0);
        const date = formatDateForDisplay(payment.Fecha);
        const available = parseAmount(payment.Disponible || payment.Créditos || 0);

        return `
            <div class="payment-card manual-payment" id="manual-payment-${payment.Referencia}">
                <div class="payment-header">
                    <div class="payment-info">
                        <div class="payment-reference">${payment.Referencia}</div>
                        <div class="payment-bank">💰 Pago Manual</div>
                    </div>
                    <div class="payment-amount">₡${amount.toLocaleString('es-CR')}</div>
                </div>
                
                <div class="payment-details">
                    <div class="payment-detail">
                        <span class="detail-label">Fecha:</span>
                        <span class="detail-value">${date}</span>
                    </div>
                    <div class="payment-detail">
                        <span class="detail-label">Disponible:</span>
                        <span class="detail-value">₡${available.toLocaleString('es-CR')}</span>
                    </div>
                    ${payment.Descripción ? `
                        <div class="payment-detail">
                            <span class="detail-label">Descripción:</span>
                            <span class="detail-value">${payment.Descripción}</span>
                        </div>
                    ` : ''}
                    ${payment.Observaciones ? `
                        <div class="payment-detail">
                            <span class="detail-label">Observaciones:</span>
                            <span class="detail-value">${payment.Observaciones}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="payment-actions">
                    <button class="btn btn-receipt" onclick="generateUnassignedManualPaymentReceipt('${payment.Referencia}')" title="Generar Recibo">
                        🧾 Recibo
                    </button>
                    <button class="btn btn-secondary" onclick="openEditManualPaymentModal('${payment.Referencia}')" title="Editar Pago">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-danger" onclick="openDeleteManualPaymentModal('${payment.Referencia}')" title="Eliminar Pago">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Agregar pagos manuales al final de los pagos bancarios
    if (manualPaymentsHtml) {
        container.innerHTML = existingPayments + manualPaymentsHtml;
    }
}

function renderAssignedManualPayments(payments) {
    const container = document.getElementById('assignedPayments');
    if (!container) return;

    // Obtener pagos bancarios asignados existentes
    const existingPayments = container.innerHTML;

    // Crear HTML para pagos manuales asignados
    const manualPaymentsHtml = payments.map(payment => {
        const amount = parseAmount(payment.Créditos || 0);
        const date = formatDateForDisplay(payment.Fecha);
        const assignmentDate = payment.FechaAsignacion ? formatDateForDisplay(payment.FechaAsignacion) : 'Fecha no registrada';

        return `
            <div class="payment-card manual-payment assigned" id="assigned-manual-payment-${payment.Referencia}">
                <div class="payment-header">
                    <div class="payment-info">
                        <div class="payment-reference">${payment.Referencia}</div>
                        <div class="payment-bank">💰 Pago Manual</div>
                    </div>
                    <div class="payment-amount">₡${amount.toLocaleString('es-CR')}</div>
                </div>
                
                <div class="payment-details">
                    <div class="payment-detail">
                        <span class="detail-label">Fecha Pago:</span>
                        <span class="detail-value">${date}</span>
                    </div>
                    <div class="payment-detail">
                        <span class="detail-label">Asignado:</span>
                        <span class="detail-value">${assignmentDate}</span>
                    </div>
                    <div class="payment-detail">
                        <span class="detail-label">Facturas:</span>
                        <span class="detail-value">${payment.FacturasAsignadas || 'No asignado'}</span>
                    </div>
                    ${payment.Descripción ? `
                        <div class="payment-detail">
                            <span class="detail-label">Descripción:</span>
                            <span class="detail-value">${payment.Descripción}</span>
                        </div>
                    ` : ''}
                    ${payment.Observaciones ? `
                        <div class="payment-detail">
                            <span class="detail-label">Observaciones:</span>
                            <span class="detail-value">${payment.Observaciones}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="payment-actions">
                    <button class="btn btn-receipt" onclick="generateManualPaymentReceipt('${payment.Referencia}')" title="Generar Recibo">
                        🧾 Recibo
                    </button>
                    <button class="btn btn-secondary" onclick="openEditManualPaymentModal('${payment.Referencia}')" title="Editar Pago">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-unassign" onclick="showUnassignConfirmation('${payment.Referencia}', 'PagosManuales')" title="Desasignar">
                        🔄 Desasignar
                    </button>
                    <button class="btn btn-danger" onclick="openDeleteManualPaymentModal('${payment.Referencia}')" title="Eliminar Pago">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Agregar pagos manuales al final de los pagos bancarios asignados
    if (manualPaymentsHtml) {
        container.innerHTML = existingPayments + manualPaymentsHtml;
    }
}

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', function() {
    // Listener para formulario de pago manual
    const manualPaymentForm = document.getElementById('manualPaymentForm');
    if (manualPaymentForm) {
        manualPaymentForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            // Obtener datos del formulario
            const reference = document.getElementById('manualPaymentReference').value;
            const amount = document.getElementById('manualPaymentAmount').value;
            const date = document.getElementById('manualPaymentDate').value;
            const description = document.getElementById('manualPaymentDescription').value;
            const observations = document.getElementById('manualPaymentObservations') ? 
                document.getElementById('manualPaymentObservations').value : '';

            // Validar campos requeridos
            if (!reference || !amount || !date) {
                showToast('Por favor complete todos los campos requeridos', 'error');
                return;
            }

            // Validar monto
            const numAmount = parseFloat(amount);
            if (numAmount <= 0) {
                showToast('El monto debe ser mayor a cero', 'error');
                return;
            }

            // Deshabilitar botón de envío
            const submitButton = manualPaymentForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = '⏳ Creando...';

            try {
                await createManualPayment({
                    reference: reference,
                    amount: amount,
                    date: formatDateForStorage(new Date(date)),
                    description: description,
                    observations: observations
                });

                // Cerrar modal
                closeManualPaymentModal();

                // Restaurar botón
                submitButton.disabled = false;
                submitButton.textContent = originalText;

            } catch (error) {
                console.error('❌ Error al crear pago manual:', error);
                showToast('Error al crear el pago manual: ' + error.message, 'error');

                // Restaurar botón
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }

    // Listener para formulario de edición de pago manual
    const editManualPaymentForm = document.getElementById('editManualPaymentForm');
    if (editManualPaymentForm) {
        editManualPaymentForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            if (!currentEditingManualPayment) {
                showToast('No hay pago seleccionado para editar', 'error');
                return;
            }

            // Obtener datos del formulario
            const reference = document.getElementById('editManualPaymentReference').value;
            const amount = document.getElementById('editManualPaymentAmount').value;
            const date = document.getElementById('editManualPaymentDate').value;
            const description = document.getElementById('editManualPaymentDescription').value;
            const observations = document.getElementById('editManualPaymentObservations') ? 
                document.getElementById('editManualPaymentObservations').value : '';

            // Validar campos requeridos
            if (!reference || !amount || !date) {
                showToast('Por favor complete todos los campos requeridos', 'error');
                return;
            }

            // Validar monto
            const numAmount = parseFloat(amount);
            if (numAmount <= 0) {
                showToast('El monto debe ser mayor a cero', 'error');
                return;
            }

            // Deshabilitar botón de envío
            const submitButton = editManualPaymentForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = '⏳ Guardando...';

            try {
                const updateData = {
                    Referencia: reference,
                    Créditos: numAmount,
                    Fecha: formatDateForStorage(new Date(date)),
                    Descripción: description,
                    Observaciones: observations
                };

                await updateManualPayment(updateData);

                // Recargar datos completos desde la API para mostrar los cambios
                console.log('🔄 Recargando datos después de actualizar pago manual...');
                await loadManualPayments();
                
                // Re-renderizar la página con los datos actualizados
                if (typeof renderPage === 'function') {
                    renderPage();
                }

                // Cerrar modal
                closeEditManualPaymentModal();

                // Mostrar mensaje de éxito
                showToast(`✅ Pago manual ${reference} actualizado exitosamente`, 'success');

                // Restaurar botón
                submitButton.disabled = false;
                submitButton.textContent = originalText;

            } catch (error) {
                console.error('❌ Error al actualizar pago manual:', error);
                showToast('Error al actualizar el pago manual: ' + error.message, 'error');

                // Restaurar botón
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }
});

// ===== FUNCIÓN DE CONFIRMACIÓN DE ELIMINACIÓN =====

async function confirmDeleteManualPayment() {
    if (!currentDeletingManualPayment) {
        showToast('No hay pago seleccionado para eliminar', 'error');
        return;
    }

    const confirmBtn = document.getElementById('confirmDeleteManualPaymentBtn');
    const originalText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Eliminando...';

    try {
        await deleteManualPayment(currentDeletingManualPayment.Referencia);

        // Cerrar modal
        closeDeleteManualPaymentModal();

        // Mostrar mensaje de éxito
        showToast(`✅ Pago manual ${currentDeletingManualPayment.Referencia} eliminado exitosamente`, 'success');

        // Restaurar botón
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;

    } catch (error) {
        console.error('❌ Error al eliminar pago manual:', error);
        showToast('Error al eliminar el pago manual: ' + error.message, 'error');

        // Restaurar botón
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

// ===== FUNCIÓN PARA ASIGNAR PAGO MANUAL A FACTURA =====

async function assignManualPaymentToInvoice(paymentReference, invoiceNumber, amount) {
    try {
        console.log('💰 Asignando pago manual a factura:', {
            paymentReference,
            invoiceNumber,
            amount
        });

        // Encontrar el pago manual
        const payment = manualPayments.find(p => p.Referencia === paymentReference);
        if (!payment) {
            throw new Error('Pago manual no encontrado');
        }

        // Encontrar la factura
        const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceNumber);
        if (!invoice) {
            throw new Error('Factura no encontrada');
        }

        // Verificar que el pago tenga suficiente monto disponible
        const availableAmount = parseAmount(payment.Disponible || payment.Créditos || 0);
        if (availableAmount < amount) {
            throw new Error(`Monto insuficiente. Disponible: ₡${availableAmount.toLocaleString('es-CR')}, Solicitado: ₡${amount.toLocaleString('es-CR')}`);
        }

        // Actualizar pago manual
        const updateData = {
            Referencia: paymentReference,
            FacturasAsignadas: invoiceNumber,
            FechaAsignacion: new Date().toISOString().split('T')[0],
            Disponible: availableAmount - amount
        };

        await updateManualPayment(updateData);

        // Actualizar estado de la factura
        const invoiceUpdateData = {
            NumeroFactura: invoiceNumber,
            Estado: 'Pagado',
            FechaPago: new Date().toISOString().split('T')[0]
        };

        // Usar la función existente para actualizar facturas
        if (typeof updateInvoice === 'function') {
            await updateInvoice(invoiceUpdateData);
        }

        // Recargar datos
        await Promise.all([
            loadManualPayments(),
            loadClientAndInvoices(currentClientId)
        ]);

        // Re-renderizar página
        if (typeof renderPage === 'function') {
            renderPage();
        }

        showToast(`✅ Pago manual ${paymentReference} asignado a factura ${invoiceNumber}`, 'success');

        return true;

    } catch (error) {
        console.error('❌ Error al asignar pago manual:', error);
        showToast('Error al asignar pago manual: ' + error.message, 'error');
        throw error;
    }
}

// ===== EXPONER FUNCIONES AL SCOPE GLOBAL =====

window.openManualPaymentModal = openManualPaymentModal;
window.closeManualPaymentModal = closeManualPaymentModal;
window.openEditManualPaymentModal = openEditManualPaymentModal;
window.closeEditManualPaymentModal = closeEditManualPaymentModal;
window.openDeleteManualPaymentModal = openDeleteManualPaymentModal;
window.closeDeleteManualPaymentModal = closeDeleteManualPaymentModal;
window.confirmDeleteManualPayment = confirmDeleteManualPayment;
window.createManualPayment = createManualPayment;
window.updateManualPayment = updateManualPayment;
window.deleteManualPayment = deleteManualPayment;
window.loadManualPayments = loadManualPayments;
window.renderManualPayments = renderManualPayments;
window.assignManualPaymentToInvoice = assignManualPaymentToInvoice;

console.log('✅ manual-payments.js cargado - Sistema de pagos manuales'); 