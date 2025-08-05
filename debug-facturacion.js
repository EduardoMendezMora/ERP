// ===== SCRIPT DE DIAGNÓSTICO PARA PROBLEMAS DE FACTURACIÓN =====

console.log('🔍 === DIAGNÓSTICO DE FACTURACIÓN ===');

// Función para verificar el estado del sistema
function diagnosticarFacturacion() {
    console.log('\n📋 === VERIFICACIÓN DE VARIABLES GLOBALES ===');
    
    // Verificar variables críticas
    console.log('🔍 Variables globales:');
    console.log('  - clients:', typeof clients, clients?.length || 'undefined');
    console.log('  - invoices:', typeof invoices, invoices?.length || 'undefined');
    console.log('  - API_URL_INVOICES:', typeof API_URL_INVOICES, API_URL_INVOICES || 'undefined');
    
    // Verificar funciones críticas
    console.log('\n🔧 Funciones críticas:');
    console.log('  - billClient:', typeof billClient);
    console.log('  - generateInvoicesForClient:', typeof generateInvoicesForClient);
    console.log('  - parseAmount:', typeof parseAmount);
    console.log('  - showToast:', typeof showToast);
    console.log('  - showLoading:', typeof showLoading);
    
    // Verificar elementos del DOM
    console.log('\n🖥️ Elementos del DOM:');
    const loadingEl = document.getElementById('loading');
    const clientsGridEl = document.getElementById('clientsGrid');
    const emptyStateEl = document.getElementById('emptyState');
    
    console.log('  - loading:', loadingEl ? '✅ Encontrado' : '❌ No encontrado');
    console.log('  - clientsGrid:', clientsGridEl ? '✅ Encontrado' : '❌ No encontrado');
    console.log('  - emptyState:', emptyStateEl ? '✅ Encontrado' : '❌ No encontrado');
    
    // Verificar botones de facturación
    console.log('\n🔘 Botones de facturación:');
    const billButtons = document.querySelectorAll('[id^="billBtn-"]');
    console.log(`  - Total botones encontrados: ${billButtons.length}`);
    
    billButtons.forEach((btn, index) => {
        const clientId = btn.id.replace('billBtn-', '');
        console.log(`  - Botón ${index + 1}: ID=${clientId}, Texto="${btn.textContent}", Disabled=${btn.disabled}`);
    });
    
    // Verificar clientes con contratos completos
    console.log('\n📋 Clientes con contratos completos:');
    if (Array.isArray(clients)) {
        const clientesCompletos = clients.filter(client => 
            client.fechaContrato && client.montoContrato && client.plazoContrato
        );
        
        console.log(`  - Total clientes: ${clients.length}`);
        console.log(`  - Con contrato completo: ${clientesCompletos.length}`);
        
        clientesCompletos.forEach((client, index) => {
            const billingInfo = getClientBillingInfo ? getClientBillingInfo(client.ID) : null;
            const isBilled = billingInfo?.status === 'billed';
            
            console.log(`  - Cliente ${index + 1}: ${client.Nombre} (ID: ${client.ID})`);
            console.log(`    Contrato: ${client.fechaContrato} | ${client.montoContrato} | ${client.plazoContrato}`);
            console.log(`    Estado facturación: ${isBilled ? 'Facturado' : 'No facturado'}`);
        });
    } else {
        console.log('  ❌ Variable clients no es un array');
    }
    
    // Verificar facturas existentes
    console.log('\n📄 Facturas existentes:');
    if (Array.isArray(invoices)) {
        console.log(`  - Total facturas: ${invoices.length}`);
        
        // Agrupar por cliente
        const facturasPorCliente = {};
        invoices.forEach(inv => {
            const clientId = inv.ID_Cliente;
            if (!facturasPorCliente[clientId]) {
                facturasPorCliente[clientId] = [];
            }
            facturasPorCliente[clientId].push(inv);
        });
        
        console.log(`  - Clientes con facturas: ${Object.keys(facturasPorCliente).length}`);
        
        // Mostrar los primeros 5 clientes con facturas
        Object.entries(facturasPorCliente).slice(0, 5).forEach(([clientId, facturas]) => {
            const cliente = clients?.find(c => c.ID.toString() === clientId.toString());
            console.log(`  - Cliente ${cliente?.Nombre || clientId}: ${facturas.length} facturas`);
        });
    } else {
        console.log('  ❌ Variable invoices no es un array');
    }
}

