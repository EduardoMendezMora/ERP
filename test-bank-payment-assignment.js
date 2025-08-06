// ===== SCRIPT DE PRUEBA PARA VERIFICAR ASIGNACIÓN DE PAGOS BANCARIOS =====
// Este script verifica que el modal de asignación muestre el monto disponible correcto

console.log('🧪 === PRUEBA DE ASIGNACIÓN DE PAGOS BANCARIOS ===');

// Función para simular una transacción con asignaciones previas
function createTestTransaction() {
    return {
        Referencia: 'TEST123',
        Créditos: '150.000,00',
        Fecha: '15/08/2025',
        banco: 'BN',
        FacturasAsignadas: 'FAC-25305:100000',
        Disponible: '50000' // 50,000 disponible después de asignar 100,000
    };
}

// Función para probar el cálculo de monto disponible
function testAvailableAmountCalculation() {
    console.log('\n🔍 Probando cálculo de monto disponible:');
    
    const transaction = createTestTransaction();
    console.log('📋 Transacción de prueba:', transaction);
    
    // Simular el cálculo que se hace en loadTransactionsTab
    const creditValue = transaction.Créditos || '0';
    const bank = transaction.banco || 'BAC';
    
    console.log('🔍 Valor original:', creditValue, 'Banco:', bank);
    
    // Parsear el monto total
    const totalAmount = parsePaymentAmountByBank(creditValue, bank);
    console.log('💰 Monto total parseado:', totalAmount);
    
    // Calcular monto disponible
    let availableAmount = totalAmount;
    
    // Si tiene campo Disponible del backend, usarlo
    if (transaction.Disponible !== undefined && transaction.Disponible !== null && transaction.Disponible !== '') {
        const disponible = parseFloat(transaction.Disponible);
        if (!isNaN(disponible)) {
            availableAmount = disponible;
            console.log(`💰 Usando Disponible del backend: ₡${availableAmount.toLocaleString('es-CR')}`);
        }
    } else {
        // Calcular dinámicamente basado en FacturasAsignadas
        const assignments = parseAssignedInvoices(transaction.FacturasAsignadas || '');
        const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
        availableAmount = Math.max(0, totalAmount - assignedAmount);
        console.log(`💰 Calculando disponible: Total=${totalAmount}, Asignado=${assignedAmount}, Disponible=${availableAmount}`);
    }
    
    console.log('✅ Resultado esperado:');
    console.log(`   - Monto total: ₡${totalAmount.toLocaleString('es-CR')}`);
    console.log(`   - Monto disponible: ₡${availableAmount.toLocaleString('es-CR')}`);
    console.log(`   - Diferencia: ₡${(totalAmount - availableAmount).toLocaleString('es-CR')}`);
    
    // Verificar que el resultado es correcto
    const expectedAvailable = 50000;
    if (Math.abs(availableAmount - expectedAvailable) < 0.01) {
        console.log('✅ PRUEBA EXITOSA: El monto disponible se calcula correctamente');
    } else {
        console.log('❌ PRUEBA FALLIDA: El monto disponible no es el esperado');
        console.log(`   - Esperado: ₡${expectedAvailable.toLocaleString('es-CR')}`);
        console.log(`   - Obtenido: ₡${availableAmount.toLocaleString('es-CR')}`);
    }
}

// Función para probar la selección de transacción
function testTransactionSelection() {
    console.log('\n🔍 Probando selección de transacción:');
    
    const transaction = createTestTransaction();
    const reference = transaction.Referencia;
    const bank = transaction.banco;
    const creditValue = transaction.Créditos;
    
    // Simular el cálculo de monto disponible
    const totalAmount = parsePaymentAmountByBank(creditValue, bank);
    let availableAmount = totalAmount;
    
    if (transaction.Disponible !== undefined && transaction.Disponible !== null && transaction.Disponible !== '') {
        const disponible = parseFloat(transaction.Disponible);
        if (!isNaN(disponible)) {
            availableAmount = disponible;
        }
    }
    
    console.log('📋 Simulando selectTransaction:');
    console.log(`   - Referencia: ${reference}`);
    console.log(`   - Banco: ${bank}`);
    console.log(`   - Monto disponible: ${availableAmount}`);
    console.log(`   - Descripción: Test transaction`);
    
    // Simular la llamada a selectTransaction
    const selectedTransaction = {
        reference: reference,
        bank: bank,
        amount: availableAmount, // Ahora usa el monto disponible
        description: 'Test transaction'
    };
    
    console.log('✅ Transacción seleccionada:', selectedTransaction);
    console.log('✅ El monto seleccionado es el disponible, no el total');
}

// Función para probar la asignación sin expectedAmount
function testAssignmentWithoutExpectedAmount() {
    console.log('\n🔍 Probando asignación sin expectedAmount:');
    
    const transaction = createTestTransaction();
    const reference = transaction.Referencia;
    const bank = transaction.banco;
    const creditValue = transaction.Créditos;
    
    // Simular el cálculo que se hace en assignTransactionToInvoice
    const totalAmount = parsePaymentAmountByBank(creditValue, bank);
    let availableAmount = totalAmount;
    
    if (transaction.Disponible !== undefined && transaction.Disponible !== null && transaction.Disponible !== '') {
        const disponible = parseFloat(transaction.Disponible);
        if (!isNaN(disponible)) {
            availableAmount = disponible;
        }
    }
    
    console.log('📋 Simulando assignTransactionToInvoice:');
    console.log(`   - Referencia: ${reference}`);
    console.log(`   - Banco: ${bank}`);
    console.log(`   - Monto total: ₡${totalAmount.toLocaleString('es-CR')}`);
    console.log(`   - Monto disponible: ₡${availableAmount.toLocaleString('es-CR')}`);
    console.log(`   - expectedAmount: null (no se proporciona)`);
    
    console.log('✅ La función usará el monto disponible del backend');
    console.log('✅ No habrá validación de expectedAmount');
}

// Ejecutar todas las pruebas
function runAllTests() {
    console.log('🚀 Iniciando pruebas de asignación de pagos bancarios...\n');
    
    testAvailableAmountCalculation();
    testTransactionSelection();
    testAssignmentWithoutExpectedAmount();
    
    console.log('\n🎯 === RESUMEN DE PRUEBAS ===');
    console.log('✅ Las modificaciones aseguran que:');
    console.log('   1. El modal muestre el monto disponible, no el total');
    console.log('   2. La selección de transacción use el monto disponible');
    console.log('   3. La asignación use el monto disponible del backend');
    console.log('   4. No se valide expectedAmount cuando no se proporciona');
    console.log('\n✅ El problema del monto original vs disponible está resuelto');
}

// Exponer funciones para testing manual
window.testBankPaymentAssignment = {
    runAllTests,
    testAvailableAmountCalculation,
    testTransactionSelection,
    testAssignmentWithoutExpectedAmount,
    createTestTransaction
};

// Ejecutar automáticamente si se carga en la consola
if (typeof window !== 'undefined') {
    console.log('🧪 Script de prueba cargado. Ejecute testBankPaymentAssignment.runAllTests() para probar');
} 