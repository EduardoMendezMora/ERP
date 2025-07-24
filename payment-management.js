// ===== VARIABLES PARA DISTRIBUCIÓN DE PAGOS =====
let currentPaymentForDistribution = null;
let paymentDistributionData = [];

// ===== CONFIGURACIÓN API =====
const API_CONFIG = {
    INVOICES: 'https://sheetdb.io/api/v1/qu62bagiwlgqy',
    PAYMENTS: 'https://sheetdb.io/api/v1/a7oekivxzreg7'
};

// ===== FUNCIÓN PRINCIPAL MEJORADA PARA APLICAR PAGOS =====
async function assignPaymentToInvoice(paymentReference, bankSource, invoiceNumber) {
    try {
        console.log(`🎯 Iniciando asignación: Pago ${paymentReference} (${bankSource}) → Factura ${invoiceNumber}`);

        // Encontrar la factura y el pago
        const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceNumber);
        const payment = unassignedPayments.find(p => p.Referencia === paymentReference && p.BankSource === bankSource);

        if (!invoice || !payment) {
            throw new Error('Factura o pago no encontrado');
        }

        // Calcular el monto disponible del pago (descontando asignaciones previas)
        const paymentAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
        const previousAssignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
        const previouslyAssignedAmount = previousAssignments.reduce((sum, assignment) => sum + assignment.amount, 0);
        const availableAmount = paymentAmount - previouslyAssignedAmount;

        console.log(`💰 Monto total del pago: ₡${paymentAmount.toLocaleString('es-CR')}`);
        console.log(`💸 Previamente asignado: ₡${previouslyAssignedAmount.toLocaleString('es-CR')}`);
        console.log(`💵 Disponible para asignar: ₡${availableAmount.toLocaleString('es-CR')}`);

        if (availableAmount <= 0) {
            throw new Error('Este pago ya está completamente asignado a otras facturas');
        }

        // Verificar si hay facturas vencidas del mismo cliente que podrían pagarse
        const overdueInvoices = clientInvoices.filter(inv =>
            inv.Estado === 'Vencido' &&
            inv.NumeroFactura !== invoiceNumber
        );

        // Si hay múltiples facturas vencidas y el pago puede cubrir más de una, mostrar modal de distribución
        if (overdueInvoices.length > 0) {
            const eligibleInvoices = [invoice, ...overdueInvoices].filter(inv => {
                const baseAmount = parseFloat(inv.MontoBase || 0);
                const finesUntilPayment = calculateFinesUntilDate(inv, payment.Fecha);
                const totalOwed = baseAmount + finesUntilPayment;
                return totalOwed <= availableAmount * 2; // Considerar facturas que se pueden pagar con el doble del disponible
            });

            if (eligibleInvoices.length > 1) {
                console.log(`📋 Múltiples facturas elegibles (${eligibleInvoices.length}), mostrando modal de distribución`);
                return await showPaymentDistributionModal(payment, eligibleInvoices, availableAmount);
            }
        }

        // Aplicar pago a una sola factura
        return await applySinglePayment(payment, invoice, availableAmount);

    } catch (error) {
        console.error('❌ Error en assignPaymentToInvoice:', error);
        showToast('Error al asignar el pago: ' + error.message, 'error');
        throw error;
    }
}

