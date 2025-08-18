// ===== CORRECCIÓN DE PROBLEMAS DE CARGA ASÍNCRONA =====
// Este archivo corrige los problemas de operaciones asíncronas pendientes

console.log('🔧 Aplicando correcciones para problemas de carga asíncrona...');

// ===== 1. CORRECCIÓN DE LA FUNCIÓN GETUPCOMINGINVOICES =====
// Reemplazar la función problemática con una versión mejorada
function getUpcomingInvoicesFixed(invoices, limit = 5) {
    console.log('📅 [FIXED] getUpcomingInvoices ejecutándose...');
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        console.log(`📅 Fecha de referencia: ${today.toISOString().split('T')[0]}`);
        console.log(`📋 Total facturas a procesar: ${invoices.length}`);
        
        // Filtrar facturas no vencidas (pendientes + futuras)
        const nonOverdueInvoices = invoices.filter(inv => {
            // Incluir facturas pendientes
            if (inv.Estado === 'Pendiente') {
                console.log(`✅ Incluyendo factura pendiente: ${inv.NumeroFactura}`);
                return true;
            }
            
            // Incluir facturas con fecha futura
            if (inv.FechaVencimiento) {
                const dueDate = parseDate(inv.FechaVencimiento);
                if (dueDate && dueDate > today) {
                    console.log(`✅ Incluyendo factura futura: ${inv.NumeroFactura} (${inv.FechaVencimiento})`);
                    return true;
                }
            }
            
            return false;
        });
        
        console.log(`📅 Facturas no vencidas encontradas: ${nonOverdueInvoices.length}`);
        
        // Ordenar por fecha de vencimiento
        const sortedInvoices = nonOverdueInvoices.sort((a, b) => {
            const dateA = parseDate(a.FechaVencimiento);
            const dateB = parseDate(b.FechaVencimiento);
            
            if (dateA && dateB) {
                return dateA.getTime() - dateB.getTime();
            }
            if (dateA && !dateB) return -1;
            if (!dateA && dateB) return 1;
            return 0;
        });
        
        const result = sortedInvoices.slice(0, limit);
        console.log(`📅 Facturas próximas retornadas: ${result.length}`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Error en getUpcomingInvoicesFixed:', error);
        return [];
    }
}

// ===== 2. CORRECCIÓN DE LA OPTIMIZACIÓN DE CARGA =====
// Reemplazar el filtrado problemático con una versión más inclusiva
function filterInvoicesOptimizedFixed(allInvoicesData) {
    console.log('⚡ [FIXED] Aplicando filtrado optimizado corregido...');
    console.log(`📋 Total facturas recibidas: ${allInvoicesData.length}`);
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        console.log(`📅 Fecha de referencia: ${today.toISOString().split('T')[0]}`);
        
        // NUEVA ESTRATEGIA: Incluir TODAS las facturas importantes
        const filteredInvoices = allInvoicesData.filter(invoice => {
            // Mantener facturas sin fecha (manuales, etc.)
            if (!invoice.FechaVencimiento) {
                console.log(`✅ Manteniendo factura sin fecha: ${invoice.NumeroFactura}`);
                return true;
            }
            
            const dueDate = parseDate(invoice.FechaVencimiento);
            if (!dueDate) {
                console.log(`✅ Manteniendo factura con fecha inválida: ${invoice.NumeroFactura} (${invoice.FechaVencimiento})`);
                return true; // Mantener facturas con fecha inválida
            }
            
            // ✅ Cargar TODAS las facturas del pasado
            if (dueDate < today) {
                console.log(`✅ Incluyendo factura del pasado: ${invoice.NumeroFactura} (${invoice.FechaVencimiento})`);
                return true;
            }
            
            // ✅ Cargar TODAS las facturas vencidas
            if (invoice.Estado === 'Vencido') {
                console.log(`✅ Incluyendo factura vencida: ${invoice.NumeroFactura} (${invoice.FechaVencimiento})`);
                return true;
            }
            
            // ✅ Cargar TODAS las facturas no vencidas (sin límite de 3 semanas)
            if (dueDate >= today) {
                console.log(`✅ Incluyendo factura no vencida: ${invoice.NumeroFactura} (${invoice.FechaVencimiento})`);
                return true;
            }
            
            return false;
        });
        
        const excludedCount = allInvoicesData.length - filteredInvoices.length;
        console.log(`✅ Facturas filtradas (optimizadas): ${filteredInvoices.length}`);
        console.log(`❌ Facturas excluidas: ${excludedCount}`);
        console.log(`⚡ Reducción: ${((excludedCount / allInvoicesData.length) * 100).toFixed(1)}%`);
        
        return filteredInvoices;
        
    } catch (error) {
        console.error('❌ Error en filterInvoicesOptimizedFixed:', error);
        return allInvoicesData; // En caso de error, devolver todas las facturas
    }
}

