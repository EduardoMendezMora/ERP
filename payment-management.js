// ===== FUNCIÓN DE UTILIDAD PARA CALCULAR SALDO DISPONIBLE =====
function calculateAvailableAmount(payment) {
    // Si la columna "Disponible" tiene contenido, usarla
    if (payment.Disponible && payment.Disponible.trim() !== '' && payment.Disponible !== '0') {
        // Asegurar que el parsing maneje tanto enteros como decimales
        const disponibleValue = payment.Disponible.toString().trim();
        const availableAmount = parseFloat(disponibleValue) || 0;
        console.log(`💰 Pago ${payment.Referencia}: Usando saldo disponible del backend: "${disponibleValue}" -> ₡${availableAmount.toLocaleString('es-CR')}`);
        return availableAmount;
    } else {
        // Si está vacía, calcular dinámicamente (comportamiento anterior)
        const paymentAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
        console.log(`🔍 [DEBUG CÁLCULO] Payment amount after parsing: ${paymentAmount}`);
        
        const assignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
        console.log(`🔍 [DEBUG CÁLCULO] Assignments after parsing:`, assignments);
        
        // Verificar si hay disponible en el nuevo formato
        const availableFromFormat = assignments.find(a => a.available !== null)?.available;
        if (availableFromFormat !== undefined && availableFromFormat !== null) {
            console.log(`🔍 [DEBUG CÁLCULO] Available amount from new format: ${availableFromFormat}`);
            console.log(`💰 Pago ${payment.Referencia}: Usando saldo disponible del nuevo formato: ₡${availableFromFormat.toLocaleString('es-CR')}`);
            return availableFromFormat;
        }
        
        const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
        console.log(`🔍 [DEBUG CÁLCULO] Assigned amount calculated: ${assignedAmount}`);
        
        const availableAmount = Math.max(0, paymentAmount - assignedAmount);
        console.log(`🔍 [DEBUG CÁLCULO] Available amount calculated: ${availableAmount}`);
        
        // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
        console.log(`🔍 [DEBUG CÁLCULO] === CÁLCULO SALDO DISPONIBLE ${payment.Referencia} ===`);
        console.log(`🔍 [DEBUG CÁLCULO] Créditos original: ${payment.Créditos} (tipo: ${typeof payment.Créditos})`);
        console.log(`🔍 [DEBUG CÁLCULO] BankSource: "${payment.BankSource}"`);
        console.log(`🔍 [DEBUG CÁLCULO] Payment amount calculado: ₡${paymentAmount.toLocaleString('es-CR')}`);
        console.log(`🔍 [DEBUG CÁLCULO] FacturasAsignadas: "${payment.FacturasAsignadas}"`);
        console.log(`🔍 [DEBUG CÁLCULO] Assignments parsed:`, assignments);
        console.log(`🔍 [DEBUG CÁLCULO] Assigned amount: ₡${assignedAmount.toLocaleString('es-CR')}`);
        console.log(`🔍 [DEBUG CÁLCULO] Available amount: ₡${availableAmount.toLocaleString('es-CR')}`);
        console.log(`🔍 [DEBUG CÁLCULO] FacturasAsignadas length: ${payment.FacturasAsignadas ? payment.FacturasAsignadas.length : 0}`);
        console.log(`🔍 [DEBUG CÁLCULO] FacturasAsignadas trim: "${payment.FacturasAsignadas ? payment.FacturasAsignadas.trim() : ''}"`);
        console.log(`🔍 [DEBUG CÁLCULO] === FIN DEBUG CÁLCULO ===`);
        
        console.log(`💰 Pago ${payment.Referencia}: Calculando saldo disponible dinámicamente: ₡${availableAmount.toLocaleString('es-CR')}`);
        return availableAmount;
    }
}

