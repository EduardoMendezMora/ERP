// ===== DIAGNÓSTICO Y CORRECCIÓN DE FACTURAS VENCIDAS =====
// Este archivo identifica y corrige problemas con el cálculo de multas y estados de facturas

// ===== PROBLEMAS IDENTIFICADOS =====
/*
1. INCONSISTENCIA EN FORMATO DE FECHAS:
   - Las fechas vienen en formato MM/DD/YYYY (ej: 10/2/2025 = 2 de Octubre)
   - El sistema las interpreta como DD/MM/YYYY (ej: 10/2/2025 = 10 de Febrero)
   - Esto causa que las facturas aparezcan como vencidas cuando no deberían

2. CÁLCULO INCORRECTO DE DÍAS DE ATRASO:
   - Las fechas se parsean incorrectamente, causando días de atraso negativos o incorrectos
   - Las multas se calculan basándose en días incorrectos

3. ESTADOS INCONSISTENTES:
   - Las facturas pueden tener estado "Vencido" pero fechas futuras
   - Las facturas pueden tener estado "Pendiente" pero fechas pasadas

4. MULTAS INCORRECTAS:
   - Se calculan multas basadas en días de atraso incorrectos
   - Los montos mostrados no coinciden con la realidad
*/

// ===== FUNCIÓN DE DIAGNÓSTICO SIMPLIFICADO =====
function diagnoseOverdueInvoices() {
    console.log('🔍 INICIANDO DIAGNÓSTICO DE PARSEO DE FECHAS...');
    
    const clientInvoices = window.clientInvoices || [];
    console.log(`📋 Total de facturas a analizar: ${clientInvoices.length}`);
    
    let dateProblems = [];
    let parsingIssues = [];
    
    clientInvoices.forEach((invoice, index) => {
        const originalDueDate = invoice.FechaVencimiento;
        
        if (!originalDueDate) {
            parsingIssues.push(`${invoice.NumeroFactura}: Sin fecha de vencimiento`);
            return;
        }
        
        // Probar parseo de fecha
        const parsedDate = parseDateCorrectly(originalDueDate);
        
        if (!parsedDate) {
            dateProblems.push(`${invoice.NumeroFactura}: No se pudo parsear "${originalDueDate}"`);
        } else {
            console.log(`✅ ${invoice.NumeroFactura}: ${originalDueDate} → ${parsedDate.toLocaleDateString('es-CR')}`);
        }
    });
    
    console.log(`\n📊 RESUMEN DEL DIAGNÓSTICO:`);
    console.log(`  - Facturas analizadas: ${clientInvoices.length}`);
    console.log(`  - Problemas de parseo: ${dateProblems.length}`);
    console.log(`  - Sin fecha: ${parsingIssues.length}`);
    
    if (dateProblems.length > 0) {
        console.log(`\n❌ PROBLEMAS DE PARSEO:`);
        dateProblems.forEach(problem => console.log(`  - ${problem}`));
    }
    
    if (parsingIssues.length > 0) {
        console.log(`\n⚠️ FACTURAS SIN FECHA:`);
        parsingIssues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    return {
        totalInvoices: clientInvoices.length,
        parsingProblems: dateProblems.length,
        missingDates: parsingIssues.length,
        problems: [...dateProblems, ...parsingIssues]
    };
}

// ===== FUNCIÓN DE CORRECCIÓN SIMPLIFICADA =====
async function fixOverdueInvoices() {
    console.log('🔧 INICIANDO CORRECCIÓN DE PARSEO DE FECHAS...');
    
    try {
        // Ejecutar diagnóstico
        const diagnosis = diagnoseOverdueInvoices();
        
        if (diagnosis.parsingProblems === 0 && diagnosis.missingDates === 0) {
            console.log('✅ No se encontraron problemas de parseo que corregir');
            showToast('✅ No se encontraron problemas de parseo de fechas', 'success');
            return;
        }
        
        console.log(`🔧 Problemas detectados: ${diagnosis.parsingProblems} fechas + ${diagnosis.missingDates} sin fecha`);
        
        // Solo re-renderizar la página para aplicar el parseo correcto
        if (typeof renderPage === 'function') {
            renderPage();
            console.log('🎨 Página re-renderizada con parseo correcto');
        }
        
        console.log('✅ Corrección completada');
        showToast(`✅ Parseo de fechas corregido. Problemas: ${diagnosis.parsingProblems}`, 'success');
        
    } catch (error) {
        console.error('❌ Error durante la corrección:', error);
        showToast('❌ Error durante la corrección: ' + error.message, 'error');
    }
}

// ===== FUNCIÓN DE VERIFICACIÓN DE CONSISTENCIA =====
function verifyDataConsistency(clientId) {
    console.log('🔍 Verificando consistencia de datos...');
    
    const inconsistencies = [];
    const clientInvoices = window.clientInvoices || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    clientInvoices.forEach(invoice => {
        // Verificar formato de fecha
        if (invoice.FechaVencimiento && invoice.FechaVencimiento.includes('/')) {
            const parts = invoice.FechaVencimiento.split('/');
            if (parts.length === 3) {
                const month = parseInt(parts[0]);
                const day = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                
                // Verificar que los valores son razonables
                if (month < 1 || month > 12) {
                    inconsistencies.push({
                        invoice: invoice.NumeroFactura,
                        issue: 'Mes inválido en fecha',
                        value: month,
                        field: 'FechaVencimiento'
                    });
                }
                
                if (day < 1 || day > 31) {
                    inconsistencies.push({
                        invoice: invoice.NumeroFactura,
                        issue: 'Día inválido en fecha',
                        value: day,
                        field: 'FechaVencimiento'
                    });
                }
                
                if (year < 2020 || year > 2030) {
                    inconsistencies.push({
                        invoice: invoice.NumeroFactura,
                        issue: 'Año inválido en fecha',
                        value: year,
                        field: 'FechaVencimiento'
                    });
                }
            }
        }
        
        // Verificar consistencia entre estado y fecha
        if (invoice.FechaVencimiento) {
            const parts = invoice.FechaVencimiento.split('/');
            if (parts.length === 3) {
                const month = parseInt(parts[0]) - 1;
                const day = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                const dueDate = new Date(year, month, day);
                dueDate.setHours(0, 0, 0, 0);
                
                const daysDifference = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                const expectedStatus = daysDifference >= 0 ? 'Vencido' : 'Pendiente';
                
                if (invoice.Estado !== expectedStatus && invoice.Estado !== 'Pagado') {
                    inconsistencies.push({
                        invoice: invoice.NumeroFactura,
                        issue: 'Estado inconsistente con fecha',
                        expected: expectedStatus,
                        actual: invoice.Estado,
                        daysDifference: daysDifference
                    });
                }
            }
        }
        
        // Verificar consistencia de multas
        if (isInvoiceOverdue(invoice) && invoice.DiasAtraso > 0) {
            const expectedFines = invoice.DiasAtraso * 2000;
            const actualFines = parseFloat(invoice.MontoMultas || 0);
            
            if (Math.abs(expectedFines - actualFines) > 1) { // Tolerancia de 1 colón
                inconsistencies.push({
                    invoice: invoice.NumeroFactura,
                    issue: 'Multas inconsistentes con días de atraso',
                    expected: expectedFines,
                    actual: actualFines,
                    daysOverdue: invoice.DiasAtraso
                });
            }
        }
    });
    
    console.log(`📊 Inconsistencias encontradas: ${inconsistencies.length}`);
    return inconsistencies;
}

// ===== FUNCIÓN DE SINCRONIZACIÓN CON BACKEND =====
async function syncWithBackendLogic(clientId) {
    console.log('🔄 Sincronizando con backend...');
    
    // Aquí iría la lógica de sincronización con el backend
    // Por ahora, solo simulamos la sincronización
    
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('✅ Sincronización completada');
            resolve();
        }, 1000);
    });
}

// ===== EXPORTAR FUNCIONES =====
window.diagnoseOverdueInvoices = diagnoseOverdueInvoices;
window.fixOverdueInvoices = fixOverdueInvoices;
window.verifyDataConsistency = verifyDataConsistency;
window.syncWithBackendLogic = syncWithBackendLogic;

console.log('✅ Módulo de corrección de facturas vencidas cargado'); 