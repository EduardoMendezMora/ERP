// ===== SCRIPT PARA CORREGIR FORMATO DEL CAMPO DISPONIBLE =====
// Este script corrige el formato del campo Disponible para asegurar consistencia

console.log('🔧 === SCRIPT DE CORRECCIÓN DE FORMATO DISPONIBLE ===');

// Función para corregir el formato de un pago específico
async function fixDisponibleFormat(reference, bankSource) {
    try {
        console.log(`🔧 Corrigiendo formato de Disponible para ${reference} en ${bankSource}`);
        
        // Buscar el pago en la API
        const searchUrl = `${API_CONFIG.PAYMENTS}/search?Referencia=${encodeURIComponent(reference)}&sheet=${bankSource}`;
        const searchResponse = await fetch(searchUrl);
        
        if (!searchResponse.ok) {
            throw new Error(`No se pudo buscar el pago (HTTP ${searchResponse.status})`);
        }
        
        const searchData = await searchResponse.json();
        if (searchData.length === 0) {
            throw new Error(`Pago ${reference} no encontrado en ${bankSource}`);
        }
        
        const payment = searchData[0];
        console.log('📋 Pago encontrado:', payment);
        
        // Calcular el monto disponible correcto
        const paymentAmount = parsePaymentAmount(payment.Créditos, bankSource);
        const assignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
        const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
        const correctAvailableAmount = Math.max(0, paymentAmount - assignedAmount);
        
        console.log('💰 Cálculo del disponible correcto:');
        console.log(`   - Monto total: ₡${paymentAmount.toLocaleString('es-CR')}`);
        console.log(`   - Asignado: ₡${assignedAmount.toLocaleString('es-CR')}`);
        console.log(`   - Disponible actual: "${payment.Disponible}"`);
        console.log(`   - Disponible correcto: ${correctAvailableAmount.toFixed(2)}`);
        
        // Verificar si necesita corrección
        const currentDisponible = parseFloat(payment.Disponible) || 0;
        const difference = Math.abs(currentDisponible - correctAvailableAmount);
        
        if (difference < 0.01) {
            console.log('✅ El disponible ya está correcto');
            return { corrected: false, message: 'No necesita corrección' };
        }
        
        // Corregir el formato
        const updateUrl = `${API_CONFIG.PAYMENTS}/Referencia/${encodeURIComponent(reference)}?sheet=${bankSource}`;
        const updateData = {
            Disponible: correctAvailableAmount.toFixed(2)
        };
        
        console.log('🔄 Actualizando con formato correcto:', updateData);
        
        const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        if (updateResponse.ok) {
            const result = await updateResponse.json();
            console.log('✅ Corrección exitosa:', result);
            return { 
                corrected: true, 
                message: `Disponible corregido de "${payment.Disponible}" a "${correctAvailableAmount.toFixed(2)}"` 
            };
        } else {
            const errorText = await updateResponse.text();
            throw new Error(`Error al actualizar: HTTP ${updateResponse.status} - ${errorText}`);
        }
        
    } catch (error) {
        console.error('❌ Error corrigiendo formato:', error);
        throw error;
    }
}

// Función para corregir múltiples pagos
async function fixMultipleDisponibleFormats(payments) {
    console.log(`🔧 Corrigiendo formato de ${payments.length} pagos`);
    
    const results = [];
    
    for (const payment of payments) {
        try {
            console.log(`\n--- Procesando ${payment.reference} (${payment.bank}) ---`);
            const result = await fixDisponibleFormat(payment.reference, payment.bank);
            results.push({
                reference: payment.reference,
                bank: payment.bank,
                ...result
            });
            
            // Pequeña pausa para no sobrecargar la API
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`❌ Error con ${payment.reference}:`, error);
            results.push({
                reference: payment.reference,
                bank: payment.bank,
                corrected: false,
                error: error.message
            });
        }
    }
    
    // Resumen
    console.log('\n📊 === RESUMEN DE CORRECCIONES ===');
    const corrected = results.filter(r => r.corrected).length;
    const errors = results.filter(r => r.error).length;
    
    console.log(`✅ Corregidos: ${corrected}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📋 Total procesados: ${results.length}`);
    
    results.forEach(result => {
        if (result.corrected) {
            console.log(`✅ ${result.reference} (${result.bank}): ${result.message}`);
        } else if (result.error) {
            console.log(`❌ ${result.reference} (${result.bank}): ${result.error}`);
        } else {
            console.log(`ℹ️ ${result.reference} (${result.bank}): ${result.message}`);
        }
    });
    
    return results;
}

// Función específica para corregir el pago problemático
async function fixSpecificPayment() {
    console.log('🔧 Corrigiendo pago específico 111111111');
    
    const payments = [
        { reference: '111111111', bank: 'BAC' }
    ];
    
    return await fixMultipleDisponibleFormats(payments);
}

// Función para verificar el estado actual de un pago
async function checkPaymentStatus(reference, bankSource) {
    try {
        console.log(`🔍 Verificando estado de ${reference} en ${bankSource}`);
        
        const searchUrl = `${API_CONFIG.PAYMENTS}/search?Referencia=${encodeURIComponent(reference)}&sheet=${bankSource}`;
        const searchResponse = await fetch(searchUrl);
        
        if (!searchResponse.ok) {
            throw new Error(`Error al buscar: HTTP ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        if (searchData.length === 0) {
            throw new Error('Pago no encontrado');
        }
        
        const payment = searchData[0];
        
        // Calcular valores
        const paymentAmount = parsePaymentAmount(payment.Créditos, bankSource);
        const assignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
        const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
        const calculatedAvailable = Math.max(0, paymentAmount - assignedAmount);
        const storedAvailable = parseFloat(payment.Disponible) || 0;
        
        console.log('📊 Estado del pago:');
        console.log(`   - Referencia: ${payment.Referencia}`);
        console.log(`   - Banco: ${bankSource}`);
        console.log(`   - Créditos: "${payment.Créditos}" -> ₡${paymentAmount.toLocaleString('es-CR')}`);
        console.log(`   - FacturasAsignadas: "${payment.FacturasAsignadas}"`);
        console.log(`   - Asignado calculado: ₡${assignedAmount.toLocaleString('es-CR')}`);
        console.log(`   - Disponible almacenado: "${payment.Disponible}" -> ₡${storedAvailable.toLocaleString('es-CR')}`);
        console.log(`   - Disponible calculado: ₡${calculatedAvailable.toLocaleString('es-CR')}`);
        
        const difference = Math.abs(storedAvailable - calculatedAvailable);
        const isCorrect = difference < 0.01;
        
        console.log(`   - Diferencia: ₡${difference.toLocaleString('es-CR')}`);
        console.log(`   - Estado: ${isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
        
        return {
            payment,
            paymentAmount,
            assignedAmount,
            storedAvailable,
            calculatedAvailable,
            difference,
            isCorrect
        };
        
    } catch (error) {
        console.error('❌ Error verificando estado:', error);
        throw error;
    }
}

// Exponer funciones globalmente
window.fixDisponibleFormat = fixDisponibleFormat;
window.fixMultipleDisponibleFormats = fixMultipleDisponibleFormats;
window.fixSpecificPayment = fixSpecificPayment;
window.checkPaymentStatus = checkPaymentStatus;

console.log('✅ Script de corrección cargado. Funciones disponibles:');
console.log('   - fixSpecificPayment() - Corregir pago 111111111');
console.log('   - checkPaymentStatus("111111111", "BAC") - Verificar estado');
console.log('   - fixDisponibleFormat("REF", "BANK") - Corregir pago específico'); 