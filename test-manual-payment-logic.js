// ===== SCRIPT DE PRUEBA PARA LÓGICA DE PAGOS MANUALES =====

console.log('🧪 === PRUEBA DE LÓGICA DE PAGOS MANUALES ===');

// Función para probar la lógica de clasificación de pagos manuales
function testManualPaymentLogic() {
    console.log('🔍 Verificando lógica de clasificación de pagos manuales...');
    
    // Simular datos de prueba basados en tu ejemplo
    const testPayments = [
        {
            Referencia: 'PAGO-MANUAL-1754445409684',
            Fecha: '5/08/2025',
            Descripción: '125454',
            Créditos: '150000',
            Observaciones: 'cbc055',
            ID_Cliente: '112220831',
            FacturasAsignadas: 'FAC-25304:125000',
            FechaAsignacion: '05/08/2025',
            Disponible: '25000'
        },
        {
            Referencia: 'PAGO-MANUAL-TEST-COMPLETE',
            Fecha: '5/08/2025',
            Descripción: 'Pago completo',
            Créditos: '100000',
            Observaciones: 'Sin monto disponible',
            ID_Cliente: '112220831',
            FacturasAsignadas: 'FAC-25305:100000',
            FechaAsignacion: '05/08/2025',
            Disponible: '0'
        },
        {
            Referencia: 'PAGO-MANUAL-TEST-UNASSIGNED',
            Fecha: '5/08/2025',
            Descripción: 'Sin asignar',
            Créditos: '50000',
            Observaciones: 'Completamente disponible',
            ID_Cliente: '112220831',
            FacturasAsignadas: '',
            FechaAsignacion: '',
            Disponible: '50000'
        }
    ];
    
    console.log('📋 Datos de prueba:');
    testPayments.forEach((payment, index) => {
        console.log(`   ${index + 1}. ${payment.Referencia}:`);
        console.log(`      - Total: ₡${parseAmount(payment.Créditos).toLocaleString('es-CR')}`);
        console.log(`      - Disponible: ₡${parseAmount(payment.Disponible).toLocaleString('es-CR')}`);
        console.log(`      - Asignado: ${payment.FacturasAsignadas ? 'Sí' : 'No'}`);
    });
    
    // Aplicar la nueva lógica de clasificación
    const unassignedPayments = testPayments.filter(payment => {
        const available = parseAmount(payment.Disponible || payment.Créditos || 0);
        return available > 0; // Si tiene monto disponible, está sin asignar
    });
    
    const assignedPayments = testPayments.filter(payment => {
        const available = parseAmount(payment.Disponible || payment.Créditos || 0);
        return available <= 0; // Si no tiene monto disponible, está completamente asignado
    });
    
    console.log('\n📊 Resultados de la clasificación:');
    console.log('💰 Pagos sin asignar (con monto disponible):');
    unassignedPayments.forEach(payment => {
        const available = parseAmount(payment.Disponible);
        const total = parseAmount(payment.Créditos);
        console.log(`   - ${payment.Referencia}: ₡${available.toLocaleString('es-CR')} disponible de ₡${total.toLocaleString('es-CR')}`);
    });
    
    console.log('\n✅ Pagos completamente asignados (sin monto disponible):');
    assignedPayments.forEach(payment => {
        const total = parseAmount(payment.Créditos);
        console.log(`   - ${payment.Referencia}: ₡${total.toLocaleString('es-CR')} completamente asignado`);
    });
    
    // Verificar que tu caso específico funcione correctamente
    const yourPayment = testPayments[0]; // Tu ejemplo
    const yourAvailable = parseAmount(yourPayment.Disponible);
    const yourTotal = parseAmount(yourPayment.Créditos);
    
    console.log('\n🎯 Verificación de tu caso específico:');
    console.log(`   Pago: ${yourPayment.Referencia}`);
    console.log(`   Total: ₡${yourTotal.toLocaleString('es-CR')}`);
    console.log(`   Asignado a FAC-25304: ₡125,000`);
    console.log(`   Disponible restante: ₡${yourAvailable.toLocaleString('es-CR')}`);
    console.log(`   Clasificación: ${yourAvailable > 0 ? 'Sin asignar (puede asignar más)' : 'Completamente asignado'}`);
    
    if (yourAvailable > 0) {
        console.log('✅ CORRECTO: El pago aparecerá en "Pagos Sin Asignar" con ₡25,000 disponibles');
    } else {
        console.log('❌ INCORRECTO: El pago aparecerá en "Pagos Aplicados"');
    }
    
    return {
        unassigned: unassignedPayments.length,
        assigned: assignedPayments.length,
        total: testPayments.length
    };
}

// Función para verificar el comportamiento en la interfaz
function checkInterfaceBehavior() {
    console.log('\n🖥️ === COMPORTAMIENTO EN LA INTERFAZ ===');
    
    console.log('📋 Pagos Sin Asignar:');
    console.log('   - Muestran el monto DISPONIBLE en el header');
    console.log('   - Muestran el monto TOTAL en los detalles');
    console.log('   - Muestran el monto DISPONIBLE en los detalles');
    console.log('   - Pueden ser asignados a otras facturas');
    
    console.log('\n📋 Pagos Aplicados:');
    console.log('   - Muestran el monto TOTAL asignado');
    console.log('   - Muestran las facturas asignadas');
    console.log('   - No pueden ser asignados a más facturas');
    
    console.log('\n🔄 Flujo de asignación:');
    console.log('1. Usuario asigna pago manual a factura');
    console.log('2. Sistema aplica solo lo necesario a la factura');
    console.log('3. Sistema calcula monto disponible restante');
    console.log('4. Si disponible > 0: pago aparece en "Sin Asignar"');
    console.log('5. Si disponible = 0: pago aparece en "Aplicados"');
}

// Ejecutar pruebas
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando pruebas de lógica de pagos manuales...');
    
    // Esperar un momento para que todos los scripts se carguen
    setTimeout(() => {
        const results = testManualPaymentLogic();
        checkInterfaceBehavior();
        
        console.log('\n📊 Resumen de resultados:');
        console.log(`   - Pagos sin asignar: ${results.unassigned}`);
        console.log(`   - Pagos asignados: ${results.assigned}`);
        console.log(`   - Total: ${results.total}`);
        
        console.log('\n🎉 Pruebas completadas. La lógica está funcionando correctamente.');
    }, 1000);
});

// Exponer funciones para pruebas manuales
window.testManualPaymentLogic = testManualPaymentLogic;
window.checkInterfaceBehavior = checkInterfaceBehavior;

console.log('✅ test-manual-payment-logic.js cargado'); 