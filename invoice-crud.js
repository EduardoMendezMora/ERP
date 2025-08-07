// ===== VARIABLES PARA CRUD DE FACTURAS =====
let currentEditingInvoice = null;
let currentDeletingInvoice = null;

// ===== FUNCIONES PARA CREAR FACTURA MANUAL =====
function openManualInvoiceModal() {
    const modal = document.getElementById('manualInvoiceModal');
    modal.classList.add('show');

    // Establecer fecha de vencimiento por defecto (7 días desde hoy)
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);
    const dueDateInput = document.getElementById('invoiceDueDate');
    dueDateInput.value = defaultDueDate.toISOString().split('T')[0];

    // Focus en el primer campo
    setTimeout(() => {
        document.getElementById('invoiceConcept').focus();
    }, 100);
}

function closeManualInvoiceModal() {
    const modal = document.getElementById('manualInvoiceModal');
    modal.classList.remove('show');

    // Limpiar formulario
    document.getElementById('manualInvoiceForm').reset();
}

async function createManualInvoice(invoiceData) {
    try {
        // Generar número de factura único
        const invoiceNumber = generateInvoiceNumber();

        // Preparar datos para la API
        const invoicePayload = {
            sheet: 'Facturas',
            ID_Cliente: currentClientId,
            NumeroFactura: invoiceNumber,
            SemanaNumero: 'MANUAL',
            SemanaDescripcion: `Factura Manual - ${invoiceData.concept}`,
            MontoBase: parseFloat(invoiceData.amount),
            MontoMultas: 0,
            MontoTotal: parseFloat(invoiceData.amount),
            FechaVencimiento: invoiceData.dueDate,
            Estado: 'Pendiente',
            DiasAtraso: 0,
            FechaCreacion: formatDateForStorage(new Date()),
            ConceptoManual: invoiceData.concept,
            DescripcionManual: invoiceData.description || '',
            TipoFactura: 'Manual'
        };

        console.log('📝 Creando factura manual:', invoicePayload);

        const response = await fetch(API_CONFIG.INVOICES, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(invoicePayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Factura creada exitosamente:', result);

        // Recargar datos completos desde la API para mostrar la nueva factura
        console.log('🔄 Recargando datos para mostrar la nueva factura...');
        await loadClientAndInvoices(currentClientId);
        
        // Re-renderizar la página con los datos actualizados
        if (typeof renderPage === 'function') {
            renderPage();
        }

        // Mostrar mensaje de éxito
        showToast(`✅ Factura ${invoiceNumber} creada exitosamente`, 'success');

        return result;

    } catch (error) {
        console.error('❌ Error al crear factura manual:', error);
        throw error;
    }
}

// Función auxiliar para formatear fechas de forma segura
function safeFormatDate(date) {
    if (!date || isNaN(new Date(date).getTime())) return '';
    return formatDateForStorage(new Date(date));
}

// ===== FUNCIONES PARA EDITAR FACTURA =====
function editInvoice(invoiceNumber) {
    console.log('✏️ Editando factura:', invoiceNumber);

    // Encontrar la factura
    const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceNumber);
    if (!invoice) {
        showToast('Factura no encontrada', 'error');
        return;
    }

    currentEditingInvoice = invoice;

    // Llenar formulario de edición
    document.getElementById('editInvoiceNumber').value = invoice.NumeroFactura;
    document.getElementById('editInvoiceNumberDisplay').value = invoice.NumeroFactura;

    // Determinar concepto (puede venir de ConceptoManual o SemanaDescripcion)
    const concept = invoice.ConceptoManual || 'Arrendamiento Semanal';
    document.getElementById('editInvoiceConcept').value = concept;

    // Descripción
    const description = invoice.DescripcionManual || invoice.SemanaDescripcion || '';
    document.getElementById('editInvoiceDescription').value = description;

    // Monto base
            document.getElementById('editInvoiceAmount').value = parseAmount(invoice.MontoBase || 0);

    // Fecha de vencimiento
    document.getElementById('editInvoiceDueDate').value = formatDateForInput(invoice.FechaVencimiento);

    // Estado
    document.getElementById('editInvoiceStatus').value = invoice.Estado || 'Pendiente';

    // Fecha de pago (solo si está cancelado)
    const paymentDateGroup = document.getElementById('editPaymentDateGroup');
    const paymentDateInput = document.getElementById('editInvoicePaymentDate');

    if (invoice.Estado === 'Cancelado') {
        paymentDateGroup.style.display = 'block';
        paymentDateInput.value = formatDateForInput(invoice.FechaPago);
    } else {
        paymentDateGroup.style.display = 'none';
        paymentDateInput.value = '';
    }

    // Mostrar modal
    document.getElementById('editInvoiceModal').classList.add('show');
}

function closeEditInvoiceModal() {
    document.getElementById('editInvoiceModal').classList.remove('show');
    document.getElementById('editInvoiceForm').reset();
    currentEditingInvoice = null;
}

async function updateInvoice(invoiceData) {
    try {
        console.log('💾 Actualizando factura:', invoiceData);

        const response = await fetch(`${API_CONFIG.INVOICES}/NumeroFactura/${invoiceData.NumeroFactura}?sheet=Facturas`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(invoiceData).toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        console.log('✅ Factura actualizada exitosamente');

        // Actualizar factura localmente
        const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceData.NumeroFactura);
        if (invoice) {
            Object.assign(invoice, invoiceData);
        }

        return true;

    } catch (error) {
        console.error('❌ Error al actualizar factura:', error);
        throw error;
    }
}

// ===== FUNCIONES PARA ELIMINAR FACTURA =====
function deleteInvoice(invoiceNumber) {
    console.log('🗑️ Iniciando eliminación de factura:', invoiceNumber);

    // Encontrar la factura
    const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceNumber);
    if (!invoice) {
        showToast('Factura no encontrada', 'error');
        return;
    }

    currentDeletingInvoice = invoice;

    // Llenar información de la factura a eliminar
    const deleteInfo = document.getElementById('deleteInvoiceInfo');
    const concept = invoice.ConceptoManual || invoice.SemanaDescripcion || 'N/A';
            const amount = parseAmount(invoice.MontoBase || 0);

    deleteInfo.innerHTML = `
        <strong>${invoice.NumeroFactura}</strong><br>
        ${concept}<br>
        ₡${amount.toLocaleString('es-CR')}
    `;

    // Mostrar modal de confirmación
    document.getElementById('deleteInvoiceModal').classList.add('show');
}