// ===== FUNCIÓN PARA APLICAR PAGO A UNA SOLA FACTURA =====
async function applySinglePayment(payment, invoice, availableAmount) {
    try {
        const baseAmount = parseFloat(invoice.MontoBase || 0);
        const paymentDate = payment.Fecha;
        const finesUntilPayment = calculateFinesUntilDate(invoice, paymentDate);
        const totalOwedUntilPayment = baseAmount + finesUntilPayment;

        console.log(`📊 Análisis de pago único:`);
        console.log(`   - Monto base: ₡${baseAmount.toLocaleString('es-CR')}`);
        console.log(`   - Multas hasta pago: ₡${finesUntilPayment.toLocaleString('es-CR')}`);
        console.log(`   - Total adeudado: ₡${totalOwedUntilPayment.toLocaleString('es-CR')}`);
        console.log(`   - Disponible: ₡${availableAmount.toLocaleString('es-CR')}`);

        let amountToApply, newStatus, newBalance = 0;

        if (availableAmount >= totalOwedUntilPayment) {
            // Pago completo
            amountToApply = totalOwedUntilPayment;
            newStatus = 'Pagado';
            console.log('✅ Pago completo - Factura será marcada como PAGADA');
        } else {
            // Pago parcial
            amountToApply = availableAmount;
            newStatus = invoice.Estado; // Mantener estado actual (Pendiente/Vencido)
            newBalance = totalOwedUntilPayment - amountToApply;
            console.log(`⚠️ Pago parcial - Saldo restante: ₡${newBalance.toLocaleString('es-CR')}`);
        }

        // Actualizar el pago en la API bancaria
        const newAssignments = await updatePaymentAssignments(
            payment,
            [{ invoiceNumber: invoice.NumeroFactura, amount: amountToApply }]
        );

        // Actualizar la factura
        const updateData = {
            Estado: newStatus,
            MontoMultas: finesUntilPayment,
            MontoTotal: newBalance > 0 ? newBalance : totalOwedUntilPayment
        };

        if (newStatus === 'Pagado') {
            updateData.FechaPago = formatDateForStorage(new Date(paymentDate));
        }

        await updateInvoiceStatus(invoice.NumeroFactura, updateData);

        // Actualizar datos locales
        Object.assign(invoice, updateData);

        // Actualizar el pago localmente
        payment.FacturasAsignadas = formatAssignedInvoices(newAssignments);

        // Si el pago está completamente asignado, removerlo de no asignados
        const totalAssigned = newAssignments.reduce((sum, a) => sum + a.amount, 0);
        const totalPayment = parsePaymentAmount(payment.Créditos, payment.BankSource);

        if (Math.abs(totalAssigned - totalPayment) < 0.01) {
            const paymentIndex = unassignedPayments.findIndex(p =>
                p.Referencia === payment.Referencia && p.BankSource === payment.BankSource
            );
            if (paymentIndex > -1) {
                unassignedPayments.splice(paymentIndex, 1);
            }
        }

        // Re-cargar y renderizar
        await reloadDataAndRender();

        // Mostrar mensaje
        if (newStatus === 'Pagado') {
            showToast(`✅ Factura ${invoice.NumeroFactura} PAGADA completamente con ${payment.Referencia}`, 'success');
        } else {
            showToast(`⚠️ Pago parcial aplicado a ${invoice.NumeroFactura}. Saldo: ₡${newBalance.toLocaleString('es-CR')}`, 'warning');
        }

        return true;

    } catch (error) {
        console.error('❌ Error en applySinglePayment:', error);
        throw error;
    }
}

// ===== MODAL DE DISTRIBUCIÓN DE PAGOS =====
async function showPaymentDistributionModal(payment, eligibleInvoices, availableAmount) {
    currentPaymentForDistribution = payment;

    // Preparar datos de distribución
    paymentDistributionData = eligibleInvoices.map(invoice => {
        const baseAmount = parseFloat(invoice.MontoBase || 0);
        const finesUntilPayment = calculateFinesUntilDate(invoice, payment.Fecha);
        const totalOwed = baseAmount + finesUntilPayment;

        return {
            invoice: invoice,
            baseAmount: baseAmount,
            fines: finesUntilPayment,
            totalOwed: totalOwed,
            assignedAmount: 0, // Usuario asignará manualmente
            remainingBalance: totalOwed
        };
    });

    // Crear modal si no existe
    if (!document.getElementById('paymentDistributionModal')) {
        createPaymentDistributionModal();
    }

    renderPaymentDistributionModal(payment, availableAmount);
    document.getElementById('paymentDistributionModal').classList.add('show');

    return new Promise((resolve, reject) => {
        window.resolveDistribution = resolve;
        window.rejectDistribution = reject;
    });
}

