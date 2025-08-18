// ===== PRUEBA ESPECÍFICA: FACTURAS NO VENCIDAS =====
// Este archivo prueba específicamente la carga de facturas no vencidas

console.log('🧪 INICIANDO PRUEBA ESPECÍFICA: FACTURAS NO VENCIDAS');

// ===== 1. PRUEBA DE FUNCIÓN GETUPCOMINGINVOICES =====
function probarGetUpcomingInvoices() {
    console.log('\n📅 1. PRUEBA DE FUNCIÓN GETUPCOMINGINVOICES');
    
    try {
        // Verificar si la función existe
        if (typeof getUpcomingInvoices !== 'function') {
            console.error('❌ Función getUpcomingInvoices no encontrada');
            return;
        }
        
        console.log('✅ Función getUpcomingInvoices encontrada');
        
        // Obtener facturas actuales
        const invoices = clientInvoices || window.clientInvoices || [];
        console.log(`📋 Total facturas disponibles: ${invoices.length}`);
        
        // Probar la función
        const upcoming = getUpcomingInvoices(invoices, 2);
        console.log(`📅 Facturas próximas obtenidas: ${upcoming.length}`);
        
        if (upcoming.length > 0) {
            console.log('📋 Ejemplos de facturas próximas:');
            upcoming.forEach((inv, index) => {
                console.log(`  ${index + 1}. ${inv.NumeroFactura}: ${inv.FechaVencimiento} (${inv.Estado})`);
            });
        } else {
            console.log('⚠️ No se encontraron facturas próximas');
        }
        
    } catch (error) {
        console.error('❌ Error probando getUpcomingInvoices:', error);
    }
}