// ===== VARIABLES PARA DISTRIBUCIÓN DE PAGOS =====
let currentPaymentForDistribution = null;
let paymentDistributionData = [];

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
        const availableAmount = calculateAvailableAmount(payment);

        console.log(`💰 Monto total del pago: ₡${parsePaymentAmount(payment.Créditos, payment.BankSource).toLocaleString('es-CR')}`);
        console.log(`💵 Disponible para asignar: ₡${availableAmount.toLocaleString('es-CR')}`);

        if (availableAmount <= 0) {
            throw new Error('Este pago ya está completamente asignado a otras facturas');
        }

        // Verificar si hay facturas vencidas del mismo cliente que podrían pagarse
        const overdueInvoices = clientInvoices.filter(inv => 
            isInvoiceOverdue(inv) &&
            inv.NumeroFactura !== invoiceNumber
        );

        // Si hay múltiples facturas vencidas y el pago puede cubrir más de una, mostrar modal de distribución
        if (overdueInvoices.length > 0) {
            const eligibleInvoices = [invoice, ...overdueInvoices].filter(inv => {
                const baseAmount = parseAmount(inv.MontoBase || 0);
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
        const baseAmount = parseAmount(invoice.MontoBase || 0);
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

        // ===== NUEVO: ACTUALIZAR CAMPO PAGOS DE LA FACTURA =====
        // Parsear pagos previos de la factura (formato: "REF:MONTO:FECHA" o "REF:MONTO" para compatibilidad)
        const previousPayments = parseInvoicePayments(invoice.Pagos || '');
        
        // Agregar el nuevo pago
        const newPayment = {
            reference: payment.Referencia,
            bank: payment.BankSource,
            amount: amountToApply,
            date: payment.Fecha || new Date().toLocaleDateString('es-CR')
        };
        
        const updatedPayments = [...previousPayments, newPayment];
        const formattedPayments = formatInvoicePayments(updatedPayments);
        
        console.log('📝 Actualizando pagos de la factura:', formattedPayments);

        // Actualizar la factura
        const updateData = {
            Estado: newStatus,
            MontoMultas: finesUntilPayment,
            MontoTotal: newBalance > 0 ? newBalance : totalOwedUntilPayment,
            Pagos: formattedPayments // ✅ CRÍTICO: Agregar el campo Pagos
        };

        if (newStatus === 'Pagado') {
            // Guardar la fecha de la transacción bancaria exactamente como viene
            updateData.FechaPago = payment.Fecha || '';
        }

        await updateInvoiceStatus(invoice.NumeroFactura, updateData);

        // Actualizar datos locales
        Object.assign(invoice, updateData);

        // Actualizar el pago localmente
        payment.FacturasAsignadas = formatAssignedInvoices(newAssignments);

        // Si el pago está completamente asignado, removerlo de no asignados
        const totalAssigned = newAssignments.reduce((sum, a) => sum + a.amount, 0);
        const totalPayment = parsePaymentAmount(payment.Créditos, payment.BankSource);
        
        // CALCULAR ASIGNACIONES ACUMULADAS TOTALES (previas + nuevas)
        const previousAssignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
        const previouslyAssignedAmount = previousAssignments.reduce((sum, assignment) => sum + assignment.amount, 0);
        const totalAccumulatedAssignments = previouslyAssignedAmount + totalAssigned;
        
        // DEBUGGING ESPECÍFICO PARA EL PAGO PROBLEMÁTICO
        if (payment.Referencia === '970430862') {
            console.log(`🔍 [DEBUG] Pago 970430862 - Verificando asignación completa:`);
            console.log(`   - FacturasAsignadas actual: "${payment.FacturasAsignadas}"`);
            console.log(`   - previousAssignments:`, previousAssignments);
            console.log(`   - previouslyAssignedAmount: ₡${previouslyAssignedAmount.toLocaleString('es-CR')}`);
            console.log(`   - newAssignments:`, newAssignments);
            console.log(`   - totalAssigned: ₡${totalAssigned.toLocaleString('es-CR')}`);
            console.log(`   - totalAccumulatedAssignments: ₡${totalAccumulatedAssignments.toLocaleString('es-CR')}`);
            console.log(`   - totalPayment: ₡${totalPayment.toLocaleString('es-CR')}`);
            console.log(`   - Diferencia: ₡${(totalAccumulatedAssignments - totalPayment).toLocaleString('es-CR')}`);
            console.log(`   - ¿Es completamente asignado?: ${Math.abs(totalAccumulatedAssignments - totalPayment) < 0.01}`);
        }
        
        console.log(`🔍 Verificando si pago está completamente asignado:`);
        console.log(`   - Asignaciones previas: ₡${previouslyAssignedAmount.toLocaleString('es-CR')}`);
        console.log(`   - Nuevas asignaciones: ₡${totalAssigned.toLocaleString('es-CR')}`);
        console.log(`   - Total acumulado: ₡${totalAccumulatedAssignments.toLocaleString('es-CR')}`);
        console.log(`   - Monto total del pago: ₡${totalPayment.toLocaleString('es-CR')}`);

        if (Math.abs(totalAccumulatedAssignments - totalPayment) < 0.01) {
            console.log(`✅ Pago completamente asignado - Removiendo de lista no asignados`);
            const paymentIndex = unassignedPayments.findIndex(p =>
                p.Referencia === payment.Referencia && p.BankSource === payment.BankSource
            );
            if (paymentIndex > -1) {
                unassignedPayments.splice(paymentIndex, 1);
            }
        } else {
            console.log(`⚠️ Pago parcialmente asignado - Manteniendo en lista no asignados`);
            console.log(`   - Disponible restante: ₡${(totalPayment - totalAccumulatedAssignments).toLocaleString('es-CR')}`);
        }

        // Re-cargar y renderizar
        await reloadDataAndRender();

        // === NUEVA FUNCIONALIDAD: ENVIAR A WHATSAPP ===
        console.log('📱 Iniciando envío de notificación de WhatsApp...');
        
        // Preparar datos para WhatsApp
        const assignmentsForWhatsApp = [{ invoiceNumber: invoice.NumeroFactura, amount: amountToApply }];
        
        // Enviar notificación de WhatsApp en segundo plano
        sendPaymentAssignmentWhatsAppNotification(payment, assignmentsForWhatsApp, currentClient)
            .then(success => {
                if (success) {
                    console.log('✅ Notificación de WhatsApp enviada correctamente');
                } else {
                    console.warn('⚠️ No se pudo enviar la notificación de WhatsApp');
                }
            })
            .catch(error => {
                console.error('❌ Error enviando notificación de WhatsApp:', error);
            });

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
        const baseAmount = parseAmount(invoice.MontoBase || 0);
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
    // ===== NUEVA LÓGICA: USAR COLUMNA DISPONIBLE DEL BACKEND =====
    const actualAvailable = calculateAvailableAmount(currentPaymentForDistribution);

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
                // Guardar la fecha de la transacción bancaria exactamente como viene
                updateData.FechaPago = currentPaymentForDistribution.Fecha || '';
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
        
        // CALCULAR ASIGNACIONES ACUMULADAS TOTALES (previas + nuevas)
        const previousAssignments = parseAssignedInvoices(currentPaymentForDistribution.FacturasAsignadas || '');
        const previouslyAssignedAmount = previousAssignments.reduce((sum, assignment) => sum + assignment.amount, 0);
        const totalAccumulatedAssignments = previouslyAssignedAmount + totalAssigned;
        
        // DEBUGGING ESPECÍFICO PARA EL PAGO PROBLEMÁTICO
        if (currentPaymentForDistribution.Referencia === '970430862') {
            console.log(`🔍 [DEBUG] Pago 970430862 - Verificando distribución completa:`);
            console.log(`   - FacturasAsignadas actual: "${currentPaymentForDistribution.FacturasAsignadas}"`);
            console.log(`   - previousAssignments:`, previousAssignments);
            console.log(`   - previouslyAssignedAmount: ₡${previouslyAssignedAmount.toLocaleString('es-CR')}`);
            console.log(`   - newAssignments:`, newAssignments);
            console.log(`   - totalAssigned: ₡${totalAssigned.toLocaleString('es-CR')}`);
            console.log(`   - totalAccumulatedAssignments: ₡${totalAccumulatedAssignments.toLocaleString('es-CR')}`);
            console.log(`   - totalPayment: ₡${totalPayment.toLocaleString('es-CR')}`);
            console.log(`   - Diferencia: ₡${(totalAccumulatedAssignments - totalPayment).toLocaleString('es-CR')}`);
            console.log(`   - ¿Es completamente asignado?: ${Math.abs(totalAccumulatedAssignments - totalPayment) < 0.01}`);
        }
        
        // DEBUGGING ESPECÍFICO PARA LA TRANSACCIÓN PROBLEMÁTICA 970873893
        if (currentPaymentForDistribution.Referencia === '970873893') {
            console.log(`🔍 [DEBUG ESPECÍFICO] Pago 970873893 - Verificando distribución completa:`);
            console.log(`   - FacturasAsignadas actual: "${currentPaymentForDistribution.FacturasAsignadas}"`);
            console.log(`   - previousAssignments:`, previousAssignments);
            console.log(`   - previouslyAssignedAmount: ₡${previouslyAssignedAmount.toLocaleString('es-CR')}`);
            console.log(`   - newAssignments:`, newAssignments);
            console.log(`   - totalAssigned: ₡${totalAssigned.toLocaleString('es-CR')}`);
            console.log(`   - totalAccumulatedAssignments: ₡${totalAccumulatedAssignments.toLocaleString('es-CR')}`);
            console.log(`   - totalPayment: ₡${totalPayment.toLocaleString('es-CR')}`);
            console.log(`   - Diferencia: ₡${(totalAccumulatedAssignments - totalPayment).toLocaleString('es-CR')}`);
            console.log(`   - ¿Es completamente asignado?: ${Math.abs(totalAccumulatedAssignments - totalPayment) < 0.01}`);
        }
        
        console.log(`🔍 Verificando si pago distribuido está completamente asignado:`);
        console.log(`   - Asignaciones previas: ₡${previouslyAssignedAmount.toLocaleString('es-CR')}`);
        console.log(`   - Nuevas asignaciones: ₡${totalAssigned.toLocaleString('es-CR')}`);
        console.log(`   - Total acumulado: ₡${totalAccumulatedAssignments.toLocaleString('es-CR')}`);
        console.log(`   - Monto total del pago: ₡${totalPayment.toLocaleString('es-CR')}`);

        if (Math.abs(totalAccumulatedAssignments - totalPayment) < 0.01) {
            console.log(`✅ Pago distribuido completamente asignado - Removiendo de lista no asignados`);
            const paymentIndex = unassignedPayments.findIndex(p =>
                p.Referencia === currentPaymentForDistribution.Referencia &&
                p.BankSource === currentPaymentForDistribution.BankSource
            );
            if (paymentIndex > -1) {
                unassignedPayments.splice(paymentIndex, 1);
            }
        } else {
            console.log(`⚠️ Pago distribuido parcialmente asignado - Manteniendo en lista no asignados`);
            console.log(`   - Disponible restante: ₡${(totalPayment - totalAccumulatedAssignments).toLocaleString('es-CR')}`);
        }

        // Cerrar modal y recargar datos
        closePaymentDistributionModal();
        await reloadDataAndRender();

        // === NUEVA FUNCIONALIDAD: ENVIAR A WHATSAPP ===
        // Solo enviar si hay asignaciones válidas
        if (validAssignments.length > 0) {
            console.log('📱 Iniciando envío de notificación de WhatsApp...');
            
            // Preparar datos para WhatsApp
            const assignmentsForWhatsApp = validAssignments.map(item => ({
                invoiceNumber: item.invoice.NumeroFactura,
                amount: item.assignedAmount
            }));
            
            // Enviar notificación de WhatsApp en segundo plano
            sendPaymentAssignmentWhatsAppNotification(currentPaymentForDistribution, assignmentsForWhatsApp, currentClient)
                .then(success => {
                    if (success) {
                        console.log('✅ Notificación de WhatsApp enviada correctamente');
                    } else {
                        console.warn('⚠️ No se pudo enviar la notificación de WhatsApp');
                    }
                })
                .catch(error => {
                    console.error('❌ Error enviando notificación de WhatsApp:', error);
                });
        }

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

        // ===== NUEVO: CALCULAR SALDO DISPONIBLE =====
        const paymentAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
        const totalAssignedAmount = combinedAssignments.reduce((sum, assignment) => sum + assignment.amount, 0);
        const availableAmount = Math.max(0, paymentAmount - totalAssignedAmount);
        
        console.log(`💰 Cálculo de saldo disponible:`);
        console.log(`   - Monto total del pago: ₡${paymentAmount.toLocaleString('es-CR')}`);
        console.log(`   - Total asignado: ₡${totalAssignedAmount.toLocaleString('es-CR')}`);
        console.log(`   - Saldo disponible: ₡${availableAmount.toLocaleString('es-CR')}`);

        // ✅ MÉTODO OFICIAL SEGÚN DOCUMENTACIÓN
        // URL: https://sheetdb.io/api/v1/{API_ID}/{COLUMN_NAME}/{VALUE}?sheet={SHEET}
        const officialUpdateUrl = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(payment.Referencia)}?sheet=${payment.BankSource}`;

        console.log('🚀 Usando método oficial SheetDB:', officialUpdateUrl);

        // Preparar datos como JSON (según documentación oficial)
        const updateData = {
            FacturasAsignadas: formattedAssignments,
            FechaAsignacion: formatDateForStorage(new Date()),
            Disponible: availableAmount.toFixed(2), // Guardar saldo disponible con formato decimal consistente
            ID_Cliente: currentClientId // ✅ CRÍTICO: Agregar ID_Cliente para que loadAssignedPayments pueda encontrar el pago
        };

        console.log('📦 Datos a actualizar:', updateData);

        // DEBUGGING PROFUNDO: Mostrar toda la información relevante antes del PATCH
        // DEBUGGING ESPECÍFICO PARA LA TRANSACCIÓN PROBLEMÁTICA
        if (payment.Referencia === '970873893') {
            console.log('🔍 [DEBUG ESPECÍFICO] === TRANSACCIÓN 970873893 ===');
            console.log('🔍 [DEBUG ESPECÍFICO] Payment object:', payment);
            console.log('🔍 [DEBUG ESPECÍFICO] New assignments:', newAssignments);
            console.log('🔍 [DEBUG ESPECÍFICO] Combined assignments:', combinedAssignments);
            console.log('🔍 [DEBUG ESPECÍFICO] Payment amount:', paymentAmount);
            console.log('🔍 [DEBUG ESPECÍFICO] Total assigned amount:', totalAssignedAmount);
            console.log('🔍 [DEBUG ESPECÍFICO] Available amount:', availableAmount);
            console.log('🔍 [DEBUG ESPECÍFICO] Update data:', updateData);
            console.log('🔍 [DEBUG ESPECÍFICO] === FIN DEBUG ESPECÍFICO ===');
        }

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
            console.log(`✅ Saldo disponible guardado: ₡${availableAmount.toLocaleString('es-CR')}`);
            
            // DEBUGGING ESPECÍFICO PARA LA TRANSACCIÓN PROBLEMÁTICA
            if (payment.Referencia === '970873893') {
                console.log('🔍 [DEBUG ESPECÍFICO] === RESPUESTA EXITOSA 970873893 ===');
                console.log('🔍 [DEBUG ESPECÍFICO] Response result:', result);
                console.log('🔍 [DEBUG ESPECÍFICO] Available amount saved:', availableAmount);
                console.log('🔍 [DEBUG ESPECÍFICO] === FIN DEBUG RESPUESTA ===');
            }
            
            return combinedAssignments;
        }

        // Si el método oficial falla, obtener más información del error
        const errorText = await response.text();
        console.error('❌ Error en método oficial:', response.status, errorText);
        
        // DEBUGGING ESPECÍFICO PARA LA TRANSACCIÓN PROBLEMÁTICA
        if (payment.Referencia === '970873893') {
            console.log('🔍 [DEBUG ESPECÍFICO] === ERROR 970873893 ===');
            console.log('🔍 [DEBUG ESPECÍFICO] Response status:', response.status);
            console.log('🔍 [DEBUG ESPECÍFICO] Error text:', errorText);
            console.log('🔍 [DEBUG ESPECÍFICO] === FIN DEBUG ERROR ===');
        }

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

    // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
    console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] === PARSEO ASIGNACIONES ===`);
    console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] assignedString: "${assignedString}"`);
    console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] assignedString type: ${typeof assignedString}`);
    console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] assignedString length: ${assignedString.length}`);
    console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] assignedString.trim(): "${assignedString.trim()}"`);
    console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] !assignedString: ${!assignedString}`);
    console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] assignedString.trim() === '': ${assignedString.trim() === ''}`);

    try {
        // Formato esperado: "FAC-001:15000;FAC-002:25000"
        const splitAssignments = assignedString.split(';');
        console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] Split assignments:`, splitAssignments);
        
        const assignments = splitAssignments.map(assignment => {
            // Buscar el patrón: FAC-XXX:amount(available) o FAC-XXX:amount
            const match = assignment.match(/^([^:]+):(\d+)(?:\((\d+)\))?$/);
            if (match) {
                const [, invoiceNumber, amount, available] = match;
                const result = {
                    invoiceNumber: invoiceNumber.trim(),
                    amount: parseFloat(amount) || 0,
                    available: available ? parseFloat(available) : null
                };
                
                // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
                console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] Assignment parsed:`, result);
                console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] invoiceNumber.trim(): "${invoiceNumber.trim()}"`);
                console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] parseFloat(amount): ${parseFloat(amount)}`);
                console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] available: ${available ? parseFloat(available) : 'null'}`);
                
                return result;
            } else {
                // Formato legacy: FAC-XXX:amount
                const [invoiceNumber, amount] = assignment.split(':');
                const result = {
                    invoiceNumber: invoiceNumber.trim(),
                    amount: parseFloat(amount) || 0,
                    available: null
                };
                
                // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
                console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] Assignment parsed (legacy):`, result);
                console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] invoiceNumber.trim(): "${invoiceNumber.trim()}"`);
                console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] parseFloat(amount): ${parseFloat(amount)}`);
                
                return result;
            }
        }).filter(assignment => assignment.invoiceNumber && assignment.amount > 0);
        
        // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
        console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] Final assignments:`, assignments);
        console.log(`🔍 [DEBUG PARSE ASSIGNMENTS] === FIN DEBUG PARSE ASSIGNMENTS ===`);
        
        return assignments;
    } catch (error) {
        console.error('Error al parsear asignaciones:', error);
        return [];
    }
}

function formatAssignedInvoices(assignments, availableAmount = null) {
    if (!assignments || assignments.length === 0) return '';

    // Nuevo formato: "FAC-001:15000(13000);FAC-002:25000(0)" donde (13000) es el saldo disponible
    if (availableAmount !== null) {
        return assignments
            .filter(assignment => assignment.invoiceNumber && assignment.amount > 0)
            .map(assignment => `${assignment.invoiceNumber}:${assignment.amount}(${availableAmount})`)
            .join(';');
    }
    
    // Formato original: "FAC-001:15000;FAC-002:25000"
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

            const baseAmount = parseAmount(invoice.MontoBase || 0);
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

// ===== FUNCIÓN AUXILIAR PARA ACTUALIZACIÓN RAW DE ASIGNACIONES =====
async function updatePaymentAssignmentsRaw(payment, assignments) {
    try {
        const formattedAssignments = formatAssignedInvoices(assignments);
        console.log('🔄 Actualización RAW para:', payment.Referencia, 'con asignaciones:', formattedAssignments);

        // ===== NUEVO: CALCULAR SALDO DISPONIBLE =====
        const paymentAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
        const totalAssignedAmount = assignments.reduce((sum, assignment) => sum + assignment.amount, 0);
        const availableAmount = Math.max(0, paymentAmount - totalAssignedAmount);
        
        console.log(`💰 Cálculo de saldo disponible (RAW):`);
        console.log(`   - Monto total del pago: ₡${paymentAmount.toLocaleString('es-CR')}`);
        console.log(`   - Total asignado: ₡${totalAssignedAmount.toLocaleString('es-CR')}`);
        console.log(`   - Saldo disponible: ₡${availableAmount.toLocaleString('es-CR')}`);

        // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
        console.log('🔍 [DEBUG RAW] === TRANSACCIÓN RAW ===');
        console.log('🔍 [DEBUG RAW] Payment object:', payment);
        console.log('🔍 [DEBUG RAW] Assignments:', assignments);
        console.log('🔍 [DEBUG RAW] Payment amount:', paymentAmount);
        console.log('🔍 [DEBUG RAW] Total assigned amount:', totalAssignedAmount);
        console.log('🔍 [DEBUG RAW] Available amount:', availableAmount);
        console.log('🔍 [DEBUG RAW] Available amount type:', typeof availableAmount);
        console.log('🔍 [DEBUG RAW] Available amount > 0:', availableAmount > 0);
        console.log('🔍 [DEBUG RAW] Available amount is NaN:', isNaN(availableAmount));
        console.log('🔍 [DEBUG RAW] Available amount is null:', availableAmount === null);
        console.log('🔍 [DEBUG RAW] Available amount is undefined:', availableAmount === undefined);

        // Datos a actualizar
        const updateData = {
            FacturasAsignadas: formatAssignedInvoices(assignments, availableAmount), // Nuevo formato con disponible
            FechaAsignacion: assignments.length > 0 ? formatDateForStorage(new Date()) : '',
            Disponible: availableAmount.toString() // Mantener columna Disponible para compatibilidad
        };
        
        // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
        console.log('🔍 [DEBUG RAW] Update data:', updateData);
        console.log('🔍 [DEBUG RAW] Disponible value being sent:', updateData.Disponible);
        console.log('🔍 [DEBUG RAW] Disponible type:', typeof updateData.Disponible);
        console.log('🔍 [DEBUG RAW] Disponible length:', updateData.Disponible.length);
        console.log('🔍 [DEBUG RAW] Disponible === "":', updateData.Disponible === "");
        console.log('🔍 [DEBUG RAW] Disponible === "0":', updateData.Disponible === "0");
        console.log('🔍 [DEBUG RAW] JSON.stringify(updateData):', JSON.stringify(updateData));
        console.log('🔍 [DEBUG RAW] === FIN DEBUG RAW ===');

        // URL oficial según documentación
        const updateUrl = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(payment.Referencia)}?sheet=${payment.BankSource}`;
        console.log('🚀 Enviando actualización RAW oficial:', updateUrl);

        const response = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            const responseText = await response.text();
            console.log('✅ Actualización RAW oficial exitosa');
            console.log(`✅ Saldo disponible guardado: ₡${availableAmount.toLocaleString('es-CR')}`);
            console.log('✅ Response from SheetDB:', responseText);
            
            // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
            console.log('🔍 [DEBUG RAW] === RESPUESTA EXITOSA RAW ===');
            console.log('🔍 [DEBUG RAW] Available amount saved:', availableAmount);
            console.log('🔍 [DEBUG RAW] Response text:', responseText);
            console.log('🔍 [DEBUG RAW] === FIN DEBUG RESPUESTA RAW ===');
            
            return true;
        } else {
            const errorText = await response.text();
            console.error('❌ Error en actualización RAW:', response.status, errorText);
            
            // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
            console.log('🔍 [DEBUG RAW] === ERROR RAW ===');
            console.log('🔍 [DEBUG RAW] Response status:', response.status);
            console.log('🔍 [DEBUG RAW] Error text:', errorText);
            console.log('🔍 [DEBUG RAW] === FIN DEBUG ERROR RAW ===');
            
            throw new Error(`Actualización RAW fallida: HTTP ${response.status} - ${errorText}`);
        }

    } catch (error) {
        console.error('❌ Error en updatePaymentAssignmentsRaw:', error);
        throw error;
    }
}