function createPaymentDistributionModal() {
    const modalHTML = `
        <div class="modal-overlay" id="paymentDistributionModal" onclick="closePaymentDistributionModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>💰 Distribución de Pago Múltiple</h3>
                    <button class="modal-close" onclick="closePaymentDistributionModal()">✕</button>
                </div>
               
                <div class="modal-body">
                    <div id="paymentDistributionInfo"></div>
                    <div id="invoicesDistributionList"></div>
                    <div id="distributionSummary"></div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closePaymentDistributionModal()">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" id="confirmDistributionBtn" onclick="confirmPaymentDistribution()">
                            ✅ Aplicar Distribución
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function renderPaymentDistributionModal(payment, availableAmount) {
    const paymentAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);

    // Información del pago
    document.getElementById('paymentDistributionInfo').innerHTML = `
        <div style="background: #e6f3ff; border: 2px solid #007aff; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #007aff;">💳 ${payment.Referencia} - ${getBankDisplayName(payment.BankSource)}</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 0.9rem;">
                <div><strong>Monto Total:</strong><br>₡${paymentAmount.toLocaleString('es-CR')}</div>
                <div><strong>Disponible:</strong><br>₡${availableAmount.toLocaleString('es-CR')}</div>
                <div><strong>Fecha:</strong><br>${formatDateForDisplay(payment.Fecha)}</div>
            </div>
        </div>
        
        <div style="margin-bottom: 16px;">
            <h4 style="color: #1d1d1f; margin-bottom: 8px;">📋 Distribuya el pago entre las siguientes facturas:</h4>
            <p style="color: #666; font-size: 0.9rem; margin: 0;">Ingrese el monto a aplicar a cada factura. El sistema calculará automáticamente el estado final.</p>
        </div>
    `;

    // Lista de facturas para distribución
    const distributionList = document.getElementById('invoicesDistributionList');
    distributionList.innerHTML = paymentDistributionData.map((item, index) => {
        const invoice = item.invoice;
        const statusClass = invoice.Estado.toLowerCase();

        return `
            <div class="distribution-item" id="distribution-${index}">
                <div class="distribution-header">
                    <div class="distribution-info">
                        <div class="invoice-title">${invoice.NumeroFactura}</div>
                        <div class="invoice-details-text">
                            ${invoice.ConceptoManual || invoice.SemanaDescripcion || 'N/A'}<br>
                            <span class="status-badge status-${statusClass}">${invoice.Estado}</span>
                            Base: ₡${item.baseAmount.toLocaleString('es-CR')} + 
                            Multas: ₡${item.fines.toLocaleString('es-CR')} = 
                            <strong>₡${item.totalOwed.toLocaleString('es-CR')}</strong>
                        </div>
                    </div>
                    <div class="amount-input-container">
                        <span class="currency-label">₡</span>
                        <input type="number" 
                               class="amount-input" 
                               id="amount-${index}"
                               min="0" 
                               max="${Math.min(availableAmount, item.totalOwed)}"
                               step="0.01"
                               placeholder="0.00"
                               onchange="updateDistributionCalculation(${index})"
                               oninput="updateDistributionCalculation(${index})">
                    </div>
                </div>
                <div id="result-${index}" style="margin-top: 8px; font-size: 0.85rem; color: #666;"></div>
            </div>
        `;
    }).join('');

    // Resumen inicial
    updateDistributionSummary(availableAmount);
}

function updateDistributionCalculation(index) {
    const input = document.getElementById(`amount-${index}`);
    const assignedAmount = parseFloat(input.value) || 0;
    const item = paymentDistributionData[index];

    // Actualizar datos
    item.assignedAmount = assignedAmount;
    item.remainingBalance = Math.max(0, item.totalOwed - assignedAmount);

    // Determinar nuevo estado
    let newStatus = item.invoice.Estado;
    let resultText = '';
    let resultColor = '#666';

    if (assignedAmount === 0) {
        resultText = 'No se aplicará pago a esta factura';
    } else if (assignedAmount >= item.totalOwed) {
        newStatus = 'Pagado';
        resultText = `✅ Factura será marcada como PAGADA`;
        resultColor = '#34c759';

        if (assignedAmount > item.totalOwed) {
            const excess = assignedAmount - item.totalOwed;
            resultText += ` (Exceso: ₡${excess.toLocaleString('es-CR')})`;
            resultColor = '#ff9500';
        }
    } else {
        resultText = `⚠️ Pago parcial - Saldo restante: ₡${item.remainingBalance.toLocaleString('es-CR')}`;
        resultColor = '#ff9500';
    }

    // Mostrar resultado
    const resultDiv = document.getElementById(`result-${index}`);
    resultDiv.innerHTML = resultText;
    resultDiv.style.color = resultColor;

    // Actualizar resumen
    updateDistributionSummary();
}

function updateDistributionSummary() {
    const availableAmount = parsePaymentAmount(currentPaymentForDistribution.Créditos, currentPaymentForDistribution.BankSource);
    const previousAssignments = parseAssignedInvoices(currentPaymentForDistribution.FacturasAsignadas || '');
    const previouslyAssignedAmount = previousAssignments.reduce((sum, assignment) => sum + assignment.amount, 0);
    const actualAvailable = availableAmount - previouslyAssignedAmount;

    const totalAssigned = paymentDistributionData.reduce((sum, item) => sum + item.assignedAmount, 0);
    const remaining = actualAvailable - totalAssigned;

    let summaryHTML = `
        <div class="total-summary">
            <div class="summary-row">
                <span>Monto Disponible:</span>
                <span>₡${actualAvailable.toLocaleString('es-CR')}</span>
            </div>
            <div class="summary-row">
                <span>Total Asignado:</span>
                <span>₡${totalAssigned.toLocaleString('es-CR')}</span>
            </div>
            <div class="summary-row">
                <span>Restante:</span>
                <span style="color: ${remaining >= 0 ? '#34c759' : '#ff3b30'}">₡${remaining.toLocaleString('es-CR')}</span>
            </div>
        </div>
    `;

    // Mensajes de validación
    if (remaining < 0) {
        summaryHTML += `
            <div class="error-message">
                ❌ <strong>Error:</strong> Ha asignado más dinero del disponible (₡${Math.abs(remaining).toLocaleString('es-CR')} de exceso)
            </div>
        `;
    } else if (remaining > 0 && totalAssigned > 0) {
        summaryHTML += `
            <div class="warning-message">
                ⚠️ <strong>Nota:</strong> Quedarán ₡${remaining.toLocaleString('es-CR')} disponibles para futuras asignaciones
            </div>
        `;
    }

    document.getElementById('distributionSummary').innerHTML = summaryHTML;

    // Habilitar/deshabilitar botón de confirmar
    const confirmBtn = document.getElementById('confirmDistributionBtn');
    const hasAssignments = totalAssigned > 0;
    const isValid = remaining >= 0;

    confirmBtn.disabled = !hasAssignments || !isValid;
}

async function confirmPaymentDistribution() {
    try {
        const confirmBtn = document.getElementById('confirmDistributionBtn');
        confirmBtn.disabled = true;
        confirmBtn.textContent = '⏳ Aplicando...';

        // Filtrar solo asignaciones con monto > 0
        const validAssignments = paymentDistributionData.filter(item => item.assignedAmount > 0);

        if (validAssignments.length === 0) {
            throw new Error('Debe asignar al menos un monto a una factura');
        }

        console.log(`🎯 Aplicando distribución a ${validAssignments.length} facturas`);

        // Preparar asignaciones para el pago
        const assignments = validAssignments.map(item => ({
            invoiceNumber: item.invoice.NumeroFactura,
            amount: item.assignedAmount
        }));

        // Actualizar el pago con las asignaciones
        const newAssignments = await updatePaymentAssignments(currentPaymentForDistribution, assignments);

        // Actualizar cada factura
        for (const item of validAssignments) {
            const invoice = item.invoice;
            const amountApplied = item.assignedAmount;
            const totalOwed = item.totalOwed;

            let newStatus = invoice.Estado;
            let newBalance = totalOwed - amountApplied;

            if (amountApplied >= totalOwed) {
                newStatus = 'Pagado';
                newBalance = 0;
            }

            const updateData = {
                Estado: newStatus,
                MontoMultas: item.fines,
                MontoTotal: newBalance > 0 ? newBalance : totalOwed
            };

            if (newStatus === 'Pagado') {
                updateData.FechaPago = formatDateForStorage(new Date(currentPaymentForDistribution.Fecha));
            }

            await updateInvoiceStatus(invoice.NumeroFactura, updateData);

            // Actualizar localmente
            Object.assign(invoice, updateData);
        }

        // Actualizar el pago localmente
        currentPaymentForDistribution.FacturasAsignadas = formatAssignedInvoices(newAssignments);

        // Verificar si el pago está completamente asignado
        const totalAssigned = newAssignments.reduce((sum, a) => sum + a.amount, 0);
        const totalPayment = parsePaymentAmount(currentPaymentForDistribution.Créditos, currentPaymentForDistribution.BankSource);

        if (Math.abs(totalAssigned - totalPayment) < 0.01) {
            const paymentIndex = unassignedPayments.findIndex(p =>
                p.Referencia === currentPaymentForDistribution.Referencia &&
                p.BankSource === currentPaymentForDistribution.BankSource
            );
            if (paymentIndex > -1) {
                unassignedPayments.splice(paymentIndex, 1);
            }
        }

        // Cerrar modal y recargar datos
        closePaymentDistributionModal();
        await reloadDataAndRender();

        // Mensaje de éxito
        const paidCount = validAssignments.filter(item => item.assignedAmount >= item.totalOwed).length;
        const partialCount = validAssignments.length - paidCount;

        let message = `✅ Pago ${currentPaymentForDistribution.Referencia} distribuido exitosamente`;
        if (paidCount > 0) message += ` - ${paidCount} factura(s) PAGADA(s)`;
        if (partialCount > 0) message += ` - ${partialCount} pago(s) parcial(es)`;

        showToast(message, 'success');

        if (window.resolveDistribution) {
            window.resolveDistribution(true);
        }

    } catch (error) {
        console.error('❌ Error en confirmPaymentDistribution:', error);
        showToast('Error al aplicar distribución: ' + error.message, 'error');

        // Restaurar botón
        const confirmBtn = document.getElementById('confirmDistributionBtn');
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✅ Aplicar Distribución';

        if (window.rejectDistribution) {
            window.rejectDistribution(error);
        }
    }
}

function closePaymentDistributionModal() {
    const modal = document.getElementById('paymentDistributionModal');
    if (modal) {
        modal.classList.remove('show');
        currentPaymentForDistribution = null;
        paymentDistributionData = [];
    }
}

// ===== FUNCIÓN CORREGIDA PARA ACTUALIZAR ASIGNACIONES DE PAGOS =====
async function updatePaymentAssignments(payment, newAssignments) {
    try {
        console.log('🔄 Actualizando asignaciones de pago:', payment.Referencia);

        // Obtener asignaciones previas
        const previousAssignments = parseAssignedInvoices(payment.FacturasAsignadas || '');

        // Combinar asignaciones (las nuevas reemplazan las existentes para las mismas facturas)
        const combinedAssignments = [...previousAssignments];

        newAssignments.forEach(newAssignment => {
            const existingIndex = combinedAssignments.findIndex(a => a.invoiceNumber === newAssignment.invoiceNumber);
            if (existingIndex > -1) {
                // Actualizar asignación existente
                combinedAssignments[existingIndex].amount += newAssignment.amount;
            } else {
                // Agregar nueva asignación
                combinedAssignments.push(newAssignment);
            }
        });

        // Formatear para la base de datos
        const formattedAssignments = formatAssignedInvoices(combinedAssignments);

        console.log('📝 Asignaciones formateadas:', formattedAssignments);

        // ✅ MÉTODO CORRECTO SEGÚN EL CÓDIGO HTML
        const updateData = {
            FacturasAsignadas: formattedAssignments,
            FechaAsignacion: formatDateForStorage(new Date())
        };

        const response = await fetch(`${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(payment.Referencia)}?sheet=${payment.BankSource}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(updateData).toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        console.log('✅ Actualización exitosa');
        return combinedAssignments;

    } catch (error) {
        console.error('❌ Error al actualizar asignaciones:', error);
        throw error;
    }
}