// ===== 3. CORRECCIÓN DE LA FUNCIÓN LOADCLIENTANDINVOICES =====
// Crear una versión mejorada con mejor manejo de errores
async function loadClientAndInvoicesFixed(clientId) {
    console.log('📋 [FIXED] Cargando cliente y facturas con correcciones...');
    
    try {
        // Cargar cliente
        const clientResponse = await fetch(`${API_CONFIG.CLIENTS}?sheet=Clientes`);
        if (!clientResponse.ok) {
            throw new Error(`Error al cargar clientes: HTTP ${clientResponse.status}`);
        }

        const clientsData = await clientResponse.json();
        const clients = Array.isArray(clientsData) ? clientsData : [];

        // Encontrar cliente
        const foundClient = clients.find(c => c.ID && c.ID.toString() === clientId.toString());

        if (!foundClient) {
            throw new Error('Cliente no encontrado con ID: ' + clientId);
        }

        // Sincronizar variables
        currentClient = foundClient;
        window.currentClient = foundClient;

        console.log('✅ Cliente encontrado:', foundClient.Nombre);

        // Cargar facturas con filtrado corregido
        let invoicesData = [];
        try {
            console.log('🚀 Cargando facturas con filtrado corregido...');
            const invoicesResponse = await fetch(`${API_CONFIG.INVOICES}?sheet=Facturas`);
            if (invoicesResponse.ok) {
                const allInvoicesData = await invoicesResponse.json();
                console.log(`📋 Total facturas en API: ${allInvoicesData.length}`);
                
                // Usar el filtrado corregido
                invoicesData = filterInvoicesOptimizedFixed(allInvoicesData);
                
            } else if (invoicesResponse.status !== 404) {
                console.warn('Error al cargar facturas:', invoicesResponse.status);
            }
        } catch (invoiceError) {
            console.warn('No se pudieron cargar las facturas:', invoiceError);
        }

        const allInvoices = Array.isArray(invoicesData) ? invoicesData : [];

        // Filtrar facturas del cliente actual
        const clientAllInvoices = allInvoices.filter(inv =>
            inv.ID_Cliente &&
            inv.NumeroFactura &&
            inv.ID_Cliente.toString() === clientId.toString()
        );

        console.log(`📋 Facturas del cliente: ${clientAllInvoices.length}`);

        // Actualizar multas por vencimiento
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        clientAllInvoices.forEach(invoice => {
            if (invoice.Estado === 'Pendiente' || invoice.Estado === 'Vencido') {
                const dueDateStr = invoice.FechaVencimiento;

                if (dueDateStr && dueDateStr !== '' && dueDateStr !== 'undefined') {
                    const dueDate = parseDate(dueDateStr);

                    if (dueDate && !isNaN(dueDate)) {
                        dueDate.setHours(0, 0, 0, 0);

                        let newStatus = 'Pendiente';
                        let newDaysOverdue = 0;
                        let newFines = 0;

                        if (today >= dueDate) {
                            const diffTime = today.getTime() - dueDate.getTime();
                            newDaysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            newStatus = 'Vencido';

                            // Solo calcular multas para facturas de arrendamiento (NO manuales)
                            const isManualInvoice = invoice.TipoFactura === 'Manual' ||
                                invoice.NumeroFactura?.startsWith('MAN-') ||
                                invoice.ConceptoManual;

                            if (!isManualInvoice) {
                                newFines = newDaysOverdue * 2000; // ₡2,000 por día
                            }
                        }

                        const baseAmount = parseAmount(invoice.MontoBase || 0);
                        const newTotal = baseAmount + newFines;

                        invoice.DiasAtraso = newDaysOverdue;
                        invoice.MontoMultas = newFines;
                        invoice.MontoTotal = newTotal;
                        invoice.Estado = newStatus;
                    }
                }
            }
        });

        // Filtrar: mostrar facturas pagadas, vencidas y pendientes
        clientInvoices = clientAllInvoices.filter(inv => {
            if (inv.Estado === 'Pagado') return true;
            if (inv.Estado === 'Vencido') return true;
            if (inv.Estado === 'Pendiente') return true;
            return false;
        });

        // Sincronizar globalmente
        window.clientInvoices = clientInvoices;

        // Ordenar facturas cronológicamente
        clientInvoices.sort((a, b) => {
            const dateA = parseDate(a.FechaVencimiento);
            const dateB = parseDate(b.FechaVencimiento);

            if (dateA && dateB) {
                return dateA.getTime() - dateB.getTime();
            }

            if (dateA && !dateB) return -1;
            if (!dateA && dateB) return 1;

            const weekA = parseInt(a.SemanaNumero || 0);
            const weekB = parseInt(b.SemanaNumero || 0);
            return weekA - weekB;
        });

        console.log(`📋 Facturas cargadas: ${clientInvoices.length}`);
        
        // Verificar facturas no vencidas
        const noVencidas = clientInvoices.filter(inv => inv.Estado === 'Pendiente');
        console.log(`📅 Facturas no vencidas: ${noVencidas.length}`);
        
        if (noVencidas.length > 0) {
            console.log('📋 Ejemplos de facturas no vencidas:');
            noVencidas.slice(0, 3).forEach(inv => {
                console.log(`  - ${inv.NumeroFactura}: ${inv.FechaVencimiento}`);
            });
        }

    } catch (error) {
        console.error('❌ Error en loadClientAndInvoicesFixed:', error);
        throw error;
    }
}

