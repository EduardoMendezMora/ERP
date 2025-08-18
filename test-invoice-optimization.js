// ===== TEST DE OPTIMIZACIÓN DE FACTURAS =====
// Script para probar el filtrado optimizado de facturas

console.log('🧪 === INICIANDO TEST DE OPTIMIZACIÓN DE FACTURAS ===');

// Simular datos de facturas para pruebas
const mockInvoices = [
    // Facturas del pasado (deben cargarse)
    { ID: 1, FechaVencimiento: '2024/12/01', Estado: 'Pagado' },
    { ID: 2, FechaVencimiento: '2024/12/15', Estado: 'Pagado' },
    { ID: 3, FechaVencimiento: '2025/01/01', Estado: 'Pagado' },
    { ID: 4, FechaVencimiento: '2025/06/01', Estado: 'Pagado' },
    
    // Facturas vencidas (deben cargarse)
    { ID: 5, FechaVencimiento: '2025/07/01', Estado: 'Vencido' },
    { ID: 6, FechaVencimiento: '2025/07/15', Estado: 'Vencido' },
    { ID: 7, FechaVencimiento: '2025/08/01', Estado: 'Vencido' },
    
    // Facturas presentes (deben cargarse)
    { ID: 8, FechaVencimiento: '2025/08/15', Estado: 'Pendiente' },
    { ID: 9, FechaVencimiento: '2025/08/20', Estado: 'Pendiente' },
    
    // Facturas futuras próximas (deben cargarse - dentro de 3 semanas)
    { ID: 10, FechaVencimiento: '2025/09/01', Estado: 'Pendiente' },
    { ID: 11, FechaVencimiento: '2025/09/05', Estado: 'Pendiente' },
    { ID: 12, FechaVencimiento: '2025/09/10', Estado: 'Pendiente' },
    
    // Facturas futuras lejanas (NO deben cargarse - más de 3 semanas)
    { ID: 13, FechaVencimiento: '2025/10/01', Estado: 'Pendiente' },
    { ID: 14, FechaVencimiento: '2025/10/15', Estado: 'Pendiente' },
    { ID: 15, FechaVencimiento: '2025/11/01', Estado: 'Pendiente' },
    { ID: 16, FechaVencimiento: '2025/12/01', Estado: 'Pendiente' },
    
    // Facturas sin fecha (deben cargarse)
    { ID: 17, FechaVencimiento: '', Estado: 'Pendiente' },
    { ID: 18, FechaVencimiento: null, Estado: 'Pendiente' },
    { ID: 19, FechaVencimiento: undefined, Estado: 'Pendiente' },
    
    // Facturas con fecha inválida (deben cargarse)
    { ID: 20, FechaVencimiento: 'fecha-invalida', Estado: 'Pendiente' },
    { ID: 21, FechaVencimiento: '2025/13/01', Estado: 'Pendiente' }, // Mes inválido
];

// Función de parseDate simplificada para el test
function parseDate(dateStr) {
    if (!dateStr || dateStr === '' || dateStr === 'undefined') {
        return null;
    }
    
    // Intentar parsear formato DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Meses van de 0-11
        const year = parseInt(parts[2]);
        
        if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020) {
            return new Date(year, month, day);
        }
    }
    
    return null;
}

// Función de filtrado optimizado (copia de la implementación real)
function filterInvoicesOptimized(allInvoices) {
    console.log('🚀 Aplicando filtrado optimizado de facturas...');
    console.log(`📋 Total facturas recibidas: ${allInvoices.length}`);
    
    // ⚡ OPTIMIZACIÓN: Filtrar facturas inteligentemente
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Fecha límite: 3 semanas desde hoy
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + 21); // 3 semanas
    futureLimit.setHours(23, 59, 59, 999);
    
    console.log('📅 Filtros aplicados:');
    console.log('  - Hoy:', today.toISOString().split('T')[0]);
    console.log('  - Límite futuro:', futureLimit.toISOString().split('T')[0]);
    
    // Filtrar facturas según la estrategia optimizada
    const filteredInvoices = allInvoices.filter(invoice => {
        if (!invoice.FechaVencimiento) {
            return true; // Mantener facturas sin fecha (manuales, etc.)
        }
        
        const dueDate = parseDate(invoice.FechaVencimiento);
        if (!dueDate) {
            return true; // Mantener facturas con fecha inválida
        }
        
        // ✅ Cargar TODAS las facturas del pasado
        if (dueDate < today) {
            return true;
        }
        
        // ✅ Cargar facturas vencidas (sin importar fecha)
        if (invoice.Estado === 'Vencido') {
            return true;
        }
        
        // ✅ Cargar facturas futuras solo hasta 3 semanas
        if (dueDate <= futureLimit) {
            return true;
        }
        
        // ❌ Excluir facturas futuras más allá de 3 semanas
        return false;
    });
    
    const excludedCount = allInvoices.length - filteredInvoices.length;
    console.log(`✅ Facturas filtradas (optimizadas): ${filteredInvoices.length}`);
    console.log(`❌ Facturas excluidas (futuras lejanas): ${excludedCount}`);
    console.log(`⚡ Reducción: ${((excludedCount / allInvoices.length) * 100).toFixed(1)}%`);
    
    return filteredInvoices;
}

// Ejecutar test
console.log('\n📊 === RESULTADOS DEL TEST ===');
const filteredInvoices = filterInvoicesOptimized(mockInvoices);

console.log('\n📋 Facturas que SÍ se cargan:');
filteredInvoices.forEach(invoice => {
    const category = getInvoiceCategory(invoice);
    console.log(`  - ID ${invoice.ID}: ${invoice.FechaVencimiento} (${invoice.Estado}) - ${category}`);
});

console.log('\n❌ Facturas que NO se cargan:');
const excludedInvoices = mockInvoices.filter(inv => !filteredInvoices.find(f => f.ID === inv.ID));
excludedInvoices.forEach(invoice => {
    console.log(`  - ID ${invoice.ID}: ${invoice.FechaVencimiento} (${invoice.Estado}) - FUTURA LEJANA`);
});

console.log('\n✅ === TEST COMPLETADO ===');
console.log(`📊 Resumen:`);
console.log(`  - Total facturas: ${mockInvoices.length}`);
console.log(`  - Cargadas: ${filteredInvoices.length}`);
console.log(`  - Excluidas: ${excludedInvoices.length}`);
console.log(`  - Reducción: ${((excludedInvoices.length / mockInvoices.length) * 100).toFixed(1)}%`);

// Función auxiliar para categorizar facturas
function getInvoiceCategory(invoice) {
    if (!invoice.FechaVencimiento) return 'SIN FECHA';
    
    const dueDate = parseDate(invoice.FechaVencimiento);
    if (!dueDate) return 'FECHA INVÁLIDA';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today) return 'PASADA';
    if (invoice.Estado === 'Vencido') return 'VENCIDA';
    
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + 21);
    futureLimit.setHours(23, 59, 59, 999);
    
    if (dueDate <= futureLimit) return 'FUTURA PRÓXIMA';
    return 'FUTURA LEJANA';
}
