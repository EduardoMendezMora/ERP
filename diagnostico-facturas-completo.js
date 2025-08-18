// ===== DIAGNÓSTICO COMPLETO DEL SISTEMA DE FACTURAS =====
// Este archivo identifica y diagnostica problemas en la carga de facturas

console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DEL SISTEMA DE FACTURAS');

// ===== 1. VERIFICACIÓN DE VARIABLES GLOBALES =====
function verificarVariablesGlobales() {
    console.log('\n📋 1. VERIFICACIÓN DE VARIABLES GLOBALES');
    
    const variables = [
        'currentClient',
        'window.currentClient',
        'currentClientId',
        'window.currentClientId',
        'clientInvoices',
        'window.clientInvoices',
        'unassignedPayments',
        'window.unassignedPayments',
        'assignedPayments',
        'window.assignedPayments'
    ];
    
    variables.forEach(varName => {
        const value = eval(varName);
        console.log(`  ${varName}:`, {
            tipo: typeof value,
            valor: value,
            esArray: Array.isArray(value),
            longitud: Array.isArray(value) ? value.length : 'N/A'
        });
    });
}

// ===== 2. VERIFICACIÓN DE FUNCIONES CRÍTICAS =====
function verificarFuncionesCriticas() {
    console.log('\n🔧 2. VERIFICACIÓN DE FUNCIONES CRÍTICAS');
    
    const funciones = [
        'loadClientAndInvoices',
        'parseDate',
        'formatDateForStorage',
        'formatDateForDisplay',
        'parseAmount',
        'renderPage',
        'getUpcomingInvoices'
    ];
    
    funciones.forEach(funcName => {
        const func = eval(funcName);
        console.log(`  ${funcName}:`, {
            existe: typeof func === 'function',
            tipo: typeof func
        });
    });
}

// ===== 3. VERIFICACIÓN DE CONFIGURACIÓN API =====
function verificarConfiguracionAPI() {
    console.log('\n🌐 3. VERIFICACIÓN DE CONFIGURACIÓN API');
    
    if (typeof API_CONFIG !== 'undefined') {
        console.log('  API_CONFIG encontrado:', {
            CLIENTS: API_CONFIG.CLIENTS,
            INVOICES: API_CONFIG.INVOICES,
            PAYMENTS: API_CONFIG.PAYMENTS
        });
    } else {
        console.error('  ❌ API_CONFIG no encontrado');
    }
}

// ===== 4. VERIFICACIÓN DE PARÁMETROS URL =====
function verificarParametrosURL() {
    console.log('\n🔗 4. VERIFICACIÓN DE PARÁMETROS URL');
    
    const urlParams = new URLSearchParams(window.location.search);
    const parametros = ['clientId', 'id', 'cliente'];
    
    parametros.forEach(param => {
        const valor = urlParams.get(param);
        console.log(`  ${param}:`, valor || 'No encontrado');
    });
    
    console.log('  URL completa:', window.location.href);
}

// ===== 5. VERIFICACIÓN DE DATOS DE CLIENTE =====
async function verificarDatosCliente() {
    console.log('\n👤 5. VERIFICACIÓN DE DATOS DE CLIENTE');
    
    try {
        const clientId = currentClientId || window.currentClientId;
        if (!clientId) {
            console.error('  ❌ No hay ID de cliente disponible');
            return;
        }
        
        console.log('  ID Cliente:', clientId);
        
        const client = currentClient || window.currentClient;
        if (client) {
            console.log('  Cliente cargado:', {
                ID: client.ID,
                Nombre: client.Nombre,
                Telefono: client.numeroTelefono,
                Placa: client.Placa
            });
        } else {
            console.error('  ❌ Cliente no cargado');
        }
        
    } catch (error) {
        console.error('  ❌ Error verificando datos de cliente:', error);
    }
}

// ===== 6. VERIFICACIÓN DE FACTURAS =====
async function verificarFacturas() {
    console.log('\n📄 6. VERIFICACIÓN DE FACTURAS');
    
    try {
        const invoices = clientInvoices || window.clientInvoices || [];
        console.log(`  Total facturas cargadas: ${invoices.length}`);
        
        if (invoices.length > 0) {
            // Clasificar facturas por estado
            const estados = {};
            invoices.forEach(inv => {
                const estado = inv.Estado || 'Sin Estado';
                estados[estado] = (estados[estado] || 0) + 1;
            });
            
            console.log('  Distribución por estado:', estados);
            
            // Verificar facturas no vencidas
            const noVencidas = invoices.filter(inv => inv.Estado === 'Pendiente');
            console.log(`  Facturas no vencidas (Pendiente): ${noVencidas.length}`);
            
            if (noVencidas.length > 0) {
                console.log('  Ejemplos de facturas no vencidas:');
                noVencidas.slice(0, 3).forEach(inv => {
                    console.log(`    - ${inv.NumeroFactura}: ${inv.FechaVencimiento} (${inv.Estado})`);
                });
            }
            
            // Verificar problemas de fechas
            const problemasFecha = invoices.filter(inv => {
                if (!inv.FechaVencimiento) return true;
                const fecha = parseDate(inv.FechaVencimiento);
                return !fecha || isNaN(fecha.getTime());
            });
            
            if (problemasFecha.length > 0) {
                console.warn(`  ⚠️ Facturas con problemas de fecha: ${problemasFecha.length}`);
                problemasFecha.slice(0, 3).forEach(inv => {
                    console.log(`    - ${inv.NumeroFactura}: "${inv.FechaVencimiento}"`);
                });
            }
        }
        
    } catch (error) {
        console.error('  ❌ Error verificando facturas:', error);
    }
}

