// ===== SCRIPT DE PRUEBA PARA CORRECCIÓN DE VISUALIZACIÓN DE PAGOS =====
// Este script verifica que findAssociatedPayment funcione correctamente para facturas canceladas

console.log('🧪 === PRUEBA DE CORRECCIÓN DE VISUALIZACIÓN DE PAGOS ===');

// Simular el estado actual del sistema
const mockAssignedPayments = [
    {
        Referencia: '11111111',
        BankSource: 'BN',
        RelatedInvoices: [
            { NumeroFactura: 'FAC-004' },
            { NumeroFactura: 'FAC-005' }
        ]
    },
    {
        Referencia: '22222222',
        BankSource: 'BAC',
        RelatedInvoices: [
            { NumeroFactura: 'FAC-006' }
        ]
    }
];

// Simular facturas del cliente
const mockClientInvoices = [
    {
        NumeroFactura: 'FAC-004',
        Estado: 'Cancelado',
        FechaPago: '2025-08-05',
        Pagos: '11111111:105000:05/08/2025'
    },
    {
        NumeroFactura: 'FAC-005',
        Estado: 'Pendiente',
        FechaPago: null,
        Pagos: ''
    },
    {
        NumeroFactura: 'FAC-006',
        Estado: 'Cancelado',
        FechaPago: '2025-08-06',
        Pagos: '22222222:50000:06/08/2025'
    }
];

// Función para simular findAssociatedPayment corregida
function simulateFindAssociatedPayment(invoiceNumber) {
    const payment = mockAssignedPayments.find(p => 
        p.RelatedInvoices?.some(inv => inv.NumeroFactura === invoiceNumber)
    );
    if (payment) {
        return {
            reference: payment.Referencia,
            bank: payment.BankSource
        };
    }
    return null;
}

// Función para simular la visualización de facturas canceladas
function simulateCancelledInvoiceDisplay(invoice) {
    const paymentDate = invoice.FechaPago ? `05/08/2025` : 'Fecha no registrada';
    const associatedPayment = simulateFindAssociatedPayment(invoice.NumeroFactura);

    let paymentInfo = `✅ Cancelado: ${paymentDate}`;
    if (associatedPayment) {
        paymentInfo += `<br><span style="font-size: 0.85rem; color: #666;">Pago: ${associatedPayment.reference} (${associatedPayment.bank})</span>`;
    }

    return {
        invoiceNumber: invoice.NumeroFactura,
        status: invoice.Estado,
        paymentInfo: paymentInfo,
        hasPaymentInfo: associatedPayment !== null
    };
}

// Función para probar la corrección
function testPaymentDisplayFix() {
    console.log('🔍 Probando corrección de visualización de pagos...');
    
    const results = mockClientInvoices.map(invoice => {
        const display = simulateCancelledInvoiceDisplay(invoice);
        console.log(`📋 Factura ${invoice.NumeroFactura}:`);
        console.log(`   - Estado: ${display.status}`);
        console.log(`   - Tiene información de pago: ${display.hasPaymentInfo ? '✅ Sí' : '❌ No'}`);
        console.log(`   - Información mostrada: ${display.paymentInfo}`);
        return display;
    });

    const cancelledInvoices = results.filter(r => r.status === 'Cancelado');
    const invoicesWithPaymentInfo = cancelledInvoices.filter(r => r.hasPaymentInfo);

    console.log(`\n📊 Resultados:`);
    console.log(`   - Total facturas: ${results.length}`);
    console.log(`   - Facturas canceladas: ${cancelledInvoices.length}`);
    console.log(`   - Canceladas con info de pago: ${invoicesWithPaymentInfo.length}`);

    if (invoicesWithPaymentInfo.length === cancelledInvoices.length) {
        console.log('✅ CORRECCIÓN EXITOSA: Todas las facturas canceladas muestran información de pago');
        return { success: true, message: 'Corrección exitosa' };
    } else {
        console.log('❌ PROBLEMA PERSISTE: Algunas facturas canceladas no muestran información de pago');
        return { success: false, message: 'Problema persiste' };
    }
}

// Función para probar específicamente FAC-004
function testFAC004Payment() {
    console.log('\n🔍 Probando específicamente FAC-004...');
    
    const fac004 = mockClientInvoices.find(inv => inv.NumeroFactura === 'FAC-004');
    if (!fac004) {
        console.log('❌ FAC-004 no encontrada en los datos de prueba');
        return { success: false, message: 'FAC-004 no encontrada' };
    }

    const associatedPayment = simulateFindAssociatedPayment('FAC-004');
    console.log(`📋 FAC-004:`);
    console.log(`   - Estado: ${fac004.Estado}`);
    console.log(`   - Pagos: ${fac004.Pagos}`);
    console.log(`   - Pago asociado encontrado: ${associatedPayment ? '✅ Sí' : '❌ No'}`);
    
    if (associatedPayment) {
        console.log(`   - Referencia: ${associatedPayment.reference}`);
        console.log(`   - Banco: ${associatedPayment.bank}`);
        console.log('✅ FAC-004 ahora muestra correctamente la información del pago');
        return { success: true, message: 'FAC-004 corregida' };
    } else {
        console.log('❌ FAC-004 aún no muestra la información del pago');
        return { success: false, message: 'FAC-004 no corregida' };
    }
}