// ===== 4. CORRECCIÓN DE LA FUNCIÓN RENDERPAGE =====
// Crear una versión más robusta del renderizado
function renderPageFixed() {
    console.log('🎨 [FIXED] Renderizando página con correcciones...');

    try {
        // Actualizar nombre del cliente en header
        updateClientHeader();

        // Renderizar detalles del cliente
        renderClientDetails();

        // Clasificar facturas por estado
        const overdueInvoices = clientInvoices.filter(inv => inv.Estado === 'Vencido');
        const paidInvoices = clientInvoices.filter(inv => inv.Estado === 'Pagado');
        
        // Usar la función corregida para obtener facturas próximas
        const upcomingInvoices = getUpcomingInvoicesFixed(clientInvoices, 5);

        console.log(`📊 Distribución de facturas:`);
        console.log(`  - Vencidas: ${overdueInvoices.length}`);
        console.log(`  - Pagadas: ${paidInvoices.length}`);
        console.log(`  - Próximas: ${upcomingInvoices.length}`);

        // Actualizar estadísticas
        updateStatsWithoutPending(overdueInvoices, paidInvoices);

        // Renderizar secciones de facturas con manejo de errores
        try {
            renderInvoicesSection('overdue', overdueInvoices);
        } catch (error) {
            console.error('❌ Error renderizando facturas vencidas:', error);
        }
        
        try {
            renderInvoicesSection('upcoming', upcomingInvoices);
        } catch (error) {
            console.error('❌ Error renderizando facturas próximas:', error);
        }
        
        try {
            renderInvoicesSection('paid', paidInvoices);
        } catch (error) {
            console.error('❌ Error renderizando facturas pagadas:', error);
        }

        // Renderizar secciones de pagos
        try {
            renderUnassignedPaymentsSection();
        } catch (error) {
            console.error('❌ Error renderizando pagos no asignados:', error);
        }
        
        try {
            renderAssignedPaymentsSection();
        } catch (error) {
            console.error('❌ Error renderizando pagos asignados:', error);
        }
        
        // Renderizar pagos manuales
        try {
            renderManualPayments();
        } catch (error) {
            console.error('❌ Error renderizando pagos manuales:', error);
        }

        // Actualizar contadores de secciones
        updateSectionCounts();

        // Asegurar que todas las secciones estén abiertas
        console.log('🎛️ Aplicando estado de secciones: todas abiertas');
        toggleAllSections(true);

        console.log('✅ Página renderizada completamente con correcciones');

    } catch (error) {
        console.error('❌ Error al renderizar página:', error);
        showToast('Error al renderizar la página: ' + error.message, 'error');
    }
}

