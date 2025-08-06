// ===== SCRIPT DE PRUEBA PARA PROBLEMA DE VISUALIZACIÓN DE PAGOS =====

console.log('🧪 === PRUEBA DE PROBLEMA DE VISUALIZACIÓN DE PAGOS ===');

// Función para probar el problema específico del pago de ₡150,000
function testPaymentDisplayIssue() {
    console.log('🔍 Analizando el problema del pago de ₡150,000:');
    
    // Simular el pago problemático
    const problematicPayment = {
        Referencia: '11111111',
        BankSource: 'BAC',
        Créditos: '150.000,00',
        Fecha: '05/08/2025',
        FacturasAsignadas: 'FAC-25305:100000;FAC-25306:125000',
        Disponible: '0'
    };
    
    console.log('📋 Datos del pago problemático:');
    console.log(`   - Referencia: ${problematicPayment.Referencia}`);
    console.log(`   - Banco: ${problematicPayment.BankSource}`);
    console.log(`   - Monto total: ${problematicPayment.Créditos}`);
    console.log(`   - FacturasAsignadas: "${problematicPayment.FacturasAsignadas}"`);
    console.log(`   - Disponible: ${problematicPayment.Disponible}`);
    
    // Parsear las asignaciones
    const assignments = parseAssignedInvoices(problematicPayment.FacturasAsignadas);
    console.log('\n🔧 Asignaciones parseadas:');
    assignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ${assignment.invoiceNumber}: ₡${assignment.amount.toLocaleString('es-CR')}`);
    });
    
    // Calcular total asignado
    const totalAssigned = assignments.reduce((sum, a) => sum + a.amount, 0);
    console.log(`\n💰 Total asignado: ₡${totalAssigned.toLocaleString('es-CR')}`);
    
    // Parsear el monto total del pago
    const totalPayment = parsePaymentAmount(problematicPayment.Créditos, problematicPayment.BankSource);
    console.log(`💰 Monto total del pago: ₡${totalPayment.toLocaleString('es-CR')}`);
    
    // Verificar la discrepancia
    const discrepancy = totalAssigned - totalPayment;
    console.log(`\n⚠️ DISCREPANCIA: ₡${discrepancy.toLocaleString('es-CR')}`);
    
    if (discrepancy > 0) {
        console.log('❌ PROBLEMA IDENTIFICADO:');
        console.log('   - El sistema está mostrando montos de facturas completas');
        console.log('   - En lugar de los montos realmente aplicados desde el pago');
        console.log('   - Esto causa que se muestre más dinero del que realmente se pagó');
    }
    
    return {
        payment: problematicPayment,
        assignments: assignments,
        totalAssigned: totalAssigned,
        totalPayment: totalPayment,
        discrepancy: discrepancy
    };
}

// Función para simular cómo debería ser la visualización correcta
function simulateCorrectDisplay() {
    console.log('\n🔍 Simulando visualización correcta:');
    
    const payment = {
        Referencia: '11111111',
        BankSource: 'BAC',
        Créditos: '150.000,00',
        Fecha: '05/08/2025'
    };
    
    // Simular facturas con montos totales
    const invoices = [
        { NumeroFactura: 'FAC-25305', MontoBase: '100.000,00', ConceptoManual: 'Semana del 7 al 13 de Agosto del 2025' },
        { NumeroFactura: 'FAC-25306', MontoBase: '125.000,00', ConceptoManual: 'Semana del 14 al 20 de Agosto del 2025' }
    ];
    
    const totalPayment = parsePaymentAmount(payment.Créditos, payment.BankSource);
    console.log(`💰 Pago total: ₡${totalPayment.toLocaleString('es-CR')}`);
    
    // Calcular distribución correcta
    let remainingAmount = totalPayment;
    const correctAssignments = [];
    
    invoices.forEach((invoice, index) => {
        const invoiceTotal = parseAmount(invoice.MontoBase);
        const amountToApply = Math.min(remainingAmount, invoiceTotal);
        
        correctAssignments.push({
            invoiceNumber: invoice.NumeroFactura,
            amount: amountToApply,
            invoiceTotal: invoiceTotal,
            concept: invoice.ConceptoManual
        });
        
        remainingAmount -= amountToApply;
    });
    
    console.log('\n✅ Distribución correcta:');
    correctAssignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ${assignment.invoiceNumber}:`);
        console.log(`      - Monto aplicado: ₡${assignment.amount.toLocaleString('es-CR')}`);
        console.log(`      - Monto total factura: ₡${assignment.invoiceTotal.toLocaleString('es-CR')}`);
        console.log(`      - Concepto: ${assignment.concept}`);
    });
    
    const totalApplied = correctAssignments.reduce((sum, a) => sum + a.amount, 0);
    console.log(`\n💰 Total aplicado: ₡${totalApplied.toLocaleString('es-CR')}`);
    console.log(`💰 Restante: ₡${remainingAmount.toLocaleString('es-CR')}`);
    
    return correctAssignments;
}