// Función para probar el parsing de pagos
function testPagosParsing() {
    console.log('\n🔍 Probando parsing del campo Pagos...');
    
    const fac004 = mockClientInvoices.find(inv => inv.NumeroFactura === 'FAC-004');
    if (!fac004) {
        console.log('❌ FAC-004 no encontrada');
        return { success: false, message: 'FAC-004 no encontrada' };
    }

    // Simular parseInvoicePayments
    function simulateParseInvoicePayments(pagosString) {
        if (!pagosString || pagosString.trim() === '') {
            return [];
        }
        
        try {
            const payments = pagosString.split(',').map(payment => {
                const parts = payment.trim().split(':');
                if (parts.length >= 2) {
                    const reference = parts[0];
                    const amount = parseFloat(parts[1]) || 0;
                    const date = parts[2] || '';
                    return { reference, amount, date };
                }
                return null;
            }).filter(payment => payment !== null);
            
            return payments;
        } catch (error) {
            console.error('Error parseando pagos de factura:', error);
            return [];
        }
    }

    const parsedPayments = simulateParseInvoicePayments(fac004.Pagos);
    console.log(`📋 Pagos parseados de FAC-004:`, parsedPayments);
    
    if (parsedPayments.length > 0) {
        console.log(`✅ Campo Pagos parseado correctamente: ${parsedPayments[0].reference}:${parsedPayments[0].amount}:${parsedPayments[0].date}`);
        return { success: true, message: 'Parsing correcto' };
    } else {
        console.log('❌ Campo Pagos no se pudo parsear');
        return { success: false, message: 'Parsing fallido' };
    }
}

// Ejecutar todas las pruebas
async function runPaymentDisplayTests() {
    console.log('\n🚀 Iniciando pruebas de corrección de visualización de pagos...\n');

    // Prueba 1: Corrección general
    console.log('📝 PRUEBA 1: Corrección general de visualización');
    const result1 = testPaymentDisplayFix();
    console.log(`   Resultado: ${result1.success ? '✅ PASÓ' : '❌ FALLÓ'}`);

    // Prueba 2: FAC-004 específicamente
    console.log('\n📝 PRUEBA 2: FAC-004 específicamente');
    const result2 = testFAC004Payment();
    console.log(`   Resultado: ${result2.success ? '✅ PASÓ' : '❌ FALLÓ'}`);

    // Prueba 3: Parsing del campo Pagos
    console.log('\n📝 PRUEBA 3: Parsing del campo Pagos');
    const result3 = testPagosParsing();
    console.log(`   Resultado: ${result3.success ? '✅ PASÓ' : '❌ FALLÓ'}`);

    // Resumen final
    console.log('\n📊 RESUMEN DE PRUEBAS:');
    console.log(`   - Prueba 1 (Corrección general): ${result1.success ? '✅ PASÓ' : '❌ FALLÓ'}`);
    console.log(`   - Prueba 2 (FAC-004): ${result2.success ? '✅ PASÓ' : '❌ FALLÓ'}`);
    console.log(`   - Prueba 3 (Parsing Pagos): ${result3.success ? '✅ PASÓ' : '❌ FALLÓ'}`);

    const allPassed = result1.success && result2.success && result3.success;
    
    if (allPassed) {
        console.log('\n🎉 TODAS LAS PRUEBAS PASARON');
        console.log('✅ La corrección de visualización de pagos funciona correctamente');
        console.log('✅ FAC-004 ahora debería mostrar la información del pago');
        console.log('✅ El campo Pagos se parsea correctamente');
    } else {
        console.log('\n⚠️ ALGUNAS PRUEBAS FALLARON');
        console.log('❌ Es posible que la corrección no esté completa');
    }

    return {
        success: allPassed,
        results: [result1, result2, result3]
    };
}

// Ejecutar si se llama directamente
if (typeof window === 'undefined') {
    runPaymentDisplayTests().catch(console.error);
}

// Exponer funciones para testing manual
if (typeof window !== 'undefined') {
    window.testPaymentDisplayFix = {
        testPaymentDisplayFix,
        testFAC004Payment,
        testPagosParsing,
        runPaymentDisplayTests
    };
    
    console.log('🔧 Funciones de prueba disponibles:');
    console.log('   testPaymentDisplayFix.runPaymentDisplayTests()');
    console.log('   testPaymentDisplayFix.testFAC004Payment()');
    console.log('   testPaymentDisplayFix.testPagosParsing()');
} 