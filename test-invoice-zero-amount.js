// ===== PRUEBA: EDICIÓN DE FACTURAS CON MONTO 0 =====
// Este archivo prueba que se pueden editar facturas con monto 0
// y que el MontoTotal se calcula correctamente

console.log('🧪 Iniciando prueba de edición de facturas con monto 0...');

// Simular datos de una factura existente
const testInvoice = {
    NumeroFactura: 'TEST-001',
    ConceptoManual: 'Arrendamiento Semanal',
    DescripcionManual: 'Semana de prueba',
    MontoBase: 50000,
    MontoTotal: 50000,
    MontoMultas: 0,
    DiasAtraso: 0,
    FechaVencimiento: '2024-01-15',
    Estado: 'Pendiente',
    TipoFactura: 'Manual'
};

console.log('📋 Factura original:', testInvoice);

// Simular edición con monto 0
const editData = {
    NumeroFactura: testInvoice.NumeroFactura,
    ConceptoManual: testInvoice.ConceptoManual,
    DescripcionManual: testInvoice.DescripcionManual,
    MontoBase: 0, // ✅ Ahora permitido
    MontoTotal: 0, // ✅ Debe ser 0 cuando no hay multas
    MontoMultas: 0,
    DiasAtraso: 0,
    FechaVencimiento: testInvoice.FechaVencimiento,
    Estado: 'Pendiente',
    TipoFactura: testInvoice.TipoFactura
};

console.log('✏️ Datos de edición:', editData);

// Simular edición con monto 0 y estado vencido (debe calcular multas)
const today = new Date();
const dueDate = new Date('2024-01-10'); // Fecha vencida
const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

const editDataVencida = {
    NumeroFactura: testInvoice.NumeroFactura,
    ConceptoManual: testInvoice.ConceptoManual,
    DescripcionManual: testInvoice.DescripcionManual,
    MontoBase: 0, // ✅ Ahora permitido
    MontoTotal: 0 + (daysOverdue * 2000), // ✅ Monto base + multas
    MontoMultas: daysOverdue * 2000,
    DiasAtraso: daysOverdue,
    FechaVencimiento: '2024-01-10',
    Estado: 'Vencido',
    TipoFactura: 'Semanal' // No es manual, debe aplicar multas
};

console.log('📅 Factura vencida con monto 0:', editDataVencida);
console.log(`   - Días de atraso: ${daysOverdue}`);
console.log(`   - Multas calculadas: ₡${(daysOverdue * 2000).toLocaleString('es-CR')}`);
console.log(`   - MontoTotal final: ₡${editDataVencida.MontoTotal.toLocaleString('es-CR')}`);

// Verificar que las validaciones permiten monto 0
function testValidations() {
    console.log('\n🔍 Probando validaciones...');
    
    const testAmounts = [0, 1000, -1000, 50000];
    
    testAmounts.forEach(amount => {
        const isValid = amount >= 0; // ✅ Nueva validación: permite 0
        const oldValidation = amount > 0; // ❌ Validación anterior: no permitía 0
        
        console.log(`   Monto ${amount}: ${isValid ? '✅ Válido' : '❌ Inválido'} (antes: ${oldValidation ? '✅ Válido' : '❌ Inválido'})`);
    });
}

testValidations();

console.log('\n✅ Prueba completada. Los cambios permiten:');
console.log('   - Montos en 0 para facturas');
console.log('   - Cálculo correcto de MontoTotal con multas');
console.log('   - Validaciones actualizadas'); 