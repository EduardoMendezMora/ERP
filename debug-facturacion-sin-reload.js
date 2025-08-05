// ===== DEBUG DE FACTURACIÓN SIN RECARGA =====
// Este script modifica la función billClient para prevenir actualizaciones automáticas

console.log('🔧 === CARGANDO DEBUG DE FACTURACIÓN SIN RECARGA ===');

// ===== FUNCIÓN ORIGINAL DE BILLCLIENT (BACKUP) =====
let originalBillClient = null;

// ===== FUNCIÓN DE DEBUG MODIFICADA =====
async function billClientDebug(clientId, preventReload = true) {
    console.log('🚀 === INICIANDO FACTURACIÓN EN MODO DEBUG ===');
    console.log('📋 Cliente ID:', clientId);
    console.log('🔄 Prevenir recarga:', preventReload);
    
    const client = clients.find(c => c.ID.toString() === clientId.toString());
    if (!client) {
        console.error('❌ Cliente no encontrado');
        showToast('Cliente no encontrado', 'error');
        return;
    }

    console.log('✅ Cliente encontrado:', client.Nombre);

    // Verificar que el contrato esté completo
    if (!client.fechaContrato || !client.montoContrato || !client.plazoContrato) {
        console.error('❌ Contrato incompleto');
        console.log('  - Fecha contrato:', client.fechaContrato);
        console.log('  - Monto contrato:', client.montoContrato);
        console.log('  - Plazo contrato:', client.plazoContrato);
        showToast('El contrato del cliente está incompleto', 'error');
        return;
    }

    console.log('✅ Contrato completo verificado');

    // Verificar si ya está facturado
    const billingInfo = getClientBillingInfo(clientId);
    console.log('📊 Estado de facturación:', billingInfo.status);
    console.log('📄 Facturas existentes:', billingInfo.invoices.length);
    
    if (billingInfo.status === 'billed') {
        console.warn('⚠️ Cliente ya facturado');
        showToast('Este cliente ya ha sido facturado', 'warning');
        return;
    }

    // Deshabilitar botón mientras procesa
    const billBtn = document.getElementById(`billBtn-${clientId}`);
    if (billBtn) {
        billBtn.disabled = true;
        billBtn.textContent = '⏳ Facturando...';
        console.log('🔘 Botón deshabilitado');
    }

    try {
        console.log('🔄 Generando facturas...');
        const invoicesData = generateInvoicesForClient(client);
        console.log(`✅ ${invoicesData.length} facturas generadas`);
        
        // Mostrar las primeras 3 facturas generadas
        invoicesData.slice(0, 3).forEach((factura, index) => {
            console.log(`📄 Factura ${index + 1}:`, {
                numero: factura.NumeroFactura,
                cliente: factura.ID_Cliente,
                semana: factura.SemanaNumero,
                vencimiento: factura.FechaVencimiento,
                monto: factura.MontoBase,
                estado: factura.Estado
            });
        });
        
        console.log('🌐 Enviando facturas a la API...');
        const apiUrl = `${API_URL_INVOICES}?sheet=Facturas`;
        console.log('📡 URL de API:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(invoicesData)
        });

        console.log('📡 Respuesta HTTP:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en la respuesta:', errorText);
            throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Facturas enviadas exitosamente:', result);

        // Recargar facturas y actualizar vista
        console.log('🔄 Recargando datos...');
        await loadInvoices();
        renderClients(clients);
        updateStats();
        
        console.log('✅ Datos actualizados');
        
        // Mostrar resultado final
        const successMessage = `✅ Cliente facturado exitosamente: ${invoicesData.length} facturas generadas`;
        console.log(successMessage);
        showToast(successMessage, 'success');
        
        // Si no prevenir recarga, hacer la redirección normal
        if (!preventReload) {
            console.log('🔄 Redirigiendo a facturas...');
            let countdown = 3;
            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    showToast(`🔄 Redirigiendo a facturas en ${countdown} segundos...`, 'warning');
                } else {
                    clearInterval(countdownInterval);
                    window.location.href = `https://arrendautos.app/facturas.html?clientId=${clientId}`;
                }
            }, 1000);
        } else {
            console.log('🛑 Modo debug: No se redirige automáticamente');
            showToast('✅ Facturación completada en modo debug. Revisa la consola para detalles.', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error al facturar cliente:', error);
        showToast('Error al generar facturas: ' + error.message, 'error');
        
        // Restaurar botón
        if (billBtn) {
            billBtn.disabled = false;
            billBtn.textContent = '📄 Facturar';
        }
    }
}

// ===== FUNCIÓN PARA REEMPLAZAR LA FUNCIÓN ORIGINAL =====
function enableDebugMode() {
    console.log('🔧 === HABILITANDO MODO DEBUG ===');
    
    // Guardar la función original si existe
    if (typeof billClient === 'function') {
        originalBillClient = billClient;
        console.log('💾 Función original guardada');
    }
    
    // Reemplazar con la función de debug
    window.billClient = billClientDebug;
    console.log('✅ Función billClient reemplazada con versión de debug');
    
    // Agregar botones de control
    addDebugControls();
}

