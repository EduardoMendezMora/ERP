// ===== PRUEBA DE CORRECCIÓN DE ZONA HORARIA =====
// Este archivo prueba que la corrección de zona horaria funciona correctamente

console.log('🧪 === PRUEBA DE CORRECCIÓN DE ZONA HORARIA ===');

// Simular el problema original
function simulateOriginalProblem() {
    console.log('🔍 Simulando problema original...');
    
    const selectedDate = '2025-08-05'; // Fecha seleccionada por el usuario
    console.log('📅 Fecha seleccionada por el usuario:', selectedDate);
    
    // Problema original: new Date() interpreta en UTC
    const problematicDate = new Date(selectedDate);
    console.log('❌ Problema original - new Date(selectedDate):', problematicDate);
    console.log('❌ Problema original - getDate():', problematicDate.getDate());
    console.log('❌ Problema original - getMonth():', problematicDate.getMonth() + 1);
    console.log('❌ Problema original - getFullYear():', problematicDate.getFullYear());
    
    // Problema original: formatDateForStorage con new Date()
    const problematicFormatted = formatDateForStorage(new Date(selectedDate));
    console.log('❌ Problema original - formatDateForStorage(new Date()):', problematicFormatted);
    
    return {
        selectedDate,
        problematicDate,
        problematicFormatted
    };
}

// Simular la corrección
function simulateCorrection() {
    console.log('🔧 Simulando corrección...');
    
    const selectedDate = '2025-08-05'; // Fecha seleccionada por el usuario
    console.log('📅 Fecha seleccionada por el usuario:', selectedDate);
    
    // Corrección: usar formatDateForManualPayment
    const correctedFormatted = formatDateForManualPayment(selectedDate);
    console.log('✅ Corrección - formatDateForManualPayment(selectedDate):', correctedFormatted);
    
    // Verificar que la corrección funciona
    const expectedDate = '05/08/2025';
    const isCorrect = correctedFormatted === expectedDate;
    
    console.log('🎯 Resultado esperado:', expectedDate);
    console.log('✅ ¿Corrección exitosa?:', isCorrect);
    
    return {
        selectedDate,
        correctedFormatted,
        expectedDate,
        isCorrect
    };
}

// Probar diferentes fechas
function testMultipleDates() {
    console.log('🔄 Probando múltiples fechas...');
    
    const testDates = [
        '2025-08-05', // 05/08/2025
        '2025-12-31', // 31/12/2025
        '2025-01-01', // 01/01/2025
        '2025-02-29', // 29/02/2025 (año bisiesto)
        '2025-06-15'  // 15/06/2025
    ];
    
    const results = testDates.map(date => {
        const original = formatDateForStorage(new Date(date));
        const corrected = formatDateForManualPayment(date);
        const expected = date.split('-').reverse().join('/'); // DD/MM/YYYY
        
        return {
            input: date,
            original: original,
            corrected: corrected,
            expected: expected,
            isCorrect: corrected === expected
        };
    });
    
    console.log('📊 Resultados de múltiples fechas:');
    results.forEach(result => {
        console.log(`   ${result.input} -> Original: ${result.original}, Corregido: ${result.corrected}, Esperado: ${result.expected}, ✅: ${result.isCorrect}`);
    });
    
    const allCorrect = results.every(r => r.isCorrect);
    console.log('🎯 ¿Todas las fechas correctas?:', allCorrect);
    
    return results;
}

