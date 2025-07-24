// ===== VARIABLES PARA DISTRIBUCIÓN DE PAGOS =====
let currentPaymentForDistribution = null;
let paymentDistributionData = [];

// ===== FUNCIÓN PRINCIPAL MEJORADA PARA APLICAR PAGOS =====
async function assignPaymentToInvoice(paymentReference, bankSource, invoiceNumber) {
    try {
        console.log(`🎯 Iniciando asignación: Pago ${paymentReference} (${bankSource}) → Factura ${invoiceNumber}`);

        const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceNumber);
        const payment = unassignedPayments.find(p => p.Referencia === paymentReference && p.BankSource === bankSource);

        if (!invoice || !payment) {
            throw new Error('Factura o pago no encontrado');
        }

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

        const overdueInvoices = clientInvoices.filter(inv =>
            inv.Estado === 'Vencido' && inv.NumeroFactura !== invoiceNumber
        );

        if (overdueInvoices.length > 0) {
            const eligibleInvoices = [invoice, ...overdueInvoices].filter(inv => {
                const baseAmount = parseFloat(inv.MontoBase || 0);
                const finesUntilPayment = calculateFinesUntilDate(inv, payment.Fecha);
                const totalOwed = baseAmount + finesUntilPayment;
                return totalOwed <= availableAmount * 2;
            });

            if (eligibleInvoices.length > 1) {
                console.log(`📋 Múltiples facturas elegibles (${eligibleInvoices.length}), mostrando modal de distribución`);
                return await showPaymentDistributionModal(payment, eligibleInvoices, availableAmount);
            }
        }

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
            amountToApply = totalOwedUntilPayment;
            newStatus = 'Pagado';
            console.log('✅ Pago completo - Factura será marcada como PAGADA');
        } else {
            amountToApply = availableAmount;
            newStatus = invoice.Estado;
            newBalance = totalOwedUntilPayment - amountToApply;
            console.log(`⚠️ Pago parcial - Saldo restante: ₡${newBalance.toLocaleString('es-CR')}`);
        }

        const newAssignments = await updatePaymentAssignments(
            payment,
            [{ invoiceNumber: invoice.NumeroFactura, amount: amountToApply }]
        );

        const updateData = {
            Estado: newStatus,
            MontoMultas: finesUntilPayment,
            MontoTotal: newBalance > 0 ? newBalance : totalOwedUntilPayment
        };

        if (newStatus === 'Pagado') {
            updateData.FechaPago = formatDateForStorage(new Date(paymentDate));
        }

        await updateInvoiceStatus(invoice.NumeroFactura, updateData);
        Object.assign(invoice, updateData);

        payment.FacturasAsignadas = formatAssignedInvoices(newAssignments);

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

        await reloadDataAndRender();

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

// ===== FUNCIÓN CORREGIDA PARA ACTUALIZAR ASIGNACIONES =====
async function updatePaymentAssignments(payment, newAssignments) {
    try {
        console.log('🔄 Actualizando asignaciones de pago:', payment.Referencia);

        const formattedAssignments = formatAssignedInvoices(newAssignments);
        const url = `${API_CONFIG.PAYMENTS}/Referencia/${payment.Referencia}?sheet=${payment.BankSource}`;
        const body = {
            FacturasAsignadas: formattedAssignments,
            FechaAsignacion: formatDateForStorage(new Date())
        };

        console.log('📤 Datos a actualizar:', body);
        console.log('PATCH URL:', url);

        const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Asignaciones actualizadas correctamente:', result);

        return newAssignments;

    } catch (error) {
        console.error('❌ Error al actualizar asignaciones:', error);
        throw error;
    }
}