// ===== FUNCIÓN PARA VERIFICAR ESTRUCTURA DE LA HOJA Y CAMPOS =====
async function verificarEstructuraHoja(sheet = 'BN') {
    try {
        console.log(`🔍 [VERIFICACIÓN] Verificando estructura de la hoja ${sheet}`);
        
        const url = `${API_CONFIG.PAYMENTS}?sheet=${sheet}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const paymentsData = await response.json();
            const payments = Array.isArray(paymentsData) ? paymentsData : [];
            
            if (payments.length > 0) {
                const firstPayment = payments[0];
                console.log(`🔍 [VERIFICACIÓN] Campos disponibles en la hoja ${sheet}:`);
                console.log('🔍 [VERIFICACIÓN] Objeto completo del primer pago:', firstPayment);
                
                // Verificar si existe el campo Disponible
                if ('Disponible' in firstPayment) {
                    console.log(`✅ [VERIFICACIÓN] Campo "Disponible" existe en la hoja ${sheet}`);
                    console.log(`🔍 [VERIFICACIÓN] Valor actual: "${firstPayment.Disponible}"`);
                } else {
                    console.log(`❌ [VERIFICACIÓN] Campo "Disponible" NO existe en la hoja ${sheet}`);
                    console.log(`🔍 [VERIFICACIÓN] Campos disponibles:`, Object.keys(firstPayment));
                }
                
                // Buscar la transacción específica
                const targetPayment = payments.find(p => p.Referencia === '970873893');
                if (targetPayment) {
                    console.log(`🔍 [VERIFICACIÓN] Transacción 970873893 encontrada en ${sheet}:`);
                    console.log('🔍 [VERIFICACIÓN] Datos completos:', targetPayment);
                    console.log(`🔍 [VERIFICACIÓN] Campo Disponible: "${targetPayment.Disponible}"`);
                } else {
                    console.log(`❌ [VERIFICACIÓN] Transacción 970873893 NO encontrada en ${sheet}`);
                }
            } else {
                console.log(`⚠️ [VERIFICACIÓN] No hay pagos en la hoja ${sheet}`);
            }
        } else {
            console.error(`❌ [VERIFICACIÓN] Error al consultar hoja ${sheet}:`, response.status);
        }
        
    } catch (error) {
        console.error(`❌ [VERIFICACIÓN] Error verificando hoja ${sheet}:`, error);
    }
}

// ===== FUNCIÓN PARA CORREGIR SALDO DISPONIBLE DE TRANSACCIÓN ESPECÍFICA =====
async function corregirSaldoDisponible(reference = '970873893') {
    try {
        console.log(`🔧 [CORRECCIÓN] Iniciando corrección de saldo para transacción ${reference}`);
        
        // Buscar la transacción en todas las hojas
        const sheets = ['BAC', 'BN', 'HuberBN'];
        let foundPayment = null;
        let foundSheet = null;
        
        for (const sheet of sheets) {
            try {
                const url = `${API_CONFIG.PAYMENTS}?sheet=${sheet}`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const paymentsData = await response.json();
                    const payments = Array.isArray(paymentsData) ? paymentsData : [];
                    
                    const payment = payments.find(p => p.Referencia === reference);
                    if (payment) {
                        foundPayment = payment;
                        foundSheet = sheet;
                        console.log(`🔧 [CORRECCIÓN] Transacción encontrada en hoja ${sheet}`);
                        break;
                    }
                }
            } catch (error) {
                console.error(`🔧 [CORRECCIÓN] Error consultando hoja ${sheet}:`, error);
            }
        }
        
        if (!foundPayment) {
            console.error(`🔧 [CORRECCIÓN] Transacción ${reference} no encontrada en ninguna hoja`);
            return false;
        }
        
        console.log(`🔧 [CORRECCIÓN] Datos actuales de la transacción:`, foundPayment);
        
        // Calcular el saldo disponible correcto (maneja tanto Float como String)
        const paymentAmount = parsePaymentAmount(foundPayment.Créditos, foundPayment.BankSource);
        const assignments = parseAssignedInvoices(foundPayment.FacturasAsignadas || '');
        const totalAssignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
        const correctAvailableAmount = Math.max(0, paymentAmount - totalAssignedAmount);
        
        console.log(`🔧 [CORRECCIÓN] Cálculo del saldo disponible:`);
        console.log(`   - Créditos del backend: ${foundPayment.Créditos} (tipo: ${typeof foundPayment.Créditos})`);
        console.log(`   - Monto total del pago: ₡${paymentAmount.toLocaleString('es-CR')}`);
        console.log(`   - Total asignado: ₡${totalAssignedAmount.toLocaleString('es-CR')}`);
        console.log(`   - Saldo disponible correcto: ₡${correctAvailableAmount.toLocaleString('es-CR')}`);
        console.log(`   - Saldo disponible actual: "${foundPayment.Disponible}"`);
        
        // Preparar datos para actualizar
        const updateData = {
            Disponible: correctAvailableAmount > 0 ? correctAvailableAmount.toString() : ''
        };
        
        console.log(`🔧 [CORRECCIÓN] Datos a actualizar:`, updateData);
        
        // Actualizar usando el método oficial
        const updateUrl = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(foundPayment.Referencia)}?sheet=${foundPayment.BankSource}`;
        
        const response = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`✅ [CORRECCIÓN] Saldo disponible corregido exitosamente:`, result);
            console.log(`✅ [CORRECCIÓN] Nuevo saldo disponible: ₡${correctAvailableAmount.toLocaleString('es-CR')}`);
            return true;
        } else {
            const errorText = await response.text();
            console.error(`❌ [CORRECCIÓN] Error al corregir saldo:`, response.status, errorText);
            return false;
        }
        
    } catch (error) {
        console.error(`❌ [CORRECCIÓN] Error en la corrección:`, error);
        return false;
    }
}

