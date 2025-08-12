// ===== SCRIPT DE PRUEBA PARA VISIBILIDAD DEL FORMULARIO =====

console.log('🧪 === PRUEBA: Visibilidad del Formulario ===');

// Función para verificar el estado actual del formulario
function checkFormVisibility() {
    console.log('\n📊 Estado actual del formulario:');
    
    const formSection = document.getElementById('formSection');
    const showFormBtn = document.getElementById('showFormBtn');
    const hideFormBtn = document.getElementById('hideFormBtn');
    
    if (formSection) {
        const isVisible = formSection.classList.contains('show');
        console.log('   - Formulario visible:', isVisible ? '✅ Sí' : '❌ No');
        console.log('   - Clases del formulario:', formSection.className);
    } else {
        console.log('   - Formulario no encontrado: ❌');
    }
    
    if (showFormBtn) {
        const isShowBtnVisible = showFormBtn.style.display !== 'none';
        console.log('   - Botón "Agregar Cliente" visible:', isShowBtnVisible ? '✅ Sí' : '❌ No');
    } else {
        console.log('   - Botón "Agregar Cliente" no encontrado: ❌');
    }
    
    if (hideFormBtn) {
        const isHideBtnVisible = hideFormBtn.style.display !== 'none';
        console.log('   - Botón "Ocultar Formulario" visible:', isHideBtnVisible ? '✅ Sí' : '❌ No');
    } else {
        console.log('   - Botón "Ocultar Formulario" no encontrado: ❌');
    }
    
    console.log('   - Modo de edición:', isEditing ? '✏️ Editando' : '➕ Agregando');
    console.log('   - Cliente actual:', currentClient ? currentClient.Nombre : 'Ninguno');
}

// Función para probar mostrar el formulario
function testShowForm() {
    console.log('\n🔍 Probando mostrar formulario...');
    
    if (typeof showForm === 'function') {
        showForm();
        console.log('✅ Función showForm() ejecutada');
        
        // Verificar después de un breve delay
        setTimeout(() => {
            checkFormVisibility();
        }, 500);
    } else {
        console.log('❌ Función showForm() no está disponible');
    }
}

// Función para probar ocultar el formulario
function testHideForm() {
    console.log('\n👁️ Probando ocultar formulario...');
    
    if (typeof hideForm === 'function') {
        hideForm();
        console.log('✅ Función hideForm() ejecutada');
        
        // Verificar después de un breve delay
        setTimeout(() => {
            checkFormVisibility();
        }, 500);
    } else {
        console.log('❌ Función hideForm() no está disponible');
    }
}

// Función para probar el modo de edición
function testEditMode() {
    console.log('\n✏️ Probando modo de edición...');
    
    if (!clients || clients.length === 0) {
        console.log('❌ No hay clientes para probar');
        return;
    }
    
    // Simular edición del primer cliente
    const testClient = clients[0];
    console.log(`📝 Editando cliente: ${testClient.Nombre}`);
    
    if (typeof editClient === 'function') {
        editClient(testClient.ID);
        console.log('✅ Función editClient() ejecutada');
        
        // Verificar después de un breve delay
        setTimeout(() => {
            checkFormVisibility();
        }, 500);
    } else {
        console.log('❌ Función editClient() no está disponible');
    }
}

// Función para probar cancelar edición
function testCancelEdit() {
    console.log('\n❌ Probando cancelar edición...');
    
    if (typeof cancelEdit === 'function') {
        cancelEdit();
        console.log('✅ Función cancelEdit() ejecutada');
        
        // Verificar después de un breve delay
        setTimeout(() => {
            checkFormVisibility();
        }, 500);
    } else {
        console.log('❌ Función cancelEdit() no está disponible');
    }
}

// Función para probar el flujo completo
function testCompleteFlow() {
    console.log('\n🔄 === PRUEBA DE FLUJO COMPLETO ===');
    
    console.log('\n1️⃣ Estado inicial:');
    checkFormVisibility();
    
    console.log('\n2️⃣ Mostrando formulario para agregar:');
    testShowForm();
    
    setTimeout(() => {
        console.log('\n3️⃣ Ocultando formulario:');
        testHideForm();
        
        setTimeout(() => {
            console.log('\n4️⃣ Probando modo de edición:');
            testEditMode();
            
            setTimeout(() => {
                console.log('\n5️⃣ Cancelando edición:');
                testCancelEdit();
                
                console.log('\n✅ Flujo completo probado');
            }, 1000);
        }, 1000);
    }, 1000);
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
    
    // Verificar elementos del DOM
    console.log('\n🔧 Elementos del DOM:');
    console.log('   - Formulario:', !!document.getElementById('formSection'));
    console.log('   - Botón "Agregar Cliente":', !!document.getElementById('showFormBtn'));
    console.log('   - Botón "Ocultar Formulario":', !!document.getElementById('hideFormBtn'));
    
    // Verificar funciones disponibles
    console.log('\n🔧 Funciones disponibles:');
    console.log('   - showForm:', typeof showForm === 'function' ? '✅' : '❌');
    console.log('   - hideForm:', typeof hideForm === 'function' ? '✅' : '❌');
    console.log('   - editClient:', typeof editClient === 'function' ? '✅' : '❌');
    console.log('   - cancelEdit:', typeof cancelEdit === 'function' ? '✅' : '❌');
    
    // Verificar estado inicial
    console.log('\n📊 Estado inicial:');
    checkFormVisibility();
    
    console.log('\n🧪 Para probar manualmente:');
    console.log('1. Haz clic en "➕ Agregar Nuevo Cliente"');
    console.log('2. El formulario debería aparecer con animación');
    console.log('3. Haz clic en "👁️ Ocultar Formulario"');
    console.log('4. El formulario debería desaparecer');
    console.log('5. Haz clic en "✏️ Editar" en cualquier tarjeta');
    console.log('6. El formulario debería aparecer en modo edición');
    console.log('7. Haz clic en "❌ Cancelar Edición"');
    console.log('8. El formulario debería desaparecer');
    
    console.log('\n💡 Comandos para probar automáticamente:');
    console.log('- testCompleteFlow() - Prueba todo el flujo');
    console.log('- testShowForm() - Solo mostrar formulario');
    console.log('- testHideForm() - Solo ocultar formulario');
    console.log('- testEditMode() - Solo probar modo edición');
    console.log('- testCancelEdit() - Solo cancelar edición');
}

// Ejecutar verificación inicial
console.log('🚀 Iniciando verificación de visibilidad del formulario...');
checkFormVisibility();

console.log('\n📝 Comportamiento esperado:');
console.log('- El formulario está OCULTO por defecto');
console.log('- El botón "➕ Agregar Nuevo Cliente" está visible');
console.log('- Al hacer clic en "➕ Agregar Nuevo Cliente": formulario aparece');
console.log('- Al hacer clic en "✏️ Editar": formulario aparece en modo edición');
console.log('- Al hacer clic en "👁️ Ocultar Formulario": formulario desaparece');
console.log('- Al hacer clic en "❌ Cancelar Edición": formulario desaparece');
console.log('- Al guardar exitosamente: formulario desaparece automáticamente');

console.log('\n💡 Para probar con datos reales:');
console.log('- Ejecuta este script en la página clientes.html');
console.log('- Para prueba específica: testInClientesPage()');
console.log('- Para prueba automática completa: testCompleteFlow()');
