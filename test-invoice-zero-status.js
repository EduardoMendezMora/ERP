// Test para verificar que cuando MontoBase es 0, el Estado se cambia automáticamente a "Pagado"

console.log('🧪 Test: Cambio automático de Estado cuando MontoBase es 0\n');

// Simular la lógica del formulario de edición
function testZeroAmountStatusChange(amount, originalStatus, originalPaymentDate) {
    console.log(`📝 Probando: Monto=${amount}, Estado original=${originalStatus}, Fecha pago original=${originalPaymentDate || 'No especificada'}`);
    
    const numAmount = parseFloat(amount);
    
    // Validar monto
    if (numAmount < 0) {
        console.log('❌ Error: El monto no puede ser negativo');
        return { success: false, error: 'Monto negativo' };
    }

    // Si el monto es 0, automáticamente cambiar el estado a "Pagado"
    let finalStatus = originalStatus;
    let finalPaymentDate = originalPaymentDate;
    
    if (numAmount === 0) {
        finalStatus = 'Pagado';
        // Si no hay fecha de pago especificada, usar la fecha actual
        if (!finalPaymentDate) {
            finalPaymentDate = new Date().toISOString().split('T')[0];
        }
        console.log('💰 Monto 0 detectado: Estado cambiado automáticamente a "Pagado"');
    }

    // Validar fecha de pago si el estado es "Pagado"
    if (finalStatus === 'Pagado' && !finalPaymentDate) {
        console.log('❌ Error: Debe especificar la fecha de pago');
        return { success: false, error: 'Fecha de pago requerida' };
    }

    console.log(`✅ Resultado: Estado final=${finalStatus}, Fecha pago final=${finalPaymentDate}`);
    return { 
        success: true, 
        finalStatus, 
        finalPaymentDate,
        statusChanged: finalStatus !== originalStatus,
        paymentDateAdded: !originalPaymentDate && finalPaymentDate
    };
}

// Casos de prueba
const testCases = [
    { amount: 0, status: 'Pendiente', paymentDate: null },
    { amount: 0, status: 'Vencido', paymentDate: null },
    { amount: 0, status: 'Pendiente', paymentDate: '2024-01-15' },
    { amount: 1000, status: 'Pendiente', paymentDate: null },
    { amount: 50000, status: 'Vencido', paymentDate: null },
    { amount: -1000, status: 'Pendiente', paymentDate: null }
];

console.log('📋 Ejecutando casos de prueba:\n');

testCases.forEach((testCase, index) => {
    console.log(`--- Caso ${index + 1} ---`);
    const result = testZeroAmountStatusChange(testCase.amount, testCase.status, testCase.paymentDate);
    
    if (result.success) {
        if (result.statusChanged) {
            console.log(`🔄 Estado cambiado: ${testCase.status} → ${result.finalStatus}`);
        }
        if (result.paymentDateAdded) {
            console.log(`📅 Fecha de pago agregada automáticamente: ${result.finalPaymentDate}`);
        }
    }
    console.log('');
});

console.log('✅ Test completado'); 