// ===== FUNCIÓN PARA RESTAURAR LA FUNCIÓN ORIGINAL =====
function disableDebugMode() {
    console.log('🔧 === DESHABILITANDO MODO DEBUG ===');
    
    if (originalBillClient) {
        window.billClient = originalBillClient;
        console.log('✅ Función original restaurada');
    }
    
    // Remover controles de debug
    removeDebugControls();
}

// ===== FUNCIÓN PARA AGREGAR CONTROLES DE DEBUG =====
function addDebugControls() {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debugPanel';
    debugPanel.innerHTML = `
        <div style="position: fixed; top: 10px; right: 10px; background: #2c3e50; color: white; padding: 15px; border-radius: 8px; z-index: 10000; font-family: Arial, sans-serif; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
            <h4 style="margin: 0 0 10px 0; color: #ecf0f1;">🔧 Panel de Debug</h4>
            <div style="margin-bottom: 10px;">
                <button id="testBilling" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 12px;">🧪 Probar Facturación</button>
                <button id="disableDebug" style="background: #95a5a6; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">❌ Deshabilitar Debug</button>
            </div>
            <div style="font-size: 11px; color: #bdc3c7;">
                <div>✅ Modo debug activo</div>
                <div>🔄 Sin recarga automática</div>
            </div>
        </div>
    `;
    document.body.appendChild(debugPanel);

    // Esperar un momento para que el DOM se actualice
    setTimeout(() => {
        const testBillingBtn = debugPanel.querySelector('#testBilling');
        const disableDebugBtn = debugPanel.querySelector('#disableDebug');
        
        if (testBillingBtn) {
            testBillingBtn.addEventListener('click', function() {
                console.log('🧪 === PRUEBA DE FACTURACIÓN ===');
                console.log('📋 Cliente de prueba: 401380887');
                billClientDebug('401380887', true);
            });
        } else {
            console.error('❌ No se pudo encontrar el botón testBilling');
        }
        
        if (disableDebugBtn) {
            disableDebugBtn.addEventListener('click', function() {
                console.log('❌ === DESHABILITANDO MODO DEBUG ===');
                if (originalBillClient) {
                    window.billClient = originalBillClient;
                    console.log('✅ Función original restaurada');
                }
                const panel = document.getElementById('debugPanel');
                if (panel) {
                    panel.remove();
                    console.log('✅ Panel de debug removido');
                }
                showToast('🔧 Modo debug deshabilitado', 'info');
            });
        } else {
            console.error('❌ No se pudo encontrar el botón disableDebug');
        }
    }, 100);
}

// ===== FUNCIÓN PARA REMOVER CONTROLES DE DEBUG =====
function removeDebugControls() {
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        debugPanel.remove();
        console.log('🎛️ Panel de control de debug removido');
    }
}

// ===== FUNCIÓN PARA PROBAR CON CLIENTE ESPECÍFICO =====
function testBillingWithClient(clientId) {
    console.log('🧪 === PRUEBA CON CLIENTE ESPECÍFICO ===');
    console.log('Cliente ID:', clientId);
    
    const client = clients.find(c => c.ID.toString() === clientId.toString());
    if (!client) {
        console.error('❌ Cliente no encontrado');
        return;
    }
    
    console.log('Cliente:', client.Nombre);
    billClientDebug(clientId, true); // Siempre en modo debug
}

// ===== FUNCIÓN PARA VER ESTADO ACTUAL =====
function showCurrentState() {
    console.log('📊 === ESTADO ACTUAL DEL SISTEMA ===');
    console.log('Clientes cargados:', clients?.length || 0);
    console.log('Facturas cargadas:', invoices?.length || 0);
    console.log('Modo debug activo:', typeof billClient === 'function' && billClient.name === 'billClientDebug');
    
    if (clients && clients.length > 0) {
        console.log('\n📋 Primeros 3 clientes:');
        clients.slice(0, 3).forEach((client, index) => {
            const contratoCompleto = client.fechaContrato && client.montoContrato && client.plazoContrato;
            console.log(`  ${index + 1}. ${client.Nombre} (ID: ${client.ID}) - Contrato: ${contratoCompleto ? '✅' : '❌'}`);
        });
    }
}

// ===== EXPONER FUNCIONES GLOBALMENTE =====
window.enableDebugMode = enableDebugMode;
window.disableDebugMode = disableDebugMode;
window.billClientDebug = billClientDebug;
window.testBillingWithClient = testBillingWithClient;
window.showCurrentState = showCurrentState;

// ===== AUTO-HABILITAR MODO DEBUG =====
console.log('🚀 === AUTO-HABILITANDO MODO DEBUG ===');
setTimeout(() => {
    enableDebugMode();
    console.log('✅ Modo debug habilitado automáticamente');
    console.log('💡 Usa el panel de control en la esquina superior derecha');
}, 1000);

console.log('✅ Script de debug sin recarga cargado');
console.log('💡 El modo debug se habilitará automáticamente en 1 segundo'); 