// Función para identificar dónde está el error en el código
function identifyCodeIssue() {
    console.log('\n🔍 Identificando dónde está el error en el código:');
    
    console.log('1. 📝 En payment-management.js línea 209:');
    console.log('   - Se crea assignmentsForWhatsApp con amountToApply (CORRECTO)');
    console.log('   - amountToApply = monto realmente aplicado desde el pago');
    
    console.log('\n2. 📝 En receipt-whatsapp.js línea 865:');
    console.log('   - Se usa assignment.amount para mostrar en el recibo');
    console.log('   - assignment.amount viene de parseAssignedInvoices()');
    
    console.log('\n3. 📝 En payment-management.js línea 1614:');
    console.log('   - parseAssignedInvoices(payment.FacturasAsignadas)');
    console.log('   - FacturasAsignadas contiene: "FAC-25305:100000;FAC-25306:125000"');
    
    console.log('\n❌ PROBLEMA IDENTIFICADO:');
    console.log('   - Los montos en FacturasAsignadas son los montos realmente aplicados');
    console.log('   - Pero el sistema los está interpretando como montos totales de facturas');
    console.log('   - Esto causa la discrepancia en la visualización');
    
    console.log('\n✅ SOLUCIÓN:');
    console.log('   - Los montos en FacturasAsignadas están CORRECTOS');
    console.log('   - El problema está en la interpretación al mostrar');
    console.log('   - Se debe mostrar el monto aplicado, no el monto total de la factura');
}

// Función para probar la función parseAssignedInvoices
function testParseAssignedInvoices() {
    console.log('\n🔍 Probando parseAssignedInvoices:');
    
    const testString = 'FAC-25305:100000;FAC-25306:125000';
    console.log(`📋 String de prueba: "${testString}"`);
    
    const result = parseAssignedInvoices(testString);
    console.log('🔧 Resultado parseado:');
    result.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ${assignment.invoiceNumber}: ₡${assignment.amount.toLocaleString('es-CR')}`);
    });
    
    console.log('\n💡 Interpretación:');
    console.log('   - FAC-25305: ₡100,000 (monto realmente aplicado desde el pago)');
    console.log('   - FAC-25306: ₡125,000 (monto realmente aplicado desde el pago)');
    console.log('   - Total: ₡225,000 (pero el pago era solo ₡150,000)');
    
    console.log('\n❌ CONCLUSIÓN:');
    console.log('   - Los montos en FacturasAsignadas están INCORRECTOS');
    console.log('   - Se están guardando montos totales de facturas en lugar de montos aplicados');
    console.log('   - El problema está en el proceso de asignación, no en la visualización');
}

// Ejecutar todas las pruebas
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando análisis del problema de visualización...');
    
    setTimeout(() => {
        const testResult = testPaymentDisplayIssue();
        const correctAssignments = simulateCorrectDisplay();
        identifyCodeIssue();
        testParseAssignedInvoices();
        
        console.log('\n📊 Resumen del análisis:');
        console.log('❌ PROBLEMA PRINCIPAL:');
        console.log('   - Los montos en FacturasAsignadas están incorrectos');
        console.log('   - Se guardan montos totales de facturas en lugar de montos aplicados');
        console.log('   - Esto causa que se muestre más dinero del que realmente se pagó');
        
        console.log('\n✅ SOLUCIÓN REQUERIDA:');
        console.log('   - Corregir el proceso de asignación para guardar montos aplicados');
        console.log('   - No montos totales de facturas');
        console.log('   - Esto asegurará que la visualización sea correcta');
        
    }, 1000);
});

// Exponer funciones para pruebas manuales
window.testPaymentDisplayIssue = testPaymentDisplayIssue;
window.simulateCorrectDisplay = simulateCorrectDisplay;
window.identifyCodeIssue = identifyCodeIssue;
window.testParseAssignedInvoices = testParseAssignedInvoices;

console.log('✅ test-payment-display-issue.js cargado'); 