// ===== FUNCIÓN DE PRUEBA PARA DEBUGGING DE TRANSACCIÓN ESPECÍFICA =====
async function testDisponibleForTransaction(reference = '970873893') {
    try {
        console.log(`🧪 [TEST] Iniciando prueba para transacción ${reference}`);
        
        // Buscar la transacción en todas las hojas
        const sheets = ['BAC', 'BN', 'HuberBN'];
        let foundPayment = null;
        let foundSheet = null;
        
        for (const sheet of sheets) {
            try {
                const url = `${API_CONFIG.PAYMENTS}?sheet=${sheet}`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const paymentsData = await response.json();
                    const payments = Array.isArray(paymentsData) ? paymentsData : [];
                    
                    const payment = payments.find(p => p.Referencia === reference);
                    if (payment) {
                        foundPayment = payment;
                        foundSheet = sheet;
                        console.log(`🧪 [TEST] Transacción encontrada en hoja ${sheet}`);
                        break;
                    }
                }
            } catch (error) {
                console.error(`🧪 [TEST] Error consultando hoja ${sheet}:`, error);
            }
        }
        
        if (!foundPayment) {
            console.error(`🧪 [TEST] Transacción ${reference} no encontrada en ninguna hoja`);
            return false;
        }
        
        console.log(`🧪 [TEST] Datos de la transacción:`, foundPayment);
        
        // Simular una asignación de prueba
        const testAssignments = [{
            invoiceNumber: 'TEST-001',
            amount: 1000
        }];
        
        console.log(`🧪 [TEST] Aplicando asignación de prueba...`);
        
        // Usar updatePaymentAssignments para probar el guardado de Disponible
        const result = await updatePaymentAssignments(foundPayment, testAssignments);
        
        console.log(`🧪 [TEST] Resultado de la prueba:`, result);
        console.log(`🧪 [TEST] Prueba completada exitosamente`);
        
        return true;
        
    } catch (error) {
        console.error(`🧪 [TEST] Error en la prueba:`, error);
        return false;
    }
}