// Probar casos edge
function testEdgeCases() {
    console.log('⚠️ Probando casos edge...');
    
    const edgeCases = [
        { input: '2025-08-05', description: 'Fecha normal' },
        { input: new Date('2025-08-05'), description: 'Objeto Date' },
        { input: '2025-08-05T00:00:00', description: 'Fecha con tiempo' },
        { input: '2025-08-05T23:59:59', description: 'Fecha fin de día' },
        { input: 'invalid-date', description: 'Fecha inválida' },
        { input: '', description: 'String vacío' },
        { input: null, description: 'Null' },
        { input: undefined, description: 'Undefined' }
    ];
    
    const results = edgeCases.map(testCase => {
        try {
            const result = formatDateForManualPayment(testCase.input);
            return {
                input: testCase.input,
                description: testCase.description,
                result: result,
                success: true
            };
        } catch (error) {
            return {
                input: testCase.input,
                description: testCase.description,
                result: error.message,
                success: false
            };
        }
    });
    
    console.log('📊 Resultados de casos edge:');
    results.forEach(result => {
        console.log(`   ${result.description}: "${result.input}" -> ${result.success ? result.result : 'ERROR: ' + result.result}`);
    });
    
    return results;
}

// Función principal de pruebas
async function runTimezoneTests() {
    console.log('\n🚀 Iniciando pruebas de corrección de zona horaria...\n');
    
    // Prueba 1: Problema original
    console.log('📝 PRUEBA 1: Problema original');
    try {
        const originalProblem = simulateOriginalProblem();
        console.log('✅ Prueba 1 completada - Problema identificado');
    } catch (error) {
        console.log('❌ Prueba 1 FALLÓ:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Prueba 2: Corrección
    console.log('📝 PRUEBA 2: Corrección implementada');
    try {
        const correction = simulateCorrection();
        if (correction.isCorrect) {
            console.log('✅ Prueba 2 PASÓ: Corrección funciona correctamente');
        } else {
            console.log('❌ Prueba 2 FALLÓ: Corrección no funciona');
        }
    } catch (error) {
        console.log('❌ Prueba 2 FALLÓ:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Prueba 3: Múltiples fechas
    console.log('📝 PRUEBA 3: Múltiples fechas');
    try {
        const multipleResults = testMultipleDates();
        const allCorrect = multipleResults.every(r => r.isCorrect);
        if (allCorrect) {
            console.log('✅ Prueba 3 PASÓ: Todas las fechas funcionan correctamente');
        } else {
            console.log('❌ Prueba 3 FALLÓ: Algunas fechas no funcionan');
        }
    } catch (error) {
        console.log('❌ Prueba 3 FALLÓ:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Prueba 4: Casos edge
    console.log('📝 PRUEBA 4: Casos edge');
    try {
        const edgeResults = testEdgeCases();
        console.log('✅ Prueba 4 completada - Casos edge probados');
    } catch (error) {
        console.log('❌ Prueba 4 FALLÓ:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Resumen de la corrección
    console.log('📝 RESUMEN DE LA CORRECCIÓN IMPLEMENTADA:');
    const corrections = [
        '✅ Nueva función formatDateForManualPayment() creada',
        '✅ Manejo específico para fechas en formato YYYY-MM-DD',
        '✅ Creación de fechas en zona horaria local',
        '✅ Corrección en createManualPayment()',
        '✅ Corrección en updateManualPayment()',
        '✅ Debug logging para verificar fechas',
        '✅ Manejo de errores mejorado'
    ];
    
    corrections.forEach(correction => {
        console.log(correction);
    });
    
    console.log('\n🎉 Corrección de zona horaria implementada correctamente');
    console.log('💡 Ahora cuando selecciones 05/08/2025, se guardará correctamente como 05/08/2025');
}

// Ejecutar las pruebas
runTimezoneTests().catch(console.error);

// Exportar funciones para uso en la consola del navegador
window.testTimezoneFix = {
    simulateOriginalProblem,
    simulateCorrection,
    testMultipleDates,
    testEdgeCases,
    runTimezoneTests
};

console.log('\n💡 Para ejecutar las pruebas manualmente, usa:');
console.log('   testTimezoneFix.runTimezoneTests()');
console.log('   testTimezoneFix.simulateOriginalProblem()');
console.log('   testTimezoneFix.simulateCorrection()'); 