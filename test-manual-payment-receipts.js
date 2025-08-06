// ===== PRUEBA DE RECIBOS DE PAGOS MANUALES =====
// Este script verifica que el sistema de recibos funcione para pagos manuales

console.log('🧪 === INICIANDO PRUEBA DE RECIBOS DE PAGOS MANUALES ===');

// Verificar que las funciones de recibo estén disponibles
const receiptFunctions = [
    'generateManualPaymentReceipt',
    'generateUnassignedManualPaymentReceipt',
    'generateManualPaymentWhatsAppMessage',
    'sendToWhatsApp',
    'printReceipt',
    'downloadReceiptPDF'
];

console.log('🔍 Verificando funciones de recibo...');
receiptFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ ${funcName} - Disponible`);
    } else {
        console.log(`❌ ${funcName} - NO DISPONIBLE`);
    }
});

// Verificar que los modales estén presentes
console.log('\n🎨 Verificando modales de recibo...');

const receiptModal = document.getElementById('receiptModal');
if (receiptModal) {
    console.log('✅ Modal de recibo - Encontrado');
} else {
    console.log('❌ Modal de recibo - NO ENCONTRADO');
}

const receiptContent = document.getElementById('receiptContent');
if (receiptContent) {
    console.log('✅ Contenido de recibo - Encontrado');
} else {
    console.log('❌ Contenido de recibo - NO ENCONTRADO');
}

// Verificar botones de acción del recibo
console.log('\n🔘 Verificando botones de acción del recibo...');

const receiptActions = [
    'printReceipt',
    'downloadReceiptPDF',
    'sendToWhatsApp',
    'sendToWhatsAppManual'
];

receiptActions.forEach(action => {
    const button = document.querySelector(`button[onclick="${action}()"]`);
    if (button) {
        console.log(`✅ Botón ${action} - Encontrado`);
    } else {
        console.log(`❌ Botón ${action} - NO ENCONTRADO`);
    }
});

// Verificar que los pagos manuales tengan botones de recibo
console.log('\n💰 Verificando botones de recibo en pagos manuales...');

const manualPaymentCards = document.querySelectorAll('.manual-payment');
console.log(`📊 Pagos manuales encontrados: ${manualPaymentCards.length}`);

manualPaymentCards.forEach((card, index) => {
    const receiptButton = card.querySelector('button[onclick*="generateManualPaymentReceipt"]') || 
                         card.querySelector('button[onclick*="generateUnassignedManualPaymentReceipt"]');
    
    if (receiptButton) {
        console.log(`✅ Pago manual ${index + 1} - Botón de recibo encontrado`);
    } else {
        console.log(`❌ Pago manual ${index + 1} - Botón de recibo NO ENCONTRADO`);
    }
});

// Verificar funciones de utilidad necesarias
console.log('\n🛠️ Verificando funciones de utilidad...');

const utilityFunctions = [
    'parseAmount',
    'formatDateForDisplay',
    'numberToWords',
    'showToast',
    'showLoadingOverlay'
];

utilityFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ ${funcName} - Disponible`);
    } else {
        console.log(`❌ ${funcName} - NO DISPONIBLE`);
    }
});

// Verificar variables globales necesarias
console.log('\n🌐 Verificando variables globales...');

const globalVariables = [
    'manualPayments',
    'currentClient',
    'currentReceiptData',
    'ULTRAMSG_CONFIG'
];

globalVariables.forEach(varName => {
    if (typeof window[varName] !== 'undefined') {
        console.log(`✅ ${varName} - Disponible`);
    } else {
        console.log(`❌ ${varName} - NO DISPONIBLE`);
    }
});

// Simular generación de recibo de pago manual asignado
console.log('\n🧪 Simulando generación de recibo de pago manual asignado...');

if (typeof generateManualPaymentReceipt === 'function' && manualPayments && manualPayments.length > 0) {
    const testPayment = manualPayments.find(p => p.FacturasAsignadas && p.FacturasAsignadas.trim() !== '');
    if (testPayment) {
        console.log('📄 Generando recibo para pago asignado:', testPayment.Referencia);
        try {
            generateManualPaymentReceipt(testPayment.Referencia);
            console.log('✅ Recibo de pago asignado generado exitosamente');
        } catch (error) {
            console.log('❌ Error al generar recibo de pago asignado:', error);
        }
    } else {
        console.log('⚠️ No hay pagos manuales asignados para probar');
    }
} else {
    console.log('⚠️ No se puede probar recibo de pago asignado - función o datos no disponibles');
}

// Simular generación de recibo de pago manual no asignado
console.log('\n🧪 Simulando generación de recibo de pago manual no asignado...');

if (typeof generateUnassignedManualPaymentReceipt === 'function' && manualPayments && manualPayments.length > 0) {
    const testPayment = manualPayments.find(p => !p.FacturasAsignadas || p.FacturasAsignadas.trim() === '');
    if (testPayment) {
        console.log('📄 Generando recibo para pago no asignado:', testPayment.Referencia);
        try {
            generateUnassignedManualPaymentReceipt(testPayment.Referencia);
            console.log('✅ Recibo de pago no asignado generado exitosamente');
        } catch (error) {
            console.log('❌ Error al generar recibo de pago no asignado:', error);
        }
    } else {
        console.log('⚠️ No hay pagos manuales no asignados para probar');
    }
} else {
    console.log('⚠️ No se puede probar recibo de pago no asignado - función o datos no disponibles');
}

// Verificar mensajes de WhatsApp
console.log('\n📱 Verificando mensajes de WhatsApp...');

if (typeof generateManualPaymentWhatsAppMessage === 'function') {
    console.log('✅ Función de mensaje de WhatsApp - Disponible');
    
    // Simular mensaje si hay datos de recibo
    if (currentReceiptData && currentReceiptData.isManualPayment) {
        try {
            const message = generateManualPaymentWhatsAppMessage();
            console.log('📝 Mensaje de WhatsApp generado:');
            console.log(message);
        } catch (error) {
            console.log('❌ Error al generar mensaje de WhatsApp:', error);
        }
    } else {
        console.log('⚠️ No hay datos de recibo actuales para generar mensaje');
    }
} else {
    console.log('❌ Función de mensaje de WhatsApp - NO DISPONIBLE');
}

// Verificar estilos CSS
console.log('\n🎨 Verificando estilos CSS...');

const style = document.createElement('div');
style.className = 'btn-receipt';
document.body.appendChild(style);

const computedStyle = window.getComputedStyle(style);
const backgroundColor = computedStyle.backgroundColor;

if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
    console.log('✅ Estilo btn-receipt - Aplicado correctamente');
    console.log('📍 Color de fondo:', backgroundColor);
} else {
    console.log('❌ Estilo btn-receipt - NO APLICADO');
}

document.body.removeChild(style);

console.log('\n✅ === PRUEBA DE RECIBOS COMPLETADA ===');
console.log('💡 Para usar el sistema de recibos:');
console.log('1. Ve a la página de facturas (facturas.html)');
console.log('2. Busca los pagos manuales en "Pagos Sin Asignar" o "Pagos Aplicados"');
console.log('3. Haz clic en el botón "🧾 Recibo" de cualquier pago manual');
console.log('4. Se abrirá el modal con el recibo generado');
console.log('5. Puedes imprimir, descargar PDF o enviar por WhatsApp');
console.log('6. Los recibos se diferencian entre asignados y no asignados'); 