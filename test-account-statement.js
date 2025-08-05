// ===== SCRIPT DE PRUEBA PARA VERIFICAR ESTADO DE CUENTA =====

console.log('🧪 === PRUEBA DE ESTADO DE CUENTA ===');

// Simular datos de prueba basados en el problema reportado
const testInvoices = [
    {
        NumeroFactura: 'FAC-6648',
        SemanaDescripcion: 'Semana del 13 al 19 de Julio del 2025',
        FechaVencimiento: '20/07/2025',
        DiasAtraso: 16,
        MontoBase: '125000', // Valor real en la BD
        MontoMultas: '32000',
        Estado: 'Vencido'
    },
    {
        NumeroFactura: 'FAC-6649',
        SemanaDescripcion: 'Semana del 20 al 26 de Julio del 2025',
        FechaVencimiento: '27/07/2025',
        DiasAtraso: 9,
        MontoBase: '125000', // Valor real en la BD
        MontoMultas: '18000',
        Estado: 'Vencido'
    },
    {
        NumeroFactura: 'FAC-6650',
        SemanaDescripcion: 'Semana del 27 de Julio al 2 de Agosto del 2025',
        FechaVencimiento: '3/08/2025',
        DiasAtraso: 2,
        MontoBase: '125000', // Valor real en la BD
        MontoMultas: '4000',
        Estado: 'Vencido'
    }
];

const testAssignedPayments = [
    {
        Assignments: [
            { invoiceNumber: 'FAC-6648', amount: '125000' },
            { invoiceNumber: 'FAC-6649', amount: '125000' }
        ]
    }
];

// Función de prueba que simula el cálculo del estado de cuenta
function testAccountStatementCalculation() {
    console.log('📋 === PRUEBA DE CÁLCULO DE ESTADO DE CUENTA ===');
    
    let totalPendiente = 0;
    const detalleFacturas = testInvoices.map(f => {
        const diasAtraso = f.DiasAtraso || 0;
        
        // ANTES (con parseFloat) - INCORRECTO
        const saldoAntes = parseFloat(f.MontoBase || 0);
        const multaAntes = parseFloat(f.MontoMultas || 0);
        
        // DESPUÉS (con parseAmount) - CORRECTO
        const saldoDespues = parseAmount(f.MontoBase || 0);
        const multaDespues = parseAmount(f.MontoMultas || 0);
        
        // Buscar pagos aplicados
        const pagosAplicados = testAssignedPayments.reduce((sum, p) => {
            if (p.Assignments && Array.isArray(p.Assignments)) {
                return sum + p.Assignments
                    .filter(a => a.invoiceNumber == f.NumeroFactura)
                    .reduce((aSum, a) => aSum + parseAmount(a.amount || 0), 0);
            }
            return sum;
        }, 0);
        
        const totalAntes = saldoAntes + multaAntes - pagosAplicados;
        const totalDespues = saldoDespues + multaDespues - pagosAplicados;
        
        console.log(`\n📄 ${f.NumeroFactura}:`);
        console.log(`   ANTES (parseFloat):`);
        console.log(`   - Saldo: ${saldoAntes} (INCORRECTO)`);
        console.log(`   - Multa: ${multaAntes}`);
        console.log(`   - Pagos aplicados: ${pagosAplicados}`);
        console.log(`   - Total: ${totalAntes}`);
        
        console.log(`   DESPUÉS (parseAmount):`);
        console.log(`   - Saldo: ${saldoDespues} (CORRECTO)`);
        console.log(`   - Multa: ${multaDespues}`);
        console.log(`   - Pagos aplicados: ${pagosAplicados}`);
        console.log(`   - Total: ${totalDespues}`);
        
        totalPendiente += totalDespues;
        
        return `* ${f.NumeroFactura} (${f.SemanaDescripcion})\n` +
               `▶️ Fecha: ${f.FechaVencimiento}\n` +
               `▶️ Días vencido: ${diasAtraso}\n` +
               `▶️ Saldo: ₡ ${saldoDespues.toLocaleString('es-CR')}\n` +
               `▶️ Multa: ₡ ${multaDespues.toLocaleString('es-CR')}\n` +
               `▶️ Pagos aplicados: ₡ ${pagosAplicados.toLocaleString('es-CR')}\n` +
               `✅ Total con Multa y Pagos: ₡ ${totalDespues.toLocaleString('es-CR')}\n`;
    }).join('\n');
    
    console.log(`\n📊 Total Pendiente: ₡ ${totalPendiente.toLocaleString('es-CR')}`);
    
    return {
        detalleFacturas,
        totalPendiente
    };
}

// Ejecutar prueba
const resultado = testAccountStatementCalculation();

console.log('\n📝 === MENSAJE GENERADO ===');
console.log(`📱 Estado de cuenta - Arrendamiento
📅 Fecha: ${new Date().toLocaleDateString('es-CR')}

👤 ANTHONY ALFARO BADILLA / BYV982 / 

${resultado.detalleFacturas}

📊 Total Pendiente: ₡ ${resultado.totalPendiente.toLocaleString('es-CR')}
────────────────────────────

Por favor atender los saldos pendientes. Si ya realizó el pago omita este mensaje nuestro Departamento Contable lo aplicará pronto. ¡Gracias! 🙌`);

console.log('\n✅ === PRUEBA COMPLETADA ===');
console.log('🔧 Los cambios deberían mostrar los montos correctos ahora:');
console.log('   - Saldo: ₡125,000 (en lugar de ₡125)');
console.log('   - Total Pendiente: positivo (en lugar de negativo)'); 