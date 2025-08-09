// Fix para el error 400 en el proceso de facturación
// Reemplazar la función billClient en clientes.html

async function billClient(clientId) {
    console.log('🔧 Iniciando facturación con fix para error 400...');
    
    const client = clients.find(c => c.ID.toString() === clientId.toString());
    if (!client) {
        showToast('Cliente no encontrado', 'error');
        return;
    }

    // Validar datos requeridos
    if (!client.fechaContrato || !client.montoContrato || !client.plazoContrato) {
        showToast('Datos del contrato incompletos', 'error');
        return;
    }

    // Deshabilitar botón mientras procesa
    const billBtn = document.getElementById(`billBtn-${clientId}`);
    if (billBtn) {
        billBtn.disabled = true;
        billBtn.textContent = '⏳ Facturando...';
    }

    try {
        console.log('📋 Datos del cliente para facturación:');
        console.log('  - ID:', client.ID);
        console.log('  - Nombre:', client.Nombre);
        console.log('  - Fecha Contrato:', client.fechaContrato);
        console.log('  - Monto Contrato:', client.montoContrato);
        console.log('  - Plazo Contrato:', client.plazoContrato);
        console.log('  - Día Pago:', client.diaPago);

        const invoicesData = generateInvoicesForClientFixed(client);
        
        console.log('📄 Facturas generadas:', invoicesData.length);
        console.log('📄 Primera factura de ejemplo:', invoicesData[0]);
        
        // Validar que todas las facturas tengan los campos requeridos
        const validationErrors = validateInvoicesData(invoicesData);
        if (validationErrors.length > 0) {
            console.error('❌ Errores de validación:', validationErrors);
            throw new Error('Datos de facturación inválidos: ' + validationErrors.join(', '));
        }
        
        // Enviar todas las facturas en lote
        console.log('📡 Enviando facturas a la API...');
        const response = await fetch(`${API_URL_INVOICES}?sheet=Facturas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(invoicesData)
        });

        console.log('📡 Respuesta de la API:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error de la API:', errorText);
            throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Respuesta exitosa:', result);

        // Recargar facturas y actualizar vista
        await loadInvoices();
        renderClients(clients);
        updateStats();
        
        // Redirigir automáticamente a la página de facturas
        showToast(`✅ Cliente facturado exitosamente: ${invoicesData.length} facturas generadas. Redirigiendo a facturas...`, 'success');
        
        // Mostrar contador regresivo y redirigir
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

// Función mejorada para generar facturas
function generateInvoicesForClientFixed(client) {
    const invoicesData = [];
    
    // Parsear fecha con validación mejorada
    const signDate = parseDateFixed(client.fechaContrato);
    if (!signDate) {
        throw new Error(`No se pudo parsear la fecha del contrato: ${client.fechaContrato}`);
    }
    
    const contractStartDate = new Date(signDate);
    contractStartDate.setDate(signDate.getDate() + 1); // Contrato inicia un día después
    
    console.log(`📅 Fecha de firma: ${client.fechaContrato}`);
    console.log(`📅 Fecha de inicio contrato: ${formatDateForDB(contractStartDate)}`);
    
    // Parsear monto con validación
    const weeklyAmount = parseAmountFixed(client.montoContrato);
    if (weeklyAmount <= 0) {
        throw new Error(`Monto del contrato inválido: ${client.montoContrato}`);
    }
    
    const totalWeeks = parseInt(client.plazoContrato);
    if (totalWeeks <= 0 || isNaN(totalWeeks)) {
        throw new Error(`Plazo del contrato inválido: ${client.plazoContrato}`);
    }
    
    const paymentDay = client.diaPago || '1'; // Valor por defecto
    
    // Obtener el último número de factura para generar consecutivos
    let lastInvoiceNumber = 0;
    invoices.forEach(inv => {
        if (inv.NumeroFactura && inv.NumeroFactura.startsWith('FAC-')) {
            const num = parseInt(inv.NumeroFactura.split('-')[1]);
            if (num > lastInvoiceNumber) {
                lastInvoiceNumber = num;
            }
        }
    });

    for (let week = 1; week <= totalWeeks; week++) {
        // Calcular fecha de inicio de la semana
        const weekStartDate = new Date(contractStartDate);
        weekStartDate.setDate(contractStartDate.getDate() + (week - 1) * 7);
        
        // Calcular fecha de fin de la semana
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);
        
        // Calcular fecha de vencimiento
        const dueDate = getNextPaymentDateFixed(weekEndDate, paymentDay);
        
        // Generar descripción de la semana
        const weekDescription = generateWeekDescriptionFixed(weekStartDate, weekEndDate);
        
        // Número de factura consecutivo
        lastInvoiceNumber++;
        const invoiceNumber = `FAC-${lastInvoiceNumber.toString().padStart(3, '0')}`;
        
        const invoiceData = {
            ID_Cliente: client.ID.toString(), // Asegurar que sea string
            NumeroFactura: invoiceNumber,
            SemanaNumero: week.toString(), // Asegurar que sea string
            SemanaDescripcion: weekDescription,
            FechaVencimiento: formatDateForStorageFixed(dueDate),
            MontoBase: weeklyAmount.toString(), // Asegurar que sea string
            DiasAtraso: '0', // Asegurar que sea string
            MontoMultas: '0', // Asegurar que sea string
            MontoTotal: weeklyAmount.toString(), // Asegurar que sea string
            Estado: 'Pendiente',
            FechaCreacion: formatDateForStorageFixed(new Date()),
            FechaPago: '', // Campo vacío para facturas nuevas
            Observaciones: `Factura generada automáticamente para ${client.Nombre}`
        };
        
        invoicesData.push(invoiceData);
    }
    
    return invoicesData;
}

// Función mejorada para parsear fechas
function parseDateFixed(dateString) {
    if (!dateString) return null;
    
    // Detectar si es formato DD/MM/YYYY (como viene de Google Sheets)
    if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // JavaScript usa meses 0-11
            const year = parseInt(parts[2]);
            
            // Validación más flexible para el año
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000) {
                return new Date(year, month, day);
            }
        }
    }
    
    // Si es formato YYYY-MM-DD
    if (dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);
            
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000) {
                return new Date(year, month, day);
            }
        }
    }
    
    console.warn('Fecha no reconocida:', dateString);
    return null;
}

// Función mejorada para parsear montos
function parseAmountFixed(amount) {
    if (!amount) return 0;
    
    // Si ya es un número, usarlo directamente
    if (typeof amount === 'number') {
        return amount;
    }
    
    // Convertir a string y limpiar
    const cleanAmount = amount.toString().trim();
    
    // Si está vacío, devolver 0
    if (!cleanAmount) return 0;
    
    // Remover caracteres no numéricos excepto punto y coma
    const numericOnly = cleanAmount.replace(/[^\d.,]/g, '');
    
    // Si no hay números, devolver 0
    if (!numericOnly) return 0;
    
    let result;
    
    if (numericOnly.includes(',')) {
        // Formato: "1.000.000,00" -> 1000000.00
        const normalizedValue = numericOnly.replace(/\./g, '').replace(',', '.');
        result = parseFloat(normalizedValue) || 0;
    } else {
        // Formato: "1000000" o "1.000.000" -> 1000000
        const normalizedValue = numericOnly.replace(/\./g, '');
        result = parseFloat(normalizedValue) || 0;
    }
    
    return result;
}

// Función mejorada para calcular fecha de vencimiento
function getNextPaymentDateFixed(weekEndDate, paymentDay) {
    const dueDate = new Date(weekEndDate);
    dueDate.setDate(weekEndDate.getDate() + 1);
    return dueDate;
}

// Función mejorada para generar descripción de semana
function generateWeekDescriptionFixed(startDate, endDate) {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const startDay = startDate.getDate();
    const startMonth = months[startDate.getMonth()];
    const startYear = startDate.getFullYear();
    
    const endDay = endDate.getDate();
    const endMonth = months[endDate.getMonth()];
    const endYear = endDate.getFullYear();
    
    if (startMonth === endMonth && startYear === endYear) {
        return `Semana del ${startDay} al ${endDay} de ${startMonth} del ${startYear}`;
    } else if (startYear === endYear) {
        return `Semana del ${startDay} de ${startMonth} al ${endDay} de ${endMonth} del ${startYear}`;
    } else {
        return `Semana del ${startDay} de ${startMonth} del ${startYear} al ${endDay} de ${endMonth} del ${endYear}`;
    }
}

// Función mejorada para formatear fechas para almacenamiento
function formatDateForStorageFixed(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`; // DD/MM/YYYY para Google Sheets
}

// Función para validar los datos de las facturas
function validateInvoicesData(invoicesData) {
    const errors = [];
    
    invoicesData.forEach((invoice, index) => {
        const requiredFields = [
            'ID_Cliente', 'NumeroFactura', 'SemanaNumero', 'SemanaDescripcion',
            'FechaVencimiento', 'MontoBase', 'DiasAtraso', 'MontoMultas',
            'MontoTotal', 'Estado', 'FechaCreacion', 'FechaPago', 'Observaciones'
        ];
        
        requiredFields.forEach(field => {
            if (invoice[field] === undefined || invoice[field] === null) {
                errors.push(`Factura ${index + 1}: Campo ${field} está vacío`);
            }
        });
        
        // Validar que los montos sean números válidos
        const amountFields = ['MontoBase', 'MontoTotal'];
        amountFields.forEach(field => {
            const value = parseFloat(invoice[field]);
            if (isNaN(value) || value < 0) {
                errors.push(`Factura ${index + 1}: Campo ${field} tiene valor inválido: ${invoice[field]}`);
            }
        });
    });
    
    return errors;
}

console.log('✅ Fix para error 400 de facturación cargado');
console.log('📝 Para aplicar: copiar y pegar estas funciones en la consola de clientes.html');
