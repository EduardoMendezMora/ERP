// ===== SCRIPT DE PRUEBA PARA PARSING DE MONTOS =====

console.log('🧪 === PRUEBA DE PARSING DE MONTOS ===');

// Función para probar el parsing de tu caso específico
function testSpecificAmount() {
    console.log('🔍 Probando tu caso específico: "100.000,00"');
    
    const testAmount = "100.000,00";
    const testBank = "BAC"; // Asumiendo que es BAC, ajusta si es otro banco
    
    console.log('📋 Datos de prueba:');
    console.log(`   - Monto original: "${testAmount}"`);
    console.log(`   - Banco: "${testBank}"`);
    
    // Probar con parseAmount (función universal)
    console.log('\n🔧 Probando con parseAmount (función universal):');
    const result1 = parseAmount(testAmount);
    console.log(`   - Resultado: ${result1}`);
    console.log(`   - Formateado: ₡${result1.toLocaleString('es-CR')}`);
    
    // Probar con parsePaymentAmountByBank
    console.log('\n🔧 Probando con parsePaymentAmountByBank:');
    const result2 = parsePaymentAmountByBank(testAmount, testBank);
    console.log(`   - Resultado: ${result2}`);
    console.log(`   - Formateado: ₡${result2.toLocaleString('es-CR')}`);
    
    // Probar con parsePaymentAmount
    console.log('\n🔧 Probando con parsePaymentAmount:');
    const result3 = parsePaymentAmount(testAmount, testBank);
    console.log(`   - Resultado: ${result3}`);
    console.log(`   - Formateado: ₡${result3.toLocaleString('es-CR')}`);
    
    // Verificar si hay diferencias
    if (result1 === result2 && result2 === result3) {
        console.log('\n✅ Todas las funciones devuelven el mismo resultado');
    } else {
        console.log('\n❌ Las funciones devuelven resultados diferentes:');
        console.log(`   - parseAmount: ${result1}`);
        console.log(`   - parsePaymentAmountByBank: ${result2}`);
        console.log(`   - parsePaymentAmount: ${result3}`);
    }
    
    return { result1, result2, result3 };
}

// Función para probar diferentes formatos
function testDifferentFormats() {
    console.log('\n🔍 Probando diferentes formatos de números:');
    
    const testCases = [
        { amount: "100.000,00", bank: "BAC", expected: 100000 },
        { amount: "100,000.00", bank: "BN", expected: 100000 },
        { amount: "100000", bank: "BAC", expected: 100000 },
        { amount: "100.000", bank: "BAC", expected: 100000 },
        { amount: "100,000", bank: "BN", expected: 100000 },
        { amount: "100000.00", bank: "BN", expected: 100000 },
        { amount: "20.000,00", bank: "HuberBN", expected: 20000 },
        { amount: "20000", bank: "HuberBN", expected: 20000 }
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`\n📋 Caso ${index + 1}: "${testCase.amount}" (${testCase.bank})`);
        
        const result1 = parseAmount(testCase.amount);
        const result2 = parsePaymentAmountByBank(testCase.amount, testCase.bank);
        const result3 = parsePaymentAmount(testCase.amount, testCase.bank);
        
        console.log(`   - Esperado: ${testCase.expected}`);
        console.log(`   - parseAmount: ${result1} ${result1 === testCase.expected ? '✅' : '❌'}`);
        console.log(`   - parsePaymentAmountByBank: ${result2} ${result2 === testCase.expected ? '✅' : '❌'}`);
        console.log(`   - parsePaymentAmount: ${result3} ${result3 === testCase.expected ? '✅' : '❌'}`);
        
        if (result1 !== testCase.expected || result2 !== testCase.expected || result3 !== testCase.expected) {
            console.log(`   ⚠️ PROBLEMA: Al menos una función no devuelve el valor esperado`);
        }
    });
}