// ===== FUNCIONES DE PARSEO DE ASIGNACIONES =====
function parseAssignedInvoices(assignedString) {
    if (!assignedString || assignedString.trim() === '') return [];

    try {
        // Formato esperado: "FAC-001:15000;FAC-002:25000"
        return assignedString.split(';').map(assignment => {
            const [invoiceNumber, amount] = assignment.split(':');
            return {
                invoiceNumber: invoiceNumber.trim(),
                amount: parseFloat(amount) || 0
            };
        }).filter(assignment => assignment.invoiceNumber && assignment.amount > 0);
    } catch (error) {
        console.error('Error al parsear asignaciones:', error);
        return [];
    }
}

function formatAssignedInvoices(assignments) {
    if (!assignments || assignments.length === 0) return '';

    // Formato: "FAC-001:15000;FAC-002:25000"
    return assignments
        .filter(assignment => assignment.invoiceNumber && assignment.amount > 0)
        .map(assignment => `${assignment.invoiceNumber}:${assignment.amount}`)
        .join(';');
}

// ===== FUNCIÓN PARA DESASIGNAR PAGOS =====
async function unassignPaymentFromInvoice(paymentReference, bankSource, invoiceNumber) {
    try {
        console.log(`🔄 Desasignando pago ${paymentReference} (${bankSource}) de factura ${invoiceNumber}`);

        // Encontrar el pago
        const payment = assignedPayments.find(p =>
            p.Referencia === paymentReference && p.BankSource === bankSource
        );

        if (!payment) {
            throw new Error('Pago no encontrado en asignados');
        }

        // Parsear asignaciones actuales
        const currentAssignments = parseAssignedInvoices(payment.FacturasAsignadas || '');

        // Remover la asignación específica
        const updatedAssignments = currentAssignments.filter(a => a.invoiceNumber !== invoiceNumber);

        // ✅ ACTUALIZAR USANDO EL MÉTODO CORRECTO
        const updateData = {
            FacturasAsignadas: formatAssignedInvoices(updatedAssignments),
            FechaAsignacion: updatedAssignments.length > 0 ? formatDateForStorage(new Date()) : ''
        };

        const response = await fetch(`${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(paymentReference)}?sheet=${bankSource}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(updateData).toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Actualizar la factura - recalcular estado
        const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceNumber);
        if (invoice) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const dueDateStr = invoice.FechaVencimiento;
            let newStatus = 'Pendiente';
            let currentFines = 0;

            if (dueDateStr) {
                const dueDate = parseDate(dueDateStr);
                if (dueDate) {
                    dueDate.setHours(0, 0, 0, 0);

                    if (today > dueDate) {
                        newStatus = 'Vencido';
                        currentFines = calculateFinesUntilDate(invoice, formatDateForStorage(today));
                    }
                }
            }

            const baseAmount = parseFloat(invoice.MontoBase || 0);
            const newTotal = baseAmount + currentFines;

            // Actualizar en la API
            await updateInvoiceStatus(invoiceNumber, {
                Estado: newStatus,
                FechaPago: '',
                MontoMultas: currentFines,
                MontoTotal: newTotal
            });

            // Actualizar localmente
            invoice.Estado = newStatus;
            invoice.FechaPago = '';
            invoice.MontoMultas = currentFines;
            invoice.MontoTotal = newTotal;
        }

        // Recargar y renderizar
        await reloadDataAndRender();

        showToast(`✅ Pago ${paymentReference} desasignado de ${invoiceNumber}`, 'success');

    } catch (error) {
        console.error('❌ Error al desasignar pago:', error);
        showToast('Error al desasignar el pago: ' + error.message, 'error');
        throw error;
    }
}

// ===== FUNCIÓN AUXILIAR PARA RECARGAR DATOS =====
async function reloadDataAndRender() {
    try {
        // Recargar pagos no asignados y asignados
        await loadUnassignedPayments(currentClientId);
        await loadAssignedPayments(currentClientId);

        // Re-renderizar la página
        if (typeof renderPage === 'function') {
            renderPage();
        }
    } catch (error) {
        console.error('Error al recargar datos:', error);
    }
}

// ===== FUNCIONES DE CARGA DE PAGOS =====
async function loadUnassignedPayments(clientId) {
    console.log('🎯 Cargando pagos no asignados...');

    try {
        unassignedPayments = [];
        window.unassignedPayments = []; // Sincronizar
        const sheets = ['BAC', 'BN', 'HuberBN'];

        for (const sheet of sheets) {
            try {
                console.log(`📋 Consultando pagos en ${sheet}...`);
                const url = `${API_CONFIG.PAYMENTS}?sheet=${sheet}`;
                const response = await fetch(url);

                if (response.ok) {
                    const paymentsData = await response.json();
                    const payments = Array.isArray(paymentsData) ? paymentsData : [];

                    // Filtrar pagos relacionados al cliente
                    const clientRelatedPayments = payments.filter(payment => {
                        // Caso 1: ID_Cliente coincide directamente
                        if (payment.ID_Cliente && payment.ID_Cliente.toString() === clientId.toString()) {
                            payment._matchReason = 'ID_Cliente directo';
                            return true;
                        }

                        // Caso 2: ID_Cliente está en Observaciones
                        if (payment.Observaciones &&
                            isClientIdInObservations(payment.Observaciones, clientId)) {
                            payment._matchReason = 'ID en Observaciones';
                            return true;
                        }

                        return false;
                    });

                    // Filtrar solo los que NO están completamente asignados
                    const unassignedFromSheet = clientRelatedPayments.filter(payment => {
                        const paymentAmount = parsePaymentAmount(payment.Créditos, sheet);
                        const assignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
                        const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);

                        // Si no tiene asignaciones O tiene monto disponible
                        return assignments.length === 0 || (paymentAmount - assignedAmount) > 0.01;
                    });

                    // Agregar información de la fuente (banco)
                    const paymentsWithSource = unassignedFromSheet.map(payment => ({
                        ...payment,
                        BankSource: sheet
                    }));

                    unassignedPayments.push(...paymentsWithSource);
                    console.log(`✅ ${sheet}: ${unassignedFromSheet.length} pagos no asignados`);

                } else if (response.status !== 404) {
                    console.warn(`Error al cargar pagos de ${sheet}:`, response.status);
                }

            } catch (error) {
                console.warn(`No se pudieron cargar pagos de ${sheet}:`, error);
            }
        }

        // Ordenar pagos por fecha (más recientes primero)
        unassignedPayments.sort((a, b) => {
            const dateA = parseDate(a.Fecha);
            const dateB = parseDate(b.Fecha);

            if (dateA && dateB) {
                return dateB.getTime() - dateA.getTime();
            }
            return 0;
        });

        // Sincronizar globalmente
        window.unassignedPayments = unassignedPayments;

        console.log(`✅ Total pagos no asignados: ${unassignedPayments.length}`);

    } catch (error) {
        console.error('Error en loadUnassignedPayments:', error);
        throw error;
    }
}

async function loadAssignedPayments(clientId) {
    console.log('📋 Cargando pagos asignados...');

    try {
        assignedPayments = [];
        window.assignedPayments = []; // Sincronizar
        const sheets = ['BAC', 'BN', 'HuberBN'];

        for (const sheet of sheets) {
            try {
                const url = `${API_CONFIG.PAYMENTS}/search?ID_Cliente=${clientId}&sheet=${sheet}`;
                const response = await fetch(url);

                if (response.ok) {
                    const paymentsData = await response.json();
                    const payments = Array.isArray(paymentsData) ? paymentsData : [];

                    // Filtrar pagos que SÍ tienen asignaciones
                    const assigned = payments.filter(payment =>
                        payment.FacturasAsignadas && payment.FacturasAsignadas.trim() !== ''
                    );

                    // Agregar información de la fuente y facturas relacionadas
                    const paymentsWithInfo = assigned.map(payment => {
                        const assignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
                        const relatedInvoices = assignments.map(assignment =>
                            clientInvoices.find(inv => inv.NumeroFactura === assignment.invoiceNumber)
                        ).filter(inv => inv);

                        return {
                            ...payment,
                            BankSource: sheet,
                            Assignments: assignments,
                            RelatedInvoices: relatedInvoices
                        };
                    });

                    assignedPayments.push(...paymentsWithInfo);
                    console.log(`${sheet}: ${assigned.length} pagos asignados`);

                } else if (response.status !== 404) {
                    console.warn(`Error al cargar pagos asignados de ${sheet}:`, response.status);
                }

            } catch (error) {
                console.warn(`No se pudieron cargar pagos asignados de ${sheet}:`, error);
            }
        }

        // Ordenar por fecha del comprobante bancario (más recientes primero)
        assignedPayments.sort((a, b) => {
            const dateA = parseDate(a.Fecha);
            const dateB = parseDate(b.Fecha);

            if (dateA && dateB) {
                return dateB.getTime() - dateA.getTime();
            }
            return 0;
        });

        // Sincronizar globalmente
        window.assignedPayments = assignedPayments;

        console.log(`✅ Total pagos asignados: ${assignedPayments.length}`);

    } catch (error) {
        console.error('Error en loadAssignedPayments:', error);
        throw error;
    }
}

// ===== FUNCIONES DE ACTUALIZACIÓN DE FACTURAS (CORREGIDAS) =====
async function updateInvoiceStatus(invoiceNumber, updateData) {
    try {
        // ✅ MÉTODO CORRECTO SEGÚN EL CÓDIGO HTML - VERSIÓN 1 (con query params)
        const params = new URLSearchParams(updateData);
        params.append('sheet', 'Facturas');

        const response = await fetch(`${API_CONFIG.INVOICES}/NumeroFactura/${invoiceNumber}?${params.toString()}`, {
            method: 'PATCH'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return true;

    } catch (error) {
        console.error('Error al actualizar estado de factura:', error);
        throw error;
    }
}

// ===== FUNCIONES DE CONFIRMACIÓN =====
function showUnassignConfirmation(paymentReference, bankSource, invoiceNumber) {
    const confirmed = confirm(`¿Está seguro de que desea desasignar el pago ${paymentReference} de la factura ${invoiceNumber}?\n\nEsto actualizará el estado de la factura según las multas actuales.`);

    if (confirmed) {
        unassignPaymentFromInvoice(paymentReference, bankSource, invoiceNumber);
    }
}

// ===== FUNCIONES AUXILIARES =====

// Función para calcular multas hasta una fecha específica
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

// Función para parsear montos según el banco
function parsePaymentAmount(paymentAmount, bankSource) {
    if (!paymentAmount) return 0;

    let cleanAmount = paymentAmount.toString().trim();

    if (bankSource === 'BAC') {
        // BAC usa formato europeo: 105.000.00 (puntos como separadores de miles)
        // Convertir puntos a comas para thousands separator
        // Solo si hay más de un punto, el último es decimal
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

// Función para detectar ID de cliente en observaciones
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
            console.log(`   Patrón: ${pattern.toString()}`);
            console.log(`   Texto: "${obsText}"`);
            return true;
        }
    }

    return false;
}

// Funciones de fecha
function parseDate(dateString) {
    if (!dateString) return null;

    try {
        // Formato DD/MM/YYYY (desde Google Sheets)
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // JS usa 0-11
                const year = parseInt(parts[2], 10);

                if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020 && year <= 2050) {
                    return new Date(year, month, day);
                }
            }
        }

        // Formato YYYY-MM-DD
        if (dateString.includes('-')) {
            const parts = dateString.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);

                if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020 && year <= 2050) {
                    return new Date(year, month, day);
                }
            }
        }

        console.warn('Formato de fecha no reconocido:', dateString);
        return null;

    } catch (error) {
        console.error('Error al parsear fecha:', dateString, error);
        return null;
    }
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

function getBankDisplayName(bankSource) {
    switch (bankSource) {
        case 'BAC': return 'BAC Credomatic';
        case 'BN': return 'Banco Nacional de Costa Rica';
        case 'HuberBN': return 'Huber - Banco Nacional';
        default: return bankSource;
    }
}

// ===== EXPONER FUNCIONES AL SCOPE GLOBAL =====
window.assignPaymentToInvoice = assignPaymentToInvoice;
window.unassignPaymentFromInvoice = unassignPaymentFromInvoice;
window.showUnassignConfirmation = showUnassignConfirmation;
window.loadUnassignedPayments = loadUnassignedPayments;
window.loadAssignedPayments = loadAssignedPayments;
window.updateInvoiceStatus = updateInvoiceStatus;

// Funciones de distribución
window.showPaymentDistributionModal = showPaymentDistributionModal;
window.closePaymentDistributionModal = closePaymentDistributionModal;
window.confirmPaymentDistribution = confirmPaymentDistribution;
window.updateDistributionCalculation = updateDistributionCalculation;

// Funciones de parseo
window.parseAssignedInvoices = parseAssignedInvoices;
window.formatAssignedInvoices = formatAssignedInvoices;

// Funciones auxiliares
window.updatePaymentAssignments = updatePaymentAssignments;
window.calculateFinesUntilDate = calculateFinesUntilDate;
window.parsePaymentAmount = parsePaymentAmount;
window.isClientIdInObservations = isClientIdInObservations;
window.parseDate = parseDate;
window.formatDateForDisplay = formatDateForDisplay;
window.formatDateForStorage = formatDateForStorage;
window.getBankDisplayName = getBankDisplayName;

console.log('✅ payment-management.js ACTUALIZADO CON MÉTODOS SHEETDB CORRECTOS');
console.log('🔧 CAMBIOS PRINCIPALES:');
console.log('  ✅ updatePaymentAssignments() - Usa método correcto con form-urlencoded');
console.log('  ✅ updateInvoiceStatus() - Usa método correcto con query params');
console.log('  ✅ unassignPaymentFromInvoice() - Actualizado con método correcto');
console.log('  ✅ API_CONFIG centralizado para fácil mantenimiento');
console.log('');
console.log('📡 MÉTODOS SHEETDB IMPLEMENTADOS:');
console.log('  - PATCH /ColumnName/Value?sheet=SheetName con form-urlencoded body');
console.log('  - PATCH /ColumnName/Value?queryParams con query parameters');
console.log('');
console.log('🎯 LISTO PARA USAR EN PRODUCCIÓN');