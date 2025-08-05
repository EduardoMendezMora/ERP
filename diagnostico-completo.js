// ===== DIAGNÓSTICO COMPLETO DEL SISTEMA DE FACTURACIÓN =====

console.log('🔍 === DIAGNÓSTICO COMPLETO DEL SISTEMA DE FACTURACIÓN ===');
console.log('Fecha y hora:', new Date().toLocaleString());

// ===== 1. VERIFICACIÓN DE CONFIGURACIÓN DE API =====
function verificarConfiguracionAPI() {
    console.log('\n🌐 === VERIFICACIÓN DE CONFIGURACIÓN DE API ===');
    
    // Verificar configuración en clientes.html
    console.log('📋 Configuración en clientes.html:');
    console.log('  - API_URL_CLIENTS:', typeof API_URL_CLIENTS, API_URL_CLIENTS || 'undefined');
    console.log('  - API_URL_INVOICES:', typeof API_URL_INVOICES, API_URL_INVOICES || 'undefined');
    
    // Verificar configuración en utils.js
    console.log('📋 Configuración en utils.js:');
    console.log('  - API_CONFIG:', typeof API_CONFIG, API_CONFIG || 'undefined');
    if (API_CONFIG) {
        console.log('    - CLIENTS:', API_CONFIG.CLIENTS);
        console.log('    - INVOICES:', API_CONFIG.INVOICES);
        console.log('    - PAYMENTS:', API_CONFIG.PAYMENTS);
    }
    
    // Verificar si las URLs son consistentes
    if (API_URL_INVOICES && API_CONFIG?.INVOICES) {
        if (API_URL_INVOICES === API_CONFIG.INVOICES) {
            console.log('✅ URLs de API consistentes');
        } else {
            console.log('❌ URLs de API inconsistentes:');
            console.log('    clientes.html:', API_URL_INVOICES);
            console.log('    utils.js:', API_CONFIG.INVOICES);
        }
    }
}

// ===== 2. VERIFICACIÓN DE VARIABLES GLOBALES =====
function verificarVariablesGlobales() {
    console.log('\n📊 === VERIFICACIÓN DE VARIABLES GLOBALES ===');
    
    // Variables en clientes.html
    console.log('📋 Variables en clientes.html:');
    console.log('  - clients:', typeof clients, clients?.length || 'undefined');
    console.log('  - invoices:', typeof invoices, invoices?.length || 'undefined');
    console.log('  - vendors:', typeof vendors, vendors?.length || 'undefined');
    
    // Variables en utils.js
    console.log('📋 Variables en utils.js:');
    console.log('  - currentClient:', typeof currentClient, currentClient ? currentClient.Nombre : 'undefined');
    console.log('  - clientInvoices:', typeof clientInvoices, clientInvoices?.length || 'undefined');
    console.log('  - currentClientId:', typeof currentClientId, currentClientId || 'undefined');
    
    // Variables en window
    console.log('📋 Variables en window:');
    console.log('  - window.currentClient:', typeof window.currentClient, window.currentClient ? window.currentClient.Nombre : 'undefined');
    console.log('  - window.currentClientId:', typeof window.currentClientId, window.currentClientId || 'undefined');
    console.log('  - window.clientInvoices:', typeof window.clientInvoices, window.clientInvoices?.length || 'undefined');
}

