// Script para verificar el estado de Google Sheets y el límite de celdas
// Ejecutar en la consola del navegador en clientes.html

console.log('📊 VERIFICANDO ESTADO DE GOOGLE SHEETS');

// Función para verificar el estado actual de las hojas
async function checkSheetStatus() {
    console.log('=== VERIFICACIÓN DE ESTADO ===');
    
    try {
        // Verificar hoja de Facturas
        console.log('📋 Verificando hoja de Facturas...');
        const invoicesResponse = await fetch(`${API_URL_INVOICES}?sheet=Facturas`);
        
        if (invoicesResponse.ok) {
            const invoices = await invoicesResponse.json();
            console.log(`  - Total de facturas: ${invoices.length}`);
            
            if (invoices.length > 0) {
                const firstInvoice = invoices[0];
                const columns = Object.keys(firstInvoice).length;
                const estimatedCells = invoices.length * columns;
                console.log(`  - Columnas por factura: ${columns}`);
                console.log(`  - Celdas estimadas: ${estimatedCells.toLocaleString()}`);
                console.log(`  - Porcentaje del límite: ${((estimatedCells / 10000000) * 100).toFixed(2)}%`);
            }
        } else {
            console.error('  - Error al acceder a facturas:', await invoicesResponse.text());
        }
        
        // Verificar hoja de Clientes
        console.log('\n📋 Verificando hoja de Clientes...');
        const clientsResponse = await fetch(`${API_URL_CLIENTS}?sheet=Clientes`);
        
        if (clientsResponse.ok) {
            const clients = await clientsResponse.json();
            console.log(`  - Total de clientes: ${clients.length}`);
            
            if (clients.length > 0) {
                const firstClient = clients[0];
                const columns = Object.keys(firstClient).length;
                const estimatedCells = clients.length * columns;
                console.log(`  - Columnas por cliente: ${columns}`);
                console.log(`  - Celdas estimadas: ${estimatedCells.toLocaleString()}`);
            }
        } else {
            console.error('  - Error al acceder a clientes:', await clientsResponse.text());
        }
        
    } catch (error) {
        console.error('❌ Error al verificar estado:', error);
    }
}

// Función para analizar facturas por fecha
async function analyzeInvoicesByDate() {
    console.log('\n=== ANÁLISIS DE FACTURAS POR FECHA ===');
    
    try {
        const response = await fetch(`${API_URL_INVOICES}?sheet=Facturas`);
        
        if (response.ok) {
            const invoices = await response.json();
            
            // Agrupar por año
            const invoicesByYear = {};
            invoices.forEach(invoice => {
                if (invoice.FechaCreacion) {
                    const year = invoice.FechaCreacion.split('/')[2];
                    if (!invoicesByYear[year]) {
                        invoicesByYear[year] = [];
                    }
                    invoicesByYear[year].push(invoice);
                }
            });
            
            console.log('📅 Facturas por año:');
            Object.keys(invoicesByYear).sort().forEach(year => {
                const count = invoicesByYear[year].length;
                console.log(`  - ${year}: ${count} facturas`);
            });
            
            // Mostrar las facturas más antiguas
            const sortedInvoices = invoices
                .filter(inv => inv.FechaCreacion)
                .sort((a, b) => {
                    const dateA = new Date(a.FechaCreacion.split('/').reverse().join('-'));
                    const dateB = new Date(b.FechaCreacion.split('/').reverse().join('-'));
                    return dateA - dateB;
                });
            
            if (sortedInvoices.length > 0) {
                console.log('\n📅 Facturas más antiguas:');
                sortedInvoices.slice(0, 5).forEach((invoice, index) => {
                    console.log(`  ${index + 1}. ${invoice.FechaCreacion} - ${invoice.NumeroFactura} - ${invoice.Estado}`);
                });
            }
            
        } else {
            console.error('❌ Error al obtener facturas:', await response.text());
        }
        
    } catch (error) {
        console.error('❌ Error al analizar facturas:', error);
    }
}

// Función para sugerir acciones de limpieza
function suggestCleanupActions() {
    console.log('\n=== SUGERENCIAS DE LIMPIEZA ===');
    console.log('🔧 Acciones recomendadas:');
    console.log('');
    console.log('1. 📁 CREAR NUEVA HOJA DE FACTURAS:');
    console.log('   - Crear una nueva hoja llamada "Facturas_2025"');
    console.log('   - Mover solo las facturas del año actual');
    console.log('   - Actualizar la API para usar la nueva hoja');
    console.log('');
    console.log('2. 🗑️ ARCHIVAR FACTURAS ANTIGUAS:');
    console.log('   - Exportar facturas de años anteriores a CSV');
    console.log('   - Eliminar facturas pagadas de años anteriores');
    console.log('   - Mantener solo facturas pendientes y recientes');
    console.log('');
    console.log('3. 📊 OPTIMIZAR ESTRUCTURA:');
    console.log('   - Eliminar columnas innecesarias');
    console.log('   - Consolidar datos duplicados');
    console.log('   - Usar hojas separadas por año');
    console.log('');
    console.log('4. 🔄 MIGRAR A NUEVA HOJA:');
    console.log('   - Crear nueva hoja con estructura optimizada');
    console.log('   - Migrar datos activos');
    console.log('   - Actualizar configuración de la API');
}

// Función para crear una nueva hoja de facturas
async function createNewInvoiceSheet() {
    console.log('\n=== CREANDO NUEVA HOJA DE FACTURAS ===');
    
    const newSheetName = 'Facturas_2025';
    console.log(`📋 Creando nueva hoja: ${newSheetName}`);
    
    try {
        // Intentar crear la nueva hoja (esto puede requerir configuración manual)
        console.log('⚠️ Nota: La creación de hojas debe hacerse manualmente en Google Sheets');
        console.log('📝 Pasos manuales:');
        console.log('   1. Abrir Google Sheets');
        console.log('   2. Crear nueva hoja llamada "Facturas_2025"');
        console.log('   3. Copiar la estructura de columnas de la hoja actual');
        console.log('   4. Actualizar la configuración de SheetDB');
        
        // Verificar si la nueva hoja existe
        const testResponse = await fetch(`${API_URL_INVOICES}?sheet=${newSheetName}`);
        if (testResponse.ok) {
            console.log('✅ La nueva hoja ya existe y es accesible');
        } else {
            console.log('❌ La nueva hoja no existe o no es accesible');
        }
        
    } catch (error) {
        console.error('❌ Error al verificar nueva hoja:', error);
    }
}

// Función principal para ejecutar todas las verificaciones
async function runFullAnalysis() {
    console.log('🚀 INICIANDO ANÁLISIS COMPLETO');
    
    await checkSheetStatus();
    await analyzeInvoicesByDate();
    suggestCleanupActions();
    
    console.log('\n✅ Análisis completado');
    console.log('📝 Para más acciones específicas, ejecuta:');
    console.log('   - createNewInvoiceSheet()');
}

// Función para ejecutar análisis específicos
function runAnalysis(type) {
    switch (type) {
        case 'status':
            checkSheetStatus();
            break;
        case 'dates':
            analyzeInvoicesByDate();
            break;
        case 'cleanup':
            suggestCleanupActions();
            break;
        case 'newsheet':
            createNewInvoiceSheet();
            break;
        case 'all':
            runFullAnalysis();
            break;
        default:
            console.log('Análisis disponibles: status, dates, cleanup, newsheet, all');
            console.log('Ejemplo: runAnalysis("all")');
    }
}

console.log('✅ Script de análisis cargado');
console.log('📝 Para usar: runAnalysis("all") o runAnalysis("status")');