// ===== FUNCIÓN PARA PROBAR DIFERENTES MÉTODOS DE ACTUALIZACIÓN =====
async function probarMetodosActualizacion(reference = '970873893') {
    try {
        console.log(`🧪 [PRUEBA] Probando diferentes métodos de actualización para ${reference}`);
        
        // Buscar la transacción
        const sheets = ['BAC', 'BN', 'HuberBN'];
        let foundPayment = null;
        
        for (const sheet of sheets) {
            try {
                const url = `${API_CONFIG.PAYMENTS}?sheet=${sheet}`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const paymentsData = await response.json();
                    const payments = Array.isArray(paymentsData) ? paymentsData : [];
                    
                    const payment = payments.find(p => p.Referencia === reference);
                    if (payment) {
                        foundPayment = payment;
                        foundPayment.BankSource = sheet;
                        console.log(`🧪 [PRUEBA] Transacción encontrada en hoja ${sheet}`);
                        break;
                    }
                }
            } catch (error) {
                console.error(`🧪 [PRUEBA] Error consultando hoja ${sheet}:`, error);
            }
        }
        
        if (!foundPayment) {
            console.error(`🧪 [PRUEBA] Transacción ${reference} no encontrada`);
            return false;
        }
        
        console.log(`🧪 [PRUEBA] Datos de la transacción:`, foundPayment);
        
        // Calcular el saldo correcto (BACKEND YA DEVUELVE FLOAT)
        const paymentAmount = parsePaymentAmount(foundPayment.Créditos, foundPayment.BankSource);
        const assignments = parseAssignedInvoices(foundPayment.FacturasAsignadas || '');
        const totalAssignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
        const correctAvailableAmount = Math.max(0, paymentAmount - totalAssignedAmount);
        
        console.log(`🧪 [PRUEBA] Saldo correcto (BACKEND FLOAT): ₡${correctAvailableAmount.toLocaleString('es-CR')}`);
        console.log(`🧪 [PRUEBA] Créditos del backend: ${foundPayment.Créditos} (tipo: ${typeof foundPayment.Créditos})`);
        
        // MÉTODO 1: JSON con Content-Type application/json
        console.log(`🧪 [PRUEBA] === MÉTODO 1: JSON ===`);
        try {
            const updateData1 = {
                Disponible: correctAvailableAmount.toString()
            };
            
            const url1 = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(foundPayment.Referencia)}?sheet=${foundPayment.BankSource}`;
            
            const response1 = await fetch(url1, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData1)
            });
            
            console.log(`🧪 [PRUEBA] Método 1 - Status: ${response1.status}`);
            if (response1.ok) {
                const result1 = await response1.json();
                console.log(`✅ [PRUEBA] Método 1 exitoso:`, result1);
            } else {
                const error1 = await response1.text();
                console.log(`❌ [PRUEBA] Método 1 falló:`, error1);
            }
        } catch (error) {
            console.log(`❌ [PRUEBA] Método 1 error:`, error);
        }
        
        // MÉTODO 2: Form data con Content-Type application/x-www-form-urlencoded
        console.log(`🧪 [PRUEBA] === MÉTODO 2: FORM DATA ===`);
        try {
            const formData = new URLSearchParams();
            formData.append('Disponible', correctAvailableAmount.toString());
            
            const url2 = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(foundPayment.Referencia)}?sheet=${foundPayment.BankSource}`;
            
            const response2 = await fetch(url2, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString()
            });
            
            console.log(`🧪 [PRUEBA] Método 2 - Status: ${response2.status}`);
            if (response2.ok) {
                const result2 = await response2.json();
                console.log(`✅ [PRUEBA] Método 2 exitoso:`, result2);
            } else {
                const error2 = await response2.text();
                console.log(`❌ [PRUEBA] Método 2 falló:`, error2);
            }
        } catch (error) {
            console.log(`❌ [PRUEBA] Método 2 error:`, error);
        }
        
        // MÉTODO 3: Solo el campo Disponible con diferentes formatos
        console.log(`🧪 [PRUEBA] === MÉTODO 3: SOLO DISPONIBLE ===`);
        try {
            const updateData3 = {
                Disponible: correctAvailableAmount.toString()
            };
            
            const url3 = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(foundPayment.Referencia)}?sheet=${foundPayment.BankSource}`;
            
            const response3 = await fetch(url3, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData3)
            });
            
            console.log(`🧪 [PRUEBA] Método 3 - Status: ${response3.status}`);
            if (response3.ok) {
                const result3 = await response3.json();
                console.log(`✅ [PRUEBA] Método 3 exitoso:`, result3);
            } else {
                const error3 = await response3.text();
                console.log(`❌ [PRUEBA] Método 3 falló:`, error3);
            }
        } catch (error) {
            console.log(`❌ [PRUEBA] Método 3 error:`, error);
        }
        
        console.log(`🧪 [PRUEBA] === FIN DE PRUEBAS ===`);
        return true;
        
    } catch (error) {
        console.error(`❌ [PRUEBA] Error en pruebas:`, error);
        return false;
    }
}

// ===== FUNCIÓN PARA PROBAR EL PARSING DE MONTOS =====
function probarParsingMontos() {
    console.log(`🧪 [PRUEBA PARSING] === PRUEBA DE PARSING DE MONTOS ===`);
    
    // Probar con el monto problemático (string que viene del backend)
    const montoProblematico = '60.000,00'; // String del backend
    const bankSource = 'BAC';
    
    console.log(`🧪 [PRUEBA PARSING] Monto original: ${montoProblematico} (tipo: ${typeof montoProblematico})`);
    console.log(`🧪 [PRUEBA PARSING] Banco: "${bankSource}"`);
    
    // Probar función actualizada
    const resultado = parsePaymentAmount(montoProblematico, bankSource);
    console.log(`🧪 [PRUEBA PARSING] Resultado: ${resultado}`);
    
    // Probar diferentes formatos posibles
    const valoresPrueba = [
        '60.000,00',  // String con formato BAC
        '60000',      // String numérico
        60000,        // Float
        60000.0,      // Float con decimal
        '47000',      // String numérico
        47000,        // Float
        '13.000,00',  // String con formato BAC
        13000         // Float
    ];
    
    console.log(`🧪 [PRUEBA PARSING] === PRUEBA DE DIFERENTES FORMATOS ===`);
    valoresPrueba.forEach(valor => {
        const resultado = parsePaymentAmount(valor, bankSource);
        console.log(`🧪 [PRUEBA PARSING] ${valor} (${typeof valor}) -> ${resultado}`);
    });
    
    console.log(`🧪 [PRUEBA PARSING] === FIN PRUEBA PARSING ===`);
    
    return {
        montoOriginal: montoProblematico,
        resultado: resultado,
        valores: valoresPrueba.map(v => ({ valor: v, resultado: parsePaymentAmount(v, bankSource) }))
    };
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
                        // ===== NUEVA LÓGICA: USAR COLUMNA DISPONIBLE DEL BACKEND =====
                        const availableAmount = calculateAvailableAmount(payment);

                        // DEBUGGING ESPECÍFICO PARA EL PAGO PROBLEMÁTICO
                        if (payment.Referencia === '970430862') {
                            console.log(`🔍 [DEBUG] Pago 970430862 en ${sheet}:`);
                            console.log(`   - Créditos: "${payment.Créditos}"`);
                            console.log(`   - FacturasAsignadas: "${payment.FacturasAsignadas}"`);
                            console.log(`   - Disponible (backend): "${payment.Disponible}"`);
                            console.log(`   - availableAmount: ₡${availableAmount.toLocaleString('es-CR')}`);
                            console.log(`   - Condición (monto disponible): ${availableAmount > 0.01}`);
                        }
                        
                        // DEBUGGING ESPECÍFICO PARA LA TRANSACCIÓN PROBLEMÁTICA 970873893
                        // DEBUGGING COMPLETO PARA TODAS LAS TRANSACCIONES
                        console.log(`🔍 [DEBUG LOAD] Pago ${payment.Referencia} en ${sheet}:`);
                        console.log(`   - Créditos: "${payment.Créditos}"`);
                        console.log(`   - FacturasAsignadas: "${payment.FacturasAsignadas}"`);
                        console.log(`   - Disponible (backend): "${payment.Disponible}"`);
                        console.log(`   - availableAmount: ₡${availableAmount.toLocaleString('es-CR')}`);
                        console.log(`   - Condición (monto disponible): ${availableAmount > 0.01}`);
                        console.log(`   - Payment object completo:`, payment);

                        // Mostrar transacción si tiene saldo disponible
                        return availableAmount > 0.01;
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

                    // Filtrar pagos relacionados al cliente (misma lógica que loadUnassignedPayments)
                    const clientRelatedPayments = payments.filter(payment => {
                        // Caso 1: ID_Cliente coincide directamente
                        if (payment.ID_Cliente && payment.ID_Cliente.toString() === clientId.toString()) {
                            payment._matchReason = 'ID_Cliente directo';
                            console.log(`🔍 Pago ${payment.Referencia} encontrado por ID_Cliente directo`);
                            return true;
                        }

                        // Caso 2: ID_Cliente está en Observaciones
                        if (payment.Observaciones &&
                            isClientIdInObservations(payment.Observaciones, clientId)) {
                            payment._matchReason = 'ID en Observaciones';
                            console.log(`🔍 Pago ${payment.Referencia} encontrado por ID en Observaciones`);
                            return true;
                        }

                        return false;
                    });

                    // Filtrar pagos que SÍ tienen asignaciones
                    const assigned = clientRelatedPayments.filter(payment => {
                        const hasAssignments = payment.FacturasAsignadas && payment.FacturasAsignadas.trim() !== '';
                        if (hasAssignments) {
                            console.log(`✅ Pago ${payment.Referencia} tiene asignaciones: "${payment.FacturasAsignadas}"`);
                        }
                        return hasAssignments;
                    });

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

// ===== FUNCIÓN PARA ENVIAR NOTIFICACIÓN DE WHATSAPP AL ASIGNAR PAGOS =====
async function sendPaymentAssignmentWhatsAppNotification(payment, assignments, client) {
    try {
        console.log('📱 Enviando notificación de WhatsApp para asignación de pago:', payment.Referencia);
        
        // Obtener información del usuario (puedes personalizar esto)
        const userName = getCurrentUserName();
        
        // Formatear información del banco
        let bankInfo = '';
        switch (payment.BankSource) {
            case 'BAC':
                bankInfo = '🔵 BAC San José';
                break;
            case 'BN':
                bankInfo = '🟢 Banco Nacional';
                break;
            case 'HuberBN':
                bankInfo = '🟡 Huber BN';
                break;
            case 'AutosubastasBAC':
                bankInfo = '🟠 Autosubastas BAC';
                break;
            case 'AutosubastasBN':
                bankInfo = '🟣 Autosubastas BN';
                break;
            default:
                bankInfo = payment.BankSource;
        }
        
        // Formatear asignaciones
        let assignmentsText = '';
        if (assignments && assignments.length > 0) {
            assignmentsText = assignments.map(assignment => 
                `   • Factura ${assignment.invoiceNumber}: ₡${assignment.amount.toLocaleString('es-CR')}`
            ).join('\n');
        }
        
        // Calcular total asignado
        const totalAssigned = assignments.reduce((sum, a) => sum + a.amount, 0);
        const totalPayment = parsePaymentAmount(payment.Créditos, payment.BankSource);
        
        // Crear mensaje de WhatsApp
        const message = `*💰 PAGO ASIGNADO A FACTURAS*

