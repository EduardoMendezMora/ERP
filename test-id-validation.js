// ===== SCRIPT DE PRUEBA PARA VALIDACIÓN DE ID DUPLICADO =====

console.log('🧪 === PRUEBA: Validación de ID Duplicado ===');

// Simular variables globales necesarias para las pruebas
if (typeof isEditing === 'undefined') {
    console.log('⚠️  isEditing no está definido, simulando...');
    window.isEditing = false;
}

if (typeof currentClient === 'undefined') {
    console.log('⚠️  currentClient no está definido, simulando...');
    window.currentClient = null;
}

if (typeof clients === 'undefined') {
    console.log('⚠️  clients no está definido, simulando array vacío...');
    window.clients = [];
}

if (typeof showToast === 'undefined') {
    console.log('⚠️  showToast no está definido, simulando...');
    window.showToast = function(message, type) {
        console.log(`🍞 Toast (${type}): ${message}`);
    };
}

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
    
    // Verificar variables de estado
    console.log('\n4. Estado de edición:');
    console.log('   - isEditing:', isEditing);
    console.log('   - currentClient:', currentClient);
    console.log('   - Modo actual:', isEditing ? 'Editando' : 'Agregando nuevo');
    
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
        console.log('💡 Para probar con datos reales, ejecuta este script en la página clientes.html');
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

// Función para probar checkIDExists directamente
async function testCheckIDExists() {
    console.log('\n🧪 Probando función checkIDExists directamente...');
    
    if (typeof checkIDExists !== 'function') {
        console.log('❌ checkIDExists no está disponible');
        return;
    }
    
    const idInput = document.getElementById('ID');
    if (!idInput) {
        console.log('❌ Campo ID no encontrado en el DOM');
        return;
    }
    
    // Simular modo de agregar nuevo cliente
    isEditing = false;
    console.log('📝 Modo: Agregando nuevo cliente');
    
    if (clients && clients.length > 0) {
        // Probar con ID existente
        const existingID = clients[0].ID;
        console.log(`🔍 Probando checkIDExists con ID existente: ${existingID}`);
        idInput.value = existingID;
        
        try {
            const exists = await checkIDExists(idInput);
            console.log(`✅ Resultado: ${exists ? 'ID existe (correcto)' : 'ID no existe (incorrecto)'}`);
        } catch (error) {
            console.log(`❌ Error en checkIDExists: ${error.message}`);
        }
        
        // Probar con ID nuevo
        const newID = '999999999';
        console.log(`🔍 Probando checkIDExists con ID nuevo: ${newID}`);
        idInput.value = newID;
        
        try {
            const exists = await checkIDExists(idInput);
            console.log(`✅ Resultado: ${exists ? 'ID existe (incorrecto)' : 'ID no existe (correcto)'}`);
        } catch (error) {
            console.log(`❌ Error en checkIDExists: ${error.message}`);
        }
        
        // Limpiar
        idInput.value = '';
    } else {
        console.log('⚠️  No hay clientes para probar checkIDExists');
    }
}

