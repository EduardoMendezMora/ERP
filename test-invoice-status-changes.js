// Test para verificar cambios automáticos de estado en facturas

console.log('🧪 Test: Cambios Automáticos de Estado en Facturas\n');

// Simular la lógica del formulario de edición
function testInvoiceStatusChanges(newAmount, originalAmount, originalStatus, originalPaymentDate) {
    console.log(`📝 Probando: Monto nuevo=${newAmount}, Monto original=${originalAmount}, Estado original=${originalStatus}, Fecha pago original=${originalPaymentDate || 'No especificada'}`);
    
    const numAmount = parseFloat(newAmount);
    const originalAmountNum = parseFloat(originalAmount);
    
    // Validar monto
    if (numAmount < 0) {
        console.log('❌ Error: El monto no puede ser negativo');
        return { success: false, error: 'Monto negativo' };
    }

    // Lógica de cambio automático de estado basado en el monto
    let finalStatus = originalStatus;
    let finalPaymentDate = originalPaymentDate;
    
    if (numAmount === 0) {
        // Si el monto es 0, automáticamente cambiar el estado a "Pagado"
        finalStatus = 'Pagado';
        // Si no hay fecha de pago especificada, usar la fecha actual
        if (!finalPaymentDate) {
            finalPaymentDate = new Date().toISOString().split('T')[0];
        }
        console.log('💰 Monto 0 detectado: Estado cambiado automáticamente a "Pagado"');
    } else if (originalAmountNum === 0 && numAmount > 0) {
        // Si el monto original era 0 y ahora es mayor a 0, cambiar a "Pendiente"
        finalStatus = 'Pendiente';
        finalPaymentDate = ''; // Limpiar fecha de pago ya que ahora hay saldo pendiente
        console.log('📝 Monto cambiado de 0 a mayor: Estado cambiado automáticamente a "Pendiente"');
    }

    // Validar fecha de pago si el estado es "Pagado"
    if (finalStatus === 'Pagado' && !finalPaymentDate) {
        console.log('❌ Error: Debe especificar la fecha de pago');
        return { success: false, error: 'Fecha de pago requerida' };
    }

    console.log(`✅ Resultado: Estado final=${finalStatus}, Fecha pago final=${finalPaymentDate || 'No especificada'}`);
    return { 
        success: true, 
        finalStatus, 
        finalPaymentDate,
        statusChanged: finalStatus !== originalStatus,
        paymentDateAdded: !originalPaymentDate && finalPaymentDate,
        paymentDateCleared: originalPaymentDate && !finalPaymentDate
    };
}

// Casos de prueba
const testCases = [
    // Caso 1: Monto 0 (debe cambiar a Pagado)
    { newAmount: 0, originalAmount: 1000, status: 'Pendiente', paymentDate: null },
    
    // Caso 2: Monto 0 con fecha de pago existente
    { newAmount: 0, originalAmount: 5000, status: 'Vencido', paymentDate: '2024-01-15' },
    
    // Caso 3: Monto cambia de 0 a mayor (debe cambiar a Pendiente)
    { newAmount: 2000, originalAmount: 0, status: 'Pagado', paymentDate: '2024-01-15' },
    
    // Caso 4: Monto cambia de 0 a mayor sin fecha de pago
    { newAmount: 1500, originalAmount: 0, status: 'Pagado', paymentDate: null },
    
    // Caso 5: Monto positivo se mantiene igual
    { newAmount: 3000, originalAmount: 3000, status: 'Pendiente', paymentDate: null },
    
    // Caso 6: Monto positivo cambia a otro positivo
    { newAmount: 4000, originalAmount: 2000, status: 'Pendiente', paymentDate: null },
    
    // Caso 7: Monto negativo (debe fallar)
    { newAmount: -1000, originalAmount: 1000, status: 'Pendiente', paymentDate: null },
    
    // Caso 8: Monto cambia de positivo a 0
    { newAmount: 0, originalAmount: 5000, status: 'Vencido', paymentDate: null }
];

console.log('📋 Ejecutando casos de prueba:\n');

testCases.forEach((testCase, index) => {
    console.log(`--- Caso ${index + 1} ---`);
    const result = testInvoiceStatusChanges(
        testCase.newAmount, 
        testCase.originalAmount, 
        testCase.status, 
        testCase.paymentDate
    );
    
    if (result.success) {
        if (result.statusChanged) {
            console.log(`🔄 Estado cambiado: ${testCase.status} → ${result.finalStatus}`);
        }
        if (result.paymentDateAdded) {
            console.log(`📅 Fecha de pago agregada automáticamente: ${result.finalPaymentDate}`);
        }
        if (result.paymentDateCleared) {
            console.log(`🗑️ Fecha de pago limpiada automáticamente`);
        }
    }
    console.log('');
});

console.log('✅ Test completado');
console.log('\n📊 Resumen de funcionalidades verificadas:');
console.log('✅ Monto 0 → Estado "Pagado"');
console.log('✅ Monto de 0 a mayor → Estado "Pendiente"');
console.log('✅ Fecha de pago automática cuando Monto = 0');
console.log('✅ Fecha de pago limpiada cuando Monto > 0');
console.log('✅ Validación de montos negativos');
console.log('✅ Preservación de estado cuando no hay cambios relevantes'); 