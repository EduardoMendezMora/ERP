// Debug script para identificar el problema de facturación
// Ejecutar en la consola del navegador en clientes.html

console.log('🔍 INICIANDO DEBUG DE FACTURACIÓN');

// Función para simular el proceso de facturación y identificar el problema
async function debugBillingProcess(clientId) {
    console.log('=== DEBUG: PROCESO DE FACTURACIÓN ===');
    
    // 1. Verificar que el cliente existe
    const client = clients.find(c => c.ID.toString() === clientId.toString());
    if (!client) {
        console.error('❌ Cliente no encontrado con ID:', clientId);
        return;
    }
    
    console.log('✅ Cliente encontrado:', client);
    console.log('📋 Datos del cliente:');
    console.log('  - ID:', client.ID);
    console.log('  - Nombre:', client.Nombre);
    console.log('  - Fecha Contrato:', client.fechaContrato);
    console.log('  - Monto Contrato:', client.montoContrato);
    console.log('  - Plazo Contrato:', client.plazoContrato);
    console.log('  - Día Pago:', client.diaPago);
    
    // 2. Verificar parseDate
    console.log('\n🔍 Verificando parseDate...');
    const signDate = parseDate(client.fechaContrato);
    console.log('  - Fecha original:', client.fechaContrato);
    console.log('  - Fecha parseada:', signDate);
    console.log('  - Es válida:', signDate !== null);
    
    if (!signDate) {
        console.error('❌ Error: No se pudo parsear la fecha del contrato');
        return;
    }
    
    // 3. Calcular fecha de inicio del contrato
    console.log('\n🔍 Calculando fecha de inicio del contrato...');
    const contractStartDate = new Date(signDate);
    contractStartDate.setDate(signDate.getDate() + 1);
    console.log('  - Fecha de inicio:', formatDateForDB(contractStartDate));
    
    // 4. Verificar parseAmount
    console.log('\n🔍 Verificando parseAmount...');
    const weeklyAmount = parseAmount(client.montoContrato);
    console.log('  - Monto original:', client.montoContrato);
    console.log('  - Monto parseado:', weeklyAmount);
    console.log('  - Tipo de dato:', typeof weeklyAmount);
    
    // 5. Verificar otros campos
    console.log('\n🔍 Verificando otros campos...');
    const totalWeeks = parseInt(client.plazoContrato);
    const paymentDay = client.diaPago;
    console.log('  - Total semanas:', totalWeeks);
    console.log('  - Día de pago:', paymentDay);
    
    // 6. Generar facturas de prueba (solo la primera)
    console.log('\n🔍 Generando primera factura de prueba...');
    const testInvoice = generateTestInvoice(client, contractStartDate, weeklyAmount, 1);
    console.log('  - Factura de prueba:', testInvoice);
    
    // 7. Verificar estructura de datos
    console.log('\n🔍 Verificando estructura de datos...');
    const requiredFields = [
        'ID_Cliente', 'NumeroFactura', 'SemanaNumero', 'SemanaDescripcion',
        'FechaVencimiento', 'MontoBase', 'DiasAtraso', 'MontoMultas',
        'MontoTotal', 'Estado', 'FechaCreacion', 'FechaPago', 'Observaciones'
    ];
    
    requiredFields.forEach(field => {
        const value = testInvoice[field];
        console.log(`  - ${field}:`, value, `(${typeof value})`);
        if (value === undefined || value === null) {
            console.warn(`    ⚠️ Campo ${field} está vacío o es null`);
        }
    });
    
    // 8. Verificar API URL
    console.log('\n🔍 Verificando configuración de API...');
    console.log('  - API_URL_INVOICES:', API_URL_INVOICES);
    console.log('  - URL completa:', `${API_URL_INVOICES}?sheet=Facturas`);
    
    // 9. Probar envío de una sola factura
    console.log('\n🔍 Probando envío de factura única...');
    try {
        const response = await fetch(`${API_URL_INVOICES}?sheet=Facturas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([testInvoice])
        });
        
        console.log('  - Status:', response.status);
        console.log('  - Status Text:', response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('  - Error response:', errorText);
        } else {
            const result = await response.json();
            console.log('  - Success response:', result);
        }
        
    } catch (error) {
        console.error('  - Error de red:', error);
    }
}

// Función auxiliar para generar una factura de prueba
function generateTestInvoice(client, contractStartDate, weeklyAmount, weekNumber) {
    // Calcular fechas
    const weekStartDate = new Date(contractStartDate);
    weekStartDate.setDate(contractStartDate.getDate() + (weekNumber - 1) * 7);
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    
    const dueDate = new Date(weekEndDate);
    dueDate.setDate(weekEndDate.getDate() + 1);
    
    // Generar descripción
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const startDay = weekStartDate.getDate();
    const startMonth = months[weekStartDate.getMonth()];
    const startYear = weekStartDate.getFullYear();
    
    const endDay = weekEndDate.getDate();
    const endMonth = months[weekEndDate.getMonth()];
    const endYear = weekEndDate.getFullYear();
    
    let weekDescription;
    if (startMonth === endMonth && startYear === endYear) {
        weekDescription = `Semana del ${startDay} al ${endDay} de ${startMonth} del ${startYear}`;
    } else if (startYear === endYear) {
        weekDescription = `Semana del ${startDay} de ${startMonth} al ${endDay} de ${endMonth} del ${startYear}`;
    } else {
        weekDescription = `Semana del ${startDay} de ${startMonth} del ${startYear} al ${endDay} de ${endMonth} del ${endYear}`;
    }
    
    return {
        ID_Cliente: client.ID,
        NumeroFactura: 'FAC-001',
        SemanaNumero: weekNumber,
        SemanaDescripcion: weekDescription,
        FechaVencimiento: formatDateForStorage(dueDate),
        MontoBase: weeklyAmount,
        DiasAtraso: 0,
        MontoMultas: 0,
        MontoTotal: weeklyAmount,
        Estado: 'Pendiente',
        FechaCreacion: formatDateForStorage(new Date()),
        FechaPago: '',
        Observaciones: `Factura de prueba para ${client.Nombre}`
    };
}

// Función para ejecutar el debug con un ID de cliente específico
function runBillingDebug(clientId) {
    console.log(`🚀 Ejecutando debug para cliente ID: ${clientId}`);
    debugBillingProcess(clientId);
}

console.log('✅ Debug script cargado');
console.log('📝 Para usar: runBillingDebug(ID_DEL_CLIENTE)');
console.log('📝 Ejemplo: runBillingDebug(1)');