// ===== 2. PRUEBA DE FILTRADO MANUAL =====
function probarFiltradoManual() {
    console.log('\n🔍 2. PRUEBA DE FILTRADO MANUAL');
    
    try {
        const invoices = clientInvoices || window.clientInvoices || [];
        console.log(`📋 Total facturas: ${invoices.length}`);
        
        if (invoices.length === 0) {
            console.log('⚠️ No hay facturas para filtrar');
            return;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log(`📅 Fecha de referencia (hoy): ${today.toISOString().split('T')[0]}`);
        
        // Filtrar facturas pendientes
        const pendientes = invoices.filter(inv => inv.Estado === 'Pendiente');
        console.log(`📋 Facturas con estado "Pendiente": ${pendientes.length}`);
        
        // Filtrar facturas que vencen en el futuro
        const futuras = invoices.filter(inv => {
            if (!inv.FechaVencimiento) return false;
            const fecha = parseDate(inv.FechaVencimiento);
            if (!fecha) return false;
            return fecha > today;
        });
        console.log(`📅 Facturas que vencen en el futuro: ${futuras.length}`);
        
        // Filtrar facturas no vencidas (pendientes + futuras)
        const noVencidas = invoices.filter(inv => {
            if (inv.Estado === 'Pendiente') return true;
            if (!inv.FechaVencimiento) return false;
            const fecha = parseDate(inv.FechaVencimiento);
            if (!fecha) return false;
            return fecha > today;
        });
        console.log(`📋 Facturas no vencidas (combinado): ${noVencidas.length}`);
        
        // Mostrar ejemplos
        if (noVencidas.length > 0) {
            console.log('📋 Ejemplos de facturas no vencidas:');
            noVencidas.slice(0, 5).forEach((inv, index) => {
                const fecha = parseDate(inv.FechaVencimiento);
                const diasHastaVencimiento = fecha ? Math.ceil((fecha - today) / (1000 * 60 * 60 * 24)) : 'N/A';
                console.log(`  ${index + 1}. ${inv.NumeroFactura}: ${inv.FechaVencimiento} (${inv.Estado}) - ${diasHastaVencimiento} días`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error en filtrado manual:', error);
    }
}

// ===== 3. PRUEBA DE PARSEO DE FECHAS =====
function probarParseoFechas() {
    console.log('\n📅 3. PRUEBA DE PARSEO DE FECHAS');
    
    try {
        const invoices = clientInvoices || window.clientInvoices || [];
        
        if (invoices.length === 0) {
            console.log('⚠️ No hay facturas para probar fechas');
            return;
        }
        
        // Verificar función parseDate
        if (typeof parseDate !== 'function') {
            console.error('❌ Función parseDate no encontrada');
            return;
        }
        
        console.log('✅ Función parseDate encontrada');
        
        // Probar con algunas fechas
        const fechasPrueba = [
            '05/08/2025',
            '2025-08-05',
            '05-08-2025',
            'invalid-date',
            '',
            null
        ];
        
        console.log('🧪 Probando parseo de fechas:');
        fechasPrueba.forEach(fecha => {
            const resultado = parseDate(fecha);
            console.log(`  "${fecha}" -> ${resultado ? resultado.toISOString().split('T')[0] : 'null'}`);
        });
        
        // Verificar fechas problemáticas en las facturas
        const fechasProblematicas = invoices.filter(inv => {
            if (!inv.FechaVencimiento) return true;
            const fecha = parseDate(inv.FechaVencimiento);
            return !fecha || isNaN(fecha.getTime());
        });
        
        if (fechasProblematicas.length > 0) {
            console.warn(`⚠️ Facturas con fechas problemáticas: ${fechasProblematicas.length}`);
            fechasProblematicas.slice(0, 3).forEach(inv => {
                console.log(`  - ${inv.NumeroFactura}: "${inv.FechaVencimiento}"`);
            });
        } else {
            console.log('✅ Todas las fechas se parsean correctamente');
        }
        
    } catch (error) {
        console.error('❌ Error probando parseo de fechas:', error);
    }
}

// ===== 4. PRUEBA DE RENDERIZADO DE SECCIÓN =====
function probarRenderizadoSeccion() {
    console.log('\n🎨 4. PRUEBA DE RENDERIZADO DE SECCIÓN');
    
    try {
        // Verificar si la función existe
        if (typeof renderInvoicesSection !== 'function') {
            console.error('❌ Función renderInvoicesSection no encontrada');
            return;
        }
        
        console.log('✅ Función renderInvoicesSection encontrada');
        
        // Verificar elementos del DOM
        const elementos = [
            'upcomingInvoices',
            'upcomingCount',
            'emptyUpcoming'
        ];
        
        console.log('🔍 Verificando elementos del DOM:');
        elementos.forEach(elementId => {
            const elemento = document.getElementById(elementId);
            console.log(`  ${elementId}: ${elemento ? '✅ Encontrado' : '❌ No encontrado'}`);
        });
        
        // Obtener facturas próximas
        const invoices = clientInvoices || window.clientInvoices || [];
        const upcoming = getUpcomingInvoices(invoices, 2);
        
        console.log(`📋 Facturas próximas para renderizar: ${upcoming.length}`);
        
        // Intentar renderizar (si los elementos existen)
        const container = document.getElementById('upcomingInvoices');
        if (container) {
            console.log('🎨 Intentando renderizar sección...');
            try {
                renderInvoicesSection('upcoming', upcoming);
                console.log('✅ Renderizado completado');
                console.log(`📊 Contenido del contenedor: ${container.innerHTML.length} caracteres`);
            } catch (error) {
                console.error('❌ Error durante el renderizado:', error);
            }
        } else {
            console.log('⚠️ Contenedor no encontrado, no se puede renderizar');
        }
        
    } catch (error) {
        console.error('❌ Error probando renderizado:', error);
    }
}

// ===== 5. PRUEBA DE CARGA COMPLETA =====
async function probarCargaCompleta() {
    console.log('\n🔄 5. PRUEBA DE CARGA COMPLETA');
    
    try {
        const clientId = currentClientId || window.currentClientId;
        if (!clientId) {
            console.error('❌ No hay ID de cliente disponible');
            return;
        }
        
        console.log(`🆔 Cliente ID: ${clientId}`);
        
        // Verificar función de carga
        if (typeof loadClientAndInvoices !== 'function') {
            console.error('❌ Función loadClientAndInvoices no encontrada');
            return;
        }
        
        console.log('✅ Función loadClientAndInvoices encontrada');
        
        // Probar recarga
        console.log('🔄 Iniciando recarga de datos...');
        const startTime = Date.now();
        
        await loadClientAndInvoices(clientId);
        
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        
        console.log(`✅ Recarga completada en ${loadTime}ms`);
        
        // Verificar resultados
        const invoices = clientInvoices || window.clientInvoices || [];
        const upcoming = getUpcomingInvoices(invoices, 2);
        
        console.log(`📊 Resultados después de la recarga:`);
        console.log(`  - Total facturas: ${invoices.length}`);
        console.log(`  - Facturas próximas: ${upcoming.length}`);
        
        if (upcoming.length > 0) {
            console.log('📋 Facturas próximas encontradas:');
            upcoming.forEach((inv, index) => {
                console.log(`  ${index + 1}. ${inv.NumeroFactura}: ${inv.FechaVencimiento}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error en carga completa:', error);
    }
}

// ===== 6. PRUEBA DE OPTIMIZACIÓN =====
function probarOptimizacion() {
    console.log('\n⚡ 6. PRUEBA DE OPTIMIZACIÓN');
    
    try {
        // Verificar funciones de optimización
        const funciones = [
            'filterInvoicesOptimized',
            'loadInvoicesOptimized'
        ];
        
        console.log('🔍 Verificando funciones de optimización:');
        funciones.forEach(funcName => {
            const func = eval(funcName);
            console.log(`  ${funcName}: ${typeof func === 'function' ? '✅ Disponible' : '❌ No disponible'}`);
        });
        
        // Verificar si se está aplicando el filtrado
        if (typeof filterInvoicesOptimized === 'function') {
            console.log('✅ Función de optimización disponible');
            
            // Simular datos para probar
            const mockInvoices = [
                { NumeroFactura: 'TEST-001', FechaVencimiento: '05/08/2025', Estado: 'Pendiente' },
                { NumeroFactura: 'TEST-002', FechaVencimiento: '15/08/2025', Estado: 'Pendiente' },
                { NumeroFactura: 'TEST-003', FechaVencimiento: '25/08/2025', Estado: 'Pendiente' }
            ];
            
            console.log('🧪 Probando filtrado optimizado con datos de prueba...');
            const filtered = filterInvoicesOptimized(mockInvoices);
            console.log(`📊 Resultado: ${filtered.length} de ${mockInvoices.length} facturas filtradas`);
            
        } else {
            console.log('⚠️ Función de optimización no disponible');
        }
        
    } catch (error) {
        console.error('❌ Error probando optimización:', error);
    }
}

// ===== FUNCIÓN PRINCIPAL DE PRUEBA =====
async function ejecutarPruebaCompleta() {
    console.log('🚀 EJECUTANDO PRUEBA COMPLETA DE FACTURAS NO VENCIDAS');
    console.log('=' .repeat(80));
    
    try {
        // Ejecutar todas las pruebas
        probarGetUpcomingInvoices();
        probarFiltradoManual();
        probarParseoFechas();
        probarRenderizadoSeccion();
        await probarCargaCompleta();
        probarOptimizacion();
        
        console.log('\n' + '=' .repeat(80));
        console.log('✅ PRUEBA COMPLETADA');
        console.log('📋 Revisa los resultados arriba para identificar problemas específicos');
        
    } catch (error) {
        console.error('❌ Error durante la prueba:', error);
    }
}

// ===== FUNCIÓN DE PRUEBA RÁPIDA =====
function pruebaRapida() {
    console.log('⚡ PRUEBA RÁPIDA DE FACTURAS NO VENCIDAS');
    
    const invoices = clientInvoices || window.clientInvoices || [];
    const noVencidas = invoices.filter(inv => inv.Estado === 'Pendiente');
    const upcoming = getUpcomingInvoices(invoices, 2);
    
    console.log(`📊 Resultados rápidos:`);
    console.log(`  - Total facturas: ${invoices.length}`);
    console.log(`  - Pendientes: ${noVencidas.length}`);
    console.log(`  - Próximas (getUpcomingInvoices): ${upcoming.length}`);
    
    if (upcoming.length === 0 && noVencidas.length > 0) {
        console.log('⚠️ POSIBLE PROBLEMA: Hay facturas pendientes pero getUpcomingInvoices no las encuentra');
        console.log('📋 Ejemplos de facturas pendientes:');
        noVencidas.slice(0, 3).forEach(inv => {
            console.log(`  - ${inv.NumeroFactura}: ${inv.FechaVencimiento}`);
        });
    }
}

// ===== EXPONER FUNCIONES GLOBALMENTE =====
window.ejecutarPruebaCompleta = ejecutarPruebaCompleta;
window.pruebaRapida = pruebaRapida;

console.log('✅ Prueba de facturas no vencidas cargada - Usa ejecutarPruebaCompleta() o pruebaRapida()');