// ===== 7. VERIFICACIÓN DE PAGOS =====
async function verificarPagos() {
    console.log('\n💰 7. VERIFICACIÓN DE PAGOS');
    
    try {
        const unassigned = unassignedPayments || window.unassignedPayments || [];
        const assigned = assignedPayments || window.assignedPayments || [];
        
        console.log(`  Pagos no asignados: ${unassigned.length}`);
        console.log(`  Pagos asignados: ${assigned.length}`);
        
        if (unassigned.length > 0) {
            console.log('  Ejemplos de pagos no asignados:');
            unassigned.slice(0, 3).forEach(payment => {
                console.log(`    - ${payment.Referencia}: ₡${payment.Créditos} (${payment.BankSource})`);
            });
        }
        
    } catch (error) {
        console.error('  ❌ Error verificando pagos:', error);
    }
}

// ===== 8. VERIFICACIÓN DE RENDERIZADO =====
function verificarRenderizado() {
    console.log('\n🎨 8. VERIFICACIÓN DE RENDERIZADO');
    
    const elementos = [
        'mainContent',
        'clientName',
        'clientNameDetail',
        'overdueInvoices',
        'upcomingInvoices',
        'paidInvoices',
        'unassignedPayments',
        'assignedPayments'
    ];
    
    elementos.forEach(elementId => {
        const elemento = document.getElementById(elementId);
        console.log(`  ${elementId}:`, {
            existe: !!elemento,
            visible: elemento ? elemento.style.display !== 'none' : false,
            contenido: elemento ? elemento.innerHTML.length : 0
        });
    });
}

// ===== 9. VERIFICACIÓN DE OPTIMIZACIÓN =====
function verificarOptimizacion() {
    console.log('\n⚡ 9. VERIFICACIÓN DE OPTIMIZACIÓN');
    
    // Verificar si las funciones de optimización están disponibles
    const funcionesOptimizacion = [
        'filterInvoicesOptimized',
        'loadInvoicesOptimized'
    ];
    
    funcionesOptimizacion.forEach(funcName => {
        const func = eval(funcName);
        console.log(`  ${funcName}:`, {
            existe: typeof func === 'function',
            tipo: typeof func
        });
    });
    
    // Verificar si se está aplicando el filtrado
    if (typeof filterInvoicesOptimized === 'function') {
        console.log('  ✅ Función de optimización disponible');
    } else {
        console.warn('  ⚠️ Función de optimización no encontrada');
    }
}

// ===== 10. VERIFICACIÓN DE ERRORES EN CONSOLA =====
function verificarErroresConsola() {
    console.log('\n🚨 10. VERIFICACIÓN DE ERRORES EN CONSOLA');
    
    // Capturar errores futuros
    const originalError = console.error;
    const errores = [];
    
    console.error = function(...args) {
        errores.push({
            timestamp: new Date().toISOString(),
            message: args.join(' ')
        });
        originalError.apply(console, args);
    };
    
    // Mostrar errores capturados
    if (errores.length > 0) {
        console.log(`  Errores capturados: ${errores.length}`);
        errores.forEach(error => {
            console.log(`    [${error.timestamp}] ${error.message}`);
        });
    } else {
        console.log('  ✅ No se detectaron errores en consola');
    }
}

