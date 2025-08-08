// ===== SCRIPT DE PRUEBA PARA ASIGNACIÓN DE PAGOS MANUALES =====

console.log('🧪 === PRUEBA DE ASIGNACIÓN DE PAGOS MANUALES ===');

// Función para probar la asignación de pagos manuales
async function testManualPaymentAssignment() {
    try {
        console.log('🔍 Verificando funciones disponibles...');
        
        // Verificar que todas las funciones necesarias estén disponibles
        const requiredFunctions = [
            'assignManualPaymentToInvoice',
            'updateInvoiceStatus',
            'parseInvoicePayments',
            'formatInvoicePayments',
            'parseTransactionAssignments',
            'formatTransactionAssignments',
            'calculateFinesUntilDate',
            'parseAmount',
            'formatDateForStorage'
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
        
        // Encontrar un pago manual sin asignar
        const unassignedPayment = window.manualPayments.find(p => 
            !p.FacturasAsignadas || p.FacturasAsignadas.trim() === ''
        );
        
        if (!unassignedPayment) {
            console.warn('⚠️ No hay pagos manuales sin asignar para probar');
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
        console.log('   - Pago manual:', unassignedPayment.Referencia);
        console.log('   - Factura:', pendingInvoice.NumeroFactura);
        console.log('   - Monto disponible:', unassignedPayment.Disponible || unassignedPayment.Créditos);
        
        // Simular asignación (sin ejecutar realmente)
        console.log('\n📝 Simulando asignación...');
        
        const paymentReference = unassignedPayment.Referencia;
        const invoiceNumber = pendingInvoice.NumeroFactura;
        const amount = parseAmount(unassignedPayment.Disponible || unassignedPayment.Créditos || 0);
        
        console.log('📊 Parámetros de asignación:');
        console.log('   - Referencia pago:', paymentReference);
        console.log('   - Número factura:', invoiceNumber);
        console.log('   - Monto:', amount);
        
        // Verificar que la función esté disponible
        if (typeof window.assignManualPaymentToInvoice === 'function') {
            console.log('✅ Función assignManualPaymentToInvoice disponible');
            console.log('🎉 Sistema listo para asignar pagos manuales');
            
            // Mostrar instrucciones para el usuario
            console.log('\n📋 Para probar la asignación:');
            console.log('1. Ve a la sección "Pagos Sin Asignar"');
            console.log('2. Busca un pago manual (💰 Pago Manual)');
            console.log('3. Ve a una factura pendiente');
            console.log('4. Haz clic en "💰 Asignar"');
            console.log('5. Selecciona el pago manual');
            console.log('6. Confirma la asignación');
            
            return true;
        } else {
            console.error('❌ Función assignManualPaymentToInvoice no disponible');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
        return false;
    }
}

// Función para verificar el estado actual de las facturas y pagos
function checkCurrentState() {
    console.log('\n📊 === ESTADO ACTUAL DEL SISTEMA ===');
    
    if (window.manualPayments) {
        const unassigned = window.manualPayments.filter(p => 
            !p.FacturasAsignadas || p.FacturasAsignadas.trim() === ''
        );
        const assigned = window.manualPayments.filter(p => 
            p.FacturasAsignadas && p.FacturasAsignadas.trim() !== ''
        );
        
        console.log('💰 Pagos manuales:');
        console.log('   - Sin asignar:', unassigned.length);
        console.log('   - Asignados:', assigned.length);
        console.log('   - Total:', window.manualPayments.length);
    }
    
    if (window.clientInvoices) {
        const pending = window.clientInvoices.filter(inv => inv.Estado === 'Pendiente');
        const overdue = window.clientInvoices.filter(inv => inv.Estado === 'Vencido');
        const paid = window.clientInvoices.filter(inv => inv.Estado === 'Pagado');
        
        console.log('📄 Facturas:');
        console.log('   - Pendientes:', pending.length);
        console.log('   - Vencidas:', overdue.length);
        console.log('   - Pagadas:', paid.length);
        console.log('   - Total:', window.clientInvoices.length);
    }
}

// Ejecutar pruebas cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando pruebas de pagos manuales...');
    
    // Esperar un momento para que todos los scripts se carguen
    setTimeout(() => {
        testManualPaymentAssignment();
        checkCurrentState();
    }, 1000);
});

// Exponer funciones para pruebas manuales
window.testManualPaymentAssignment = testManualPaymentAssignment;
window.checkCurrentState = checkCurrentState;

console.log('✅ test-manual-payment-assignment.js cargado'); 