${bankInfo}
📅 *Fecha Pago:* ${formatDateForDisplay(payment.Fecha)}
🔢 *Referencia:* ${payment.Referencia}
💰 *Monto Total:* ${totalPayment.toLocaleString('es-CR')} colones

👤 *Cliente:* ${client ? client.Nombre : 'N/A'}
🆔 *ID Cliente:* ${client ? client.ID : 'N/A'}

📋 *Facturas Asignadas:*
${assignmentsText}

💵 *Total Asignado:* ₡${totalAssigned.toLocaleString('es-CR')}
${totalAssigned < totalPayment ? `⚠️ *Pendiente:* ₡${(totalPayment - totalAssigned).toLocaleString('es-CR')}` : '✅ *Completamente asignado*'}

👤 *Asignado por:* ${userName}
⏰ *Hora:* ${new Date().toLocaleString('es-CR')}

---
_Sistema de Gestión de Facturas_`;

        // Configurar la llamada a la API de UltraMsg
        const apiUrl = `${ULTRAMSG_CONFIG.BASE_URL}/${ULTRAMSG_CONFIG.INSTANCE_ID}/messages/chat`;
        
        const requestBody = {
            token: ULTRAMSG_CONFIG.TOKEN,
            to: '120363403929811504@g.us', // Mismo grupo que transacciones
            body: message,
            priority: 1
        };

        console.log('📡 Enviando a UltraMsg API:', apiUrl);
        console.log('📝 Mensaje:', message.substring(0, 100) + '...');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();
        console.log('📱 Respuesta de UltraMsg:', responseData);

        if (response.ok && responseData.sent) {
            console.log('✅ Mensaje de WhatsApp enviado exitosamente');
            return true;
        } else {
            console.error('❌ Error enviando mensaje de WhatsApp:', responseData);
            return false;
        }

    } catch (error) {
        console.error('❌ Error en sendPaymentAssignmentWhatsAppNotification:', error);
        return false;
    }
}

// ===== FUNCIÓN AUXILIAR: OBTENER NOMBRE DEL USUARIO =====
function getCurrentUserName() {
    // Puedes personalizar esto para obtener el nombre del usuario actual
    // Por ahora retorna un nombre genérico, pero puedes implementar:
    // - Obtener de localStorage
    // - Obtener de una cookie
    // - Obtener de un campo en la interfaz
    // - Obtener del sistema de autenticación
    return 'Usuario Sistema';
}

// ===== EXPORTAR FUNCIONES GLOBALMENTE =====
window.calculateAvailableAmount = calculateAvailableAmount;
window.assignPaymentToInvoice = assignPaymentToInvoice;
window.applySinglePayment = applySinglePayment;
window.showPaymentDistributionModal = showPaymentDistributionModal;
window.closePaymentDistributionModal = closePaymentDistributionModal;
window.updatePaymentAssignments = updatePaymentAssignments;
window.updatePaymentAssignmentsRaw = updatePaymentAssignmentsRaw;
window.unassignPaymentFromInvoice = unassignPaymentFromInvoice;
window.loadUnassignedPayments = loadUnassignedPayments;
window.loadAssignedPayments = loadAssignedPayments;
window.updateInvoiceStatus = updateInvoiceStatus;
window.showUnassignConfirmation = showUnassignConfirmation;
window.testSheetDBConnection = testSheetDBConnection;
window.quickTestUpdate = quickTestUpdate;
window.debugSheetDBInfo = debugSheetDBInfo;
window.sendPaymentAssignmentWhatsAppNotification = sendPaymentAssignmentWhatsAppNotification;
window.getCurrentUserName = getCurrentUserName;
window.testDisponibleForTransaction = testDisponibleForTransaction;
window.corregirSaldoDisponible = corregirSaldoDisponible;
window.verificarEstructuraHoja = verificarEstructuraHoja;
window.probarMetodosActualizacion = probarMetodosActualizacion;
window.probarParsingMontos = probarParsingMontos;

console.log('✅ payment-management.js COMPLETO - Usando método oficial SheetDB + WhatsApp');
console.log('🧪 Funciones de debugging disponibles:');
console.log('  - debugSheetDBInfo() - Información de debugging');
console.log('  - testSheetDBConnection(referencia, banco) - Prueba conexión oficial');
console.log('  - quickTestUpdate(referencia, banco) - Prueba rápida oficial');
console.log('  - testDisponibleForTransaction(referencia) - Prueba guardado de Disponible');
console.log('  - corregirSaldoDisponible(referencia) - Corregir saldo disponible de transacción');
console.log('  - verificarEstructuraHoja(hoja) - Verificar estructura y campos de la hoja');
console.log('  - probarMetodosActualizacion(referencia) - Probar diferentes métodos de actualización');
console.log('  - probarParsingMontos() - Probar parsing de montos BAC');
console.log('');
console.log('📱 NUEVA FUNCIONALIDAD WHATSAPP:');
console.log('  ✅ Envío automático de notificaciones al asignar pagos');
console.log('  ✅ Mismo grupo que transacciones: 120363403929811504@g.us');
console.log('  ✅ Formato detallado con facturas asignadas y montos');
console.log('  ✅ Envío en segundo plano sin interrumpir la UI');
console.log('');
console.log('🔧 CAMBIO PRINCIPAL:');
console.log('  ✅ Usando método OFICIAL: PATCH /Referencia/X?sheet=Y');
console.log('  ✅ Con Content-Type: application/x-www-form-urlencoded');
console.log('  ✅ Datos en body como URLSearchParams (según documentación)');
console.log('');
console.log('🎯 Para probar: testSheetDBConnection("18475172", "BN")');

// ===== FUNCIÓN DE PRUEBA PARA VERIFICAR PARSING DE MONTOS =====
function testParsingProblematicAmount() {
    console.log(`🧪 [PRUEBA PARSING] === PRUEBA ESPECÍFICA PARA 970873893 ===`);
    
    // Simular el monto problemático que viene del backend
    const montoProblematico = '60.000,00';
    const bankSource = 'BAC';
    
    console.log(`🧪 [PRUEBA PARSING] Monto original: ${montoProblematico} (tipo: ${typeof montoProblematico})`);
    console.log(`🧪 [PRUEBA PARSING] Banco: "${bankSource}"`);
    
    // Probar la función parsePaymentAmount
    const resultado = parsePaymentAmount(montoProblematico, bankSource);
    console.log(`🧪 [PRUEBA PARSING] Resultado parsePaymentAmount: ${resultado}`);
    
    // Simular el cálculo completo
    const paymentAmount = resultado;
    const assignedAmount = 47000; // FAC-19511:47000
    const availableAmount = paymentAmount - assignedAmount;
    
    console.log(`🧪 [PRUEBA PARSING] Cálculo completo:`);
    console.log(`   - Payment amount: ₡${paymentAmount.toLocaleString('es-CR')}`);
    console.log(`   - Assigned amount: ₡${assignedAmount.toLocaleString('es-CR')}`);
    console.log(`   - Available amount: ₡${availableAmount.toLocaleString('es-CR')}`);
    
    console.log(`🧪 [PRUEBA PARSING] === FIN PRUEBA ===`);
    
    return {
        montoOriginal: montoProblematico,
        resultado: resultado,
        availableAmount: availableAmount
    };
}

// ===== FUNCIÓN DE PRUEBA COMPLETA PARA LA TRANSACCIÓN PROBLEMÁTICA =====
async function testCompletePaymentAssignment() {
    console.log(`🧪 [PRUEBA COMPLETA] === PRUEBA COMPLETA PARA 970873893 ===`);
    
    // Simular el objeto de pago como viene del backend
    const mockPayment = {
        Fecha: '03/08/2025',
        Referencia: '970873893',
        Descripción: 'SINPE MOVIL Abono_Carro_CBY419',
        Créditos: '60.000,00', // String del backend
        BankSource: 'BAC',
        Observaciones: 'Conciliada con factura - FAC-19511:47000',
        FacturasAsignadas: 'FAC-19511:47000'
    };
    
    console.log(`🧪 [PRUEBA COMPLETA] Mock payment object:`, mockPayment);
    
    // 1. Probar parsePaymentAmount
    const paymentAmount = parsePaymentAmount(mockPayment.Créditos, mockPayment.BankSource);
    console.log(`🧪 [PRUEBA COMPLETA] 1. Payment amount parsed: ${paymentAmount}`);
    
    // 2. Probar parseAssignedInvoices
    const assignments = parseAssignedInvoices(mockPayment.FacturasAsignadas);
    console.log(`🧪 [PRUEBA COMPLETA] 2. Assignments parsed:`, assignments);
    
    // 3. Calcular monto asignado
    const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
    console.log(`🧪 [PRUEBA COMPLETA] 3. Assigned amount: ${assignedAmount}`);
    
    // 4. Calcular saldo disponible
    const availableAmount = Math.max(0, paymentAmount - assignedAmount);
    console.log(`🧪 [PRUEBA COMPLETA] 4. Available amount: ${availableAmount}`);
    
    // 5. Probar calculateAvailableAmount
    const calculatedAvailable = calculateAvailableAmount(mockPayment);
    console.log(`🧪 [PRUEBA COMPLETA] 5. calculateAvailableAmount result: ${calculatedAvailable}`);
    
    // 6. Simular datos de actualización
    const updateData = {
        FacturasAsignadas: mockPayment.FacturasAsignadas,
        FechaAsignacion: formatDateForStorage(new Date()),
        Disponible: availableAmount > 0 ? availableAmount.toString() : ''
    };
    
    console.log(`🧪 [PRUEBA COMPLETA] 6. Update data que se enviaría:`, updateData);
    
    console.log(`🧪 [PRUEBA COMPLETA] === RESUMEN ===`);
    console.log(`   - Monto original: ${mockPayment.Créditos} (${typeof mockPayment.Créditos})`);
    console.log(`   - Monto parseado: ${paymentAmount}`);
    console.log(`   - Monto asignado: ${assignedAmount}`);
    console.log(`   - Saldo disponible: ${availableAmount}`);
    console.log(`   - Disponible a guardar: "${updateData.Disponible}"`);
    console.log(`🧪 [PRUEBA COMPLETA] === FIN PRUEBA COMPLETA ===`);
    
    return {
        paymentAmount,
        assignedAmount,
        availableAmount,
        updateData
    };
}

// ===== FUNCIÓN DE PRUEBA PARA VERIFICAR CÁLCULO 970873893 =====
function testCalculation970873893() {
    console.log('🧪 [PRUEBA CÁLCULO] === PRUEBA ESPECÍFICA PARA 970873893 ===');
    
    // Simular los datos del pago problemático
    const payment = {
        Referencia: '970873893',
        Créditos: '60.000,00',
        BankSource: 'BAC',
        FacturasAsignadas: 'FAC-19511:47000'
    };
    
    // Simular las asignaciones
    const assignments = [
        { invoiceNumber: 'FAC-19511', amount: 47000 }
    ];
    
    console.log('🧪 [PRUEBA CÁLCULO] Payment object:', payment);
    console.log('🧪 [PRUEBA CÁLCULO] Assignments:', assignments);
    
    // Calcular usando la misma lógica que updatePaymentAssignmentsRaw
    const paymentAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
    const totalAssignedAmount = assignments.reduce((sum, assignment) => sum + assignment.amount, 0);
    const availableAmount = Math.max(0, paymentAmount - totalAssignedAmount);
    
    console.log('🧪 [PRUEBA CÁLCULO] Payment amount:', paymentAmount);
    console.log('🧪 [PRUEBA CÁLCULO] Total assigned amount:', totalAssignedAmount);
    console.log('🧪 [PRUEBA CÁLCULO] Available amount:', availableAmount);
    console.log('🧪 [PRUEBA CÁLCULO] Available amount type:', typeof availableAmount);
    console.log('🧪 [PRUEBA CÁLCULO] Available amount > 0:', availableAmount > 0);
    console.log('🧪 [PRUEBA CÁLCULO] Disponible value:', availableAmount.toString());
    console.log('🧪 [PRUEBA CÁLCULO] Disponible type:', typeof availableAmount.toString());
    console.log('🧪 [PRUEBA CÁLCULO] Disponible length:', availableAmount.toString().length);
    console.log('🧪 [PRUEBA CÁLCULO] Disponible === "":', availableAmount.toString() === "");
    console.log('🧪 [PRUEBA CÁLCULO] Disponible === "0":', availableAmount.toString() === "0");
    
    // Simular el updateData
    const updateData = {
        FacturasAsignadas: 'FAC-19511:47000',
        FechaAsignacion: formatDateForStorage(new Date()),
        Disponible: availableAmount.toString()
    };
    
    console.log('🧪 [PRUEBA CÁLCULO] Update data:', updateData);
    console.log('🧪 [PRUEBA CÁLCULO] JSON.stringify(updateData):', JSON.stringify(updateData));
    console.log('🧪 [PRUEBA CÁLCULO] === FIN PRUEBA CÁLCULO ===');
    
    return {
        paymentAmount,
        totalAssignedAmount,
        availableAmount,
        updateData
    };
}

// Función disponible para pruebas manuales
// testCalculation970873893();

// ===== FUNCIÓN DE PRUEBA PARA DIAGNOSTICAR 970873893 =====
function test970873893Calculation() {
    console.log('🧪 [PRUEBA DIAGNÓSTICO] === PRUEBA ESPECÍFICA PARA 970873893 ===');
    
    // Simular los datos exactos del problema
    const testPayment = {
        Referencia: '970873893',
        Créditos: '60.000,00',
        BankSource: 'BAC',
        FacturasAsignadas: 'FAC-19511:47000'
    };
    
    console.log('🧪 [PRUEBA DIAGNÓSTICO] Datos de prueba:', testPayment);
    
    // Probar parsePaymentAmount
    const paymentAmount = parsePaymentAmount(testPayment.Créditos, testPayment.BankSource);
    console.log('🧪 [PRUEBA DIAGNÓSTICO] Payment amount parsed:', paymentAmount);
    
    // Probar parseAssignedInvoices
    const assignments = parseAssignedInvoices(testPayment.FacturasAsignadas);
    console.log('🧪 [PRUEBA DIAGNÓSTICO] Assignments parsed:', assignments);
    
    // Probar cálculo manual
    const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
    console.log('🧪 [PRUEBA DIAGNÓSTICO] Assigned amount:', assignedAmount);
    
    const availableAmount = Math.max(0, paymentAmount - assignedAmount);
    console.log('🧪 [PRUEBA DIAGNÓSTICO] Available amount calculated:', availableAmount);
    
    // Probar calculateAvailableAmount
    const result = calculateAvailableAmount(testPayment);
    console.log('🧪 [PRUEBA DIAGNÓSTICO] calculateAvailableAmount result:', result);
    
    console.log('🧪 [PRUEBA DIAGNÓSTICO] === FIN PRUEBA DIAGNÓSTICO ===');
    
    return {
        paymentAmount,
        assignments,
        assignedAmount,
        availableAmount,
        result
    };
}

// Ejecutar la prueba automáticamente
test970873893Calculation();

// ===== FUNCIÓN PARA DEMOSTRAR EL NUEVO FORMATO SUGERIDO =====
function demonstrateNewFormat() {
    console.log('💡 [NUEVO FORMATO] === DEMOSTRACIÓN DEL FORMATO SUGERIDO ===');
    
    // Formato actual: "FAC-19511:47000"
    // Formato sugerido: "FAC-19511:47000(13000)" donde (13000) es el saldo disponible
    
    const currentFormat = 'FAC-19511:47000';
    const newFormat = 'FAC-19511:47000(13000)';
    
    console.log('💡 [NUEVO FORMATO] Formato actual:', currentFormat);
    console.log('💡 [NUEVO FORMATO] Formato sugerido:', newFormat);
    console.log('💡 [NUEVO FORMATO] Ventajas del nuevo formato:');
    console.log('   - El saldo disponible está integrado en la asignación');
    console.log('   - Fácil de interpretar: FAC-19511:47000(13000)');
    console.log('   - No necesita columna separada "Disponible"');
    console.log('   - Más compacto y legible');
    
    // Función para parsear el nuevo formato
    function parseNewFormat(assignedString) {
        if (!assignedString || assignedString.trim() === '') return [];
        
        const assignments = [];
        const parts = assignedString.split(';');
        
        for (const part of parts) {
            // Buscar el patrón: FAC-XXX:amount(available)
            const match = part.match(/^([^:]+):(\d+)(?:\((\d+)\))?$/);
            if (match) {
                const [, invoiceNumber, amount, available] = match;
                assignments.push({
                    invoiceNumber: invoiceNumber.trim(),
                    amount: parseFloat(amount) || 0,
                    available: available ? parseFloat(available) : 0
                });
            }
        }
        
        return assignments;
    }
    
    // Probar el nuevo formato
    const parsedNew = parseNewFormat(newFormat);
    console.log('💡 [NUEVO FORMATO] Parseado del nuevo formato:', parsedNew);
    
    // Función para formatear el nuevo formato
    function formatNewFormat(assignments, availableAmount) {
        if (!assignments || assignments.length === 0) return '';
        
        return assignments
            .filter(assignment => assignment.invoiceNumber && assignment.amount > 0)
            .map(assignment => `${assignment.invoiceNumber}:${assignment.amount}(${availableAmount})`)
            .join(';');
    }
    
    const formattedNew = formatNewFormat(parsedNew, 13000);
    console.log('💡 [NUEVO FORMATO] Formateado del nuevo formato:', formattedNew);
    
    console.log('💡 [NUEVO FORMATO] === FIN DEMOSTRACIÓN ===');
    
    return {
        currentFormat,
        newFormat,
        parsedNew,
        formattedNew
    };
}

// Ejecutar la demostración
demonstrateNewFormat();

// ===== FUNCIÓN DE PRUEBA PARA VERIFICAR GUARDADO EN CAMPO DISPONIBLE =====
async function testDisponibleFieldSaving(paymentReference = '970873893', bankSource = 'BN') {
    try {
        console.log(`🧪 [TEST] Verificando guardado en campo "Disponible" para pago ${paymentReference}`);
        
        // 1. Buscar el pago actual
        const searchUrl = `${API_CONFIG.PAYMENTS}/search?Referencia=${encodeURIComponent(paymentReference)}&sheet=${bankSource}`;
        const searchResponse = await fetch(searchUrl);
        
        if (!searchResponse.ok) {
            throw new Error(`Error al buscar pago: HTTP ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        if (searchData.length === 0) {
            throw new Error(`Pago ${paymentReference} no encontrado en ${bankSource}`);
        }
        
        const payment = searchData[0];
        console.log(`🧪 [TEST] Pago encontrado:`, payment);
        console.log(`🧪 [TEST] Campo "Disponible" actual: "${payment.Disponible}"`);
        
        // 2. Calcular nuevo valor disponible
        const paymentAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
        const currentAssignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
        const totalAssignedAmount = currentAssignments.reduce((sum, assignment) => sum + assignment.amount, 0);
        const newAvailableAmount = Math.max(0, paymentAmount - totalAssignedAmount);
        
        console.log(`🧪 [TEST] Cálculo de disponible:`);
        console.log(`   - Monto total del pago: ₡${paymentAmount.toLocaleString('es-CR')}`);
        console.log(`   - Total asignado: ₡${totalAssignedAmount.toLocaleString('es-CR')}`);
        console.log(`   - Nuevo disponible: ₡${newAvailableAmount.toLocaleString('es-CR')}`);
        
        // 3. Actualizar solo el campo "Disponible"
        const updateUrl = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(paymentReference)}?sheet=${bankSource}`;
        const updateData = {
            Disponible: newAvailableAmount.toString()
        };
        
        console.log(`🧪 [TEST] Enviando actualización:`, updateData);
        
        const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        if (updateResponse.ok) {
            const result = await updateResponse.json();
            console.log(`✅ [TEST] Campo "Disponible" actualizado exitosamente:`, result);
            
            // 4. Verificar que se guardó correctamente
            const verifyResponse = await fetch(searchUrl);
            const verifyData = await verifyResponse.json();
            const updatedPayment = verifyData[0];
            
            console.log(`🧪 [TEST] Verificación post-actualización:`);
            console.log(`   - Campo "Disponible" guardado: "${updatedPayment.Disponible}"`);
            console.log(`   - Valor esperado: "${newAvailableAmount.toString()}"`);
            console.log(`   - ¿Coinciden?: ${updatedPayment.Disponible === newAvailableAmount.toString()}`);
            
            if (updatedPayment.Disponible === newAvailableAmount.toString()) {
                console.log(`✅ [TEST] ¡ÉXITO! El campo "Disponible" se guardó correctamente`);
                return true;
            } else {
                console.log(`❌ [TEST] ERROR: El campo "Disponible" no se guardó correctamente`);
                return false;
            }
        } else {
            const errorText = await updateResponse.text();
            console.error(`❌ [TEST] Error al actualizar: HTTP ${updateResponse.status} - ${errorText}`);
            return false;
        }
        
    } catch (error) {
        console.error(`❌ [TEST] Error en testDisponibleFieldSaving:`, error);
        return false;
    }
}

// ===== FUNCIÓN PARA ACTUALIZAR TODOS LOS PAGOS CON CAMPO DISPONIBLE =====
async function updateAllPaymentsWithDisponible(sheet = 'BN') {
    try {
        console.log(`🔄 [BATCH UPDATE] Actualizando campo "Disponible" para todos los pagos en ${sheet}`);
        
        // 1. Obtener todos los pagos de la hoja
        const url = `${API_CONFIG.PAYMENTS}?sheet=${sheet}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error al obtener pagos: HTTP ${response.status}`);
        }
        
        const paymentsData = await response.json();
        const payments = Array.isArray(paymentsData) ? paymentsData : [];
        
        console.log(`📊 [BATCH UPDATE] Total pagos encontrados en ${sheet}: ${payments.length}`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // 2. Procesar cada pago
        for (const payment of payments) {
            try {
                console.log(`🔄 [BATCH UPDATE] Procesando pago ${payment.Referencia}...`);
                
                // Calcular disponible
                const paymentAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
                const currentAssignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
                const totalAssignedAmount = currentAssignments.reduce((sum, assignment) => sum + assignment.amount, 0);
                const availableAmount = Math.max(0, paymentAmount - totalAssignedAmount);
                
                // Verificar si necesita actualización
                const currentDisponible = payment.Disponible || '';
                const newDisponible = availableAmount.toString();
                
                if (currentDisponible !== newDisponible) {
                    console.log(`📝 [BATCH UPDATE] Actualizando ${payment.Referencia}:`);
                    console.log(`   - Disponible actual: "${currentDisponible}"`);
                    console.log(`   - Disponible nuevo: "${newDisponible}"`);
                    
                    // Actualizar en el backend
                    const updateUrl = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(payment.Referencia)}?sheet=${sheet}`;
                    const updateData = {
                        Disponible: newDisponible
                    };
                    
                    const updateResponse = await fetch(updateUrl, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updateData)
                    });
                    
                    if (updateResponse.ok) {
                        console.log(`✅ [BATCH UPDATE] Pago ${payment.Referencia} actualizado exitosamente`);
                        successCount++;
                    } else {
                        const errorText = await updateResponse.text();
                        console.error(`❌ [BATCH UPDATE] Error al actualizar ${payment.Referencia}: HTTP ${updateResponse.status} - ${errorText}`);
                        errorCount++;
                    }
                } else {
                    console.log(`✅ [BATCH UPDATE] Pago ${payment.Referencia} ya tiene el valor correcto: "${currentDisponible}"`);
                    successCount++;
                }
                
                // Pequeña pausa para no sobrecargar la API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`❌ [BATCH UPDATE] Error procesando pago ${payment.Referencia}:`, error);
                errorCount++;
            }
        }
        
        console.log(`📊 [BATCH UPDATE] Resumen de actualización en ${sheet}:`);
        console.log(`   - Total procesados: ${payments.length}`);
        console.log(`   - Exitosos: ${successCount}`);
        console.log(`   - Errores: ${errorCount}`);
        
        return { total: payments.length, success: successCount, errors: errorCount };
        
    } catch (error) {
        console.error(`❌ [BATCH UPDATE] Error en updateAllPaymentsWithDisponible:`, error);
        throw error;
    }
}