// ===== 5. CORRECCIÓN DE LA FUNCIÓN INITIALIZEAPP =====
// Crear una versión mejorada de la inicialización
async function initializeAppFixed() {
    console.log('🚀 [FIXED] Inicializando aplicación con correcciones...');

    try {
        // Obtener ID del cliente desde la URL
        const urlParams = new URLSearchParams(window.location.search);
        const clientId = urlParams.get('clientId') || urlParams.get('id') || urlParams.get('cliente');

        console.log('🔍 Parámetros de URL encontrados:', window.location.search);
        console.log('🆔 ID del cliente extraído:', clientId);

        if (!clientId) {
            window.location.href = '/clientes.html';
            return;
        }

        // Establecer ID del cliente globalmente
        currentClientId = clientId;
        window.currentClientId = clientId;

        console.log('🆔 Cliente ID obtenido:', clientId);

        // Cargar preferencias de sección guardadas
        loadSectionPreferences();

        // Mostrar loading
        showLoading(true);

        // Usar la función corregida para cargar datos
        console.log('🔄 Iniciando carga de cliente y facturas con correcciones...');
        await loadClientAndInvoicesFixed(clientId);
        console.log('✅ Cliente y facturas cargados con correcciones');

        // Cargar pagos con manejo de errores mejorado
        console.log('🔄 Iniciando carga de pagos con correcciones...');
        try {
            await Promise.allSettled([
                loadUnassignedPayments(clientId),
                loadAssignedPayments(clientId),
                loadManualPayments()
            ]);
            console.log('✅ Pagos cargados (con manejo de errores mejorado)');
        } catch (error) {
            console.error('❌ Error general en carga de pagos:', error);
        }

        // Usar la función corregida para renderizar
        console.log('🔄 Iniciando renderizado de página con correcciones...');
        renderPageFixed();
        console.log('✅ Página renderizada con correcciones');

        // Mostrar contenido principal
        document.getElementById('mainContent').style.display = 'block';
        showLoading(false);

        console.log('✅ Aplicación inicializada correctamente con correcciones');

    } catch (error) {
        console.error('❌ Error al inicializar aplicación:', error);
        showError(error.message);
        showLoading(false);
    }
}

// ===== 6. FUNCIÓN DE VERIFICACIÓN RÁPIDA =====
function verificarCorrecciones() {
    console.log('🔍 Verificando correcciones aplicadas...');
    
    const invoices = clientInvoices || window.clientInvoices || [];
    const noVencidas = invoices.filter(inv => inv.Estado === 'Pendiente');
    const upcoming = getUpcomingInvoicesFixed(invoices, 5);
    
    console.log(`📊 Resultados después de las correcciones:`);
    console.log(`  - Total facturas: ${invoices.length}`);
    console.log(`  - Pendientes: ${noVencidas.length}`);
    console.log(`  - Próximas (función corregida): ${upcoming.length}`);
    
    if (upcoming.length === 0 && noVencidas.length > 0) {
        console.log('⚠️ PROBLEMA PERSISTENTE: Hay facturas pendientes pero la función corregida no las encuentra');
        console.log('📋 Ejemplos de facturas pendientes:');
        noVencidas.slice(0, 3).forEach(inv => {
            console.log(`  - ${inv.NumeroFactura}: ${inv.FechaVencimiento}`);
        });
    } else if (upcoming.length > 0) {
        console.log('✅ CORRECCIÓN EXITOSA: Se encontraron facturas próximas');
        console.log('📋 Facturas próximas encontradas:');
        upcoming.forEach((inv, index) => {
            console.log(`  ${index + 1}. ${inv.NumeroFactura}: ${inv.FechaVencimiento}`);
        });
    }
}

// ===== 7. APLICAR CORRECCIONES AUTOMÁTICAMENTE =====
function aplicarCorrecciones() {
    console.log('🔧 Aplicando correcciones automáticamente...');
    
    // Reemplazar funciones problemáticas
    if (typeof window.getUpcomingInvoices === 'function') {
        window.getUpcomingInvoices = getUpcomingInvoicesFixed;
        console.log('✅ getUpcomingInvoices reemplazada con versión corregida');
    }
    
    if (typeof window.filterInvoicesOptimized === 'function') {
        window.filterInvoicesOptimized = filterInvoicesOptimizedFixed;
        console.log('✅ filterInvoicesOptimized reemplazada con versión corregida');
    }
    
    if (typeof window.loadClientAndInvoices === 'function') {
        window.loadClientAndInvoices = loadClientAndInvoicesFixed;
        console.log('✅ loadClientAndInvoices reemplazada con versión corregida');
    }
    
    if (typeof window.renderPage === 'function') {
        window.renderPage = renderPageFixed;
        console.log('✅ renderPage reemplazada con versión corregida');
    }
    
    if (typeof window.initializeApp === 'function') {
        window.initializeApp = initializeAppFixed;
        console.log('✅ initializeApp reemplazada con versión corregida');
    }
    
    console.log('✅ Todas las correcciones aplicadas');
}

// ===== EXPONER FUNCIONES GLOBALMENTE =====
window.getUpcomingInvoicesFixed = getUpcomingInvoicesFixed;
window.filterInvoicesOptimizedFixed = filterInvoicesOptimizedFixed;
window.loadClientAndInvoicesFixed = loadClientAndInvoicesFixed;
window.renderPageFixed = renderPageFixed;
window.initializeAppFixed = initializeAppFixed;
window.verificarCorrecciones = verificarCorrecciones;
window.aplicarCorrecciones = aplicarCorrecciones;

// Aplicar correcciones automáticamente al cargar
aplicarCorrecciones();

console.log('✅ Correcciones de carga asíncrona aplicadas - Usa verificarCorrecciones() para verificar');
