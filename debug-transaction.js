// ===== FUNCIÓN DE TESTING PARA DIAGNOSTICAR TRANSACCIÓN PROBLEMÁTICA =====
async function debugProblematicTransaction() {
    console.log('🔍 INICIANDO DIAGNÓSTICO DE TRANSACCIÓN PROBLEMÁTICA...');
    console.log('📋 Buscando: Referencia=970873893, Fecha=03/08/2025');
    
    try {
        // Cargar transacciones desde todas las hojas (BAC, BN, HuberBN)
        const sheets = ['BAC', 'BN', 'HuberBN'];
        let allTransactions = [];
        
        for (const sheet of sheets) {
            try {
                console.log(`📋 Consultando transacciones en ${sheet}...`);
                const apiUrl = `https://sheetdb.io/api/v1/a7oekivxzreg7?sheet=${sheet}`;
                const response = await fetch(apiUrl);
                
                if (response.ok) {
                    const sheetTransactions = await response.json();
                    const transactionsWithBank = Array.isArray(sheetTransactions) ? 
                        sheetTransactions.map(t => ({ ...t, banco: sheet })) : [];
                    
                    // Buscar la transacción problemática en esta hoja específica
                    const problematicInSheet = transactionsWithBank.find(t => 
                        t.Referencia === '970873893' && 
                        t.Fecha === '03/08/2025'
                    );
                    if (problematicInSheet) {
                        console.log(`🔍 TRANSACCIÓN PROBLEMÁTICA ENCONTRADA EN ${sheet}:`);
                        console.log('   Referencia:', problematicInSheet.Referencia);
                        console.log('   Fecha:', problematicInSheet.Fecha);
                        console.log('   Créditos:', problematicInSheet.Créditos);
                        console.log('   Banco:', problematicInSheet.Banco);
                        console.log('   ID_Cliente:', problematicInSheet.ID_Cliente);
                        console.log('   Observaciones:', problematicInSheet.Observaciones);
                        console.log('   FacturasAsignadas:', problematicInSheet.FacturasAsignadas);
                    }
                    
                    allTransactions.push(...transactionsWithBank);
                    console.log(`✅ ${sheet}: ${transactionsWithBank.length} transacciones cargadas`);
                } else if (response.status !== 404) {
                    console.warn(`Error al cargar transacciones de ${sheet}:`, response.status);
                }
            } catch (error) {
                console.warn(`No se pudieron cargar transacciones de ${sheet}:`, error);
            }
        }
        
        console.log('📊 Total transacciones cargadas:', allTransactions.length);
        
        // Buscar la transacción problemática en allTransactions
        const problematicInAll = allTransactions.find(t => 
            t.Referencia === '970873893' && 
            t.Fecha === '03/08/2025'
        );
        
        if (!problematicInAll) {
            console.log('❌ TRANSACCIÓN PROBLEMÁTICA NO ENCONTRADA EN allTransactions');
            console.log('🔍 Buscando transacciones similares...');
            const similarTransactions = allTransactions.filter(t => 
                t.Referencia === '970873893' || t.Fecha === '03/08/2025'
            );
            console.log('   Transacciones con referencia 970873893:', similarTransactions.filter(t => t.Referencia === '970873893').length);
            console.log('   Transacciones con fecha 03/08/2025:', similarTransactions.filter(t => t.Fecha === '03/08/2025').length);
            
            if (similarTransactions.length > 0) {
                console.log('   Transacciones similares encontradas:');
                similarTransactions.forEach((t, i) => {
                    console.log(`   ${i + 1}. Ref: ${t.Referencia}, Fecha: ${t.Fecha}, Créditos: ${t.Créditos}, Banco: ${t.banco}`);
                });
            }
            return;
        }
        
        console.log('🔍 TRANSACCIÓN PROBLEMÁTICA ENCONTRADA EN allTransactions:');
        console.log('   Referencia:', problematicInAll.Referencia);
        console.log('   Fecha:', problematicInAll.Fecha);
        console.log('   Créditos:', problematicInAll.Créditos);
        console.log('   Banco:', problematicInAll.Banco);
        console.log('   ID_Cliente:', problematicInAll.ID_Cliente);
        console.log('   Observaciones:', problematicInAll.Observaciones);
        console.log('   FacturasAsignadas:', problematicInAll.FacturasAsignadas);
        
        // Aplicar filtros uno por uno
        console.log('\n🔍 APLICANDO FILTROS UNO POR UNO:');
        
        // Filtro 1: ID_Cliente con saldo disponible
        if (problematicInAll.ID_Cliente && problematicInAll.ID_Cliente.trim() !== '' && problematicInAll.ID_Cliente !== 'undefined') {
            console.log('✅ Tiene ID_Cliente, verificando saldo disponible...');
            
            // Calcular saldo disponible según la lógica de la columna "Disponible"
            let availableAmount = 0;
            
            if (problematicInAll.Disponible === undefined || problematicInAll.Disponible === null || problematicInAll.Disponible === '') {
                // Si "Disponible" está vacío, usar el monto original de la transacción
                availableAmount = parsePaymentAmount(problematicInAll.Créditos, problematicInAll.Banco);
                console.log('   Disponible vacío, usando monto original:', availableAmount);
            } else if (parseFloat(problematicInAll.Disponible) === 0) {
                // Si "Disponible" es 0, la transacción ya fue utilizada completamente
                availableAmount = 0;
                console.log('   Disponible es 0, transacción completamente utilizada');
            } else {
                // Si "Disponible" tiene un número diferente de 0, usar ese número
                availableAmount = parseFloat(problematicInAll.Disponible) || 0;
                console.log('   Disponible (columna):', availableAmount);
            }
            
            console.log('   Available > 0.01:', availableAmount > 0.01);
            
            if (availableAmount <= 0.01) {
                console.log('❌ FILTRADA: Sin saldo disponible');
                return;
            } else {
                console.log('✅ PASÓ: Tiene saldo disponible');
            }
        } else {
            console.log('✅ NO tiene ID_Cliente, continúa al siguiente filtro');
        }
        
        // Filtro 2: Fecha cutoff
        const cutoffDate = new Date('2025-07-10');
        cutoffDate.setHours(0, 0, 0, 0);
        
        let transactionDate = null;
        if (problematicInAll.Fecha) {
            const dateParts = problematicInAll.Fecha.split('/');
            if (dateParts.length === 3) {
                const day = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1;
                const year = parseInt(dateParts[2]);
                transactionDate = new Date(year, month, day);
            }
        }
        
        if (transactionDate && transactionDate < cutoffDate) {
            console.log('❌ FILTRADA: Fecha anterior al cutoff (10/07/2025)');
            return;
        } else {
            console.log('✅ PASÓ: Fecha posterior al cutoff');
        }
        
        // Filtro 3: Observaciones (lógica condicional por fecha)
        const newLogicDate = new Date('2025-08-03');
        newLogicDate.setHours(0, 0, 0, 0);
        
        if (transactionDate && transactionDate < newLogicDate) {
            // Lógica antigua: filtrar por observaciones
            if (problematicInAll.Observaciones && problematicInAll.Observaciones.trim() !== '' && problematicInAll.Observaciones !== 'undefined') {
                console.log('❌ FILTRADA: Tiene observaciones (lógica antigua)');
                return;
            } else {
                console.log('✅ PASÓ: No tiene observaciones');
            }
        } else {
            console.log('✅ PASÓ: Fecha >= 03/08/2025, no se filtra por observaciones');
        }
        
        // Filtro 4: Saldo disponible final
        let availableAmount = 0;
        
        // Calcular saldo disponible según la lógica de la columna "Disponible"
        if (problematicInAll.Disponible === undefined || problematicInAll.Disponible === null || problematicInAll.Disponible === '') {
            // Si "Disponible" está vacío, usar el monto original de la transacción
            availableAmount = parsePaymentAmount(problematicInAll.Créditos, problematicInAll.Banco);
            console.log('\n🔍 CÁLCULO FINAL DE SALDO (Disponible vacío, usando monto original):');
            console.log('   Available Amount:', availableAmount);
        } else if (parseFloat(problematicInAll.Disponible) === 0) {
            // Si "Disponible" es 0, la transacción ya fue utilizada completamente
            availableAmount = 0;
            console.log('\n🔍 CÁLCULO FINAL DE SALDO (Disponible es 0):');
            console.log('   Available Amount:', availableAmount);
        } else {
            // Si "Disponible" tiene un número diferente de 0, usar ese número
            availableAmount = parseFloat(problematicInAll.Disponible) || 0;
            console.log('\n🔍 CÁLCULO FINAL DE SALDO (usando columna Disponible):');
            console.log('   Available Amount:', availableAmount);
        }
        
        console.log('   Available > 0.01:', availableAmount > 0.01);
        
        if (availableAmount > 0.01) {
            console.log('✅ TRANSACCIÓN DEBERÍA APARECER EN EL MODAL');
            console.log('🎯 Si no aparece, el problema está en el renderizado del modal');
        } else {
            console.log('❌ TRANSACCIÓN NO APARECERÁ: Sin saldo disponible');
        }
        
    } catch (error) {
        console.error('❌ Error en debugProblematicTransaction:', error);
    }
}

// Exponer función globalmente
window.debugProblematicTransaction = debugProblematicTransaction;

console.log('🔧 Función debugProblematicTransaction() cargada. Ejecuta debugProblematicTransaction() en la consola para diagnosticar la transacción problemática.'); 