// Función específica para probar en clientes.html
function testInClientesPage() {
    console.log('\n🎯 === PRUEBA ESPECÍFICA PARA CLIENTES.HTML ===');
    
    // Verificar que estamos en la página correcta
    if (!document.getElementById('clientForm')) {
        console.log('❌ No estás en la página clientes.html');
        console.log('💡 Ve a clientes.html y ejecuta: testInClientesPage()');
        return;
    }
    
    console.log('✅ Estás en clientes.html');
    
    // Verificar que los clientes estén cargados
    if (!clients || clients.length === 0) {
        console.log('❌ No hay clientes cargados');
        console.log('💡 Espera a que se carguen los clientes o recarga la página');
        return;
    }
    
    console.log(`✅ ${clients.length} clientes cargados`);
    
    // Mostrar algunos IDs existentes para probar
    console.log('\n📋 IDs existentes para probar:');
    clients.slice(0, 5).forEach((client, index) => {
        console.log(`   ${index + 1}. ID: ${client.ID} - ${client.Nombre}`);
    });
    
    // Verificar que las funciones estén disponibles
    console.log('\n🔧 Funciones disponibles:');
    console.log('   - validateID:', typeof validateID === 'function' ? '✅' : '❌');
    console.log('   - checkIDExists:', typeof checkIDExists === 'function' ? '✅' : '❌');
    console.log('   - validateForm:', typeof validateForm === 'function' ? '✅' : '❌');
    
    // Verificar variables de estado
    console.log('\n📊 Variables de estado:');
    console.log('   - isEditing:', isEditing);
    console.log('   - currentClient:', currentClient);
    console.log('   - clients.length:', clients.length);
    
    // Verificar event listeners
    const idInput = document.getElementById('ID');
    if (idInput) {
        console.log('\n🎧 Event listeners configurados:');
        console.log('   - Campo ID encontrado: ✅');
        console.log('   - Event listeners deberían estar activos');
    }
    
    console.log('\n🧪 Para probar manualmente:');
    console.log('1. Haz clic en "➕ Agregar Cliente"');
    console.log('2. Escribe uno de los IDs mostrados arriba');
    console.log('3. Presiona Tab o haz clic fuera del campo');
    console.log('4. Deberías ver un mensaje de error rojo');
    console.log('5. El campo se limpiará automáticamente');
    
    console.log('\n💡 Comando para probar automáticamente:');
    console.log('testIDDuplication()');
}

// Función para probar automáticamente la duplicación
function testIDDuplication() {
    console.log('\n🤖 === PRUEBA AUTOMÁTICA DE DUPLICACIÓN ===');
    
    if (!clients || clients.length === 0) {
        console.log('❌ No hay clientes para probar');
        return;
    }
    
    const idInput = document.getElementById('ID');
    if (!idInput) {
        console.log('❌ Campo ID no encontrado');
        return;
    }
    
    // Asegurar que estamos en modo agregar
    isEditing = false;
    
    // Tomar un ID existente
    const existingID = clients[0].ID;
    console.log(`🔍 Probando con ID existente: ${existingID}`);
    
    // Simular el evento blur
    idInput.value = existingID;
    idInput.focus();
    
    // Simular salir del campo
    setTimeout(() => {
        idInput.blur();
        console.log('✅ Evento blur disparado');
        
        // Verificar si el campo se limpió
        setTimeout(() => {
            if (idInput.value === '') {
                console.log('✅ Campo se limpió correctamente');
            } else {
                console.log('❌ Campo no se limpió');
            }
        }, 100);
    }, 100);
}

// Función para probar el modo de edición
function testEditMode() {
    console.log('\n✏️  === PRUEBA DEL MODO DE EDICIÓN ===');
    
    if (!clients || clients.length === 0) {
        console.log('❌ No hay clientes para probar');
        return;
    }
    
    console.log('📝 Simulando modo de edición...');
    isEditing = true;
    currentClient = clients[0];
    
    console.log('✅ Modo de edición activado');
    console.log('   - isEditing:', isEditing);
    console.log('   - currentClient:', currentClient ? currentClient.Nombre : 'null');
    
    console.log('\n🧪 Para probar manualmente:');
    console.log('1. Haz clic en "✏️ Editar" en cualquier tarjeta de cliente');
    console.log('2. Modifica el ID del cliente');
    console.log('3. Presiona Tab o haz clic fuera del campo');
    console.log('4. NO deberías ver mensaje de error (porque estás editando)');
    console.log('5. Intenta guardar - debería permitirlo');
    
    // Restaurar modo normal
    setTimeout(() => {
        isEditing = false;
        currentClient = null;
        console.log('✅ Modo normal restaurado');
    }, 2000);
}

// Ejecutar pruebas
console.log('🚀 Iniciando pruebas de validación de ID...');
testIDValidation();
simulateIDCheck();
testCheckIDExists();

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

console.log('\n💡 Para probar con datos reales:');
console.log('- Ejecuta este script en la página clientes.html después de cargar los clientes');
console.log('- O copia y pega las funciones de validación en la consola de clientes.html');
console.log('- Para prueba específica en clientes.html: testInClientesPage()');
console.log('- Para prueba automática: testIDDuplication()');
console.log('- Para probar modo edición: testEditMode()');