// ===== FUNCIÓN PARA ACTUALIZAR CAMPO DISPONIBLE EN TODOS LOS BANCOS =====
async function updateDisponibleInAllBanks() {
    try {
        console.log(`🌐 [GLOBAL UPDATE] Iniciando actualización de campo "Disponible" en todos los bancos`);
        
        const banks = ['BAC', 'BN', 'HuberBN'];
        const results = {};
        
        for (const bank of banks) {
            try {
                console.log(`🏦 [GLOBAL UPDATE] Procesando banco: ${bank}`);
                const result = await updateAllPaymentsWithDisponible(bank);
                results[bank] = result;
                console.log(`✅ [GLOBAL UPDATE] Banco ${bank} completado:`, result);
            } catch (error) {
                console.error(`❌ [GLOBAL UPDATE] Error en banco ${bank}:`, error);
                results[bank] = { error: error.message };
            }
        }
        
        // Resumen final
        console.log(`📊 [GLOBAL UPDATE] Resumen final de actualización:`);
        let totalProcessed = 0;
        let totalSuccess = 0;
        let totalErrors = 0;
        
        for (const [bank, result] of Object.entries(results)) {
            if (result.error) {
                console.log(`❌ ${bank}: Error - ${result.error}`);
                totalErrors++;
            } else {
                console.log(`✅ ${bank}: ${result.success}/${result.total} exitosos, ${result.errors} errores`);
                totalProcessed += result.total;
                totalSuccess += result.success;
                totalErrors += result.errors;
            }
        }
        
        console.log(`🎯 [GLOBAL UPDATE] Total general: ${totalSuccess}/${totalProcessed} exitosos, ${totalErrors} errores`);
        
        return results;
        
    } catch (error) {
        console.error(`❌ [GLOBAL UPDATE] Error en updateDisponibleInAllBanks:`, error);
        throw error;
    }
}

