// ===== VARIABLES PARA DISTRIBUCIÓN DE PAGOS =====
let currentPaymentForDistribution = null;
let paymentDistributionData = [];

// ===== FUNCIÓN PARA GENERAR SUGERENCIAS INTELIGENTES =====
function generateSmartSuggestions(transaction, clientInvoices, clientData) {
    if (!transaction || !clientInvoices || clientInvoices.length === 0) {
        return [];
    }

    const suggestions = [];
    const transactionAmount = parseFloat(transaction.creditos || 0);
    const transactionDescription = (transaction.descripcion || '').toLowerCase();
    
    // Información del cliente para búsqueda
    const clientName = (clientData?.Nombre || '').toLowerCase();
    const clientId = clientData?.ID || '';
    const clientPlate = (clientData?.Placa || '').toLowerCase();

    clientInvoices.forEach(invoice => {
        let score = 0;
        const invoiceAmount = parseFloat(invoice.MontoTotal || invoice.MontoBase || 0);
        const invoiceNumber = (invoice.NumeroFactura || '').toLowerCase();
        const invoiceConcept = (invoice.Concepto || '').toLowerCase();
        const invoiceDescription = (invoice.Descripcion || '').toLowerCase();
        const invoiceWeek = (invoice.SemanaDescripcion || '').toLowerCase();
        
        // 1. Coincidencia exacta de monto (máxima puntuación)
        if (Math.abs(transactionAmount - invoiceAmount) === 0) {
            score += 100;
        }
        // 2. Coincidencia aproximada de monto (±5%)
        else if (Math.abs(transactionAmount - invoiceAmount) / invoiceAmount <= 0.05) {
            score += 80;
        }
        // 3. Coincidencia parcial de monto (±10%)
        else if (Math.abs(transactionAmount - invoiceAmount) / invoiceAmount <= 0.10) {
            score += 60;
        }
        // 4. Coincidencia de monto parcial (pago parcial)
        else if (transactionAmount < invoiceAmount && transactionAmount > 0) {
            score += 40;
        }

        // 5. Coincidencia de número de factura en descripción
        if (transactionDescription.includes(invoiceNumber.replace('fac-', ''))) {
            score += 50;
        }

        // 6. Coincidencia de conceptos clave
        const keywords = ['arriendo', 'renta', 'alquiler', 'semana', 'semanal'];
        keywords.forEach(keyword => {
            if (transactionDescription.includes(keyword) && 
                (invoiceConcept.includes(keyword) || invoiceDescription.includes(keyword))) {
                score += 30;
            }
        });

        // 7. Coincidencia de número de semana
        const weekMatch = invoiceWeek.match(/semana\s*(\d+)/i);
        if (weekMatch) {
            const weekNumber = weekMatch[1];
            if (transactionDescription.includes(weekNumber)) {
                score += 25;
            }
        }

        // 8. Coincidencia de nombre del cliente
        if (clientName && transactionDescription.includes(clientName.split(' ')[0])) {
            score += 20;
        }

        // 9. Coincidencia de ID del cliente
        if (clientId && transactionDescription.includes(clientId)) {
            score += 25;
        }

        // 10. Coincidencia de placa del vehículo
        if (clientPlate && transactionDescription.includes(clientPlate)) {
            score += 20;
        }

        // 11. Facturas vencidas (prioridad)
        if (invoice.Estado === 'Vencido') {
            score += 15;
        }

        // Solo incluir sugerencias con score mínimo
        if (score >= 20) {
            suggestions.push({
                invoiceNumber: invoice.NumeroFactura,
                amount: invoiceAmount,
                concept: invoice.Concepto || invoice.Descripcion || '',
                week: invoice.SemanaDescripcion || '',
                status: invoice.Estado,
                score: score,
                daysOverdue: parseInt(invoice.DiasAtraso || 0),
                isExactMatch: Math.abs(transactionAmount - invoiceAmount) === 0,
                isCloseMatch: Math.abs(transactionAmount - invoiceAmount) / invoiceAmount <= 0.05
            });
        }
    });

    // Ordenar por score descendente
    return suggestions.sort((a, b) => b.score - a.score);
}

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
        console.log(`📊 Aplicando pago único: ${payment.referencia} a factura ${invoice.NumeroFactura}`);
        console.log(`💰 Monto disponible: ₡${availableAmount.toLocaleString('es-CR')}`);
        
        // Calcular el total adeudado de la factura (base + multas acumuladas)
        const baseAmount = parseFloat(invoice.MontoBase || 0);
        const currentFines = parseFloat(invoice.MontoMultas || 0);
        const totalOwed = baseAmount + currentFines;
        
        console.log(`📋 Análisis de factura:`);
        console.log(`   - Monto base: ₡${baseAmount.toLocaleString('es-CR')}`);
        console.log(`   - Multas actuales: ₡${currentFines.toLocaleString('es-CR')}`);
        console.log(`   - Total adeudado: ₡${totalOwed.toLocaleString('es-CR')}`);
        
        // Determinar cuánto aplicar y el nuevo estado
        let amountToApply, newStatus, newBalance, newFines;
        
        if (availableAmount >= totalOwed) {
            // Pago completo
            amountToApply = totalOwed;
            newStatus = 'Pagado';
            newBalance = 0;
            newFines = 0;
            console.log('✅ Pago completo - Factura será marcada como PAGADA');
        } else {
            // Pago parcial
            amountToApply = availableAmount;
            
            // Determinar si el pago cubre el monto base
            if (availableAmount >= baseAmount) {
                // Pago cubre el monto base, sobra para multas
                const remainingForFines = availableAmount - baseAmount;
                newFines = Math.max(0, currentFines - remainingForFines);
                newBalance = 0; // El monto base está cubierto
                newStatus = newFines > 0 ? 'Vencido' : 'Pendiente';
            } else {
                // Pago no cubre el monto base
                newBalance = baseAmount - availableAmount;
                newFines = currentFines; // Las multas se mantienen
                newStatus = 'Vencido'; // Si tiene multas, está vencida
            }
            
            console.log(`⚠️ Pago parcial - Saldo restante: ₡${newBalance.toLocaleString('es-CR')}`);
            console.log(`⚠️ Multas restantes: ₡${newFines.toLocaleString('es-CR')}`);
        }
        
        // Actualizar el pago en la API bancaria
        const newAssignments = await updatePaymentAssignments(
            payment,
            [{ invoiceNumber: invoice.NumeroFactura, amount: amountToApply }]
        );
        
        // Actualizar la factura con el nuevo estado
        const updateData = {
            Estado: newStatus,
            MontoMultas: newFines,
            MontoTotal: newBalance + newFines
        };
        
        if (newStatus === 'Pagado') {
            updateData.FechaPago = payment.fecha || '';
        }
        
        await updateInvoiceStatus(invoice.NumeroFactura, updateData);
        
        // Actualizar datos locales
        Object.assign(invoice, updateData);
        
        // Actualizar el pago localmente
        payment.FacturasAsignadas = formatAssignedInvoices(newAssignments);
        
        // Si el pago está completamente asignado, removerlo de no asignados
        const totalAssigned = newAssignments.reduce((sum, a) => sum + a.amount, 0);
        const totalPayment = parsePaymentAmount(payment.creditos, payment.BankSource);
        
        if (Math.abs(totalAssigned - totalPayment) < 0.01) {
            const paymentIndex = unassignedPayments.findIndex(p =>
                p.referencia === payment.referencia && p.BankSource === payment.BankSource
            );
            if (paymentIndex > -1) {
                unassignedPayments.splice(paymentIndex, 1);
            }
        }
        
        // Re-cargar y renderizar
        await reloadDataAndRender();
        
        // Mostrar mensaje apropiado
        if (newStatus === 'Pagado') {
            showToast(`✅ Factura ${invoice.NumeroFactura} PAGADA completamente con ${payment.referencia}`, 'success');
        } else if (newBalance === 0) {
            showToast(`⚠️ Pago parcial aplicado a ${invoice.NumeroFactura}. Multas pendientes: ₡${newFines.toLocaleString('es-CR')}`, 'warning');
        } else {
            showToast(`⚠️ Pago parcial aplicado a ${invoice.NumeroFactura}. Saldo: ₡${newBalance.toLocaleString('es-CR')} + Multas: ₡${newFines.toLocaleString('es-CR')}`, 'warning');
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
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>💰 Asignación de Pagos y Transacciones</h3>
                    <button class="modal-close" onclick="closePaymentDistributionModal()">✕</button>
                </div>
               
                <div class="modal-body">
                    <!-- Tabs para navegar entre pagos asignados y transacciones -->
                    <div class="modal-tabs">
                        <button class="tab-button active" id="tab-assigned" onclick="switchPaymentTab('assigned')">
                            💳 Pagos Asignados
                        </button>
                        <button class="tab-button" id="tab-transactions" onclick="switchPaymentTab('transactions')">
                            🏦 Transacciones Bancarias
                        </button>
                    </div>
                    
                    <!-- Contenido de pagos asignados -->
                    <div id="tab-content-assigned" class="tab-content active">
                        <div id="paymentDistributionInfo"></div>
                        <div id="invoicesDistributionList"></div>
                        <div id="distributionSummary"></div>
                    </div>
                    
                    <!-- Contenido de transacciones bancarias -->
                    <div id="tab-content-transactions" class="tab-content">
                        <div id="transactionsInfo"></div>
                        <div id="transactionsList"></div>
                        <div id="transactionsSummary"></div>
                    </div>
                    
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
    const modal = document.getElementById('paymentDistributionModal');
    if (!modal || !modal.classList.contains('show')) {
        showToast('No se puede confirmar: el modal no está abierto.', 'error');
        return;
    }
    if (!currentPaymentForDistribution) {
        showToast('Error interno: No hay pago seleccionado para distribuir.', 'error');
        return;
    }
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

        // Actualizar cada factura con lógica mejorada
        for (const item of validAssignments) {
            const invoice = item.invoice;
            const amountApplied = item.assignedAmount;
            const baseAmount = parseFloat(invoice.MontoBase || 0);
            const currentFines = parseFloat(invoice.MontoMultas || 0);
            const totalOwed = baseAmount + currentFines;

            let newStatus, newBalance, newFines;

            if (amountApplied >= totalOwed) {
                // Pago completo
                newStatus = 'Pagado';
                newBalance = 0;
                newFines = 0;
            } else {
                // Pago parcial
                if (amountApplied >= baseAmount) {
                    // Pago cubre el monto base, sobra para multas
                    const remainingForFines = amountApplied - baseAmount;
                    newFines = Math.max(0, currentFines - remainingForFines);
                    newBalance = 0;
                    newStatus = newFines > 0 ? 'Vencido' : 'Pendiente';
                } else {
                    // Pago no cubre el monto base
                    newBalance = baseAmount - amountApplied;
                    newFines = currentFines;
                    newStatus = 'Vencido';
                }
            }

            const updateData = {
                Estado: newStatus,
                MontoMultas: newFines,
                MontoTotal: newBalance + newFines
            };

            if (newStatus === 'Pagado') {
                updateData.FechaPago = currentPaymentForDistribution.fecha || '';
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
        // Limpiar variable solo al cerrar/cancelar
        currentPaymentForDistribution = null;
        paymentDistributionData = [];
        // Deshabilitar el botón de confirmar
        const confirmBtn = document.getElementById('confirmDistributionBtn');
        if (confirmBtn) confirmBtn.disabled = true;
    }
}

// ===== FUNCIONES DE MANEJO DE ASIGNACIONES EN BD (CORREGIDA SEGÚN DOCUMENTACIÓN OFICIAL) =====
async function updatePaymentAssignments(payment, newAssignments) {
    try {
        console.log('🔄 Actualizando asignaciones de pago según documentación oficial:', payment.Referencia);

        // VALIDACIÓN PREVIA: Verificar unicidad de la referencia en la hoja
        const searchUrl = `${API_CONFIG.PAYMENTS}/search?Referencia=${encodeURIComponent(payment.Referencia)}&sheet=${payment.BankSource}`;
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
            throw new Error(`No se pudo verificar la unicidad del pago (HTTP ${searchResponse.status})`);
        }
        const searchData = await searchResponse.json();
        if (searchData.length === 0) {
            throw new Error(`El pago ${payment.Referencia} no existe en la hoja ${payment.BankSource}`);
        }
        if (searchData.length > 1) {
            throw new Error(`No se puede actualizar el pago porque la referencia '${payment.Referencia}' aparece más de una vez en la hoja '${payment.BankSource}'. Debe ser única para poder modificar el registro. Corrija los duplicados en la hoja de Google Sheets.`);
        }

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

        console.log('📝 Asignaciones formateadas para BD:', formattedAssignments);

        // ✅ MÉTODO OFICIAL SEGÚN DOCUMENTACIÓN
        // URL: https://sheetdb.io/api/v1/{API_ID}/{COLUMN_NAME}/{VALUE}?sheet={SHEET}
        const officialUpdateUrl = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(payment.Referencia)}?sheet=${payment.BankSource}`;

        console.log('🚀 Usando método oficial SheetDB:', officialUpdateUrl);

        // Preparar datos como JSON (según documentación oficial)
        const updateData = {
            FacturasAsignadas: formattedAssignments,
            FechaAsignacion: formatDateForStorage(new Date())
        };

        console.log('📦 Datos a actualizar:', updateData);

        // DEBUGGING PROFUNDO: Mostrar toda la información relevante antes del PATCH
        console.log('🛠️ [DEBUG] --- INICIO DEBUG PROFUNDO PATCH SheetDB ---');
        console.log('🛠️ [DEBUG] URL PATCH:', officialUpdateUrl);
        console.log('🛠️ [DEBUG] Headers:', { 'Content-Type': 'application/json' });
        console.log('🛠️ [DEBUG] Body:', JSON.stringify(updateData));
        console.log('🛠️ [DEBUG] Referencia:', payment.Referencia);
        console.log('🛠️ [DEBUG] Banco:', payment.BankSource);
        console.log('🛠️ [DEBUG] Resultado búsqueda unicidad:', searchData);
        console.log('🛠️ [DEBUG] --- FIN DEBUG PRE-PATCH ---');

        const response = await fetch(officialUpdateUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });

        // DEBUGGING PROFUNDO: Mostrar respuesta cruda
        let responseText = '';
        try {
            responseText = await response.clone().text();
        } catch (e) {
            responseText = '[No se pudo leer el body de la respuesta]';
        }
        console.log('🛠️ [DEBUG] PATCH status:', response.status);
        console.log('🛠️ [DEBUG] PATCH statusText:', response.statusText);
        console.log('🛠️ [DEBUG] PATCH response body:', responseText);
        console.log('🛠️ [DEBUG] PATCH ok:', response.ok);
        console.log('🛠️ [DEBUG] --- FIN DEBUG PATCH ---');

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Actualización oficial exitosa:', result);
            return combinedAssignments;
        }

        // Si el método oficial falla, obtener más información del error
        const errorText = await response.text();
        console.error('❌ Error en método oficial:', response.status, errorText);

        // Verificar si el problema es que el registro no existe
        if (response.status === 404) {
            console.log('🔍 Error 404 - Verificando si el pago existe...');

            // Ya se verificó unicidad antes, así que solo mostrar mensaje genérico
            throw new Error(`Error 404 al actualizar: El pago existe pero no se puede modificar. Verifique permisos y unicidad del campo "Referencia"`);
        }

        throw new Error(`Actualización fallida: HTTP ${response.status} - ${errorText}`);

    } catch (error) {
        console.error('❌ Error al actualizar asignaciones:', error);

        // Información de debugging
        console.error('🔍 Información de debugging:');
        console.error('  - Referencia del pago:', payment.Referencia);
        console.error('  - Banco:', payment.BankSource);
        console.error('  - API URL base:', API_CONFIG.PAYMENTS);
        console.error('  - Nuevas asignaciones:', newAssignments);

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

        // Actualizar en la base de datos usando la función corregida
        await updatePaymentAssignmentsRaw(payment, updatedAssignments);

        // Actualizar la factura - recalcular estado considerando pagos restantes
        const invoice = clientInvoices.find(inv => inv.NumeroFactura === invoiceNumber);
        if (invoice) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const dueDateStr = invoice.FechaVencimiento;
            const baseAmount = parseFloat(invoice.MontoBase || 0);
            let newStatus = 'Pendiente';
            let currentFines = 0;

            // Calcular multas si está vencida
            if (dueDateStr) {
                const dueDate = parseDate(dueDateStr);
                if (dueDate) {
                    dueDate.setHours(0, 0, 0, 0);

                    if (today > dueDate) {
                        currentFines = calculateFinesUntilDate(invoice, formatDateForStorage(today));
                    }
                }
            }

            // Determinar el estado basado en si hay saldo pendiente
            const totalOwed = baseAmount + currentFines;
            
            // Verificar si hay otros pagos aplicados a esta factura
            const otherPayments = assignedPayments.reduce((sum, p) => {
                if (p.Assignments && Array.isArray(p.Assignments)) {
                    return sum + p.Assignments
                        .filter(a => a.invoiceNumber === invoiceNumber)
                        .reduce((aSum, a) => aSum + parseFloat(a.amount || 0), 0);
                }
                return sum;
            }, 0);

            const remainingBalance = totalOwed - otherPayments;

            if (remainingBalance <= 0) {
                newStatus = 'Pagado';
            } else if (currentFines > 0) {
                newStatus = 'Vencido';
            } else {
                newStatus = 'Pendiente';
            }

            // Actualizar en la API
            await updateInvoiceStatus(invoiceNumber, {
                Estado: newStatus,
                FechaPago: newStatus === 'Pagado' ? '' : '',
                MontoMultas: currentFines,
                MontoTotal: Math.max(0, remainingBalance)
            });

            // Actualizar localmente
            invoice.Estado = newStatus;
            invoice.FechaPago = newStatus === 'Pagado' ? '' : '';
            invoice.MontoMultas = currentFines;
            invoice.MontoTotal = Math.max(0, remainingBalance);
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

// ===== FUNCIÓN AUXILIAR PARA ACTUALIZACIÓN RAW DE ASIGNACIONES =====
async function updatePaymentAssignmentsRaw(payment, assignments) {
    try {
        const formattedAssignments = formatAssignedInvoices(assignments);
        console.log('🔄 Actualización RAW para:', payment.Referencia, 'con asignaciones:', formattedAssignments);

        // Datos a actualizar
        const updateData = {
            FacturasAsignadas: formattedAssignments,
            FechaAsignacion: assignments.length > 0 ? formatDateForStorage(new Date()) : ''
        };

        // URL oficial según documentación
        const updateUrl = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(payment.Referencia)}?sheet=${payment.BankSource}`;
        console.log('🚀 Enviando actualización RAW oficial:', updateUrl);

        const response = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(updateData).toString()
        });

        if (response.ok) {
            console.log('✅ Actualización RAW oficial exitosa');
            return assignments;
        }

        const errorText = await response.text();
        throw new Error(`Actualización RAW fallida: HTTP ${response.status}: ${errorText}`);

    } catch (error) {
        console.error('❌ Error en updatePaymentAssignmentsRaw:', error);
        throw error;
    }
}