// ===== 3. VERIFICACIÓN DE FUNCIONES CRÍTICAS =====
function verificarFuncionesCriticas() {
    console.log('\n🔧 === VERIFICACIÓN DE FUNCIONES CRÍTICAS ===');
    
    // Funciones de facturación
    console.log('📄 Funciones de facturación:');
    console.log('  - billClient:', typeof billClient);
    console.log('  - generateInvoicesForClient:', typeof generateInvoicesForClient);
    console.log('  - getClientBillingInfo:', typeof getClientBillingInfo);
    
    // Funciones de utilidad
    console.log('🛠️ Funciones de utilidad:');
    console.log('  - parseAmount:', typeof parseAmount);
    console.log('  - parseDate:', typeof parseDate);
    console.log('  - formatDateForStorage:', typeof formatDateForStorage);
    console.log('  - formatDateForDB:', typeof formatDateForDB);
    
    // Funciones de UI
    console.log('🎨 Funciones de UI:');
    console.log('  - showToast:', typeof showToast);
    console.log('  - showLoading:', typeof showLoading);
    console.log('  - showError:', typeof showError);
    
    // Funciones de carga de datos
    console.log('📥 Funciones de carga:');
    console.log('  - loadInvoicesData:', typeof loadInvoicesData);
    console.log('  - loadInvoices:', typeof loadInvoices);
    console.log('  - loadClientAndInvoices:', typeof loadClientAndInvoices);
}

