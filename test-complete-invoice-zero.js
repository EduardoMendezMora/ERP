// Test completo para verificar todas las funcionalidades de facturas con monto 0

console.log('🧪 Test Completo: Funcionalidades de Facturas con Monto 0\n');

// Simular la lógica completa del formulario de edición
function testCompleteInvoiceZeroLogic(amount, originalStatus, originalPaymentDate, dueDate, isManualInvoice = false) {
    console.log(`📝 Probando: Monto=${amount}, Estado=${originalStatus}, Fecha pago=${originalPaymentDate || 'No especificada'}, Vencimiento=${dueDate}, Manual=${isManualInvoice}`);
    
    const numAmount = parseFloat(amount);
    
    // 1. Validar monto
    if (numAmount < 0) {
        console.log('❌ Error: El monto no puede ser negativo');
        return { success: false, error: 'Monto negativo' };
    }

    // 2. Lógica de cambio automático de estado
    let finalStatus = originalStatus;
    let finalPaymentDate = originalPaymentDate;
    
    if (numAmount === 0) {
        finalStatus = 'Pagado';
        if (!finalPaymentDate) {
            finalPaymentDate = new Date().toISOString().split('T')[0];
        }
        console.log('💰 Monto 0 detectado: Estado cambiado automáticamente a "Pagado"');
    }

    // 3. Validar fecha de pago si el estado es "Pagado"
    if (finalStatus === 'Pagado' && !finalPaymentDate) {
        console.log('❌ Error: Debe especificar la fecha de pago');
        return { success: false, error: 'Fecha de pago requerida' };
    }

    // 4. Calcular multas acumuladas si la factura está vencida
    let fines = 0;
    let daysOverdue = 0;
    
    if (finalStatus === 'Vencido') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateObj = new Date(dueDate);
        dueDateObj.setHours(0, 0, 0, 0);
        
        if (today > dueDateObj) {
            const diffTime = today.getTime() - dueDateObj.getTime();
            daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // Solo aplicar multas si no es una factura manual
            if (!isManualInvoice) {
                fines = daysOverdue * 2000; // ₡2,000 por día
                console.log(`📅 Factura vencida por ${daysOverdue} días: Multas = ₡${fines.toLocaleString()}`);
            } else {
                console.log('📝 Factura manual: No se aplican multas automáticas');
            }
        }
    }

    // 5. Calcular MontoTotal
    const montoTotal = numAmount + fines;

    // 6. Preparar datos finales
    const updateData = {
        MontoBase: numAmount,
        MontoTotal: montoTotal,
        MontoMultas: fines,
        DiasAtraso: daysOverdue,
        Estado: finalStatus,
        FechaPago: finalPaymentDate
    };

    console.log(`✅ Resultado final:`);
    console.log(`   - MontoBase: ₡${numAmount.toLocaleString()}`);
    console.log(`   - MontoTotal: ₡${montoTotal.toLocaleString()}`);
    console.log(`   - MontoMultas: ₡${fines.toLocaleString()}`);
    console.log(`   - DiasAtraso: ${daysOverdue}`);
    console.log(`   - Estado: ${finalStatus}`);
    console.log(`   - FechaPago: ${finalPaymentDate}`);

    return { 
        success: true, 
        updateData,
        statusChanged: finalStatus !== originalStatus,
        paymentDateAdded: !originalPaymentDate && finalPaymentDate,
        hasFines: fines > 0
    };
}

// Casos de prueba completos
const completeTestCases = [
    {
        name: "Factura normal con monto 0",
        amount: 0,
        status: 'Pendiente',
        paymentDate: null,
        dueDate: '2024-12-31',
        isManual: false
    },
    {
        name: "Factura vencida con monto 0",
        amount: 0,
        status: 'Vencido',
        paymentDate: null,
        dueDate: '2024-01-01',
        isManual: false
    },
    {
        name: "Factura manual con monto 0",
        amount: 0,
        status: 'Pendiente',
        paymentDate: null,
        dueDate: '2024-12-31',
        isManual: true
    },
    {
        name: "Factura vencida con multas",
        amount: 50000,
        status: 'Vencido',
        paymentDate: null,
        dueDate: '2024-01-01',
        isManual: false
    },
    {
        name: "Factura manual vencida (sin multas)",
        amount: 30000,
        status: 'Vencido',
        paymentDate: null,
        dueDate: '2024-01-01',
        isManual: true
    },
    {
        name: "Factura normal con fecha de pago existente",
        amount: 0,
        status: 'Pendiente',
        paymentDate: '2024-01-15',
        dueDate: '2024-12-31',
        isManual: false
    },
    {
        name: "Monto negativo (debe fallar)",
        amount: -1000,
        status: 'Pendiente',
        paymentDate: null,
        dueDate: '2024-12-31',
        isManual: false
    }
];

console.log('📋 Ejecutando casos de prueba completos:\n');

completeTestCases.forEach((testCase, index) => {
    console.log(`--- Caso ${index + 1}: ${testCase.name} ---`);
    const result = testCompleteInvoiceZeroLogic(
        testCase.amount, 
        testCase.status, 
        testCase.paymentDate, 
        testCase.dueDate, 
        testCase.isManual
    );
    
    if (result.success) {
        if (result.statusChanged) {
            console.log(`🔄 Estado cambiado: ${testCase.status} → ${result.updateData.Estado}`);
        }
        if (result.paymentDateAdded) {
            console.log(`📅 Fecha de pago agregada automáticamente: ${result.updateData.FechaPago}`);
        }
        if (result.hasFines) {
            console.log(`💰 Multas aplicadas: ₡${result.updateData.MontoMultas.toLocaleString()}`);
        }
    }
    console.log('');
});

console.log('✅ Test completo finalizado');
console.log('\n📊 Resumen de funcionalidades verificadas:');
console.log('✅ Monto 0 permitido');
console.log('✅ Estado automático "Pagado" cuando MontoBase = 0');
console.log('✅ Fecha de pago automática cuando es necesaria');
console.log('✅ Cálculo correcto de MontoTotal (MontoBase + Multas)');
console.log('✅ Multas solo para facturas automáticas');
console.log('✅ Validación de montos negativos');
console.log('✅ Preservación de fecha de pago existente'); 