function closeDeleteInvoiceModal() {
    document.getElementById('deleteInvoiceModal').classList.remove('show');
    currentDeletingInvoice = null;
}

async function confirmDeleteInvoice() {
    if (!currentDeletingInvoice) {
        showToast('No hay factura seleccionada para eliminar', 'error');
        return;
    }

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const originalText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Eliminando...';

    try {
        console.log('🗑️ Eliminando factura:', currentDeletingInvoice.NumeroFactura);

        const response = await fetch(`${API_CONFIG.INVOICES}/NumeroFactura/${currentDeletingInvoice.NumeroFactura}?sheet=Facturas`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        console.log('✅ Factura eliminada exitosamente');

        // Guardar el número de factura antes de cerrar el modal
        const invoiceNumber = currentDeletingInvoice.NumeroFactura;

        // Recargar datos completos desde la API para mostrar los cambios
        console.log('🔄 Recargando datos después de eliminar factura...');
        await loadClientAndInvoices(currentClientId);
        
        // Re-renderizar página con los datos actualizados
        if (typeof renderPage === 'function') {
            renderPage();
        }

        // Cerrar modal
        closeDeleteInvoiceModal();

        // Mostrar mensaje de éxito
        showToast(`✅ Factura ${invoiceNumber} eliminada exitosamente`, 'success');

    } catch (error) {
        console.error('❌ Error al eliminar factura:', error);
        showToast('Error al eliminar la factura: ' + error.message, 'error');

        // Restaurar botón
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}



// ===== FUNCIONES DE CARGA DE DATOS =====
async function loadClientAndInvoices(clientId) {
    console.log('📋 Cargando cliente y facturas...');

    try {
        // Cargar cliente
        const clientResponse = await fetch(`${API_CONFIG.CLIENTS}?sheet=Clientes`);
        if (!clientResponse.ok) {
            throw new Error(`Error al cargar clientes: HTTP ${clientResponse.status}`);
        }

        const clientsData = await clientResponse.json();
        const clients = Array.isArray(clientsData) ? clientsData : [];

        // ✅ FIX: Encontrar cliente y asignar a AMBAS variables
        const foundClient = clients.find(c => c.ID && c.ID.toString() === clientId.toString());

        if (!foundClient) {
            throw new Error('Cliente no encontrado con ID: ' + clientId);
        }

        // ✅ CRÍTICO: Actualizar AMBAS variables (local y global)
        currentClient = foundClient;
        window.currentClient = foundClient;  // ⭐ ESTO FALTABA

        console.log('✅ Cliente encontrado:', foundClient.Nombre);
        console.log('🔗 Variables sincronizadas - currentClient y window.currentClient actualizadas');

        // Cargar facturas
        let invoicesData = [];
        try {
            const invoicesResponse = await fetch(`${API_CONFIG.INVOICES}?sheet=Facturas`);
            if (invoicesResponse.ok) {
                invoicesData = await invoicesResponse.json();
            } else if (invoicesResponse.status !== 404) {
                console.warn('Error al cargar facturas:', invoicesResponse.status);
            }
        } catch (invoiceError) {
            console.warn('No se pudieron cargar las facturas:', invoiceError);
        }

        const allInvoices = Array.isArray(invoicesData) ? invoicesData : [];

        // Filtrar facturas del cliente actual
        const clientAllInvoices = allInvoices.filter(inv =>
            inv.ID_Cliente &&
            inv.NumeroFactura &&
            inv.ID_Cliente.toString() === clientId.toString()
        );

        // Actualizar multas por vencimiento en todas las facturas
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        clientAllInvoices.forEach(invoice => {
            if (invoice.Estado === 'Pendiente') {
                const dueDateStr = invoice.FechaVencimiento;

                if (dueDateStr && dueDateStr !== '' && dueDateStr !== 'undefined') {
                    const dueDate = parseDate(dueDateStr);

                    if (dueDate && !isNaN(dueDate)) {
                        dueDate.setHours(0, 0, 0, 0);

                        let newDaysOverdue = 0;
                        let newFines = 0;

                        if (today >= dueDate) {
                            const diffTime = today.getTime() - dueDate.getTime();
                            newDaysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                            // Solo calcular multas para facturas de arrendamiento (NO manuales)
                            const isManualInvoice = invoice.TipoFactura === 'Manual' ||
                                invoice.NumeroFactura?.startsWith('MAN-') ||
                                invoice.ConceptoManual;

                            if (!isManualInvoice) {
                                newFines = newDaysOverdue * 2000; // ₡2,000 por día
                            }
                        }

                        const baseAmount = parseAmount(invoice.MontoBase || 0);
                        const newTotal = baseAmount + newFines;

                        invoice.DiasAtraso = newDaysOverdue;
                        invoice.MontoMultas = newFines;
                        invoice.MontoTotal = newTotal;
                        // Mantener estado como Pendiente, no cambiar a Vencido
                    }
                }
            }
        });

        // Filtrar: mostrar facturas pendientes y canceladas
        clientInvoices = clientAllInvoices.filter(inv => {
            // Mostrar facturas pendientes
            if (inv.Estado === 'Pendiente') return true;

            // Mostrar facturas canceladas
            if (inv.Estado === 'Cancelado') return true;

            return false;
        });

        // ✅ Sincronizar también el array de facturas globalmente
        window.clientInvoices = clientInvoices;

        // Ordenar facturas cronológicamente por fecha de vencimiento
        clientInvoices.sort((a, b) => {
            const dateA = parseDate(a.FechaVencimiento);
            const dateB = parseDate(b.FechaVencimiento);

            // Si ambas fechas son válidas, ordenar por fecha
            if (dateA && dateB) {
                return dateA.getTime() - dateB.getTime();
            }

            // Si solo una fecha es válida, la válida va primero
            if (dateA && !dateB) return -1;
            if (!dateA && dateB) return 1;

            // Si ninguna fecha es válida, ordenar por número de semana
            const weekA = parseInt(a.SemanaNumero || 0);
            const weekB = parseInt(b.SemanaNumero || 0);
            return weekA - weekB;
        });

        console.log(`📋 Facturas cargadas: ${clientInvoices.length} (incluyendo pendientes futuras)`);

    } catch (error) {
        console.error('❌ Error en loadClientAndInvoices:', error);
        throw error;
    }
}

// ===== FUNCIONES DE RENDERIZADO =====
function renderClientDetails() {
    const detailsContainer = document.getElementById('clientDetails');

    // ✅ FIX: Usar la variable correcta
    const client = window.currentClient || currentClient;
    if (!client) {
        console.error('❌ No hay cliente disponible para renderizar detalles');
        return;
    }

    const details = [];

    if (client.numeroTelefono) {
        const formattedPhone = client.numeroTelefono.toString()
            .replace(/^(506)(\d{4})(\d{4})$/, '$1 $2 $3');
        details.push({
            label: 'Teléfono',
            value: formattedPhone
        });
    }

    if (client.Placa) {
        details.push({
            label: 'Placa',
            value: client.Placa
        });
    }

    if (client.diaPago) {
        details.push({
            label: 'Día de Pago',
            value: client.diaPago
        });
    }

    if (client.montoContrato) {
        const amount = parseFloat(client.montoContrato);
        details.push({
            label: 'Monto Semanal',
            value: `₡${amount.toLocaleString('es-CR')}`
        });
    }

    if (client.fechaContrato) {
        details.push({
            label: 'Fecha Inicio',
            value: formatDateForDisplay(client.fechaContrato)
        });
    }

    if (client.plazoContrato) {
        details.push({
            label: 'Duración',
            value: `${client.plazoContrato} semanas`
        });
    }

    const detailsHtml = details.map(detail => `
        <div class="detail-item">
            <span class="detail-label">${detail.label}</span>
            <span class="detail-value">${detail.value}</span>
        </div>
    `).join('');

    detailsContainer.innerHTML = detailsHtml;
}

function updateStatsWithoutPending(overdueInvoices, cancelledInvoices) {
    const totalFines = clientInvoices.reduce((sum, inv) => {
        const fines = parseFloat(inv.MontoMultas || 0);
        return sum + fines;
    }, 0);

    // Mostrar estadísticas sin pendientes
    document.getElementById('statPaid').textContent = cancelledInvoices.length;
    document.getElementById('statPending').textContent = '0'; // No mostramos pendientes
    document.getElementById('statOverdue').textContent = overdueInvoices.length;
    document.getElementById('statFines').textContent = `₡${totalFines.toLocaleString('es-CR')}`;

    console.log('📊 Estadísticas actualizadas (sin pendientes):', {
        canceladas: cancelledInvoices.length,
        vencidas: overdueInvoices.length,
        pendientes: 0,
        multas: totalFines
    });
}

function renderInvoicesSection(status, invoices) {
    const containerMap = {
        'overdue': 'overdueInvoices',
        'pending': 'pendingInvoices',
        'upcoming': 'upcomingInvoices',
        'paid': 'paidInvoices'
    };

    const emptyMap = {
        'overdue': 'emptyOverdue',
        'pending': 'emptyPending',
        'upcoming': 'emptyUpcoming',
        'paid': 'emptyPaid'
    };

    const countMap = {
        'overdue': 'overdueCount',
        'pending': 'pendingCount',
        'upcoming': 'upcomingCount',
        'paid': 'paidCount'
    };

    const container = document.getElementById(containerMap[status]);
    const emptyElement = document.getElementById(emptyMap[status]);
    const countElement = document.getElementById(countMap[status]);

    if (!container || !emptyElement || !countElement) {
        console.error(`No se encontraron elementos para la sección: ${status}`);
        return;
    }

    countElement.textContent = invoices.length;

    if (invoices.length === 0) {
        container.innerHTML = '';
        emptyElement.style.display = 'block';
        return;
    }

    emptyElement.style.display = 'none';

    // Ordenar las facturas de esta sección cronológicamente
    const sortedInvoices = [...invoices].sort((a, b) => {
        const dateA = parseDate(a.FechaVencimiento);
        const dateB = parseDate(b.FechaVencimiento);

        // Para facturas pagadas, ordenar por fecha de pago si existe
        if (status === 'paid') {
            const payDateA = parseDate(a.FechaPago);
            const payDateB = parseDate(b.FechaPago);

            if (payDateA && payDateB) {
                return payDateB.getTime() - payDateA.getTime(); // Más recientes primero
            }
            if (payDateA && !payDateB) return -1;
            if (!payDateA && payDateB) return 1;
        }

        // Para vencidas, pendientes y próximas, ordenar por fecha de vencimiento
        if (dateA && dateB) {
            return dateA.getTime() - dateB.getTime();
        }

        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;

        // Fallback: ordenar por número de semana
        const weekA = parseInt(a.SemanaNumero || 0);
        const weekB = parseInt(b.SemanaNumero || 0);
        return weekA - weekB;
    });

    const statusLabels = {
        'overdue': 'Pendiente',
        'pending': 'Pendiente',
        'upcoming': 'Próxima',
        'cancelled': 'Cancelado'
    };

    // Personalizar etiqueta para facturas que vencen hoy
    const getStatusLabel = (status, isDueToday) => {
        if (status === 'overdue' && isDueToday) {
            return 'Vence HOY';
        }
        if (status === 'upcoming') {
            return 'Próxima';
        }
        return statusLabels[status];
    };

    container.innerHTML = sortedInvoices.map(invoice => {
        const baseAmount = parseAmount(invoice.MontoBase || 0);
        const fines = parseAmount(invoice.MontoMultas || 0);
        // Calcular el monto total original (base + multas) para mostrar en el detalle
        const originalTotalAmount = baseAmount + fines;
        // El MontoTotal del backend ya refleja el saldo pendiente después de pagos
        const currentTotalAmount = parseAmount(invoice.MontoTotal || originalTotalAmount);
        const daysOverdue = parseInt(invoice.DiasAtraso || 0);
        const isDueToday = status === 'overdue' && daysOverdue === 0;

        let detailsHtml = `
            <div class="invoice-detail">
                <div class="invoice-detail-label">Fecha Venc.</div>
                <div class="invoice-detail-value">${formatDateForDisplay(invoice.FechaVencimiento)}</div>
            </div>
            <div class="invoice-detail">
                <div class="invoice-detail-label">Monto Base</div>
                <div class="invoice-detail-value">₡${baseAmount.toLocaleString('es-CR')}</div>
            </div>
        `;

        if (status === 'overdue') {
            if (daysOverdue === 0) {
                // Vence hoy - mostrar sin multa
                detailsHtml += `
                    <div class="invoice-detail">
                        <div class="invoice-detail-label">Estado</div>
                        <div class="invoice-detail-value" style="color: #f59e0b;">Vence HOY</div>
                    </div>
                    <div class="invoice-detail">
                        <div class="invoice-detail-label">Multas</div>
                        <div class="invoice-detail-value">₡0</div>
                    </div>
                `;
            } else {
                // Ya pasó el día de vencimiento
                detailsHtml += `
                    <div class="invoice-detail">
                        <div class="invoice-detail-label">Días Atraso</div>
                        <div class="invoice-detail-value overdue-highlight">${daysOverdue}</div>
                    </div>
                    <div class="invoice-detail">
                        <div class="invoice-detail-label">Multas</div>
                        <div class="invoice-detail-value overdue-highlight">₡${fines.toLocaleString('es-CR')}</div>
                    </div>
                `;
            }
        }

        detailsHtml += `
            <div class="invoice-detail">
                <div class="invoice-detail-label">Total</div>
                <div class="invoice-detail-value amount-highlight">₡${currentTotalAmount.toLocaleString('es-CR')}</div>
            </div>
        `;

        let actionsHtml = '';
        if (status !== 'cancelled') {
            // ===== NUEVO: USAR SISTEMA DE PAGOS DE LA FACTURA =====
            const previousPayments = parseInvoicePayments(invoice.Pagos || '');
            const totalPreviousPayments = previousPayments.reduce((sum, payment) => sum + payment.amount, 0);
            const hasPartialPayments = totalPreviousPayments > 0;

            let partialPaymentWarning = '';

            if (hasPartialPayments) {
                const remaining = originalTotalAmount - totalPreviousPayments;

                partialPaymentWarning = `
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 8px; border-radius: 6px; margin: 8px 0; font-size: 0.85rem;">
                        <strong>⚠️ Pagos parciales aplicados:</strong><br>
                        Total aplicado: ₡${totalPreviousPayments.toLocaleString('es-CR')}<br>
                        <strong>Saldo pendiente: ₡${remaining.toLocaleString('es-CR')}</strong>
                    </div>
                `;
            }

            actionsHtml = `
                ${partialPaymentWarning}
                <div class="invoice-actions">
                    <button class="btn btn-assign" onclick="openAssignInvoiceModal('${invoice.NumeroFactura}')" title="Asignar Pago">
                        💰 Asignar
                    </button>
                    <button class="btn btn-secondary" onclick="editInvoice('${invoice.NumeroFactura}')" title="Editar Factura">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-danger" onclick="deleteInvoice('${invoice.NumeroFactura}')" title="Eliminar Factura">
                        🗑️ Eliminar
                    </button>
                </div>
            `;
        } else {
            const paymentDate = invoice.FechaPago ? formatDateForDisplay(invoice.FechaPago) : 'Fecha no registrada';
            // Para facturas canceladas, buscar el pago asociado
            const associatedPayment = findAssociatedPayment(invoice.NumeroFactura);

            let paymentInfo = `✅ Cancelado: ${paymentDate}`;
            if (associatedPayment) {
                paymentInfo += `<br><span style="font-size: 0.85rem; color: #666;">Pago: ${associatedPayment.reference} (${associatedPayment.bank})</span>`;
            }

            actionsHtml = `
                <div class="payment-date">
                    ${paymentInfo}
                </div>
                <div class="invoice-actions" style="margin-top: 12px;">
                    <button class="btn btn-secondary" onclick="editInvoice('${invoice.NumeroFactura}')" title="Editar Factura">
                        ✏️ Editar
                    </button>
                    ${associatedPayment ? `
                        <button class="btn btn-unassign" onclick="showUnassignConfirmation('${associatedPayment.reference}', '${associatedPayment.bank}', '${invoice.NumeroFactura}')" title="Desasignar Pago">
                            🔄 Desasignar
                        </button>
                    ` : ''}
                    <button class="btn btn-danger" onclick="deleteInvoice('${invoice.NumeroFactura}')" title="Eliminar Factura">
                        🗑️ Eliminar
                    </button>
                </div>
            `;
        }

        return `
            <div class="invoice-card ${status}" id="invoice-${invoice.NumeroFactura}">
                <div class="invoice-header">
                    <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                        <div>
                            <div class="invoice-number">${invoice.NumeroFactura}</div>
                            <div class="invoice-week">Semana ${invoice.SemanaNumero}</div>
                        </div>
                        <div style="flex: 1; min-width: 200px;">
                            <div style="font-size: 0.9rem; color: #666; line-height: 1.4;">
                                ${invoice.SemanaDescripcion || `Semana ${invoice.SemanaNumero}`}
                            </div>
                        </div>
                    </div>
                    <span class="status-badge status-${status}">
                        ${getStatusLabel(status, isDueToday)}
                    </span>
                </div>
               
                <div class="invoice-details" style="margin-bottom: 16px;">
                    ${detailsHtml}
                </div>
               
                ${actionsHtml}
            </div>
        `;
    }).join('');
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
    // Listener para cambio de estado en formulario de edición
    const editStatusSelect = document.getElementById('editInvoiceStatus');
    if (editStatusSelect) {
        editStatusSelect.addEventListener('change', function() {
            const paymentDateGroup = document.getElementById('editPaymentDateGroup');
            const paymentDateInput = document.getElementById('editInvoicePaymentDate');

            if (this.value === 'Cancelado') {
                paymentDateGroup.style.display = 'block';
                if (!paymentDateInput.value) {
                    // Establecer fecha actual como fecha de pago por defecto
                    const today = new Date();
                    paymentDateInput.value = formatDateForInput(formatDateForStorage(today));
                }
            } else {
                paymentDateGroup.style.display = 'none';
                paymentDateInput.value = '';
            }
        });
    }

    // Listener para formulario de edición
    const editForm = document.getElementById('editInvoiceForm');
    if (editForm) {
        editForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            if (!currentEditingInvoice) {
                showToast('No hay factura seleccionada para editar', 'error');
                return;
            }

            // Obtener datos del formulario
            const concept = document.getElementById('editInvoiceConcept').value;
            const description = document.getElementById('editInvoiceDescription').value;
            const amount = document.getElementById('editInvoiceAmount').value;
            const dueDate = document.getElementById('editInvoiceDueDate').value;
            const status = document.getElementById('editInvoiceStatus').value;
            const paymentDate = document.getElementById('editInvoicePaymentDate').value;

            // Validar campos requeridos
            if (!concept || !amount || !dueDate || !status) {
                showToast('Por favor complete todos los campos requeridos', 'error');
                return;
            }

            // Validar monto
            const numAmount = parseFloat(amount);
            if (numAmount < 0) {
                showToast('El monto no puede ser negativo', 'error');
                return;
            }

            // Lógica de cambio automático de estado basado en el monto
            let finalStatus = status;
            let finalPaymentDate = paymentDate;
            
            // Obtener el monto original de la factura
            const originalAmount = parseFloat(currentEditingInvoice.MontoBase || 0);
            
            if (numAmount === 0) {
                // Si el monto es 0, automáticamente cambiar el estado a "Cancelado"
                finalStatus = 'Cancelado';
                // Si no hay fecha de pago especificada, usar la fecha actual
                if (!finalPaymentDate) {
                    finalPaymentDate = new Date().toISOString().split('T')[0];
                }
                console.log('💰 Monto 0 detectado: Estado cambiado automáticamente a "Cancelado"');
            } else if (originalAmount === 0 && numAmount > 0) {
                // Si el monto original era 0 y ahora es mayor a 0, cambiar a "Pendiente"
                finalStatus = 'Pendiente';
                finalPaymentDate = ''; // Limpiar fecha de pago ya que ahora hay saldo pendiente
                console.log('📝 Monto cambiado de 0 a mayor: Estado cambiado automáticamente a "Pendiente"');
            }

            // Validar fecha de pago si el estado es "Cancelado"
            if (finalStatus === 'Cancelado' && !finalPaymentDate) {
                showToast('Debe especificar la fecha de pago', 'error');
                return;
            }

            // Deshabilitar botón de envío
            const submitButton = editForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = '⏳ Guardando...';

            try {
                // Preparar datos para actualizar
                const formattedDueDate = formatDateForStorage(new Date(dueDate));
                const formattedPaymentDate = paymentDate ? formatDateForStorage(new Date(paymentDate)) : '';

                // Calcular multas acumuladas si la factura está vencida (basado en fecha, no estado)
                let fines = 0;
                let daysOverdue = 0;
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDateObj = new Date(formattedDueDate);
                dueDateObj.setHours(0, 0, 0, 0);
                
                if (today > dueDateObj) {
                    const diffTime = today.getTime() - dueDateObj.getTime();
                    daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    
                    // Solo aplicar multas si no es una factura manual y el estado es Pendiente
                    const isManualInvoice = currentEditingInvoice.TipoFactura === 'Manual' ||
                        currentEditingInvoice.NumeroFactura?.startsWith('MAN-') ||
                        currentEditingInvoice.ConceptoManual;
                    
                    if (!isManualInvoice && finalStatus === 'Pendiente') {
                        fines = daysOverdue * 2000; // ₡2,000 por día
                    }
                }

                const updateData = {
                    NumeroFactura: currentEditingInvoice.NumeroFactura,
                    ConceptoManual: concept,
                    DescripcionManual: description,
                    MontoBase: numAmount,
                    MontoTotal: numAmount + fines, // Monto base + multas acumuladas
                    MontoMultas: fines,
                    DiasAtraso: daysOverdue,
                    FechaVencimiento: formattedDueDate,
                    Estado: finalStatus,
                    FechaPago: safeFormatDate(finalPaymentDate),
                    TipoFactura: currentEditingInvoice.TipoFactura || 'Manual'
                };

                await updateInvoice(updateData);

                // Guardar el número de factura antes de cerrar el modal
                const invoiceNumber = currentEditingInvoice.NumeroFactura;

                // Recargar datos completos desde la API para mostrar los cambios
                console.log('🔄 Recargando datos después de actualizar factura...');
                await loadClientAndInvoices(currentClientId);
                
                // Re-renderizar la página con los datos actualizados
                if (typeof renderPage === 'function') {
                    renderPage();
                }

                // Cerrar modal
                closeEditInvoiceModal();

                // Mostrar mensaje de éxito
                showToast(`✅ Factura ${invoiceNumber} actualizada exitosamente`, 'success');

                // Restaurar botón
                submitButton.disabled = false;
                submitButton.textContent = originalText;

            } catch (error) {
                console.error('❌ Error al actualizar factura:', error);
                showToast('Error al actualizar la factura: ' + error.message, 'error');

                // Restaurar botón
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }

    // Event listener para el formulario de factura manual
    const form = document.getElementById('manualInvoiceForm');
    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            // Obtener datos del formulario
            const concept = document.getElementById('invoiceConcept').value;
            const description = document.getElementById('invoiceDescription').value;
            const amount = document.getElementById('invoiceAmount').value;
            const dueDate = document.getElementById('invoiceDueDate').value;

            // Validar campos requeridos
            if (!concept || !amount || !dueDate) {
                showToast('Por favor complete todos los campos requeridos', 'error');
                return;
            }

            // Validar monto
            const numAmount = parseFloat(amount);
            if (numAmount < 0) {
                showToast('El monto no puede ser negativo', 'error');
                return;
            }

            // Validar fecha (permitir cualquier fecha)
            const selectedDate = new Date(dueDate);

            // Deshabilitar botón de envío
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = '⏳ Creando...';

            try {
                // Convertir fecha al formato correcto para almacenamiento
                const formattedDueDate = formatDateForStorage(selectedDate);

                await createManualInvoice({
                    concept: concept,
                    description: description,
                    amount: amount,
                    dueDate: formattedDueDate
                });

                // Cerrar modal
                closeManualInvoiceModal();

                // Restaurar botón
                submitButton.disabled = false;
                submitButton.textContent = originalText;

            } catch (error) {
                console.error('❌ Error al crear factura:', error);
                showToast('Error al crear la factura: ' + error.message, 'error');

                // Restaurar botón
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }
});

// ===== FUNCIONES DE PARSEO DE PAGOS =====
function parseInvoicePayments(paymentsString) {
    if (!paymentsString || paymentsString.trim() === '') {
        return [];
    }
    
    try {
        const payments = paymentsString.split(',').map(payment => {
            const parts = payment.trim().split(':');
            if (parts.length >= 2) {
                const reference = parts[0];
                const amount = parseFloat(parts[1]) || 0;
                const date = parts[2] || '';
                return { reference, amount, date };
            }
            return null;
        }).filter(payment => payment !== null);
        
        return payments;
    } catch (error) {
        console.error('Error parseando pagos de factura:', error);
        return [];
    }
}

// ===== EXPONER FUNCIONES AL SCOPE GLOBAL =====
window.openManualInvoiceModal = openManualInvoiceModal;
window.closeManualInvoiceModal = closeManualInvoiceModal;
window.createManualInvoice = createManualInvoice;
window.editInvoice = editInvoice;
window.closeEditInvoiceModal = closeEditInvoiceModal;
window.updateInvoice = updateInvoice;
window.deleteInvoice = deleteInvoice;
window.closeDeleteInvoiceModal = closeDeleteInvoiceModal;
window.confirmDeleteInvoice = confirmDeleteInvoice;

window.loadClientAndInvoices = loadClientAndInvoices;
window.renderClientDetails = renderClientDetails;
window.updateStatsWithoutPending = updateStatsWithoutPending;
window.renderInvoicesSection = renderInvoicesSection;
window.parseInvoicePayments = parseInvoicePayments;

console.log('✅ invoice-crud.js cargado - Sistema CRUD de facturas');