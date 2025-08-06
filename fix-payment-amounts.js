// ===== SCRIPT PARA CORREGIR MONTOS INCORRECTOS EN PAGOS =====

console.log('🔧 === SCRIPT DE CORRECCIÓN DE MONTOS DE PAGOS ===');

// Función para identificar pagos con montos incorrectos
async function identifyIncorrectPayments() {
    console.log('🔍 Identificando pagos con montos incorrectos...');
    
    const sheets = ['BAC', 'BN', 'HuberBN'];
    const problematicPayments = [];
    
    for (const sheet of sheets) {
        try {
            console.log(`📋 Revisando ${sheet}...`);
            const url = `${API_CONFIG.PAYMENTS}?sheet=${sheet}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const paymentsData = await response.json();
                const payments = Array.isArray(paymentsData) ? paymentsData : [];
                
                payments.forEach(payment => {
                    if (payment.FacturasAsignadas && payment.FacturasAsignadas.trim() !== '') {
                        const assignments = parseAssignedInvoices(payment.FacturasAsignadas);
                        const totalAssigned = assignments.reduce((sum, a) => sum + a.amount, 0);
                        const totalPayment = parsePaymentAmount(payment.Créditos, payment.BankSource);
                        
                        // Verificar si hay discrepancia
                        if (Math.abs(totalAssigned - totalPayment) > 1) {
                            problematicPayments.push({
                                payment: payment,
                                sheet: sheet,
                                totalAssigned: totalAssigned,
                                totalPayment: totalPayment,
                                discrepancy: totalAssigned - totalPayment,
                                assignments: assignments
                            });
                        }
                    }
                });
            }
        } catch (error) {
            console.warn(`Error revisando ${sheet}:`, error);
        }
    }
    
    console.log(`\n📊 Resultados:`);
    console.log(`   - Pagos problemáticos encontrados: ${problematicPayments.length}`);
    
    problematicPayments.forEach((item, index) => {
        console.log(`\n${index + 1}. Pago problemático:`);
        console.log(`   - Referencia: ${item.payment.Referencia}`);
        console.log(`   - Banco: ${item.sheet}`);
        console.log(`   - Monto del pago: ₡${item.totalPayment.toLocaleString('es-CR')}`);
        console.log(`   - Total asignado: ₡${item.totalAssigned.toLocaleString('es-CR')}`);
        console.log(`   - Discrepancia: ₡${item.discrepancy.toLocaleString('es-CR')}`);
        console.log(`   - FacturasAsignadas: "${item.payment.FacturasAsignadas}"`);
    });
    
    return problematicPayments;
}

// Función para corregir un pago específico
async function fixPaymentAmounts(paymentReference, bankSource) {
    console.log(`🔧 Corrigiendo pago ${paymentReference} en ${bankSource}...`);
    
    try {
        // Obtener el pago
        const url = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(paymentReference)}?sheet=${bankSource}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`No se pudo obtener el pago: ${response.status}`);
        }
        
        const payment = await response.json();
        console.log('📋 Pago original:', payment);
        
        if (!payment.FacturasAsignadas || payment.FacturasAsignadas.trim() === '') {
            console.log('✅ Pago no tiene asignaciones - no necesita corrección');
            return;
        }
        
        const assignments = parseAssignedInvoices(payment.FacturasAsignadas);
        const totalAssigned = assignments.reduce((sum, a) => sum + a.amount, 0);
        const totalPayment = parsePaymentAmount(payment.Créditos, payment.BankSource);
        
        console.log(`💰 Análisis:`);
        console.log(`   - Monto del pago: ₡${totalPayment.toLocaleString('es-CR')}`);
        console.log(`   - Total asignado: ₡${totalAssigned.toLocaleString('es-CR')}`);
        console.log(`   - Discrepancia: ₡${(totalAssigned - totalPayment).toLocaleString('es-CR')}`);
        
        // Si no hay discrepancia, no necesita corrección
        if (Math.abs(totalAssigned - totalPayment) <= 1) {
            console.log('✅ Pago ya está correcto');
            return;
        }
        
        // Calcular la proporción correcta
        const ratio = totalPayment / totalAssigned;
        console.log(`📊 Proporción de corrección: ${ratio.toFixed(4)}`);
        
        // Corregir las asignaciones
        const correctedAssignments = assignments.map(assignment => ({
            invoiceNumber: assignment.invoiceNumber,
            amount: Math.round(assignment.amount * ratio)
        }));
        
        console.log('🔧 Asignaciones corregidas:');
        correctedAssignments.forEach((assignment, index) => {
            console.log(`   ${index + 1}. ${assignment.invoiceNumber}: ₡${assignment.amount.toLocaleString('es-CR')}`);
        });
        
        const totalCorrected = correctedAssignments.reduce((sum, a) => sum + a.amount, 0);
        console.log(`💰 Total corregido: ₡${totalCorrected.toLocaleString('es-CR')}`);
        
        // Formatear para la base de datos
        const formattedAssignments = formatAssignedInvoices(correctedAssignments);
        console.log(`📝 Formato para BD: "${formattedAssignments}"`);
        
        // Actualizar en la base de datos
        const updateData = {
            FacturasAsignadas: formattedAssignments,
            Disponible: '0' // Si está completamente asignado
        };
        
        const updateUrl = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(paymentReference)}?sheet=${bankSource}`;
        const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        if (updateResponse.ok) {
            const result = await updateResponse.json();
            console.log('✅ Pago corregido exitosamente:', result);
        } else {
            throw new Error(`Error al actualizar: ${updateResponse.status}`);
        }
        
    } catch (error) {
        console.error('❌ Error corrigiendo pago:', error);
        throw error;
    }
}

// Función para corregir todos los pagos problemáticos
async function fixAllProblematicPayments() {
    console.log('🔧 Iniciando corrección masiva de pagos...');
    
    try {
        const problematicPayments = await identifyIncorrectPayments();
        
        if (problematicPayments.length === 0) {
            console.log('✅ No se encontraron pagos que necesiten corrección');
            return;
        }
        
        console.log(`\n🔧 Corrigiendo ${problematicPayments.length} pagos...`);
        
        for (let i = 0; i < problematicPayments.length; i++) {
            const item = problematicPayments[i];
            console.log(`\n${i + 1}/${problematicPayments.length} - Corrigiendo ${item.payment.Referencia}...`);
            
            try {
                await fixPaymentAmounts(item.payment.Referencia, item.sheet);
                console.log(`✅ ${item.payment.Referencia} corregido`);
            } catch (error) {
                console.error(`❌ Error corrigiendo ${item.payment.Referencia}:`, error);
            }
            
            // Pausa entre correcciones para no sobrecargar la API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n🎉 Corrección masiva completada');
        
    } catch (error) {
        console.error('❌ Error en corrección masiva:', error);
    }
}

// Función para probar la corrección con un pago específico
async function testFixSpecificPayment(reference = '11111111', bank = 'BAC') {
    console.log(`🧪 Probando corrección con pago ${reference} en ${bank}...`);
    
    try {
        await fixPaymentAmounts(reference, bank);
        console.log('✅ Prueba de corrección completada');
    } catch (error) {
        console.error('❌ Error en prueba de corrección:', error);
    }
}

// Ejecutar análisis al cargar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Script de corrección de montos cargado');
    console.log('💡 Funciones disponibles:');
    console.log('   - identifyIncorrectPayments()');
    console.log('   - fixPaymentAmounts(reference, bank)');
    console.log('   - fixAllProblematicPayments()');
    console.log('   - testFixSpecificPayment(reference, bank)');
});

// Exponer funciones para uso manual
window.identifyIncorrectPayments = identifyIncorrectPayments;
window.fixPaymentAmounts = fixPaymentAmounts;
window.fixAllProblematicPayments = fixAllProblematicPayments;
window.testFixSpecificPayment = testFixSpecificPayment;

console.log('✅ fix-payment-amounts.js cargado'); 