// ===== 11. VERIFICACIÓN DE RENDIMIENTO =====
function verificarRendimiento() {
    console.log('\n📊 11. VERIFICACIÓN DE RENDIMIENTO');
    
    const performance = window.performance;
    if (performance && performance.timing) {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
        
        console.log('  Tiempos de carga:', {
            'Tiempo total': `${loadTime}ms`,
            'DOM Ready': `${domReadyTime}ms`
        });
    }
    
    // Verificar uso de memoria
    if (performance && performance.memory) {
        const memory = performance.memory;
        console.log('  Uso de memoria:', {
            'Usado': `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
            'Total': `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
            'Límite': `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
        });
    }
}

// ===== 12. VERIFICACIÓN DE CONECTIVIDAD API =====
async function verificarConectividadAPI() {
    console.log('\n🌐 12. VERIFICACIÓN DE CONECTIVIDAD API');
    
    try {
        const apis = [
            { nombre: 'Clientes', url: `${API_CONFIG.CLIENTS}?sheet=Clientes` },
            { nombre: 'Facturas', url: `${API_CONFIG.INVOICES}?sheet=Facturas` },
            { nombre: 'Pagos BAC', url: `${API_CONFIG.PAYMENTS}?sheet=BAC` }
        ];
        
        for (const api of apis) {
            try {
                const startTime = Date.now();
                const response = await fetch(api.url);
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                console.log(`  ${api.nombre}:`, {
                    estado: response.status,
                    tiempo: `${responseTime}ms`,
                    ok: response.ok
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`    Datos recibidos: ${Array.isArray(data) ? data.length : 'N/A'} elementos`);
                }
                
            } catch (error) {
                console.error(`  ❌ Error en ${api.nombre}:`, error.message);
            }
        }
        
    } catch (error) {
        console.error('  ❌ Error verificando conectividad API:', error);
    }
}

// ===== FUNCIÓN PRINCIPAL DE DIAGNÓSTICO =====
async function ejecutarDiagnosticoCompleto() {
    console.log('🚀 EJECUTANDO DIAGNÓSTICO COMPLETO DEL SISTEMA DE FACTURAS');
    console.log('=' .repeat(80));
    
    try {
        // Ejecutar todas las verificaciones
        verificarVariablesGlobales();
        verificarFuncionesCriticas();
        verificarConfiguracionAPI();
        verificarParametrosURL();
        await verificarDatosCliente();
        await verificarFacturas();
        await verificarPagos();
        verificarRenderizado();
        verificarOptimizacion();
        verificarErroresConsola();
        verificarRendimiento();
        await verificarConectividadAPI();
        
        console.log('\n' + '=' .repeat(80));
        console.log('✅ DIAGNÓSTICO COMPLETADO');
        console.log('📋 Revisa los resultados arriba para identificar problemas');
        
    } catch (error) {
        console.error('❌ Error durante el diagnóstico:', error);
    }
}

// ===== FUNCIÓN DE DIAGNÓSTICO ESPECÍFICO PARA FACTURAS NO VENCIDAS =====
async function diagnosticarFacturasNoVencidas() {
    console.log('\n🔍 DIAGNÓSTICO ESPECÍFICO: FACTURAS NO VENCIDAS');
    
    try {
        const invoices = clientInvoices || window.clientInvoices || [];
        const noVencidas = invoices.filter(inv => inv.Estado === 'Pendiente');
        
        console.log(`📊 Total facturas: ${invoices.length}`);
        console.log(`📅 Facturas no vencidas (Pendiente): ${noVencidas.length}`);
        
        if (noVencidas.length === 0) {
            console.log('❌ PROBLEMA: No hay facturas no vencidas cargadas');
            
            // Verificar si hay facturas con otros estados
            const estados = {};
            invoices.forEach(inv => {
                const estado = inv.Estado || 'Sin Estado';
                estados[estado] = (estados[estado] || 0) + 1;
            });
            
            console.log('📋 Distribución actual de estados:', estados);
            
            // Verificar si el problema está en el filtrado
            const todasPendientes = invoices.filter(inv => {
                if (!inv.FechaVencimiento) return false;
                const fecha = parseDate(inv.FechaVencimiento);
                if (!fecha) return false;
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                return fecha > today;
            });
            
            console.log(`🔍 Facturas que deberían ser no vencidas: ${todasPendientes.length}`);
            
            if (todasPendientes.length > 0) {
                console.log('📋 Ejemplos de facturas que deberían ser no vencidas:');
                todasPendientes.slice(0, 5).forEach(inv => {
                    console.log(`  - ${inv.NumeroFactura}: ${inv.FechaVencimiento} (Estado: ${inv.Estado})`);
                });
            }
            
        } else {
            console.log('✅ Facturas no vencidas encontradas');
            console.log('📋 Ejemplos:');
            noVencidas.slice(0, 5).forEach(inv => {
                console.log(`  - ${inv.NumeroFactura}: ${inv.FechaVencimiento}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error en diagnóstico de facturas no vencidas:', error);
    }
}

// ===== EXPONER FUNCIONES GLOBALMENTE =====
window.ejecutarDiagnosticoCompleto = ejecutarDiagnosticoCompleto;
window.diagnosticarFacturasNoVencidas = diagnosticarFacturasNoVencidas;

console.log('✅ Diagnóstico de facturas cargado - Usa ejecutarDiagnosticoCompleto() o diagnosticarFacturasNoVencidas()');
