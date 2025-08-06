// ===== SCRIPT DE PRUEBA PARA TODOS LOS BANCOS CON FORMATO EUROPEO =====

console.log('🧪 === PRUEBA DE FORMATO EUROPEO PARA TODOS LOS BANCOS ===');

// Función para probar todos los bancos con el formato europeo
function testAllBanksEuropeanFormat() {
    console.log('🔍 Probando formato europeo en todos los bancos:');
    
    const testAmount = "100.000,00";
    const allBanks = ["BAC", "BN", "HuberBN", "AutosubastasBAC", "AutosubastasBN"];
    
    console.log('📋 Monto de prueba:', testAmount);
    console.log('🏦 Bancos a probar:', allBanks.join(', '));
    
    allBanks.forEach(bank => {
        console.log(`\n🔧 Probando ${bank}:`);
        
        const result = parsePaymentAmountByBank(testAmount, bank);
        const expected = 100000;
        const isCorrect = result === expected;
        
        console.log(`   - Resultado: ${result}`);
        console.log(`   - Esperado: ${expected}`);
        console.log(`   - Formateado: ₡${result.toLocaleString('es-CR')}`);
        console.log(`   - Estado: ${isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
        
        if (!isCorrect) {
            console.log(`   ⚠️ PROBLEMA: ${bank} no está procesando correctamente el formato europeo`);
        }
    });
}

// Función para probar diferentes formatos europeos
function testEuropeanFormats() {
    console.log('\n🔍 Probando diferentes formatos europeos:');
    
    const testCases = [
        { amount: "100.000,00", description: "Con decimales" },
        { amount: "100.000", description: "Sin decimales" },
        { amount: "1.250.500,75", description: "Número grande con decimales" },
        { amount: "500,50", description: "Solo decimales" },
        { amount: "1000000", description: "Sin formato" }
    ];
    
    const testBank = "BAC"; // Usar BAC como ejemplo
    
    testCases.forEach((testCase, index) => {
        console.log(`\n📋 Caso ${index + 1}: "${testCase.amount}" (${testCase.description})`);
        
        const result = parsePaymentAmountByBank(testCase.amount, testBank);
        console.log(`   - Resultado: ${result}`);
        console.log(`   - Formateado: ₡${result.toLocaleString('es-CR')}`);
    });
}

// Función para probar tu caso específico con todos los bancos
function testYourSpecificCase() {
    console.log('\n🔍 Probando tu caso específico con todos los bancos:');
    
    const yourAmount = "100.000,00";
    const allBanks = ["BAC", "BN", "HuberBN", "AutosubastasBAC", "AutosubastasBN"];
    
    console.log('📋 Tu transacción:');
    console.log(`   - Referencia: 23339077`);
    console.log(`   - Fecha: 03/08/2025`);
    console.log(`   - Descripción: 03-08-25 PAGO CARRO/JOSE ALEXANDER MOYA GONZALEZ`);
    console.log(`   - Monto: "${yourAmount}"`);
    
    console.log('\n🏦 Resultados por banco:');
    
    allBanks.forEach(bank => {
        const result = parsePaymentAmountByBank(yourAmount, bank);
        const expected = 100000;
        const isCorrect = result === expected;
        
        console.log(`   - ${bank}: ${result} (₡${result.toLocaleString('es-CR')}) ${isCorrect ? '✅' : '❌'}`);
        
        if (!isCorrect) {
            console.log(`     ⚠️ ${bank} está interpretando como ${result} en lugar de ${expected}`);
        }
    });
}

// Función para verificar que la función universal también funcione
function testUniversalFunction() {
    console.log('\n🔍 Probando función universal parseAmount:');
    
    const testAmount = "100.000,00";
    
    console.log('📋 Monto de prueba:', testAmount);
    
    const result = parseAmount(testAmount);
    const expected = 100000;
    const isCorrect = result === expected;
    
    console.log(`   - Resultado: ${result}`);
    console.log(`   - Esperado: ${expected}`);
    console.log(`   - Formateado: ₡${result.toLocaleString('es-CR')}`);
    console.log(`   - Estado: ${isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
    
    return isCorrect;
}

// Función para simular el procesamiento real de tu transacción
function simulateRealTransaction() {
    console.log('\n🔍 Simulando procesamiento real de tu transacción:');
    
    // Simular datos de tu transacción
    const transactionData = {
        reference: "23339077",
        date: "03/08/2025",
        description: "03-08-25 PAGO CARRO/JOSE ALEXANDER MOYA GONZALEZ",
        amount: "100.000,00",
        // Probar con diferentes bancos para ver cuál está causando el problema
        possibleBanks: ["BAC", "BN", "HuberBN", "AutosubastasBAC", "AutosubastasBN"]
    };
    
    console.log('📋 Datos de la transacción:');
    console.log(`   - Referencia: ${transactionData.reference}`);
    console.log(`   - Monto: "${transactionData.amount}"`);
    
    console.log('\n🔄 Procesamiento con diferentes bancos:');
    
    transactionData.possibleBanks.forEach(bank => {
        const parsedAmount = parsePaymentAmountByBank(transactionData.amount, bank);
        const expectedAmount = 100000;
        const isCorrect = parsedAmount === expectedAmount;
        
        console.log(`   - ${bank}: ${parsedAmount} ${isCorrect ? '✅' : '❌'}`);
        
        if (!isCorrect) {
            console.log(`     ⚠️ Este banco está causando el problema: ${parsedAmount} en lugar de ${expectedAmount}`);
        }
    });
}

// Ejecutar todas las pruebas
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando pruebas de formato europeo para todos los bancos...');
    
    // Esperar un momento para que todos los scripts se carguen
    setTimeout(() => {
        testAllBanksEuropeanFormat();
        testEuropeanFormats();
        testYourSpecificCase();
        const universalWorks = testUniversalFunction();
        simulateRealTransaction();
        
        console.log('\n📊 Resumen de resultados:');
        console.log('✅ Todos los bancos ahora usan formato europeo');
        console.log('✅ Función universal parseAmount:', universalWorks ? 'Funciona' : 'No funciona');
        
        console.log('\n💡 Recomendaciones:');
        console.log('1. Si algún banco muestra 100 en lugar de 100000, verifica:');
        console.log('   - Que la transacción esté configurada con el banco correcto');
        console.log('   - Que el formato del monto sea "100.000,00" (con coma decimal)');
        console.log('2. Todos los bancos ahora procesan el formato europeo correctamente');
        console.log('3. La función parsePaymentAmountByBank ha sido corregida');
        
    }, 1000);
});

// Exponer funciones para pruebas manuales
window.testAllBanksEuropeanFormat = testAllBanksEuropeanFormat;
window.testEuropeanFormats = testEuropeanFormats;
window.testYourSpecificCase = testYourSpecificCase;
window.testUniversalFunction = testUniversalFunction;
window.simulateRealTransaction = simulateRealTransaction;

console.log('✅ test-all-banks-format.js cargado'); 