// ===== FUNCIÓN AUXILIAR PARA RECARGAR DATOS =====
async function reloadDataAndRender() {
    try {
        // Recargar pagos no asignados y asignados
        await loadUnassignedPayments(currentClientId);
        await loadAssignedPayments(currentClientId);

        // Recargar facturas del cliente para mostrar cambios de estado
        if (typeof loadClientAndInvoices === 'function') {
            await loadClientAndInvoices(currentClientId);
        }

        // Recalcular estados de facturas considerando pagos aplicados
        if (typeof recalculateInvoiceStates === 'function') {
            await recalculateInvoiceStates(currentClientId);
        }

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

                    // Normalizar campos de pagos (consistente con backend)
                    const normalizedPayments = payments.map(payment => normalizePaymentFields(payment, sheet));

                    // Filtrar pagos relacionados al cliente
                    const clientRelatedPayments = normalizedPayments.filter(payment => {
                        // Caso 1: ID_Cliente coincide directamente
                        if (payment.idCliente && payment.idCliente === clientId.toString()) {
                            payment._matchReason = 'ID_Cliente directo';
                            console.log(`🔍 Pago ${payment.referencia} encontrado por ID_Cliente directo`);
                            return true;
                        }

                        // Caso 2: ID_Cliente está en Observaciones
                        if (payment.observaciones &&
                            isClientIdInObservations(payment.observaciones, clientId)) {
                            payment._matchReason = 'ID en Observaciones';
                            console.log(`🔍 Pago ${payment.referencia} encontrado por ID en Observaciones`);
                            return true;
                        }

                        return false;
                    });

                    // Filtrar solo los que NO están completamente asignados
                    const unassignedFromSheet = clientRelatedPayments.filter(payment => {
                        const paymentAmount = parsePaymentAmount(payment.creditos, sheet);
                        const assignments = parseAssignedInvoices(payment.facturasAsignadas || '');
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
    console.log(`📋 Cargando pagos asignados para cliente ID: ${clientId}...`);

    try {
        assignedPayments = [];
        window.assignedPayments = []; // Sincronizar
        const sheets = ['BAC', 'BN', 'HuberBN'];

        for (const sheet of sheets) {
            try {
                console.log(`📋 Consultando pagos asignados en ${sheet}...`);
                const url = `${API_CONFIG.PAYMENTS}?sheet=${sheet}`;
                const response = await fetch(url);

                if (response.ok) {
                    const paymentsData = await response.json();
                    const payments = Array.isArray(paymentsData) ? paymentsData : [];

                    // Normalizar campos de pagos (consistente con backend)
                    const normalizedPayments = payments.map(payment => normalizePaymentFields(payment, sheet));

                    // Filtrar pagos relacionados al cliente (misma lógica que loadUnassignedPayments)
                    const clientRelatedPayments = normalizedPayments.filter(payment => {
                        // Caso 1: ID_Cliente coincide directamente
                        if (payment.idCliente && payment.idCliente === clientId.toString()) {
                            payment._matchReason = 'ID_Cliente directo';
                            console.log(`🔍 Pago ${payment.referencia} encontrado por ID_Cliente directo`);
                            return true;
                        }

                        // Caso 2: ID_Cliente está en Observaciones
                        if (payment.observaciones &&
                            isClientIdInObservations(payment.observaciones, clientId)) {
                            payment._matchReason = 'ID en Observaciones';
                            console.log(`🔍 Pago ${payment.referencia} encontrado por ID en Observaciones`);
                            return true;
                        }

                        return false;
                    });

                    // Filtrar pagos que SÍ tienen asignaciones
                    const assigned = clientRelatedPayments.filter(payment => {
                        const hasAssignments = payment.facturasAsignadas && payment.facturasAsignadas.trim() !== '';
                        if (hasAssignments) {
                            console.log(`✅ Pago ${payment.referencia} tiene asignaciones: "${payment.facturasAsignadas}"`);
                        }
                        return hasAssignments;
                    });

                    // Agregar información de la fuente y facturas relacionadas
                    const paymentsWithInfo = assigned.map(payment => {
                        const assignments = parseAssignedInvoices(payment.facturasAsignadas || '');
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
                    console.log(`✅ ${sheet}: ${assigned.length} pagos asignados`);

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

// ===== FUNCIONES DE ACTUALIZACIÓN DE FACTURAS =====
async function updateInvoiceStatus(invoiceNumber, updateData) {
    try {
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

// ===== FUNCIONES DE DEBUGGING PARA SHEETDB (COMPLETAS) =====
async function testSheetDBConnection(paymentReference, bankSource) {
    console.log('🧪 === PRUEBA DE CONEXIÓN SHEETDB OFICIAL ===');
    console.log(`Probando pago: ${paymentReference} en banco: ${bankSource}`);

    try {
        // 1. Probar búsqueda (sabemos que funciona)
        const searchUrl = `${API_CONFIG.PAYMENTS}/search?Referencia=${encodeURIComponent(paymentReference)}&sheet=${bankSource}`;
        console.log('🔍 1. Probando búsqueda:', searchUrl);

        const searchResponse = await fetch(searchUrl);
        console.log('📡 Respuesta búsqueda:', searchResponse.status, searchResponse.statusText);

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            console.log('✅ Datos encontrados:', searchData.length, 'registros');
            console.log('📋 Registro encontrado:', searchData[0]);

            if (searchData.length > 0) {
                const originalData = searchData[0];

                // 2. Probar método OFICIAL según documentación
                const testUpdateData = {
                    FacturasAsignadas: 'TEST-OFFICIAL-' + Date.now(),
                    FechaAsignacion: formatDateForStorage(new Date())
                };

                const officialUrl = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(paymentReference)}?sheet=${bankSource}`;
                console.log('\n🚀 2. Probando MÉTODO OFICIAL según documentación:');
                console.log('   URL:', officialUrl);
                console.log('   Datos:', testUpdateData);

                const officialResponse = await fetch(officialUrl, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams(testUpdateData).toString()
                });

                console.log('📡 Respuesta oficial:', officialResponse.status, officialResponse.statusText);

                if (officialResponse.ok) {
                    const result = await officialResponse.json();
                    console.log('✅ MÉTODO OFICIAL EXITOSO!');
                    console.log('📦 Resultado:', result);

                    // Revertir cambio
                    const revertData = {
                        FacturasAsignadas: originalData.FacturasAsignadas || '',
                        FechaAsignacion: originalData.FechaAsignacion || ''
                    };

                    await fetch(officialUrl, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams(revertData).toString()
                    });

                    console.log('🔄 Cambios revertidos');
                    console.log('🎉 EL MÉTODO OFICIAL FUNCIONA CORRECTAMENTE');
                } else {
                    const errorText = await officialResponse.text();
                    console.log('❌ Método oficial falló:', errorText);

                    // 3. Probar método JSON
                    console.log('\n🔄 3. Probando método JSON:');
                    const jsonResponse = await fetch(officialUrl, {
                        method: 'PATCH',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(testUpdateData)
                    });

                    console.log('📡 Respuesta JSON:', jsonResponse.status, jsonResponse.statusText);

                    if (jsonResponse.ok) {
                        const result = await jsonResponse.json();
                        console.log('✅ MÉTODO JSON EXITOSO!');
                        console.log('📦 Resultado:', result);

                        // Revertir cambio
                        await fetch(officialUrl, {
                            method: 'PATCH',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                FacturasAsignadas: originalData.FacturasAsignadas || '',
                                FechaAsignacion: originalData.FechaAsignacion || ''
                            })
                        });

                        console.log('🔄 Cambios revertidos');
                        console.log('🎉 EL MÉTODO JSON FUNCIONA CORRECTAMENTE');
                    } else {
                        const jsonErrorText = await jsonResponse.text();
                        console.log('❌ Método JSON también falló:', jsonErrorText);
                        console.log('💡 Posibles causas:');
                        console.log('   - Registro no existe para actualización');
                        console.log('   - Permisos insuficientes en SheetDB');
                        console.log('   - Campo Referencia no es único');
                        console.log('   - API SheetDB requiere plan pagado para updates');
                    }
                }
            }

        } else {
            const errorText = await searchResponse.text();
            console.error('❌ Error en búsqueda:', errorText);
        }

    } catch (error) {
        console.error('❌ Error en prueba de conexión:', error);
    }

    console.log('🧪 === FIN DE PRUEBA OFICIAL ===');
}

// ===== FUNCIÓN DE PRUEBA SIMPLE =====
async function quickTestUpdate(paymentReference, bankSource) {
    console.log('🚀 Prueba rápida de actualización oficial...');

    const payment = { Referencia: paymentReference, BankSource: bankSource };
    const testAssignments = [{ invoiceNumber: 'TEST-123', amount: 1000 }];

    try {
        const result = await updatePaymentAssignments(payment, testAssignments);
        console.log('✅ Prueba exitosa:', result);

        // Limpiar
        await updatePaymentAssignmentsRaw(payment, []);
        console.log('🧹 Limpieza completada');

    } catch (error) {
        console.error('❌ Prueba falló:', error.message);
    }
}

// Función para mostrar información de debugging
function debugSheetDBInfo() {
    console.log('🧪 === INFORMACIÓN DE DEBUGGING SHEETDB ===');
    console.log('Base URL:', API_CONFIG.PAYMENTS);
    console.log('');
    console.log('✅ MÉTODO QUE FUNCIONA (búsqueda):');
    console.log('   GET /search?Referencia=X&sheet=Y');
    console.log('');
    console.log('🔧 MÉTODO OFICIAL IMPLEMENTADO:');
    console.log('   PATCH /Referencia/X?sheet=Y');
    console.log('   Con Content-Type: application/x-www-form-urlencoded');
    console.log('   Y datos en el body como URLSearchParams');
    console.log('');
    console.log('🎯 SEGÚN DOCUMENTACIÓN OFICIAL:');
    console.log('   PATCH /api/v1/{API_ID}/{COLUMN_NAME}/{VALUE}?sheet={SHEET}');
    console.log('   Con Content-Type: application/x-www-form-urlencoded');
    console.log('   Y datos en el body');
    console.log('');
    console.log('💡 POSIBLES CAUSAS DE ERROR 404:');
    console.log('   1. Plan gratuito no permite updates');
    console.log('   2. Campo Referencia no es clave única');
    console.log('   3. Permisos insuficientes');
    console.log('   4. API endpoint incorrecto');
    console.log('');
    console.log('🧪 Funciones de prueba:');
    console.log('   testSheetDBConnection("18475172", "BN")');
    console.log('   quickTestUpdate("18475172", "BN")');
}

// Función auxiliar para formatear fechas de forma segura (si no existe ya)
function safeFormatDate(date) {
    if (!date || isNaN(new Date(date).getTime())) return '';
    return formatDateForStorage(new Date(date));
}

// ===== FUNCIÓN PARA CARGAR TODAS LAS TRANSACCIONES SIN CONCILIAR =====
async function loadAllUnreconciledTransactions() {
    try {
        console.log(`🏦 Cargando TODAS las transacciones bancarias sin conciliar...`);
        
        const transactions = [];
        const sheets = ['BAC', 'BN', 'HuberBN'];
        const API_CONFIG = {
            TRANSACTIONS: 'https://sheetdb.io/api/v1/a7oekivxzreg7'
        };
        
        for (const sheet of sheets) {
            try {
                console.log(`📋 Consultando transacciones en ${sheet}...`);
                const url = `${API_CONFIG.TRANSACTIONS}?sheet=${sheet}`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const transactionsData = await response.json();
                    const sheetTransactions = Array.isArray(transactionsData) ? transactionsData : [];
                    
                    // Normalizar campos de transacciones
                    const normalizedTransactions = sheetTransactions.map(transaction => ({
                        ...transaction,
                        banco: sheet,
                        fecha: transaction.Fecha || transaction.fecha,
                        referencia: transaction.Referencia || transaction.referencia,
                        descripcion: transaction.Descripción || transaction.descripcion,
                        creditos: parseFloat(transaction.Créditos || transaction.creditos || 0),
                        debitos: parseFloat(transaction.Débitos || transaction.debitos || 0),
                        observaciones: transaction.Observaciones || transaction.observaciones || '',
                        idCliente: (transaction.ID_Cliente || transaction.id_cliente || '').toString(),
                        facturasAsignadas: transaction.FacturasAsignadas || transaction.facturas_asignadas || ''
                    }));
                    
                    // Filtrar solo transacciones SIN CONCILIAR (sin facturas asignadas)
                    const unreconciledTransactions = normalizedTransactions.filter(transaction => 
                        transaction.creditos > 0 && 
                        (!transaction.facturasAsignadas || transaction.facturasAsignadas.trim() === '')
                    );
                    
                    transactions.push(...unreconciledTransactions);
                    console.log(`✅ ${sheet}: ${unreconciledTransactions.length} transacciones sin conciliar encontradas`);
                    
                } else if (response.status !== 404) {
                    console.warn(`Error al cargar transacciones de ${sheet}:`, response.status);
                }
                
            } catch (error) {
                console.warn(`No se pudieron cargar transacciones de ${sheet}:`, error);
            }
        }
        
        // Ordenar por fecha (más recientes primero)
        transactions.sort((a, b) => {
            const dateA = parseDate(a.fecha);
            const dateB = parseDate(b.fecha);
            
            if (dateA && dateB) {
                return dateB.getTime() - dateA.getTime();
            }
            return 0;
        });
        
        console.log(`✅ Total transacciones sin conciliar: ${transactions.length}`);
        return transactions;
        
    } catch (error) {
        console.error('❌ Error cargando transacciones sin conciliar:', error);
        return [];
    }
}

// ===== FUNCIÓN PARA NORMALIZAR CAMPOS DE PAGOS =====
function normalizePaymentFields(payment, sheetName) {
    return {
        ...payment,
        fuente: sheetName,
        creditos: parseFloat(payment.Créditos || payment.creditos || 0),
        idCliente: (payment.ID_Cliente || payment.id_cliente || '').toString(),
        facturasAsignadas: payment.FacturasAsignadas || payment.facturas_asignadas || '',
        fecha: payment.Fecha || payment.fecha,
        referencia: payment.Referencia || payment.referencia || '',
        descripcion: payment.Descripción || payment.descripcion || '',
        fechaAsignacion: payment.FechaAsignacion || payment.fecha_asignacion,
        observaciones: payment.Observaciones || payment.observaciones || ''
    };
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
window.updateDistributionSummary = updateDistributionSummary;

// Funciones de parseo
window.parseAssignedInvoices = parseAssignedInvoices;
window.formatAssignedInvoices = formatAssignedInvoices;

// Funciones principales de actualización
window.updatePaymentAssignments = updatePaymentAssignments;
window.updatePaymentAssignmentsRaw = updatePaymentAssignmentsRaw;

// ✅ FUNCIONES DE DEBUGGING EXPUESTAS (COMPLETAS)
window.testSheetDBConnection = testSheetDBConnection;
window.debugSheetDBInfo = debugSheetDBInfo;
window.quickTestUpdate = quickTestUpdate;

// ✅ NUEVAS FUNCIONES DE RECÁLCULO Y FIFO
window.recalculateInvoiceStates = recalculateInvoiceStates;
window.applyPaymentAutoFIFO = applyPaymentAutoFIFO;
window.syncWithBackendLogic = syncWithBackendLogic;
window.verifyDataConsistency = verifyDataConsistency;

// ✅ FUNCIONES DE TRANSACCIONES BANCARIAS
window.loadAllUnreconciledTransactions = loadAllUnreconciledTransactions;
window.switchPaymentTab = switchPaymentTab;
window.loadTransactionsTab = loadTransactionsTab;
window.generateSmartSuggestions = generateSmartSuggestions;
window.renderTransactionsListWithSuggestions = renderTransactionsListWithSuggestions;
window.assignTransactionToInvoice = assignTransactionToInvoice;
window.showAllSuggestions = showAllSuggestions;
window.assignTransactionManually = assignTransactionManually;

// ===== FUNCIÓN PARA SINCRONIZAR CON BACKEND (GOOGLE APPS SCRIPT) =====
async function syncWithBackendLogic(clientId) {
    try {
        console.log(`🔄 SINCRONIZANDO LÓGICA CON BACKEND para cliente ${clientId}...`);
        
        // 1. Recalcular estados de facturas (consistente con backend)
        await recalculateInvoiceStates(clientId);
        
        // 2. Verificar pagos no asignados y aplicar FIFO si es necesario
        const unassignedPayments = window.unassignedPayments || [];
        const clientUnassigned = unassignedPayments.filter(p => {
            if (p.idCliente && p.idCliente === clientId.toString()) return true;
            if (p.observaciones && isClientIdInObservations(p.observaciones, clientId)) return true;
            return false;
        });
        
        console.log(`📋 Pagos no asignados encontrados: ${clientUnassigned.length}`);
        
        // 3. Aplicar lógica FIFO automática (como el backend)
        for (const payment of clientUnassigned) {
            if (!payment.facturasAsignadas || payment.facturasAsignadas.trim() === '') {
                console.log(`🔄 Aplicando FIFO automático a pago ${payment.referencia}...`);
                await applyPaymentAutoFIFO(payment, clientId);
            }
        }
        
        // 4. Recalcular una vez más después de aplicar FIFO
        await recalculateInvoiceStates(clientId);
        
        // 5. Recargar datos para mostrar cambios
        await reloadDataAndRender();
        
        console.log(`✅ Sincronización con backend completada para cliente ${clientId}`);
        
    } catch (error) {
        console.error('❌ Error sincronizando con backend:', error);
        throw error;
    }
}

// ===== FUNCIÓN PARA VERIFICAR CONSISTENCIA DE DATOS =====
function verifyDataConsistency(clientId) {
    try {
        console.log(`🔍 VERIFICANDO CONSISTENCIA DE DATOS para cliente ${clientId}...`);
        
        const clientInvoices = window.clientInvoices || [];
        const assignedPayments = window.assignedPayments || [];
        
        const clientFacturas = clientInvoices.filter(inv => 
            inv.ID_Cliente && inv.ID_Cliente.toString() === clientId.toString()
        );
        
        let inconsistencies = [];
        
        for (const invoice of clientFacturas) {
            const baseAmount = parseFloat(invoice.MontoBase || 0);
            const currentFines = parseFloat(invoice.MontoMultas || 0);
            const currentTotal = parseFloat(invoice.MontoTotal || 0);
            const currentStatus = invoice.Estado || 'Pendiente';
            
            // Calcular multas reales
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = parseDate(invoice.FechaVencimiento);
            let realFines = 0;
            
            if (dueDate) {
                dueDate.setHours(0, 0, 0, 0);
                if (today > dueDate) {
                    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                    realFines = daysOverdue * 2000;
                }
            }
            
            // Calcular pagos aplicados
            const paymentsApplied = assignedPayments.reduce((sum, p) => {
                if (p.Assignments && Array.isArray(p.Assignments)) {
                    return sum + p.Assignments
                        .filter(a => a.invoiceNumber === invoice.NumeroFactura)
                        .reduce((aSum, a) => aSum + parseFloat(a.amount || 0), 0);
                }
                return sum;
            }, 0);
            
            // Calcular total real
            const realTotal = baseAmount + realFines - paymentsApplied;
            
            // Verificar inconsistencias
            if (Math.abs(currentFines - realFines) > 0.01) {
                inconsistencies.push({
                    invoice: invoice.NumeroFactura,
                    issue: 'Multas incorrectas',
                    current: currentFines,
                    expected: realFines
                });
            }
            
            if (Math.abs(currentTotal - realTotal) > 0.01) {
                inconsistencies.push({
                    invoice: invoice.NumeroFactura,
                    issue: 'Total incorrecto',
                    current: currentTotal,
                    expected: realTotal
                });
            }
            
            // Verificar estado
            let expectedStatus = 'Pendiente';
            if (realTotal <= 0) {
                expectedStatus = 'Pagado';
            } else if (realFines > 0) {
                expectedStatus = 'Vencido';
            }
            
            if (currentStatus !== expectedStatus) {
                inconsistencies.push({
                    invoice: invoice.NumeroFactura,
                    issue: 'Estado incorrecto',
                    current: currentStatus,
                    expected: expectedStatus
                });
            }
        }
        
        if (inconsistencies.length > 0) {
            console.warn(`⚠️ Se encontraron ${inconsistencies.length} inconsistencias:`);
            inconsistencies.forEach(inc => {
                console.warn(`   - ${inc.invoice}: ${inc.issue} (actual: ${inc.current}, esperado: ${inc.expected})`);
            });
        } else {
            console.log(`✅ No se encontraron inconsistencias en los datos`);
        }
        
        return inconsistencies;
        
    } catch (error) {
        console.error('❌ Error verificando consistencia:', error);
        return [];
    }
}

// ===== FUNCIÓN PARA RECALCULAR ESTADOS DE FACTURAS CONSIDERANDO PAGOS =====
async function recalculateInvoiceStates(clientId) {
    try {
        console.log(`🔄 Recalculando estados de facturas para cliente ${clientId}...`);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Obtener facturas del cliente
        const clientInvoices = window.clientInvoices || [];
        const clientFacturas = clientInvoices.filter(inv => 
            inv.ID_Cliente && inv.ID_Cliente.toString() === clientId.toString()
        );
        
        console.log(`📋 Procesando ${clientFacturas.length} facturas...`);
        
        let updatedCount = 0;
        
        for (const invoice of clientFacturas) {
            const baseAmount = parseFloat(invoice.MontoBase || 0);
            const dueDateStr = invoice.FechaVencimiento;
            let newStatus = 'Pendiente';
            let currentFines = 0;
            
            // Calcular multas si está vencida
            if (dueDateStr) {
                const dueDate = parseDate(dueDateStr);
                if (dueDate) {
                    dueDate.setHours(0, 0, 0, 0);
                    
                    if (today > dueDate) {
                        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                        currentFines = daysOverdue * 2000; // ₡2,000 por día
                    }
                }
            }
            
            // Calcular total adeudado
            const totalOwed = baseAmount + currentFines;
            
            // Calcular pagos aplicados a esta factura
            const assignedPayments = window.assignedPayments || [];
            const paymentsApplied = assignedPayments.reduce((sum, p) => {
                if (p.Assignments && Array.isArray(p.Assignments)) {
                    return sum + p.Assignments
                        .filter(a => a.invoiceNumber === invoice.NumeroFactura)
                        .reduce((aSum, a) => aSum + parseFloat(a.amount || 0), 0);
                }
                return sum;
            }, 0);
            
            // Calcular saldo pendiente
            const remainingBalance = totalOwed - paymentsApplied;
            
            // Determinar nuevo estado
            if (remainingBalance <= 0) {
                newStatus = 'Pagado';
            } else if (currentFines > 0) {
                newStatus = 'Vencido';
            } else {
                newStatus = 'Pendiente';
            }
            
            // Verificar si hay cambios
            const currentStatus = invoice.Estado || 'Pendiente';
            const currentFinesAmount = parseFloat(invoice.MontoMultas || 0);
            const currentTotal = parseFloat(invoice.MontoTotal || 0);
            
            if (currentStatus !== newStatus || 
                Math.abs(currentFinesAmount - currentFines) > 0.01 ||
                Math.abs(currentTotal - remainingBalance) > 0.01) {
                
                // Actualizar en la API
                const updateData = {
                    Estado: newStatus,
                    MontoMultas: currentFines,
                    MontoTotal: Math.max(0, remainingBalance)
                };
                
                if (newStatus === 'Pagado') {
                    updateData.FechaPago = today.toISOString().split('T')[0];
                }
                
                await updateInvoiceStatus(invoice.NumeroFactura, updateData);
                
                // Actualizar localmente
                Object.assign(invoice, updateData);
                
                updatedCount++;
                console.log(`✅ Factura ${invoice.NumeroFactura}: ${currentStatus} → ${newStatus}, Multas: ₡${currentFines.toLocaleString()}, Total: ₡${remainingBalance.toLocaleString()}`);
            }
        }
        
        console.log(`✅ Recalculación completada: ${updatedCount} facturas actualizadas`);
        return updatedCount;
        
    } catch (error) {
        console.error('❌ Error recalculando estados de facturas:', error);
        throw error;
    }
}

// ===== FUNCIÓN PARA APLICAR PAGOS AUTOMÁTICAMENTE (FIFO) =====
async function applyPaymentAutoFIFO(payment, clientId) {
    try {
        console.log(`🔄 Aplicando pago ${payment.referencia} automáticamente (FIFO) para cliente ${clientId}`);
        
        // Obtener facturas pendientes del cliente ordenadas por fecha de vencimiento (más antiguas primero)
        const pendingInvoices = clientInvoices
            .filter(invoice => 
                invoice.ID_Cliente.toString() === clientId.toString() &&
                invoice.Estado !== 'Pagado' &&
                parseFloat(invoice.MontoTotal || invoice.MontoBase) > 0
            )
            .sort((a, b) => new Date(a.FechaVencimiento) - new Date(b.FechaVencimiento));
        
        if (pendingInvoices.length === 0) {
            console.log(`⚠️ No hay facturas pendientes para aplicar pago automático`);
            return false;
        }
        
        let remainingAmount = payment.creditos;
        const assignments = [];
        
        console.log(`📋 Facturas pendientes encontradas: ${pendingInvoices.length}`);
        
        for (const invoice of pendingInvoices) {
            if (remainingAmount <= 0) break;
            
            const invoiceTotal = parseFloat(invoice.MontoTotal || invoice.MontoBase);
            const amountToApply = Math.min(remainingAmount, invoiceTotal);
            
            assignments.push({
                invoiceNumber: invoice.NumeroFactura,
                amount: amountToApply
            });
            
            remainingAmount -= amountToApply;
            
            console.log(`   ✅ Aplicando ₡${amountToApply.toLocaleString()} a factura ${invoice.NumeroFactura}`);
        }
        
        if (assignments.length > 0) {
            // Actualizar el pago con las asignaciones
            await updatePaymentAssignments(payment, assignments);
            
            // Actualizar cada factura
            for (const assignment of assignments) {
                const invoice = clientInvoices.find(inv => inv.NumeroFactura === assignment.invoiceNumber);
                if (invoice) {
                    const newTotal = parseFloat(invoice.MontoTotal || invoice.MontoBase) - assignment.amount;
                    const newStatus = newTotal <= 0 ? 'Pagado' : invoice.Estado;
                    
                    const updateData = {
                        Estado: newStatus,
                        MontoTotal: Math.max(0, newTotal)
                    };
                    
                    if (newStatus === 'Pagado') {
                        updateData.FechaPago = payment.fecha || '';
                    }
                    
                    await updateInvoiceStatus(invoice.NumeroFactura, updateData);
                }
            }
            
            console.log(`✅ Pago ${payment.referencia} aplicado automáticamente a ${assignments.length} facturas`);
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Error aplicando pago automático:', error);
        return false;
    }
}

// ===== FUNCIONES PARA MANEJAR TABS DEL MODAL =====
function switchPaymentTab(tabName) {
    // Actualizar botones de tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Actualizar contenido de tabs
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-content-${tabName}`).classList.add('active');
    
    // Cargar contenido específico según el tab
    if (tabName === 'transactions') {
        loadTransactionsTab();
    }
}

// ===== FUNCIÓN PARA CARGAR TAB DE TRANSACCIONES =====
async function loadTransactionsTab() {
    try {
        const clientId = window.currentClient?.ID;
        const clientData = window.currentClient;
        if (!clientId) {
            document.getElementById('transactionsInfo').innerHTML = '<p>❌ No hay cliente seleccionado</p>';
            return;
        }
        
        // Mostrar loading
        document.getElementById('transactionsInfo').innerHTML = '<p>🔄 Cargando transacciones bancarias sin conciliar...</p>';
        
        // Cargar TODAS las transacciones sin conciliar
        const allTransactions = await loadAllUnreconciledTransactions();
        
        if (allTransactions.length === 0) {
            document.getElementById('transactionsInfo').innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <h4>📋 No hay transacciones sin conciliar</h4>
                    <p>Todas las transacciones bancarias ya han sido asignadas a facturas</p>
                </div>
            `;
            document.getElementById('transactionsList').innerHTML = '';
            return;
        }
        
        // Generar sugerencias para cada transacción
        const clientInvoices = window.clientInvoices || [];
        const transactionsWithSuggestions = allTransactions.map(transaction => {
            const suggestions = generateSmartSuggestions(transaction, clientInvoices, clientData);
            return {
                ...transaction,
                suggestions: suggestions,
                hasSuggestions: suggestions.length > 0
            };
        });
        
        // Mostrar información general
        const totalCredits = allTransactions.reduce((sum, t) => sum + t.creditos, 0);
        const transactionsWithSuggestionsCount = transactionsWithSuggestions.filter(t => t.hasSuggestions).length;
        
        document.getElementById('transactionsInfo').innerHTML = `
            <div style="background: #f0f8ff; border: 2px solid #0066cc; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px 0; color: #0066cc;">🏦 Transacciones Sin Conciliar</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 0.9rem;">
                    <div><strong>Total Transacciones:</strong><br>${allTransactions.length} transacciones</div>
                    <div><strong>Total Créditos:</strong><br>₡${totalCredits.toLocaleString('es-CR')}</div>
                    <div><strong>Con Sugerencias:</strong><br>${transactionsWithSuggestionsCount} transacciones</div>
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <h4 style="color: #1d1d1f; margin-bottom: 8px;">📋 Transacciones con sugerencias inteligentes:</h4>
                <p style="color: #666; font-size: 0.9rem; margin: 0;">El sistema analiza descripción y monto para sugerir facturas del cliente. Ordenadas por mayor coincidencia.</p>
            </div>
        `;
        
        // Renderizar lista de transacciones con sugerencias
        renderTransactionsListWithSuggestions(transactionsWithSuggestions);
        
    } catch (error) {
        console.error('Error cargando transacciones:', error);
        document.getElementById('transactionsInfo').innerHTML = '<p>❌ Error cargando transacciones</p>';
    }
}

// ===== FUNCIÓN PARA RENDERIZAR LISTA DE TRANSACCIONES CON SUGERENCIAS =====
function renderTransactionsListWithSuggestions(transactionsWithSuggestions) {
    const transactionsList = document.getElementById('transactionsList');
    
    // Ordenar transacciones: primero las que tienen sugerencias, luego por score
    const sortedTransactions = transactionsWithSuggestions.sort((a, b) => {
        if (a.hasSuggestions && !b.hasSuggestions) return -1;
        if (!a.hasSuggestions && b.hasSuggestions) return 1;
        if (a.hasSuggestions && b.hasSuggestions) {
            const maxScoreA = Math.max(...a.suggestions.map(s => s.score));
            const maxScoreB = Math.max(...b.suggestions.map(s => s.score));
            return maxScoreB - maxScoreA;
        }
        return 0;
    });
    
    transactionsList.innerHTML = sortedTransactions.map((transaction, index) => {
        const bankName = getBankDisplayName(transaction.banco);
        const hasSuggestions = transaction.hasSuggestions;
        const topSuggestion = hasSuggestions ? transaction.suggestions[0] : null;
        
        return `
            <div class="transaction-item" id="transaction-${index}" style="
                border: 1px solid ${hasSuggestions ? '#28a745' : '#e0e0e0'}; 
                border-radius: 8px; 
                padding: 16px; 
                margin-bottom: 16px;
                background: ${hasSuggestions ? '#f8fff9' : '#ffffff'};
                box-shadow: ${hasSuggestions ? '0 2px 8px rgba(40, 167, 69, 0.1)' : '0 1px 3px rgba(0,0,0,0.1)'};
            ">
                <div class="transaction-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div class="transaction-info" style="flex: 1;">
                        <div style="font-weight: 600; color: #1d1d1f; margin-bottom: 4px; display: flex; align-items: center;">
                            ${transaction.referencia} - ${bankName}
                            ${hasSuggestions ? '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 8px;">💡 Sugerencias</span>' : ''}
                        </div>
                        <div style="font-size: 0.9rem; color: #666; margin-bottom: 4px;">
                            ${transaction.descripcion || 'Sin descripción'}
                        </div>
                        <div style="font-size: 0.85rem; color: #888;">
                            ${formatDateForDisplay(transaction.fecha)}
                        </div>
                    </div>
                    <div class="transaction-amount" style="text-align: right;">
                        <div style="font-size: 1.2rem; font-weight: 600; color: #28a745;">
                            ₡${transaction.creditos.toLocaleString('es-CR')}
                        </div>
                    </div>
                </div>
                
                ${hasSuggestions ? `
                    <div class="suggestions-section" style="margin-top: 16px; padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #28a745;">
                        <div style="font-weight: 600; color: #28a745; margin-bottom: 8px; font-size: 0.9rem;">
                            🎯 Sugerencias de Facturas (${transaction.suggestions.length} encontradas):
                        </div>
                        <div class="suggestions-list">
                            ${transaction.suggestions.slice(0, 3).map((suggestion, sIndex) => {
                                const invoice = suggestion.invoice;
                                const statusClass = invoice.Estado.toLowerCase();
                                const isExactMatch = Math.abs(transaction.creditos - suggestion.amount) < 0.01;
                                
                                return `
                                    <div class="suggestion-item" style="
                                        display: flex; 
                                        justify-content: space-between; 
                                        align-items: center; 
                                        padding: 8px; 
                                        margin-bottom: 6px; 
                                        background: ${isExactMatch ? '#e8f5e8' : '#ffffff'}; 
                                        border: 1px solid ${isExactMatch ? '#28a745' : '#e0e0e0'}; 
                                        border-radius: 4px;
                                        ${isExactMatch ? 'border-left: 4px solid #28a745;' : ''}
                                    ">
                                        <div class="suggestion-info" style="flex: 1;">
                                            <div style="font-weight: 600; color: #1d1d1f; margin-bottom: 2px;">
                                                ${invoice.NumeroFactura}
                                                ${isExactMatch ? '<span style="color: #28a745; font-size: 0.8rem;">💰 Monto exacto</span>' : ''}
                                            </div>
                                            <div style="font-size: 0.8rem; color: #666; margin-bottom: 2px;">
                                                ${invoice.ConceptoManual || invoice.SemanaDescripcion || 'N/A'}
                                            </div>
                                            <div style="font-size: 0.75rem; color: #888;">
                                                Score: ${suggestion.score} | ${suggestion.reason}
                                            </div>
                                        </div>
                                        <div class="suggestion-actions" style="display: flex; align-items: center; gap: 8px;">
                                            <div style="text-align: right; margin-right: 8px;">
                                                <div style="font-size: 0.9rem; font-weight: 600; color: #1d1d1f;">
                                                    ₡${suggestion.amount.toLocaleString('es-CR')}
                                                </div>
                                                <span class="status-badge status-${statusClass}" style="font-size: 0.7rem;">${invoice.Estado}</span>
                                            </div>
                                            <button type="button" 
                                                    class="btn btn-sm btn-success"
                                                    onclick="assignTransactionToInvoice('${transaction.referencia}', '${transaction.banco}', '${invoice.NumeroFactura}', ${transaction.creditos})"
                                                    style="white-space: nowrap;">
                                                ${isExactMatch ? '✅ Asignar' : '📝 Asignar'}
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        ${transaction.suggestions.length > 3 ? `
                            <div style="text-align: center; margin-top: 8px; font-size: 0.8rem; color: #666;">
                                +${transaction.suggestions.length - 3} sugerencias más...
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="no-suggestions" style="margin-top: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px; text-align: center; color: #666; font-size: 0.9rem;">
                        🔍 No se encontraron sugerencias para esta transacción
                    </div>
                `}
                
                <div class="transaction-actions" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
                    <button type="button" 
                            class="btn btn-sm btn-outline-primary"
                            onclick="showAllSuggestions('${transaction.referencia}', ${index})"
                            style="margin-right: 8px;">
                        🔍 Ver Todas las Sugerencias
                    </button>
                    <button type="button" 
                            class="btn btn-sm btn-outline-secondary"
                            onclick="assignTransactionManually('${transaction.referencia}', '${transaction.banco}', ${transaction.creditos})">
                        ✏️ Asignación Manual
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== FUNCIÓN PARA MOSTRAR TODAS LAS SUGERENCIAS =====
function showAllSuggestions(transactionRef, transactionIndex) {
    // Aquí podrías abrir un modal con todas las sugerencias
    showToast('🔄 Funcionalidad en desarrollo - Mostrar todas las sugerencias', 'info');
}

// ===== FUNCIÓN PARA ASIGNACIÓN MANUAL =====
function assignTransactionManually(transactionRef, bankSource, amount) {
    // Aquí podrías abrir un modal para asignación manual
    showToast('🔄 Funcionalidad en desarrollo - Asignación manual', 'info');
}

// ===== FUNCIÓN PARA ASIGNAR TRANSACCIÓN A FACTURA ESPECÍFICA =====
async function assignTransactionToInvoice(transactionRef, bankSource, invoiceNumber, amount) {
    try {
        console.log(`🔄 Asignando transacción ${transactionRef} a factura ${invoiceNumber}...`);
        
        // Buscar la transacción
        const transaction = {
            referencia: transactionRef,
            banco: bankSource,
            creditos: amount,
            fecha: new Date().toISOString().split('T')[0]
        };
        
        // Buscar la factura
        const invoice = window.clientInvoices?.find(inv => inv.NumeroFactura === invoiceNumber);
        if (!invoice) {
            showToast('❌ Factura no encontrada', 'error');
            return;
        }
        
        // Aplicar el pago usando la lógica existente
        await applySinglePayment(transaction, invoice, amount);
        
        // Recargar el tab de transacciones
        await loadTransactionsTab();
        
        showToast(`✅ Transacción ${transactionRef} asignada a factura ${invoiceNumber}`, 'success');
        
    } catch (error) {
        console.error('Error asignando transacción:', error);
        showToast('❌ Error asignando transacción: ' + error.message, 'error');
    }
}

// ===== FUNCIÓN PARA RENDERIZAR LISTA DE TRANSACCIONES =====
function renderTransactionsList(transactions) {
    // Esta función ya no se usa, pero la mantenemos por compatibilidad
    console.log('renderTransactionsList llamada con', transactions.length, 'transacciones');
}

// ===== FUNCIONES AUXILIARES =====
function getBankDisplayName(bankCode) {
    const bankNames = {
        'BAC': 'BAC San José',
        'BN': 'Banco Nacional',
        'HuberBN': 'Huber Banco Nacional'
    };
    return bankNames[bankCode] || bankCode;
}

function formatDateForDisplay(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CR');
    } catch (error) {
        return dateString;
    }
}

function parseDate(dateString) {
    if (!dateString) return null;
    try {
        return new Date(dateString);
    } catch (error) {
        return null;
    }
}

function isClientIdInObservations(observations, clientId) {
    if (!observations || !clientId) return false;
    return observations.includes(clientId.toString());
}

// ===== FUNCIÓN PARA MOSTRAR TOAST =====
function showToast(message, type = 'info') {
    // Crear toast si no existe
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        document.body.appendChild(toast);
    }
    
    // Configurar estilo según tipo
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.textContent = message;
    
    // Mostrar toast
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
    }, 3000);
}

// ===== EXPOSICIÓN DE FUNCIONES AL SCOPE GLOBAL =====
console.log('✅ payment-management.js COMPLETO - Sistema de sugerencias inteligentes activo');
console.log('🧪 Funciones de debugging disponibles:');
console.log('  - debugSheetDBInfo() - Información de debugging');
console.log('  - testSheetDBConnection(referencia, banco) - Prueba conexión oficial');
console.log('  - quickTestUpdate(referencia, banco) - Prueba rápida oficial');
console.log('');
console.log('🎯 SISTEMA DE SUGERENCIAS INTELIGENTES:');
console.log('  ✅ loadAllUnreconciledTransactions() - Carga todas las transacciones sin conciliar');
console.log('  ✅ generateSmartSuggestions() - Genera sugerencias basadas en monto y descripción');
console.log('  ✅ switchPaymentTab() - Cambia entre tabs del modal');
console.log('  ✅ loadTransactionsTab() - Carga el tab de transacciones');
console.log('  ✅ assignTransactionToInvoice() - Asigna transacción a factura específica');
console.log('');

// ✅ FUNCIONES DE PAGOS
window.assignPaymentToInvoice = assignPaymentToInvoice;
window.applySinglePayment = applySinglePayment;
window.showPaymentDistributionModal = showPaymentDistributionModal;
window.createPaymentDistributionModal = createPaymentDistributionModal;
window.renderPaymentDistributionModal = renderPaymentDistributionModal;
window.updateDistributionCalculation = updateDistributionCalculation;
window.updateDistributionSummary = updateDistributionSummary;
window.confirmPaymentDistribution = confirmPaymentDistribution;
window.closePaymentDistributionModal = closePaymentDistributionModal;
window.updatePaymentAssignments = updatePaymentAssignments;
window.parseAssignedInvoices = parseAssignedInvoices;
window.formatAssignedInvoices = formatAssignedInvoices;
window.unassignPaymentFromInvoice = unassignPaymentFromInvoice;
window.updatePaymentAssignmentsRaw = updatePaymentAssignmentsRaw;
window.reloadDataAndRender = reloadDataAndRender;
window.loadUnassignedPayments = loadUnassignedPayments;
window.loadAssignedPayments = loadAssignedPayments;
window.updateInvoiceStatus = updateInvoiceStatus;
window.showUnassignConfirmation = showUnassignConfirmation;

// ✅ FUNCIONES DE TRANSACCIONES BANCARIAS
window.loadAllUnreconciledTransactions = loadAllUnreconciledTransactions;
window.switchPaymentTab = switchPaymentTab;
window.loadTransactionsTab = loadTransactionsTab;
window.generateSmartSuggestions = generateSmartSuggestions;
window.renderTransactionsListWithSuggestions = renderTransactionsListWithSuggestions;
window.assignTransactionToInvoice = assignTransactionToInvoice;
window.showAllSuggestions = showAllSuggestions;
window.assignTransactionManually = assignTransactionManually;

// ✅ FUNCIONES DE SINCRONIZACIÓN
window.syncWithBackendLogic = syncWithBackendLogic;
window.verifyDataConsistency = verifyDataConsistency;
window.recalculateInvoiceStates = recalculateInvoiceStates;
window.applyPaymentAutoFIFO = applyPaymentAutoFIFO;

// ✅ FUNCIONES DE DEBUGGING
window.testSheetDBConnection = testSheetDBConnection;
window.quickTestUpdate = quickTestUpdate;
window.debugSheetDBInfo = debugSheetDBInfo;

// ✅ FUNCIONES AUXILIARES
window.getBankDisplayName = getBankDisplayName;
window.formatDateForDisplay = formatDateForDisplay;
window.parseDate = parseDate;
window.isClientIdInObservations = isClientIdInObservations;
window.showToast = showToast;

console.log('🎉 Todas las funciones expuestas al scope global correctamente');