// Función para probar la generación de facturas
function probarGeneracionFacturas(clientId) {
    console.log(`\n🧪 === PRUEBA DE GENERACIÓN DE FACTURAS PARA CLIENTE ${clientId} ===`);
    
    if (!Array.isArray(clients)) {
        console.log('❌ Variable clients no disponible');
        return;
    }
    
    const client = clients.find(c => c.ID.toString() === clientId.toString());
    if (!client) {
        console.log(`❌ Cliente ${clientId} no encontrado`);
        return;
    }
    
    console.log('📋 Datos del cliente:');
    console.log(`  - Nombre: ${client.Nombre}`);
    console.log(`  - ID: ${client.ID}`);
    console.log(`  - Fecha contrato: ${client.fechaContrato}`);
    console.log(`  - Monto contrato: ${client.montoContrato}`);
    console.log(`  - Plazo contrato: ${client.plazoContrato}`);
    console.log(`  - Día pago: ${client.diaPago}`);
    
    // Verificar contrato completo
    const contratoCompleto = client.fechaContrato && client.montoContrato && client.plazoContrato;
    console.log(`  - Contrato completo: ${contratoCompleto ? '✅ Sí' : '❌ No'}`);
    
    if (!contratoCompleto) {
        console.log('❌ No se puede generar facturas: contrato incompleto');
        return;
    }
    
    // Verificar si ya está facturado
    if (typeof getClientBillingInfo === 'function') {
        const billingInfo = getClientBillingInfo(clientId);
        console.log(`  - Estado facturación: ${billingInfo.status}`);
        
        if (billingInfo.status === 'billed') {
            console.log('⚠️ Cliente ya facturado');
            return;
        }
    }
    
    // Probar generación de facturas
    if (typeof generateInvoicesForClient === 'function') {
        try {
            console.log('\n🔄 Generando facturas de prueba...');
            const facturasGeneradas = generateInvoicesForClient(client);
            
            console.log(`✅ Facturas generadas: ${facturasGeneradas.length}`);
            
            // Mostrar las primeras 3 facturas
            facturasGeneradas.slice(0, 3).forEach((factura, index) => {
                console.log(`  - Factura ${index + 1}: ${factura.NumeroFactura}`);
                console.log(`    Cliente: ${factura.ID_Cliente}`);
                console.log(`    Semana: ${factura.SemanaNumero} - ${factura.SemanaDescripcion}`);
                console.log(`    Vencimiento: ${factura.FechaVencimiento}`);
                console.log(`    Monto: ${factura.MontoBase}`);
                console.log(`    Estado: ${factura.Estado}`);
            });
            
            if (facturasGeneradas.length > 3) {
                console.log(`    ... y ${facturasGeneradas.length - 3} facturas más`);
            }
            
            return facturasGeneradas;
            
        } catch (error) {
            console.error('❌ Error al generar facturas:', error);
            return null;
        }
    } else {
        console.log('❌ Función generateInvoicesForClient no disponible');
        return null;
    }
}