// ===== EXPOSICIÓN GLOBAL DE FUNCIONES =====
window.parseAssignedInvoices = parseAssignedInvoices;
window.formatAssignedInvoices = formatAssignedInvoices;
window.calculateAvailableAmount = calculateAvailableAmount;
window.loadUnassignedPayments = loadUnassignedPayments;
window.loadAssignedPayments = loadAssignedPayments;
window.updateInvoiceStatus = updateInvoiceStatus;
window.assignPaymentToInvoice = assignPaymentToInvoice;
window.updatePaymentAssignments = updatePaymentAssignments;
window.updatePaymentAssignmentsRaw = updatePaymentAssignmentsRaw;
window.reloadDataAndRender = reloadDataAndRender;
window.sendPaymentAssignmentWhatsAppNotification = sendPaymentAssignmentWhatsAppNotification;
window.showPaymentDistributionModal = showPaymentDistributionModal;
window.closePaymentDistributionModal = closePaymentDistributionModal;
window.unassignPaymentFromInvoice = unassignPaymentFromInvoice;
window.showUnassignConfirmation = showUnassignConfirmation;
window.testDisponibleForTransaction = testDisponibleForTransaction;
window.corregirSaldoDisponible = corregirSaldoDisponible;
window.updateAllPaymentsWithDisponible = updateAllPaymentsWithDisponible;
window.updateDisponibleInAllBanks = updateDisponibleInAllBanks;