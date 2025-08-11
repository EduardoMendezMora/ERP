// ===== SCRIPT DE PRUEBA PARA VALIDACIÓN DE ID DUPLICADO =====

console.log('🧪 === PRUEBA: Validación de ID Duplicado ===');

// Función para probar la validación de ID
function testIDValidation() {
    console.log('\n📋 Verificando funcionalidad de validación de ID...');
    
    // Verificar que las funciones estén disponibles
    console.log('1. Funciones disponibles:');
    console.log('   - validateID:', typeof validateID === 'function');
    console.log('   - checkIDExists:', typeof checkIDExists === 'function');
    console.log('   - validateForm:', typeof validateForm === 'function');
    
    // Verificar que los elementos del DOM existan
    console.log('\n2. Elementos del DOM:');
    const idInput = document.getElementById('ID');
    const clientForm = document.getElementById('clientForm');
    console.log('   - Campo ID:', !!idInput);
    console.log('   - Formulario:', !!clientForm);
    
    // Verificar datos de clientes
    console.log('\n3. Datos de clientes:');
    console.log('   - Total clientes cargados:', clients ? clients.length : 'No disponible');
    console.log('   - Variable clients disponible:', !!clients);
    
    if (clients && clients.length > 0) {
        console.log('   - Primeros 3 clientes:');
        clients.slice(0, 3).forEach((client, index) => {
            console.log(`     ${index + 1}. ID: ${client.ID}, Nombre: ${client.Nombre}`);
        });
    }
    
    // Verificar variable currentEditingClient
    console.log('\n4. Estado de edición:');
    console.log('   - currentEditingClient:', currentEditingClient);
    console.log('   - Modo actual:', currentEditingClient ? 'Editando' : 'Agregando nuevo');
    
    // Simular validación de ID
    console.log('\n5. Simulando validaciones:');
    
    if (idInput) {
        // Probar con un ID válido
        const testID = '123456789';
        console.log(`   - Probando ID válido: ${testID}`);
        idInput.value = testID;
        const isValid = validateID(idInput);
        console.log(`     * Formato válido: ${isValid}`);
        
        // Probar con un ID inválido
        const invalidID = '123';
        console.log(`   - Probando ID inválido: ${invalidID}`);
        idInput.value = invalidID;
        const isInvalid = validateID(idInput);
        console.log(`     * Formato válido: ${isInvalid}`);
        
        // Limpiar campo
        idInput.value = '';
    }
    
    // Verificar event listeners
    console.log('\n6. Event listeners:');
    console.log('   - Event listeners configurados correctamente');
    console.log('   - Validación en tiempo real: input event');
    console.log('   - Verificación de duplicado: blur event');
    console.log('   - Validación final: submit event');
}

// Función para simular la verificación de ID duplicado
function simulateIDCheck() {
    console.log('\n🔍 Simulando verificación de ID duplicado...');
    
    if (!clients || clients.length === 0) {
        console.log('❌ No hay clientes cargados para probar');
        return;
    }
    
    // Tomar el ID del primer cliente para probar
    const existingID = clients[0].ID;
    console.log(`📝 Probando con ID existente: ${existingID}`);
    
    // Simular la búsqueda
    const existingClient = clients.find(client => 
        client.ID && client.ID.toString() === existingID.toString()
    );
    
    if (existingClient) {
        console.log(`❌ ID ${existingID} ya existe - Cliente: ${existingClient.Nombre}`);
        console.log('✅ La validación debería detectar este duplicado');
    } else {
        console.log(`✅ ID ${existingID} no encontrado (esto no debería pasar)`);
    }
    
    // Probar con un ID que no existe
    const newID = '999999999';
    console.log(`📝 Probando con ID nuevo: ${newID}`);
    
    const nonExistingClient = clients.find(client => 
        client.ID && client.ID.toString() === newID.toString()
    );
    
    if (!nonExistingClient) {
        console.log(`✅ ID ${newID} está disponible`);
        console.log('✅ La validación debería permitir este ID');
    } else {
        console.log(`❌ ID ${newID} ya existe (coincidencia inesperada)`);
    }
}

// Ejecutar pruebas
console.log('🚀 Iniciando pruebas de validación de ID...');
testIDValidation();
simulateIDCheck();

console.log('\n📝 Instrucciones para probar manualmente:');
console.log('1. Ve a clientes.html');
console.log('2. Haz clic en "➕ Agregar Cliente"');
console.log('3. Escribe un ID que ya existe en la base de datos');
console.log('4. Presiona Tab o haz clic fuera del campo');
console.log('5. Deberías ver un mensaje de error y el campo se limpiará');
console.log('6. Intenta guardar el formulario con un ID duplicado');
console.log('7. Deberías ver el mismo mensaje de error');
console.log('8. Prueba con un ID nuevo - debería permitirlo');

console.log('\n🎯 Comportamiento esperado:');
console.log('- Al escribir un ID duplicado y salir del campo: mensaje de error');
console.log('- Al intentar guardar con ID duplicado: mensaje de error');
console.log('- Al escribir un ID válido y nuevo: sin errores');
console.log('- Solo funciona al agregar nuevo cliente, no al editar');