// ===== MODAL DE DISTRIBUCIÓN DE PAGOS =====
async function showPaymentDistributionModal(payment, eligibleInvoices, availableAmount) {
    currentPaymentForDistribution = payment;

    paymentDistributionData = eligibleInvoices.map(invoice => {
        const baseAmount = parseFloat(invoice.MontoBase || 0);
        const finesUntilPayment = calculateFinesUntilDate(invoice, payment.Fecha);
        const totalOwed = baseAmount + finesUntilPayment;

        return {
            invoice: invoice,
            baseAmount: baseAmount,
            fines: finesUntilPayment,
            totalOwed: totalOwed,
            assignedAmount: 0,
            remainingBalance: totalOwed
        };
    });

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
                        <button type="button" class="btn btn-secondary" onclick="closePaymentDistributionModal()">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="confirmDistributionBtn" onclick="confirmPaymentDistribution()">✅ Aplicar Distribución</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ===== RENDER MODAL =====
function renderPaymentDistributionModal(payment, availableAmount) {
    const paymentAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);

    document.getElementById('paymentDistributionInfo').innerHTML = `
        <div style="background: #e6f3ff; border: 2px solid #007aff; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #007aff;">💳 ${payment.Referencia} - ${getBankDisplayName(payment.BankSource)}</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 0.9rem;">
                <div><strong>Monto Total:</strong><br>₡${paymentAmount.toLocaleString('es-CR')}</div>
                <div><strong>Disponible:</strong><br>₡${availableAmount.toLocaleString('es-CR')}</div>
                <div><strong>Fecha:</strong><br>${formatDateForDisplay(payment.Fecha)}</div>
            </div>
        </div>
    `;

    document.getElementById('invoicesDistributionList').innerHTML = paymentDistributionData.map((item, index) => {
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
                        <input type="number" class="amount-input" id="amount-${index}"
                               min="0" max="${Math.min(availableAmount, item.totalOwed)}" step="0.01"
                               placeholder="0.00"
                               onchange="updateDistributionCalculation(${index})"
                               oninput="updateDistributionCalculation(${index})">
                    </div>
                </div>
                <div id="result-${index}" style="margin-top: 8px; font-size: 0.85rem; color: #666;"></div>
            </div>
        `;
    }).join('');

    updateDistributionSummary(availableAmount);
}

// ===== CALCULAR DISTRIBUCIÓN =====
function updateDistributionCalculation(index) {
    const input = document.getElementById(`amount-${index}`);
    const assignedAmount = parseFloat(input.value) || 0;
    const item = paymentDistributionData[index];

    item.assignedAmount = assignedAmount;
    item.remainingBalance = Math.max(0, item.totalOwed - assignedAmount);

    let newStatus = item.invoice.Estado;
    let resultText = '';

    if (assignedAmount === 0) {
        resultText = 'No se aplicará pago a esta factura';
    } else if (assignedAmount >= item.totalOwed) {
        newStatus = 'Pagado';
        resultText = `✅ Factura será marcada como PAGADA`;
    } else {
        resultText = `⚠️ Pago parcial, saldo: ₡${item.remainingBalance.toLocaleString('es-CR')}`;
    }

    document.getElementById(`result-${index}`).textContent = resultText;
    updateDistributionSummary();
}

// ===== RESUMEN DE DISTRIBUCIÓN =====
function updateDistributionSummary(availableAmount) {
    const totalAssigned = paymentDistributionData.reduce((sum, item) => sum + item.assignedAmount, 0);
    const remaining = availableAmount - totalAssigned;

    document.getElementById('distributionSummary').innerHTML = `
        <div style="font-size: 0.9rem;">
            <strong>Total asignado:</strong> ₡${totalAssigned.toLocaleString('es-CR')}<br>
            <strong>Restante:</strong> ₡${remaining.toLocaleString('es-CR')}
        </div>
    `;
}

// ===== CONFIRMAR DISTRIBUCIÓN =====
async function confirmPaymentDistribution() {
    try {
        console.log('💾 Confirmando distribución de pago...');

        const assignments = paymentDistributionData
            .filter(item => item.assignedAmount > 0)
            .map(item => ({ invoiceNumber: item.invoice.NumeroFactura, amount: item.assignedAmount }));

        const newAssignments = await updatePaymentAssignments(currentPaymentForDistribution, assignments);

        for (const item of paymentDistributionData) {
            if (item.assignedAmount > 0) {
                const updateData = {
                    Estado: item.assignedAmount >= item.totalOwed ? 'Pagado' : item.invoice.Estado,
                    MontoMultas: item.fines,
                    MontoTotal: item.remainingBalance
                };
                if (updateData.Estado === 'Pagado') {
                    updateData.FechaPago = formatDateForStorage(new Date(currentPaymentForDistribution.Fecha));
                }
                await updateInvoiceStatus(item.invoice.NumeroFactura, updateData);
                Object.assign(item.invoice, updateData);
            }
        }

        closePaymentDistributionModal();
        await reloadDataAndRender();
        showToast('✅ Distribución de pago aplicada correctamente', 'success');

        if (typeof window.resolveDistribution === 'function') {
            window.resolveDistribution(true);
        }
    } catch (error) {
        console.error('❌ Error al confirmar distribución de pago:', error);
        showToast('Error al aplicar distribución: ' + error.message, 'error');

        if (typeof window.rejectDistribution === 'function') {
            window.rejectDistribution(error);
        }
    }
}

// ===== CERRAR MODAL =====
function closePaymentDistributionModal() {
    const modal = document.getElementById('paymentDistributionModal');
    if (modal) modal.classList.remove('show');
}
