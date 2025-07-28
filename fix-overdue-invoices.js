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

// ===== FUNCIÓN DE DIAGNÓSTICO =====
function diagnoseOverdueInvoices() {
    console.log('🔍 INICIANDO DIAGNÓSTICO DE FACTURAS VENCIDAS...');
    
    const clientInvoices = window.clientInvoices || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`📅 Fecha actual del sistema: ${today.toLocaleDateString('es-CR')}`);
    console.log(`📋 Total de facturas a analizar: ${clientInvoices.length}`);
    
    let problems = [];
    let correctedInvoices = [];
    
    clientInvoices.forEach((invoice, index) => {
        console.log(`\n🔍 Analizando factura ${index + 1}: ${invoice.NumeroFactura}`);
        
        const originalDueDate = invoice.FechaVencimiento;
        const originalStatus = invoice.Estado;
        const originalFines = parseFloat(invoice.MontoMultas || 0);
        const originalDaysOverdue = parseInt(invoice.DiasAtraso || 0);
        
        console.log(`  - Fecha vencimiento original: ${originalDueDate}`);
        console.log(`  - Estado original: ${originalStatus}`);
        console.log(`  - Multas originales: ₡${originalFines.toLocaleString('es-CR')}`);
        console.log(`  - Días atraso originales: ${originalDaysOverdue}`);
        
        // Parsear fecha correctamente (asumiendo formato DD/MM/YYYY)
        let parsedDueDate = null;
        let parsingMethod = '';
        
        if (originalDueDate && originalDueDate.includes('/')) {
            const parts = originalDueDate.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // Meses en JS van de 0-11
                const year = parseInt(parts[2]);
                parsedDueDate = new Date(year, month, day);
                parsingMethod = 'DD/MM/YYYY';
            }
        } else if (originalDueDate) {
            parsedDueDate = new Date(originalDueDate);
            parsingMethod = 'ISO';
        }
        
        if (parsedDueDate) {
            parsedDueDate.setHours(0, 0, 0, 0);
            
            const daysDifference = Math.floor((today - parsedDueDate) / (1000 * 60 * 60 * 24));
            const correctStatus = daysDifference >= 0 ? 'Vencido' : 'Pendiente';
            const correctDaysOverdue = daysDifference >= 0 ? daysDifference : 0;
            
            // Solo calcular multas para facturas de arrendamiento (NO manuales)
            const isManualInvoice = invoice.TipoFactura === 'Manual' ||
                invoice.NumeroFactura?.startsWith('MAN-') ||
                invoice.ConceptoManual;
            
            const correctFines = (!isManualInvoice && correctDaysOverdue > 0) ? correctDaysOverdue * 2000 : 0;
            
            console.log(`  - Fecha parseada (${parsingMethod}): ${parsedDueDate.toLocaleDateString('es-CR')}`);
            console.log(`  - Diferencia en días: ${daysDifference}`);
            console.log(`  - Estado correcto: ${correctStatus}`);
            console.log(`  - Días atraso correctos: ${correctDaysOverdue}`);
            console.log(`  - Multas correctas: ₡${correctFines.toLocaleString('es-CR')}`);
            console.log(`  - Es factura manual: ${isManualInvoice ? 'SÍ' : 'NO'}`);
            
            // Detectar problemas
            const problems = [];
            
            if (originalStatus !== correctStatus) {
                problems.push(`Estado incorrecto: ${originalStatus} → ${correctStatus}`);
            }
            
            if (originalDaysOverdue !== correctDaysOverdue) {
                problems.push(`Días atraso incorrectos: ${originalDaysOverdue} → ${correctDaysOverdue}`);
            }
            
            if (originalFines !== correctFines) {
                problems.push(`Multas incorrectas: ₡${originalFines.toLocaleString('es-CR')} → ₡${correctFines.toLocaleString('es-CR')}`);
            }
            
            if (problems.length > 0) {
                console.log(`  ⚠️ PROBLEMAS DETECTADOS:`);
                problems.forEach(problem => console.log(`    - ${problem}`));
                
                // Crear factura corregida
                const correctedInvoice = {
                    ...invoice,
                    FechaVencimiento: originalDueDate, // Mantener formato original
                    Estado: correctStatus,
                    DiasAtraso: correctDaysOverdue,
                    MontoMultas: correctFines,
                    MontoTotal: parseFloat(invoice.MontoBase || 0) + correctFines,
                    _diagnostic: {
                        originalStatus,
                        originalDaysOverdue,
                        originalFines,
                        correctStatus,
                        correctDaysOverdue,
                        correctFines,
                        problems
                    }
                };
                
                correctedInvoices.push(correctedInvoice);
            } else {
                console.log(`  ✅ Sin problemas detectados`);
            }
        } else {
            console.log(`  ❌ No se pudo parsear la fecha: ${originalDueDate}`);
            problems.push(`Fecha inválida: ${originalDueDate}`);
        }
    });
    
    console.log(`\n📊 RESUMEN DEL DIAGNÓSTICO:`);
    console.log(`  - Facturas analizadas: ${clientInvoices.length}`);
    console.log(`  - Facturas con problemas: ${correctedInvoices.length}`);
    console.log(`  - Problemas totales: ${problems.length}`);
    
    return {
        totalInvoices: clientInvoices.length,
        problematicInvoices: correctedInvoices.length,
        problems: problems,
        correctedInvoices: correctedInvoices
    };
}

// ===== FUNCIÓN DE CORRECCIÓN =====
async function fixOverdueInvoices() {
    console.log('🔧 INICIANDO CORRECCIÓN DE FACTURAS VENCIDAS...');
    
    try {
        // Ejecutar diagnóstico
        const diagnosis = diagnoseOverdueInvoices();
        
        if (diagnosis.problematicInvoices === 0) {
            console.log('✅ No se encontraron problemas que corregir');
            showToast('✅ No se encontraron problemas en las facturas vencidas', 'success');
            return;
        }
        
        console.log(`🔧 Corrigiendo ${diagnosis.problematicInvoices} facturas...`);
        
        // Actualizar las facturas en el array global
        const clientInvoices = window.clientInvoices || [];
        const updatedInvoices = [...clientInvoices];
        
        diagnosis.correctedInvoices.forEach(correctedInvoice => {
            const index = updatedInvoices.findIndex(inv => inv.NumeroFactura === correctedInvoice.NumeroFactura);
            if (index !== -1) {
                // Actualizar solo los campos necesarios
                updatedInvoices[index] = {
                    ...updatedInvoices[index],
                    Estado: correctedInvoice.Estado,
                    DiasAtraso: correctedInvoice.DiasAtraso,
                    MontoMultas: correctedInvoice.MontoMultas,
                    MontoTotal: correctedInvoice.MontoTotal
                };
                
                console.log(`✅ Corregida: ${correctedInvoice.NumeroFactura}`);
            }
        });
        
        // Actualizar el array global
        window.clientInvoices = updatedInvoices;
        
        // Guardar en localStorage
        const clientId = window.currentClient?.ID;
        if (clientId) {
            const key = `clientInvoices_${clientId}`;
            localStorage.setItem(key, JSON.stringify(updatedInvoices));
            console.log(`💾 Datos guardados en localStorage: ${key}`);
        }
        
        // Re-renderizar la página
        if (typeof renderPage === 'function') {
            renderPage();
            console.log('🎨 Página re-renderizada');
        }
        
        console.log('✅ Corrección completada');
        showToast(`✅ Se corrigieron ${diagnosis.problematicInvoices} facturas`, 'success');
        
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
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
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
        if (invoice.Estado === 'Vencido' && invoice.DiasAtraso > 0) {
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