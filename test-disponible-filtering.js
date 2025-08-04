// ===== SCRIPT DE PRUEBA PARA VERIFICAR FILTRADO POR DISPONIBLE =====

async function testDisponibleFiltering() {
    console.log('🧪 Iniciando prueba de filtrado por campo Disponible...');
    
    try {
        // Simular datos de transacciones con diferentes valores de Disponible
        const testTransactions = [
            {
                Referencia: 'TEST001',
                Créditos: '50000',
                Fecha: '15/08/2025',
                Disponible: '50000',
                ID_Cliente: '',
                Observaciones: ''
            },
            {
                Referencia: 'TEST002',
                Créditos: '30000',
                Fecha: '16/08/2025',
                Disponible: '15000',
                ID_Cliente: '',
                Observaciones: ''
            },
            {
                Referencia: 'TEST003',
                Créditos: '25000',
                Fecha: '17/08/2025',
                Disponible: '0',
                ID_Cliente: '',
                Observaciones: ''
            },
            {
                Referencia: 'TEST004',
                Créditos: '40000',
                Fecha: '18/08/2025',
                Disponible: '',
                ID_Cliente: '',
                Observaciones: ''
            },
            {
                Referencia: 'TEST005',
                Créditos: '35000',
                Fecha: '19/08/2025',
                Disponible: null,
                ID_Cliente: '',
                Observaciones: ''
            }
        ];
        
        console.log('📋 Transacciones de prueba:');
        testTransactions.forEach(t => {
            console.log(`   - ${t.Referencia}: Disponible = "${t.Disponible}"`);
        });
        
        // Aplicar la misma lógica de filtrado que en loadTransactionsTab
        const cutoffDate = new Date('2025-07-10');
        cutoffDate.setHours(0, 0, 0, 0);
        
        const pendingTransactions = testTransactions.filter(t => {
            // Si tiene ID_Cliente asignado, está conciliada
            if (t.ID_Cliente && t.ID_Cliente.trim() !== '' && t.ID_Cliente !== 'undefined') {
                console.log(`🚫 ${t.Referencia} excluida: tiene ID_Cliente`);
                return false;
            }
            
            // Si tiene Observaciones con contenido, está conciliada
            if (t.Observaciones && t.Observaciones.trim() !== '' && t.Observaciones !== 'undefined') {
                console.log(`🚫 ${t.Referencia} excluida: tiene Observaciones`);
                return false;
            }
            
            // NUEVO: Si tiene Disponible = 0, ya no tiene saldo disponible para asignar
            if (t.Disponible !== undefined && t.Disponible !== null) {
                const disponible = parseFloat(t.Disponible);
                if (!isNaN(disponible) && disponible <= 0) {
                    console.log(`🚫 ${t.Referencia} excluida: Disponible = ${t.Disponible} (sin saldo disponible)`);
                    return false;
                }
            }
            
            // Filtrar por fecha - solo desde 10/07/2025
            if (t.Fecha) {
                // Parsear fecha en formato DD/MM/YYYY
                const dateParts = t.Fecha.split('/');
                if (dateParts.length === 3) {
                    const day = parseInt(dateParts[0]);
                    const month = parseInt(dateParts[1]) - 1; // Meses en JS van de 0-11
                    const year = parseInt(dateParts[2]);
                    const transactionDate = new Date(year, month, day);
                    
                    if (transactionDate < cutoffDate) {
                        console.log(`🚫 ${t.Referencia} excluida: fecha anterior a 10/07/2025`);
                        return false;
                    }
                }
            }
            
            // Solo mostrar las que no están conciliadas, son desde la fecha límite y tienen saldo disponible
            console.log(`✅ ${t.Referencia} incluida: disponible para asignar`);
            return true;
        });
        
        console.log('\n📊 Resultados del filtrado:');
        console.log(`   - Total transacciones: ${testTransactions.length}`);
        console.log(`   - Transacciones disponibles: ${pendingTransactions.length}`);
        console.log(`   - Transacciones excluidas: ${testTransactions.length - pendingTransactions.length}`);
        
        console.log('\n✅ Transacciones disponibles para asignar:');
        pendingTransactions.forEach(t => {
            console.log(`   - ${t.Referencia}: Disponible = "${t.Disponible}"`);
        });
        
        // Verificar que TEST003 (Disponible = 0) no está en la lista
        const test003Included = pendingTransactions.some(t => t.Referencia === 'TEST003');
        if (test003Included) {
            console.error('❌ ERROR: TEST003 (Disponible = 0) no debería estar incluida');
        } else {
            console.log('✅ CORRECTO: TEST003 (Disponible = 0) correctamente excluida');
        }
        
        // Verificar que TEST001 y TEST002 (Disponible > 0) están en la lista
        const test001Included = pendingTransactions.some(t => t.Referencia === 'TEST001');
        const test002Included = pendingTransactions.some(t => t.Referencia === 'TEST002');
        
        if (test001Included && test002Included) {
            console.log('✅ CORRECTO: TEST001 y TEST002 (Disponible > 0) correctamente incluidas');
        } else {
            console.error('❌ ERROR: TEST001 o TEST002 deberían estar incluidas');
        }
        
        console.log('\n🎉 Prueba completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Ejecutar la prueba
testDisponibleFiltering(); 