// Función para probar el envío a la API
async function probarEnvioAPI(facturasGeneradas) {
    console.log('\n🌐 === PRUEBA DE ENVÍO A API ===');
    
    if (!facturasGeneradas || facturasGeneradas.length === 0) {
        console.log('❌ No hay facturas para enviar');
        return;
    }
    
    if (!API_URL_INVOICES) {
        console.log('❌ API_URL_INVOICES no configurada');
        return;
    }
    
    console.log(`📡 URL de API: ${API_URL_INVOICES}`);
    console.log(`📦 Facturas a enviar: ${facturasGeneradas.length}`);
    
    try {
        // Solo enviar la primera factura como prueba
        const facturaPrueba = facturasGeneradas[0];
        console.log('\n📤 Enviando factura de prueba:', facturaPrueba.NumeroFactura);
        
        const response = await fetch(`${API_URL_INVOICES}?sheet=Facturas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([facturaPrueba]) // Enviar solo una factura
        });
        
        console.log(`📡 Respuesta HTTP: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Factura enviada exitosamente:', result);
        } else {
            const errorText = await response.text();
            console.error('❌ Error en la respuesta:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Error de red:', error);
    }
}

// Función para simular el proceso completo de facturación
async function simularFacturacion(clientId) {
    console.log(`\n🚀 === SIMULACIÓN COMPLETA DE FACTURACIÓN PARA CLIENTE ${clientId} ===`);
    
    // Paso 1: Verificar cliente
    const client = clients?.find(c => c.ID.toString() === clientId.toString());
    if (!client) {
        console.log('❌ Cliente no encontrado');
        return;
    }
    
    // Paso 2: Verificar contrato
    if (!client.fechaContrato || !client.montoContrato || !client.plazoContrato) {
        console.log('❌ Contrato incompleto');
        return;
    }
    
    // Paso 3: Verificar si ya está facturado
    if (typeof getClientBillingInfo === 'function') {
        const billingInfo = getClientBillingInfo(clientId);
        if (billingInfo.status === 'billed') {
            console.log('⚠️ Cliente ya facturado');
            return;
        }
    }
    
    // Paso 4: Generar facturas
    if (typeof generateInvoicesForClient !== 'function') {
        console.log('❌ Función generateInvoicesForClient no disponible');
        return;
    }
    
    const facturasGeneradas = generateInvoicesForClient(client);
    if (!facturasGeneradas || facturasGeneradas.length === 0) {
        console.log('❌ No se generaron facturas');
        return;
    }
    
    console.log(`✅ ${facturasGeneradas.length} facturas generadas`);
    
    // Paso 5: Enviar a API (solo simulación, no enviar realmente)
    console.log('📡 Simulando envío a API...');
    console.log(`URL: ${API_URL_INVOICES}?sheet=Facturas`);
    console.log(`Método: POST`);
    console.log(`Datos: ${facturasGeneradas.length} facturas`);
    
    console.log('✅ Simulación completada');
}

// Función para verificar errores en la consola
function verificarErroresConsola() {
    console.log('\n🚨 === VERIFICACIÓN DE ERRORES ===');
    
    // Verificar si hay errores de JavaScript
    const originalError = console.error;
    let errorCount = 0;
    
    console.error = function(...args) {
        errorCount++;
        console.log(`🚨 Error ${errorCount}:`, ...args);
        originalError.apply(console, args);
    };
    
    // Verificar si hay errores de red
    window.addEventListener('error', function(e) {
        console.log('🚨 Error de JavaScript:', e.error);
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        console.log('🚨 Promesa rechazada:', e.reason);
    });
    
    console.log('🔍 Monitoreo de errores activado');
}

// Función principal de diagnóstico
function ejecutarDiagnosticoCompleto() {
    console.log('🔍 === DIAGNÓSTICO COMPLETO DE FACTURACIÓN ===');
    console.log('Fecha:', new Date().toLocaleString());
    
    // Ejecutar todas las verificaciones
    diagnosticarFacturacion();
    verificarErroresConsola();
    
    // Si hay clientes disponibles, probar con el primero
    if (Array.isArray(clients) && clients.length > 0) {
        const primerCliente = clients[0];
        console.log(`\n🧪 Probando con primer cliente: ${primerCliente.Nombre} (ID: ${primerCliente.ID})`);
        
        const facturasGeneradas = probarGeneracionFacturas(primerCliente.ID);
        if (facturasGeneradas && facturasGeneradas.length > 0) {
            // probarEnvioAPI(facturasGeneradas); // Descomentar para probar envío real
            simularFacturacion(primerCliente.ID);
        }
    }
    
    console.log('\n✅ Diagnóstico completado');
    console.log('💡 Revisa los resultados arriba para identificar problemas');
}

// Función para probar un cliente específico
function probarClienteEspecifico(clientId) {
    console.log(`\n🎯 === PRUEBA ESPECÍFICA PARA CLIENTE ${clientId} ===`);
    
    diagnosticarFacturacion();
    const facturasGeneradas = probarGeneracionFacturas(clientId);
    
    if (facturasGeneradas && facturasGeneradas.length > 0) {
        simularFacturacion(clientId);
    }
}

// Función para verificar la conectividad de la API
async function verificarConectividadAPI() {
    console.log('\n🌐 === VERIFICACIÓN DE CONECTIVIDAD API ===');
    
    if (!API_URL_INVOICES) {
        console.log('❌ API_URL_INVOICES no configurada');
        return;
    }
    
    try {
        console.log(`📡 Probando conexión a: ${API_URL_INVOICES}`);
        
        const response = await fetch(`${API_URL_INVOICES}?sheet=Facturas`);
        console.log(`📡 Respuesta: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Conexión exitosa. Datos recibidos: ${data.length} registros`);
        } else {
            console.log('❌ Error en la respuesta de la API');
        }
        
    } catch (error) {
        console.error('❌ Error de conectividad:', error);
    }
}

// Exportar funciones para uso global
window.diagnosticarFacturacion = diagnosticarFacturacion;
window.probarGeneracionFacturas = probarGeneracionFacturas;
window.probarEnvioAPI = probarEnvioAPI;
window.simularFacturacion = simularFacturacion;
window.verificarErroresConsola = verificarErroresConsola;
window.ejecutarDiagnosticoCompleto = ejecutarDiagnosticoCompleto;
window.probarClienteEspecifico = probarClienteEspecifico;
window.verificarConectividadAPI = verificarConectividadAPI;

console.log('✅ Script de diagnóstico cargado');
console.log('💡 Usa ejecutarDiagnosticoCompleto() para iniciar el diagnóstico');
console.log('💡 Usa probarClienteEspecifico(clientId) para probar un cliente específico');
console.log('💡 Usa verificarConectividadAPI() para verificar la API'); 