// Función para simular el procesamiento de tu transacción
function simulateTransactionProcessing() {
    console.log('\n🔍 Simulando el procesamiento de tu transacción:');
    
    // Simular los datos de tu transacción
    const transactionData = {
        reference: "23339077",
        date: "03/08/2025",
        description: "03-08-25 PAGO CARRO/JOSE ALEXANDER MOYA GONZALEZ",
        amount: "100.000,00",
        bank: "BAC" // Ajusta según tu banco
    };
    
    console.log('📋 Datos de la transacción:');
    console.log(`   - Referencia: ${transactionData.reference}`);
    console.log(`   - Fecha: ${transactionData.date}`);
    console.log(`   - Descripción: ${transactionData.description}`);
    console.log(`   - Monto: "${transactionData.amount}"`);
    console.log(`   - Banco: ${transactionData.bank}`);
    
    // Simular el procesamiento que haría el sistema
    console.log('\n🔄 Procesamiento del sistema:');
    
    // Paso 1: Parsear el monto
    const parsedAmount = parsePaymentAmountByBank(transactionData.amount, transactionData.bank);
    console.log(`   1. Monto parseado: ${parsedAmount}`);
    console.log(`      - Formateado: ₡${parsedAmount.toLocaleString('es-CR')}`);
    
    // Paso 2: Verificar si es correcto
    const expectedAmount = 100000;
    const isCorrect = parsedAmount === expectedAmount;
    console.log(`   2. Verificación: ${isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
    console.log(`      - Esperado: ₡${expectedAmount.toLocaleString('es-CR')}`);
    console.log(`      - Obtenido: ₡${parsedAmount.toLocaleString('es-CR')}`);
    
    if (!isCorrect) {
        console.log(`   ⚠️ PROBLEMA: El monto se está interpretando como ${parsedAmount} en lugar de ${expectedAmount}`);
        console.log(`   🔍 Posibles causas:`);
        console.log(`      - Banco incorrecto en la configuración`);
        console.log(`      - Formato de número diferente al esperado`);
        console.log(`      - Error en la función de parsing`);
    }
    
    return { parsedAmount, expectedAmount, isCorrect };
}

// Función para verificar qué banco está usando tu transacción
function identifyBankForTransaction() {
    console.log('\n🔍 Identificando el banco para tu transacción:');
    
    const transactionData = {
        reference: "23339077",
        amount: "100.000,00"
    };
    
    // Probar con diferentes bancos
    const banks = ["BAC", "BN", "HuberBN"];
    
    banks.forEach(bank => {
        const result = parsePaymentAmountByBank(transactionData.amount, bank);
        console.log(`   - ${bank}: ${result} (₡${result.toLocaleString('es-CR')})`);
    });
    
    console.log('\n💡 Recomendación:');
    console.log('   Si tu transacción viene de BAC, debería mostrar 100000');
    console.log('   Si tu transacción viene de BN, debería mostrar 100');
    console.log('   Si tu transacción viene de HuberBN, debería mostrar 100000');
}

// Ejecutar todas las pruebas
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando pruebas de parsing de montos...');
    
    // Esperar un momento para que todos los scripts se carguen
    setTimeout(() => {
        const specificTest = testSpecificAmount();
        testDifferentFormats();
        const simulation = simulateTransactionProcessing();
        identifyBankForTransaction();
        
        console.log('\n📊 Resumen de resultados:');
        console.log(`   - Tu caso específico: ${specificTest.result2}`);
        console.log(`   - Simulación: ${simulation.isCorrect ? '✅ Correcto' : '❌ Incorrecto'}`);
        
        if (simulation.isCorrect) {
            console.log('\n🎉 El parsing está funcionando correctamente.');
            console.log('💡 Si aún ves 100 en lugar de 100000, el problema puede estar en:');
            console.log('   1. El banco configurado incorrectamente');
            console.log('   2. La transacción se está procesando con otro banco');
            console.log('   3. Hay un error en otra parte del código');
        } else {
            console.log('\n❌ Hay un problema con el parsing de montos.');
            console.log('🔧 Revisa la configuración del banco para tu transacción.');
        }
    }, 1000);
});

// Exponer funciones para pruebas manuales
window.testSpecificAmount = testSpecificAmount;
window.testDifferentFormats = testDifferentFormats;
window.simulateTransactionProcessing = simulateTransactionProcessing;
window.identifyBankForTransaction = identifyBankForTransaction;

console.log('✅ test-amount-parsing.js cargado'); 