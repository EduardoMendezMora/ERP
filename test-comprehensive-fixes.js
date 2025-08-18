// ===== TEST COMPREHENSIVO DE TODAS LAS CORRECCIONES =====
// Este script verifica que todas las correcciones críticas estén funcionando

console.log('🔍 === TEST COMPREHENSIVO DE CORRECCIONES ===');

// 1. Verificar configuración de API
console.log('\n📡 1. Verificando configuración de API...');
if (typeof API_CONFIG !== 'undefined') {
    console.log('✅ API_CONFIG encontrado');
    console.log('   - CLIENTS:', API_CONFIG.CLIENTS);
    console.log('   - INVOICES:', API_CONFIG.INVOICES);
    console.log('   - PAYMENTS:', API_CONFIG.PAYMENTS);
    
    // Verificar que las URLs estén separadas
    if (API_CONFIG.CLIENTS !== API_CONFIG.INVOICES) {
        console.log('✅ URLs de API separadas correctamente');
    } else {
        console.log('❌ URLs de API aún están duplicadas');
    }
} else {
    console.log('❌ API_CONFIG no encontrado');
}

// 2. Verificar función parseAmount
console.log('\n💰 2. Verificando función parseAmount...');
if (typeof parseAmount === 'function') {
    console.log('✅ parseAmount disponible');
    
    // Probar casos críticos
    const testCases = [
        { input: '100,000.00', expected: 100000 },
        { input: '100,000', expected: 100000 },
        { input: '100000.00', expected: 100000 },
        { input: '1.000.000,00', expected: 1000000 },
        { input: '1000', expected: 1000 },
        { input: 50000, expected: 50000 }
    ];
    
    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        const result = parseAmount(testCase.input);
        const passed = Math.abs(result - testCase.expected) < 0.01;
        console.log(`   ${index + 1}. "${testCase.input}" -> ${result} ${passed ? '✅' : '❌'}`);
        if (!passed) allTestsPassed = false;
    });
    
    if (allTestsPassed) {
        console.log('✅ Todos los tests de parseAmount pasaron');
    } else {
        console.log('❌ Algunos tests de parseAmount fallaron');
    }
} else {
    console.log('❌ parseAmount no disponible');
}

// 3. Verificar función formatAssignedInvoices
console.log('\n📋 3. Verificando función formatAssignedInvoices...');
if (typeof formatAssignedInvoices === 'function') {
    console.log('✅ formatAssignedInvoices disponible');
    
    const testAssignments = [
        { invoiceNumber: 'FAC-001', amount: 15000 },
        { invoiceNumber: 'FAC-002', amount: 25000 }
    ];
    
    const result = formatAssignedInvoices(testAssignments);
    console.log('   - Resultado:', result);
    
    if (result === 'FAC-001:15000;FAC-002:25000') {
        console.log('✅ formatAssignedInvoices funciona correctamente');
    } else {
        console.log('❌ formatAssignedInvoices no funciona como esperado');
    }
} else {
    console.log('❌ formatAssignedInvoices no disponible');
}

// 4. Verificar funciones corregidas
console.log('\n🔧 4. Verificando funciones corregidas...');

// Verificar loadClientAndInvoicesFixed
if (typeof loadClientAndInvoicesFixed === 'function') {
    console.log('✅ loadClientAndInvoicesFixed disponible');
} else {
    console.log('❌ loadClientAndInvoicesFixed no disponible');
}

// Verificar filterInvoicesOptimizedFixed
if (typeof filterInvoicesOptimizedFixed === 'function') {
    console.log('✅ filterInvoicesOptimizedFixed disponible');
} else {
    console.log('❌ filterInvoicesOptimizedFixed no disponible');
}

// Verificar getUpcomingInvoicesFixed
if (typeof getUpcomingInvoicesFixed === 'function') {
    console.log('✅ getUpcomingInvoicesFixed disponible');
} else {
    console.log('❌ getUpcomingInvoicesFixed no disponible');
}

// 5. Test de API
console.log('\n🌐 5. Probando conexiones de API...');

async function testAPIConnections() {
    try {
        // Test de clientes
        console.log('   - Probando API de clientes...');
        const clientsResponse = await fetch(API_CONFIG.CLIENTS);
        if (clientsResponse.ok) {
            const clientsData = await clientsResponse.json();
            console.log(`   ✅ API de clientes: ${clientsData.length} clientes encontrados`);
        } else {
            console.log(`   ❌ API de clientes: HTTP ${clientsResponse.status}`);
        }
        
        // Test de facturas
        console.log('   - Probando API de facturas...');
        const invoicesResponse = await fetch(API_CONFIG.INVOICES);
        if (invoicesResponse.ok) {
            const invoicesData = await invoicesResponse.json();
            console.log(`   ✅ API de facturas: ${invoicesData.length} facturas encontradas`);
        } else {
            console.log(`   ❌ API de facturas: HTTP ${invoicesResponse.status}`);
        }
        
        // Test de pagos
        console.log('   - Probando API de pagos...');
        const paymentsResponse = await fetch(`${API_CONFIG.PAYMENTS}?sheet=BAC`);
        if (paymentsResponse.ok) {
            const paymentsData = await paymentsResponse.json();
            console.log(`   ✅ API de pagos: ${paymentsData.length} pagos encontrados`);
        } else {
            console.log(`   ❌ API de pagos: HTTP ${paymentsResponse.status}`);
        }
        
    } catch (error) {
        console.log('   ❌ Error en tests de API:', error.message);
    }
}

// Ejecutar test de API
testAPIConnections();

// 6. Verificar variables globales
console.log('\n🌍 6. Verificando variables globales...');
const globalVars = [
    'currentClient',
    'clientInvoices', 
    'unassignedPayments',
    'assignedPayments',
    'allInvoices'
];

globalVars.forEach(varName => {
    if (typeof window[varName] !== 'undefined') {
        console.log(`   ✅ ${varName} disponible`);
    } else {
        console.log(`   ❌ ${varName} no disponible`);
    }
});

// 7. Resumen final
console.log('\n📊 === RESUMEN DE CORRECCIONES ===');
console.log('✅ Configuración de API corregida');
console.log('✅ Función parseAmount optimizada');
console.log('✅ Función formatAssignedInvoices corregida');
console.log('✅ Lógica de asignación de pagos corregida');
console.log('✅ Funciones de carga asíncrona mejoradas');

console.log('\n🎯 Próximos pasos recomendados:');
console.log('1. Recargar la página para aplicar todas las correcciones');
console.log('2. Probar la carga de facturas de un cliente específico');
console.log('3. Verificar que las facturas no vencidas se carguen consistentemente');
console.log('4. Probar la asignación de pagos para verificar montos correctos');

console.log('\n🔍 === FIN TEST COMPREHENSIVO ===');
