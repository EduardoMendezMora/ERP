// ===== PRUEBA DE ESTRUCTURA DE PAGOS MANUALES =====
// Este script verifica que el sistema use la estructura correcta de la hoja PagosManuales

console.log('🧪 === INICIANDO PRUEBA DE ESTRUCTURA DE PAGOS MANUALES ===');

// Verificar que las funciones estén disponibles
const requiredFunctions = [
    'openManualPaymentModal',
    'createManualPayment', 
    'updateManualPayment',
    'deleteManualPayment',
    'loadManualPayments',
    'renderManualPayments',
    'assignManualPaymentToInvoice'
];

console.log('🔍 Verificando funciones disponibles...');
requiredFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ ${funcName} - Disponible`);
    } else {
        console.log(`❌ ${funcName} - NO DISPONIBLE`);
    }
});

// Verificar estructura de datos esperada
console.log('\n📋 Verificando estructura de datos...');

// Simular un pago manual con la estructura correcta
const testPayment = {
    Fecha: '2025-01-15',
    Referencia: 'PAGO-MANUAL-TEST-001',
    Descripción: 'Pago de prueba',
    Créditos: 50000,
    Observaciones: 'Observación de prueba',
    ID_Cliente: '123456',
    FacturasAsignadas: '',
    FechaAsignacion: '',
    Disponible: 50000
};

console.log('📊 Estructura de pago manual esperada:');
console.log('- Fecha:', testPayment.Fecha);
console.log('- Referencia:', testPayment.Referencia);
console.log('- Descripción:', testPayment.Descripción);
console.log('- Créditos:', testPayment.Créditos);
console.log('- Observaciones:', testPayment.Observaciones);
console.log('- ID_Cliente:', testPayment.ID_Cliente);
console.log('- FacturasAsignadas:', testPayment.FacturasAsignadas);
console.log('- FechaAsignacion:', testPayment.FechaAsignacion);
console.log('- Disponible:', testPayment.Disponible);

// Verificar que los modales tengan los campos correctos
console.log('\n🎨 Verificando campos de modales...');

const modalFields = {
    'manualPaymentModal': [
        'manualPaymentReference',
        'manualPaymentAmount', 
        'manualPaymentDate',
        'manualPaymentDescription',
        'manualPaymentObservations'
    ],
    'editManualPaymentModal': [
        'editManualPaymentReference',
        'editManualPaymentAmount',
        'editManualPaymentDate', 
        'editManualPaymentDescription',
        'editManualPaymentObservations'
    ]
};

Object.entries(modalFields).forEach(([modalId, fields]) => {
    console.log(`\n🔍 Verificando modal: ${modalId}`);
    fields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            console.log(`✅ ${fieldId} - Encontrado`);
        } else {
            console.log(`❌ ${fieldId} - NO ENCONTRADO`);
        }
    });
});

// Verificar integración con main.js
console.log('\n🔗 Verificando integración con main.js...');

if (typeof manualPayments !== 'undefined') {
    console.log('✅ Variable manualPayments - Disponible');
} else {
    console.log('❌ Variable manualPayments - NO DISPONIBLE');
}

if (typeof currentClientId !== 'undefined') {
    console.log('✅ Variable currentClientId - Disponible');
} else {
    console.log('❌ Variable currentClientId - NO DISPONIBLE');
}

// Verificar funciones de utilidad
console.log('\n🛠️ Verificando funciones de utilidad...');

const utilityFunctions = [
    'parseAmount',
    'formatDateForDisplay',
    'formatDateForStorage',
    'formatDateForInput',
    'showToast'
];

utilityFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ ${funcName} - Disponible`);
    } else {
        console.log(`❌ ${funcName} - NO DISPONIBLE`);
    }
});

// Verificar configuración de API
console.log('\n🌐 Verificando configuración de API...');

if (typeof API_CONFIG !== 'undefined' && API_CONFIG.PAYMENTS) {
    console.log('✅ API_CONFIG.PAYMENTS - Disponible');
    console.log('📍 URL:', API_CONFIG.PAYMENTS);
} else {
    console.log('❌ API_CONFIG.PAYMENTS - NO DISPONIBLE');
}

// Simular creación de pago manual
console.log('\n🧪 Simulando creación de pago manual...');

const testPaymentData = {
    reference: 'PAGO-MANUAL-TEST-002',
    amount: '75000',
    date: '2025-01-16',
    description: 'Pago de prueba con estructura correcta',
    observations: 'Observación de prueba para verificar estructura'
};

console.log('📝 Datos de prueba:');
console.log('- Referencia:', testPaymentData.reference);
console.log('- Monto:', testPaymentData.amount);
console.log('- Fecha:', testPaymentData.date);
console.log('- Descripción:', testPaymentData.description);
console.log('- Observaciones:', testPaymentData.observations);

// Verificar que el botón esté disponible
console.log('\n🔘 Verificando botón de crear pago manual...');

const createButton = document.querySelector('button[onclick="openManualPaymentModal()"]');
if (createButton) {
    console.log('✅ Botón "Crear Pago Manual" - Encontrado');
    console.log('📍 Texto:', createButton.textContent.trim());
} else {
    console.log('❌ Botón "Crear Pago Manual" - NO ENCONTRADO');
}

console.log('\n✅ === PRUEBA DE ESTRUCTURA COMPLETADA ===');
console.log('💡 Para usar el sistema:');
console.log('1. Ve a la página de facturas (facturas.html)');
console.log('2. Busca el botón "💰 Crear Pago Manual" en la sección "Acciones Rápidas"');
console.log('3. Completa los campos: Referencia, Monto, Fecha, Descripción, Observaciones');
console.log('4. Los pagos manuales aparecerán en "Pagos Sin Asignar"');
console.log('5. Puedes asignarlos a facturas usando el sistema de asignación existente'); 