// ===== SCRIPT DE PRUEBA PARA VERIFICAR PAGOS MANUALES EN WHATSAPP =====

console.log('🧪 === PRUEBA: Pagos Manuales en Estado de Cuenta WhatsApp ===');

// Función para probar que los pagos manuales se consideren en el estado de cuenta
function testManualPaymentsInWhatsApp() {
    console.log('\n📋 Verificando datos disponibles para el estado de cuenta...');
    
    // Verificar que existan las variables globales necesarias
    console.log('1. Variables globales:');
    console.log('   - window.currentClient:', !!window.currentClient);
    console.log('   - window.clientInvoices:', !!window.clientInvoices);
    console.log('   - window.assignedPayments:', !!window.assignedPayments);
    console.log('   - window.manualPayments:', !!window.manualPayments);
    
    if (window.currentClient) {
        console.log('   - Cliente actual:', window.currentClient.Nombre);
    }
    
    if (window.clientInvoices) {
        console.log('   - Total facturas:', window.clientInvoices.length);
        const vencidas = window.clientInvoices.filter(f => f.Estado === 'Vencido');
        console.log('   - Facturas vencidas:', vencidas.length);
    }
    
    if (window.assignedPayments) {
        console.log('   - Total pagos bancarios asignados:', window.assignedPayments.length);
    }
    
    if (window.manualPayments) {
        console.log('   - Total pagos manuales:', window.manualPayments.length);
        
        // Mostrar detalles de pagos manuales
        window.manualPayments.forEach((payment, index) => {
            console.log(`   - Pago manual ${index + 1}:`);
            console.log(`     * Referencia: ${payment.Referencia}`);
            console.log(`     * Monto: ₡${parseAmount(payment.Créditos || 0).toLocaleString('es-CR')}`);
            console.log(`     * Disponible: ₡${parseAmount(payment.Disponible || 0).toLocaleString('es-CR')}`);
            console.log(`     * Asignaciones: ${payment.FacturasAsignadas || 'Ninguna'}`);
        });
    }
    
    // Simular el cálculo del estado de cuenta
    console.log('\n2. Simulando cálculo de estado de cuenta...');
    
    if (!window.clientInvoices || !window.manualPayments) {
        console.error('❌ Faltan datos necesarios para el cálculo');
        return;
    }
    
    const facturas = window.clientInvoices;
    const assignedPayments = window.assignedPayments || [];
    const manualPayments = window.manualPayments;
    
    // Filtrar solo facturas vencidas
    const vencidas = facturas.filter(f => f.Estado === 'Vencido');
    console.log(`   - Facturas vencidas encontradas: ${vencidas.length}`);
    
    if (vencidas.length === 0) {
        console.log('   - No hay facturas vencidas para calcular');
        return;
    }
    
    let totalPendiente = 0;
    
    vencidas.forEach((f, index) => {
        console.log(`\n   📄 Factura ${index + 1}: ${f.NumeroFactura}`);
        
        const saldo = parseAmount(f.MontoBase || 0);
        const multa = parseAmount(f.MontoMultas || 0);
        
        // Buscar pagos bancarios aplicados
        const pagosBancariosAplicados = assignedPayments.reduce((sum, p) => {
            if (p.Assignments && Array.isArray(p.Assignments)) {
                return sum + p.Assignments
                    .filter(a => a.invoiceNumber == f.NumeroFactura)
                    .reduce((aSum, a) => aSum + parseAmount(a.amount || 0), 0);
            }
            return sum;
        }, 0);
        
        // Buscar pagos manuales aplicados
        const pagosManualesAplicados = manualPayments.reduce((sum, p) => {
            if (p.FacturasAsignadas && p.FacturasAsignadas.trim() !== '') {
                const assignments = parseTransactionAssignments(p.FacturasAsignadas);
                return sum + assignments
                    .filter(a => a.invoiceNumber == f.NumeroFactura)
                    .reduce((aSum, a) => aSum + parseAmount(a.amount || 0), 0);
            }
            return sum;
        }, 0);
        
        const pagosAplicados = pagosBancariosAplicados + pagosManualesAplicados;
        const total = saldo + multa - pagosAplicados;
        totalPendiente += total;
        
        console.log(`     - Saldo base: ₡${saldo.toLocaleString('es-CR')}`);
        console.log(`     - Multa: ₡${multa.toLocaleString('es-CR')}`);
        console.log(`     - Pagos bancarios: ₡${pagosBancariosAplicados.toLocaleString('es-CR')}`);
        console.log(`     - Pagos manuales: ₡${pagosManualesAplicados.toLocaleString('es-CR')}`);
        console.log(`     - Total pagos: ₡${pagosAplicados.toLocaleString('es-CR')}`);
        console.log(`     - Saldo pendiente: ₡${total.toLocaleString('es-CR')}`);
    });
    
    console.log(`\n📊 Total pendiente general: ₡${totalPendiente.toLocaleString('es-CR')}`);
    
    // Verificar que la función sendAccountStatement esté disponible
    console.log('\n3. Verificando función sendAccountStatement:');
    console.log('   - Función disponible:', typeof window.sendAccountStatement === 'function');
    
    if (typeof window.sendAccountStatement === 'function') {
        console.log('   ✅ La función está disponible y debería considerar pagos manuales');
    } else {
        console.error('   ❌ La función sendAccountStatement no está disponible');
    }
}

// Función auxiliar para parsear asignaciones (copiada de account-statement.js)
function parseTransactionAssignments(assignmentsString) {
    if (!assignmentsString || assignmentsString.trim() === '') {
        return [];
    }

    try {
        return assignmentsString.split(';')
            .filter(assignment => assignment.trim() !== '')
            .map(assignment => {
                const parts = assignment.split(':');
                if (parts.length >= 2) {
                    return {
                        invoiceNumber: parts[0].trim(),
                        amount: parseAmount(parts[1].trim() || 0)
                    };
                }
                return null;
            })
            .filter(assignment => assignment !== null);
    } catch (error) {
        console.error('Error parseando asignaciones de transacciones:', error);
        return [];
    }
}

// Función auxiliar para parsear montos
function parseAmount(amount) {
    if (typeof amount === 'number') return amount;
    if (!amount) return 0;
    
    // Convertir string a número, manejando formato "1.000.000,00"
    const cleanAmount = amount.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanAmount) || 0;
}

// Ejecutar prueba
console.log('🚀 Iniciando prueba de pagos manuales en WhatsApp...');
testManualPaymentsInWhatsApp();

console.log('\n📝 Instrucciones para probar:');
console.log('1. Ve a facturas.html y selecciona un cliente');
console.log('2. Crea o asigna algunos pagos manuales a facturas');
console.log('3. Haz clic en "📱 Enviar estado de cuenta"');
console.log('4. Verifica que el mensaje de WhatsApp incluya los pagos manuales');
console.log('5. Compara el total pendiente con el cálculo de esta prueba');
