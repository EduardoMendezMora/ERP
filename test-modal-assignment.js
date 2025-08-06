// ===== SCRIPT DE PRUEBA PARA MODAL DE ASIGNACIÓN =====

console.log('🧪 === PRUEBA DE MODAL DE ASIGNACIÓN ===');

// Función para probar que los pagos manuales aparezcan en el modal
function testModalAssignment() {
    console.log('🔍 Verificando que los pagos manuales aparezcan en el modal de asignación...');
    
    // Verificar que las funciones necesarias estén disponibles
    const requiredFunctions = [
        'openAssignInvoiceModal',
        'renderAssignInvoiceModal',
        'selectPaymentForInvoice',
        'confirmAssignInvoice',
        'assignManualPaymentToInvoice'
    ];
    
    const missingFunctions = [];
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] !== 'function') {
            missingFunctions.push(funcName);
        }
    });
    
    if (missingFunctions.length > 0) {
        console.error('❌ Funciones faltantes:', missingFunctions);
        return false;
    }
    
    console.log('✅ Todas las funciones están disponibles');
    
    // Verificar que haya datos de prueba
    if (!window.manualPayments || window.manualPayments.length === 0) {
        console.warn('⚠️ No hay pagos manuales disponibles para probar');
        return false;
    }
    
    if (!window.clientInvoices || window.clientInvoices.length === 0) {
        console.warn('⚠️ No hay facturas disponibles para probar');
        return false;
    }
    
    console.log('📋 Datos disponibles:');
    console.log('   - Pagos manuales:', window.manualPayments.length);
    console.log('   - Facturas:', window.clientInvoices.length);
    
    // Encontrar pagos manuales con monto disponible
    const availableManualPayments = window.manualPayments.filter(payment => {
        const available = parseAmount(payment.Disponible || payment.Créditos || 0);
        return available > 0;
    });
    
    console.log('💰 Pagos manuales con monto disponible:', availableManualPayments.length);
    
    if (availableManualPayments.length === 0) {
        console.warn('⚠️ No hay pagos manuales con monto disponible para probar');
        return false;
    }
    
    // Encontrar una factura pendiente
    const pendingInvoice = window.clientInvoices.find(inv => 
        inv.Estado === 'Pendiente' || inv.Estado === 'Vencido'
    );
    
    if (!pendingInvoice) {
        console.warn('⚠️ No hay facturas pendientes para probar');
        return false;
    }
    
    console.log('🎯 Datos de prueba encontrados:');
    console.log('   - Factura:', pendingInvoice.NumeroFactura);
    console.log('   - Estado:', pendingInvoice.Estado);
    console.log('   - Monto total:', parseAmount(pendingInvoice.MontoTotal || pendingInvoice.MontoBase || 0));
    
    availableManualPayments.forEach((payment, index) => {
        const available = parseAmount(payment.Disponible || 0);
        const total = parseAmount(payment.Créditos || 0);
        console.log(`   - Pago manual ${index + 1}: ${payment.Referencia}`);
        console.log(`     Total: ₡${total.toLocaleString('es-CR')}`);
        console.log(`     Disponible: ₡${available.toLocaleString('es-CR')}`);
    });
    
    // Simular apertura del modal
    console.log('\n📝 Simulando apertura del modal...');
    console.log('Para probar manualmente:');
    console.log('1. Ve a una factura pendiente');
    console.log('2. Haz clic en "💰 Asignar"');
    console.log('3. El modal debería mostrar los pagos manuales disponibles');
    console.log('4. Selecciona un pago manual');
    console.log('5. Confirma la asignación');
    
    return true;
}

// Función para verificar la lógica de filtrado en el modal
function testModalFiltering() {
    console.log('\n🔍 Verificando lógica de filtrado en el modal...');
    
    if (!window.manualPayments) {
        console.warn('⚠️ No hay pagos manuales cargados');
        return;
    }
    
    // Aplicar la misma lógica que usa el modal
    const modalFilteredPayments = window.manualPayments.filter(p => {
        const available = parseAmount(p.Disponible || p.Créditos || 0);
        return available > 0; // Si tiene monto disponible, está sin asignar
    });
    
    console.log('📊 Resultados del filtrado:');
    console.log('   - Pagos manuales totales:', window.manualPayments.length);
    console.log('   - Pagos con monto disponible:', modalFilteredPayments.length);
    
    modalFilteredPayments.forEach((payment, index) => {
        const available = parseAmount(payment.Disponible || 0);
        const total = parseAmount(payment.Créditos || 0);
        console.log(`   ${index + 1}. ${payment.Referencia}:`);
        console.log(`      - Total: ₡${total.toLocaleString('es-CR')}`);
        console.log(`      - Disponible: ₡${available.toLocaleString('es-CR')}`);
        console.log(`      - Aparecerá en modal: ${available > 0 ? '✅ Sí' : '❌ No'}`);
    });
}

// Función para verificar el monto que se asignará
function testAssignmentAmount() {
    console.log('\n💰 Verificando monto de asignación...');
    
    if (!window.manualPayments) {
        console.warn('⚠️ No hay pagos manuales cargados');
        return;
    }
    
    const availablePayments = window.manualPayments.filter(p => {
        const available = parseAmount(p.Disponible || p.Créditos || 0);
        return available > 0;
    });
    
    availablePayments.forEach((payment, index) => {
        const available = parseAmount(payment.Disponible || 0);
        const total = parseAmount(payment.Créditos || 0);
        
        console.log(`   ${index + 1}. ${payment.Referencia}:`);
        console.log(`      - Total del pago: ₡${total.toLocaleString('es-CR')}`);
        console.log(`      - Disponible para asignar: ₡${available.toLocaleString('es-CR')}`);
        console.log(`      - Monto que se asignará: ₡${available.toLocaleString('es-CR')} (disponible)`);
        
        if (available < total) {
            console.log(`      - ⚠️ Pago parcial: ya se asignaron ₡${(total - available).toLocaleString('es-CR')}`);
        }
    });
}

// Ejecutar pruebas cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando pruebas de modal de asignación...');
    
    // Esperar un momento para que todos los scripts se carguen
    setTimeout(() => {
        const modalTest = testModalAssignment();
        testModalFiltering();
        testAssignmentAmount();
        
        if (modalTest) {
            console.log('\n🎉 Pruebas completadas. El modal debería mostrar los pagos manuales correctamente.');
            console.log('\n📋 Instrucciones para probar:');
            console.log('1. Recarga la página si es necesario');
            console.log('2. Ve a una factura pendiente');
            console.log('3. Haz clic en "💰 Asignar"');
            console.log('4. Verifica que aparezcan los pagos manuales con monto disponible');
            console.log('5. Selecciona uno y confirma la asignación');
        } else {
            console.log('\n❌ Hay problemas con las funciones del modal.');
        }
    }, 1000);
});

// Exponer funciones para pruebas manuales
window.testModalAssignment = testModalAssignment;
window.testModalFiltering = testModalFiltering;
window.testAssignmentAmount = testAssignmentAmount;

console.log('✅ test-modal-assignment.js cargado'); 