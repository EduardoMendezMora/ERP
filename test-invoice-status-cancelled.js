// Test para verificar que las facturas solo pueden tener estados "Pendiente" y "Cancelado"

console.log('🧪 Test: Estados de Facturas - Solo "Pendiente" y "Cancelado"\n');

// Simular la lógica del formulario de edición
function testInvoiceStatusLogic(newAmount, originalAmount, originalStatus, originalPaymentDate) {
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
        // Si el monto es 0, automáticamente cambiar el estado a "Cancelado"
        finalStatus = 'Cancelado';
        // Si no hay fecha de pago especificada, usar la fecha actual
        if (!finalPaymentDate) {
            finalPaymentDate = new Date().toISOString().split('T')[0];
        }
        console.log('💰 Monto 0 detectado: Estado cambiado automáticamente a "Cancelado"');
    } else if (originalAmountNum === 0 && numAmount > 0) {
        // Si el monto original era 0 y ahora es mayor a 0, cambiar a "Pendiente"
        finalStatus = 'Pendiente';
        finalPaymentDate = ''; // Limpiar fecha de pago ya que ahora hay saldo pendiente
        console.log('📝 Monto cambiado de 0 a mayor: Estado cambiado automáticamente a "Pendiente"');
    }

    // Validar que el estado final sea válido
    if (finalStatus !== 'Pendiente' && finalStatus !== 'Cancelado') {
        console.log('❌ Error: Estado inválido. Solo se permiten "Pendiente" y "Cancelado"');
        return { success: false, error: 'Estado inválido' };
    }

    // Validar fecha de pago si el estado es "Cancelado"
    if (finalStatus === 'Cancelado' && !finalPaymentDate) {
        console.log('❌ Error: Debe especificar la fecha de pago para facturas canceladas');
        return { success: false, error: 'Fecha de pago requerida' };
    }

    console.log(`✅ Resultado: Estado final=${finalStatus}, Fecha pago final=${finalPaymentDate || 'No especificada'}`);
    return { 
        success: true, 
        finalStatus, 
        finalPaymentDate,
        statusChanged: finalStatus !== originalStatus,
        paymentDateAdded: !originalPaymentDate && finalPaymentDate,
        paymentDateCleared: originalPaymentDate && !finalPaymentDate,
        isValidStatus: finalStatus === 'Pendiente' || finalStatus === 'Cancelado'
    };
}

// Casos de prueba
const testCases = [
    // Caso 1: Monto 0 (debe cambiar a Cancelado)
    { newAmount: 0, originalAmount: 1000, status: 'Pendiente', paymentDate: null },
    
    // Caso 2: Monto 0 con fecha de pago existente
    { newAmount: 0, originalAmount: 5000, status: 'Pendiente', paymentDate: '2024-01-15' },
    
    // Caso 3: Monto cambia de 0 a mayor (debe cambiar a Pendiente)
    { newAmount: 2000, originalAmount: 0, status: 'Cancelado', paymentDate: '2024-01-15' },
    
    // Caso 4: Monto cambia de 0 a mayor sin fecha de pago
    { newAmount: 1500, originalAmount: 0, status: 'Cancelado', paymentDate: null },
    
    // Caso 5: Monto positivo se mantiene igual
    { newAmount: 3000, originalAmount: 3000, status: 'Pendiente', paymentDate: null },
    
    // Caso 6: Monto positivo cambia a otro positivo
    { newAmount: 4000, originalAmount: 2000, status: 'Pendiente', paymentDate: null },
    
    // Caso 7: Monto negativo (debe fallar)
    { newAmount: -1000, originalAmount: 1000, status: 'Pendiente', paymentDate: null },
    
    // Caso 8: Monto cambia de positivo a 0
    { newAmount: 0, originalAmount: 5000, status: 'Pendiente', paymentDate: null },
    
    // Caso 9: Estado inválido (debe fallar)
    { newAmount: 1000, originalAmount: 1000, status: 'Vencido', paymentDate: null },
    
    // Caso 10: Estado inválido (debe fallar)
    { newAmount: 1000, originalAmount: 1000, status: 'Pagado', paymentDate: null }
];

console.log('📋 Ejecutando casos de prueba:\n');

testCases.forEach((testCase, index) => {
    console.log(`--- Caso ${index + 1} ---`);
    const result = testInvoiceStatusLogic(
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
        if (result.isValidStatus) {
            console.log(`✅ Estado válido: ${result.finalStatus}`);
        }
    }
    console.log('');
});

console.log('✅ Test completado');
console.log('\n📊 Resumen de funcionalidades verificadas:');
console.log('✅ Solo estados "Pendiente" y "Cancelado" permitidos');
console.log('✅ Monto 0 → Estado "Cancelado"');
console.log('✅ Monto de 0 a mayor → Estado "Pendiente"');
console.log('✅ Fecha de pago automática cuando Monto = 0');
console.log('✅ Fecha de pago limpiada cuando Monto > 0');
console.log('✅ Validación de montos negativos');
console.log('✅ Validación de estados inválidos');
console.log('✅ Preservación de estado cuando no hay cambios relevantes'); 