// ===== 4. VERIFICACIÓN DE CONECTIVIDAD DE API =====
async function verificarConectividadAPI() {
    console.log('\n🌐 === VERIFICACIÓN DE CONECTIVIDAD DE API ===');
    
    const apis = [
        { name: 'Clientes', url: API_URL_CLIENTS || API_CONFIG?.CLIENTS, sheet: 'Clientes' },
        { name: 'Facturas', url: API_URL_INVOICES || API_CONFIG?.INVOICES, sheet: 'Facturas' },
        { name: 'Pagos', url: API_CONFIG?.PAYMENTS, sheet: 'Pagos' }
    ];
    
    for (const api of apis) {
        if (!api.url) {
            console.log(`❌ ${api.name}: URL no configurada`);
            continue;
        }
        
        try {
            console.log(`📡 Probando ${api.name}: ${api.url}?sheet=${api.sheet}`);
            
            const response = await fetch(`${api.url}?sheet=${api.sheet}`);
            console.log(`  - Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`  - ✅ Datos recibidos: ${Array.isArray(data) ? data.length : 'N/A'} registros`);
                
                if (Array.isArray(data) && data.length > 0) {
                    console.log(`  - 📋 Primer registro:`, Object.keys(data[0]));
                }
            } else {
                console.log(`  - ❌ Error en la respuesta`);
            }
            
        } catch (error) {
            console.log(`  - ❌ Error de conectividad:`, error.message);
        }
    }
}

// ===== 5. VERIFICACIÓN DE CLIENTES Y CONTRATOS =====
function verificarClientesYContratos() {
    console.log('\n📋 === VERIFICACIÓN DE CLIENTES Y CONTRATOS ===');
    
    if (!Array.isArray(clients)) {
        console.log('❌ Variable clients no es un array');
        return;
    }
    
    console.log(`📊 Total de clientes: ${clients.length}`);
    
    // Clientes con contratos completos
    const clientesCompletos = clients.filter(client => 
        client.fechaContrato && client.montoContrato && client.plazoContrato
    );
    
    console.log(`✅ Clientes con contrato completo: ${clientesCompletos.length}`);
    console.log(`❌ Clientes con contrato incompleto: ${clients.length - clientesCompletos.length}`);
    
    // Mostrar detalles de los primeros 5 clientes
    clients.slice(0, 5).forEach((client, index) => {
        const contratoCompleto = client.fechaContrato && client.montoContrato && client.plazoContrato;
        console.log(`\n📋 Cliente ${index + 1}: ${client.Nombre} (ID: ${client.ID})`);
        console.log(`  - Contrato completo: ${contratoCompleto ? '✅' : '❌'}`);
        console.log(`  - Fecha contrato: ${client.fechaContrato || 'Faltante'}`);
        console.log(`  - Monto contrato: ${client.montoContrato || 'Faltante'}`);
        console.log(`  - Plazo contrato: ${client.plazoContrato || 'Faltante'}`);
        console.log(`  - Día pago: ${client.diaPago || 'No especificado'}`);
        
        // Verificar si ya está facturado
        if (typeof getClientBillingInfo === 'function') {
            const billingInfo = getClientBillingInfo(client.ID);
            console.log(`  - Estado facturación: ${billingInfo.status}`);
            if (billingInfo.status === 'billed') {
                console.log(`  - Facturas existentes: ${billingInfo.invoices.length}`);
            }
        }
    });
}

// ===== 6. VERIFICACIÓN DE FACTURAS EXISTENTES =====
function verificarFacturasExistentes() {
    console.log('\n📄 === VERIFICACIÓN DE FACTURAS EXISTENTES ===');
    
    if (!Array.isArray(invoices)) {
        console.log('❌ Variable invoices no es un array');
        return;
    }
    
    console.log(`📊 Total de facturas: ${invoices.length}`);
    
    // Agrupar por cliente
    const facturasPorCliente = {};
    invoices.forEach(inv => {
        const clientId = inv.ID_Cliente;
        if (!facturasPorCliente[clientId]) {
            facturasPorCliente[clientId] = [];
        }
        facturasPorCliente[clientId].push(inv);
    });
    
    console.log(`👥 Clientes con facturas: ${Object.keys(facturasPorCliente).length}`);
    
    // Mostrar estadísticas por estado
    const estados = {};
    invoices.forEach(inv => {
        const estado = inv.Estado || 'Sin Estado';
        estados[estado] = (estados[estado] || 0) + 1;
    });
    
    console.log('📊 Facturas por estado:');
    Object.entries(estados).forEach(([estado, cantidad]) => {
        console.log(`  - ${estado}: ${cantidad}`);
    });
    
    // Mostrar las primeras 5 facturas
    console.log('\n📋 Primeras 5 facturas:');
    invoices.slice(0, 5).forEach((inv, index) => {
        console.log(`  ${index + 1}. ${inv.NumeroFactura} - Cliente: ${inv.ID_Cliente} - Estado: ${inv.Estado} - Monto: ${inv.MontoTotal}`);
    });
}

// ===== 7. VERIFICACIÓN DE ELEMENTOS DEL DOM =====
function verificarElementosDOM() {
    console.log('\n🖥️ === VERIFICACIÓN DE ELEMENTOS DEL DOM ===');
    
    const elementos = [
        'loading',
        'clientsGrid', 
        'emptyState',
        'mainContent',
        'errorState',
        'clientName',
        'clientNameDetail'
    ];
    
    elementos.forEach(id => {
        const elemento = document.getElementById(id);
        console.log(`  - ${id}: ${elemento ? '✅ Encontrado' : '❌ No encontrado'}`);
    });
    
    // Verificar botones de facturación
    const billButtons = document.querySelectorAll('[id^="billBtn-"]');
    console.log(`\n🔘 Botones de facturación encontrados: ${billButtons.length}`);
    
    billButtons.forEach((btn, index) => {
        const clientId = btn.id.replace('billBtn-', '');
        console.log(`  - Botón ${index + 1}: ID=${clientId}, Texto="${btn.textContent}", Disabled=${btn.disabled}`);
    });
}

// ===== 8. VERIFICACIÓN DE ERRORES EN CONSOLA =====
function verificarErroresConsola() {
    console.log('\n🚨 === VERIFICACIÓN DE ERRORES ===');
    
    // Interceptar errores futuros
    const originalError = console.error;
    const originalWarn = console.warn;
    
    let errorCount = 0;
    let warningCount = 0;
    
    console.error = function(...args) {
        errorCount++;
        console.log(`🚨 Error ${errorCount}:`, ...args);
        originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
        warningCount++;
        console.log(`⚠️ Warning ${warningCount}:`, ...args);
        originalWarn.apply(console, args);
    };
    
    // Agregar listeners para errores no capturados
    window.addEventListener('error', function(e) {
        console.log('🚨 Error de JavaScript no capturado:', e.error);
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        console.log('🚨 Promesa rechazada no capturada:', e.reason);
    });
    
    console.log('🔍 Monitoreo de errores activado');
}

// ===== 9. PRUEBA DE GENERACIÓN DE FACTURAS =====
function probarGeneracionFacturas() {
    console.log('\n🧪 === PRUEBA DE GENERACIÓN DE FACTURAS ===');
    
    if (!Array.isArray(clients) || clients.length === 0) {
        console.log('❌ No hay clientes disponibles para probar');
        return;
    }
    
    // Buscar un cliente con contrato completo que no esté facturado
    const clientePrueba = clients.find(client => {
        const contratoCompleto = client.fechaContrato && client.montoContrato && client.plazoContrato;
        if (!contratoCompleto) return false;
        
        if (typeof getClientBillingInfo === 'function') {
            const billingInfo = getClientBillingInfo(client.ID);
            return billingInfo.status === 'not_billed';
        }
        
        return true; // Si no hay función de verificación, asumir que no está facturado
    });
    
    if (!clientePrueba) {
        console.log('❌ No se encontró cliente adecuado para la prueba');
        console.log('💡 Buscando cliente con contrato completo...');
        
        const clientesCompletos = clients.filter(client => 
            client.fechaContrato && client.montoContrato && client.plazoContrato
        );
        
        if (clientesCompletos.length > 0) {
            console.log(`✅ Encontrados ${clientesCompletos.length} clientes con contrato completo`);
            console.log('💡 Todos podrían estar ya facturados');
        } else {
            console.log('❌ No hay clientes con contrato completo');
        }
        return;
    }
    
    console.log(`🧪 Probando con cliente: ${clientePrueba.Nombre} (ID: ${clientePrueba.ID})`);
    
    // Probar generación de facturas
    if (typeof generateInvoicesForClient === 'function') {
        try {
            console.log('🔄 Generando facturas de prueba...');
            const facturasGeneradas = generateInvoicesForClient(clientePrueba);
            
            console.log(`✅ ${facturasGeneradas.length} facturas generadas`);
            
            // Mostrar las primeras 3 facturas
            facturasGeneradas.slice(0, 3).forEach((factura, index) => {
                console.log(`\n📄 Factura ${index + 1}:`);
                console.log(`  - Número: ${factura.NumeroFactura}`);
                console.log(`  - Cliente: ${factura.ID_Cliente}`);
                console.log(`  - Semana: ${factura.SemanaNumero} - ${factura.SemanaDescripcion}`);
                console.log(`  - Vencimiento: ${factura.FechaVencimiento}`);
                console.log(`  - Monto: ${factura.MontoBase}`);
                console.log(`  - Estado: ${factura.Estado}`);
            });
            
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

// ===== 10. VERIFICACIÓN DE FORMATOS DE DATOS =====
function verificarFormatosDatos() {
    console.log('\n📝 === VERIFICACIÓN DE FORMATOS DE DATOS ===');
    
    if (!Array.isArray(clients) || clients.length === 0) {
        console.log('❌ No hay clientes para verificar formatos');
        return;
    }
    
    const cliente = clients[0];
    console.log(`📋 Verificando formatos con cliente: ${cliente.Nombre}`);
    
    // Verificar formato de fecha
    if (cliente.fechaContrato) {
        console.log(`📅 Fecha contrato: "${cliente.fechaContrato}"`);
        
        if (typeof parseDate === 'function') {
            const fechaParseada = parseDate(cliente.fechaContrato);
            console.log(`  - Parseada: ${fechaParseada}`);
            console.log(`  - Válida: ${fechaParseada instanceof Date && !isNaN(fechaParseada)}`);
        }
    }
    
    // Verificar formato de monto
    if (cliente.montoContrato) {
        console.log(`💰 Monto contrato: "${cliente.montoContrato}"`);
        
        if (typeof parseAmount === 'function') {
            const montoParseado = parseAmount(cliente.montoContrato);
            console.log(`  - Parseado: ${montoParseado}`);
            console.log(`  - Tipo: ${typeof montoParseado}`);
        }
    }
    
    // Verificar formato de plazo
    if (cliente.plazoContrato) {
        console.log(`⏱️ Plazo contrato: "${cliente.plazoContrato}"`);
        const plazoNumerico = parseInt(cliente.plazoContrato);
        console.log(`  - Numérico: ${plazoNumerico}`);
        console.log(`  - Válido: ${!isNaN(plazoNumerico)}`);
    }
}

// ===== FUNCIÓN PRINCIPAL DE DIAGNÓSTICO =====
async function ejecutarDiagnosticoCompleto() {
    console.log('🚀 === INICIANDO DIAGNÓSTICO COMPLETO ===');
    
    try {
        // 1. Verificar configuración
        verificarConfiguracionAPI();
        
        // 2. Verificar variables
        verificarVariablesGlobales();
        
        // 3. Verificar funciones
        verificarFuncionesCriticas();
        
        // 4. Verificar conectividad
        await verificarConectividadAPI();
        
        // 5. Verificar clientes
        verificarClientesYContratos();
        
        // 6. Verificar facturas
        verificarFacturasExistentes();
        
        // 7. Verificar DOM
        verificarElementosDOM();
        
        // 8. Verificar errores
        verificarErroresConsola();
        
        // 9. Verificar formatos
        verificarFormatosDatos();
        
        // 10. Probar generación
        const facturasPrueba = probarGeneracionFacturas();
        
        console.log('\n✅ === DIAGNÓSTICO COMPLETADO ===');
        console.log('💡 Revisa los resultados arriba para identificar problemas');
        
        if (facturasPrueba && facturasPrueba.length > 0) {
            console.log('🎯 Próximo paso: Probar envío a API con probarEnvioAPI(facturasPrueba)');
        }
        
    } catch (error) {
        console.error('❌ Error durante el diagnóstico:', error);
    }
}

// ===== FUNCIÓN PARA PROBAR ENVÍO A API =====
async function probarEnvioAPI(facturasGeneradas) {
    console.log('\n🌐 === PRUEBA DE ENVÍO A API ===');
    
    if (!facturasGeneradas || facturasGeneradas.length === 0) {
        console.log('❌ No hay facturas para enviar');
        return;
    }
    
    const apiUrl = API_URL_INVOICES || API_CONFIG?.INVOICES;
    if (!apiUrl) {
        console.log('❌ URL de API no configurada');
        return;
    }
    
    console.log(`📡 URL de API: ${apiUrl}`);
    console.log(`📦 Facturas a enviar: ${facturasGeneradas.length}`);
    
    try {
        // Solo enviar la primera factura como prueba
        const facturaPrueba = facturasGeneradas[0];
        console.log('\n📤 Enviando factura de prueba:', facturaPrueba.NumeroFactura);
        
        const response = await fetch(`${apiUrl}?sheet=Facturas`, {
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

// ===== EXPONER FUNCIONES GLOBALMENTE =====
window.ejecutarDiagnosticoCompleto = ejecutarDiagnosticoCompleto;
window.probarEnvioAPI = probarEnvioAPI;
window.verificarConfiguracionAPI = verificarConfiguracionAPI;
window.verificarVariablesGlobales = verificarVariablesGlobales;
window.verificarFuncionesCriticas = verificarFuncionesCriticas;
window.verificarConectividadAPI = verificarConectividadAPI;
window.verificarClientesYContratos = verificarClientesYContratos;
window.verificarFacturasExistentes = verificarFacturasExistentes;
window.verificarElementosDOM = verificarElementosDOM;
window.verificarErroresConsola = verificarErroresConsola;
window.probarGeneracionFacturas = probarGeneracionFacturas;
window.verificarFormatosDatos = verificarFormatosDatos;

console.log('✅ Script de diagnóstico completo cargado');
console.log('💡 Usa ejecutarDiagnosticoCompleto() para iniciar el diagnóstico completo'); 