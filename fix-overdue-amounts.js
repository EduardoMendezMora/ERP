// Script para corregir el problema de montos en facturas vencidas
// Ejecutar en la consola del navegador en facturasVencidas.html

console.log('🔧 Aplicando fix para montos en facturas vencidas...');

// Función mejorada para parsear montos en formato Float
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

// Función mejorada para formatear números
function formatNumberFixed(number) {
    if (number === null || number === undefined || isNaN(number)) {
        return '0';
    }
    
    // Convertir a número si es string
    const num = typeof number === 'string' ? parseFloat(number.replace(/[^\d.,]/g, '').replace(',', '.')) : parseFloat(number);
    
    if (isNaN(num)) {
        return '0';
    }
    
    return new Intl.NumberFormat('es-CR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}

// Función mejorada para calcular multas
function calculateFineFixed(invoice) {
    const daysOverdue = getDaysOverdue(invoice);
    const baseAmount = parseAmountFixed(invoice.MontoBase || 0);
    
    if (daysOverdue <= 0) return 0;
    
    if (daysOverdue > 30) {
        return baseAmount * 0.10;
    }
    
    if (daysOverdue > 7) {
        return baseAmount * 0.05;
    }
    
    return 0;
}

// Función para re-renderizar las facturas con los montos corregidos
function reRenderOverdueInvoices() {
    const container = document.getElementById('overdueInvoices');
    const countElement = document.getElementById('overdueCount');
    
    if (!container || !countElement) {
        console.error('❌ No se encontraron elementos necesarios');
        return;
    }
    
    if (filteredInvoices.length === 0) {
        container.innerHTML = '';
        countElement.textContent = '0';
        return;
    }
    
    countElement.textContent = filteredInvoices.length;
    
    const sortedInvoices = filteredInvoices.sort((a, b) => {
        const daysA = getDaysOverdue(a);
        const daysB = getDaysOverdue(b);
        return daysB - daysA;
    });
    
    container.innerHTML = sortedInvoices.map(invoice => {
        const client = allClients.find(c => c.ID.toString() === invoice.ID_Cliente.toString());
        const daysOverdue = getDaysOverdue(invoice);
        const baseAmount = parseAmountFixed(invoice.MontoBase || 0);
        const fineAmount = calculateFineFixed(invoice);
        const totalAmount = baseAmount + fineAmount;
        
        console.log(`🔍 Factura ${invoice.NumeroFactura}:`, {
            montoOriginal: invoice.MontoBase,
            montoParseado: baseAmount,
            multa: fineAmount,
            total: totalAmount
        });
        
        return `
            <div class="invoice-card overdue-card">
                <div class="invoice-header">
                    <div class="invoice-number">${invoice.NumeroFactura}</div>
                    <div class="invoice-status overdue">${daysOverdue} días vencida</div>
                </div>
                
                <div class="invoice-client">
                    <strong>${client ? client.Nombre : 'Cliente no encontrado'}</strong>
                </div>
                
                <div class="invoice-description">
                    ${invoice.SemanaDescripcion || 'Sin descripción'}
                </div>
                
                <div class="invoice-dates">
                    <div class="date-item">
                        <span class="date-label">Vence:</span>
                        <span class="date-value">${formatDate(invoice.FechaVencimiento)}</span>
                    </div>
                </div>
                
                <div class="invoice-amounts">
                    <div class="amount-item">
                        <span class="amount-label">Base:</span>
                        <span class="amount-value">₡${formatNumberFixed(baseAmount)}</span>
                    </div>
                    <div class="amount-item fine">
                        <span class="amount-label">Multa:</span>
                        <span class="amount-value">₡${formatNumberFixed(fineAmount)}</span>
                    </div>
                    <div class="amount-item total">
                        <span class="amount-label">Total:</span>
                        <span class="amount-value">₡${formatNumberFixed(totalAmount)}</span>
                    </div>
                </div>
                
                <div class="invoice-actions">
                    <button class="btn-action" onclick="markAsPaid('${invoice.NumeroFactura}')">
                        ✅ Pagar
                    </button>
                    <button class="btn-action" onclick="editInvoice('${invoice.NumeroFactura}')">
                        ✏️ Editar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Función para aplicar el fix
function applyAmountFix() {
    console.log('🔧 Aplicando corrección de montos...');
    
    // Reemplazar las funciones globales
    window.parseAmount = parseAmountFixed;
    window.formatNumber = formatNumberFixed;
    window.calculateFine = calculateFineFixed;
    
    // Re-renderizar las facturas
    reRenderOverdueInvoices();
    
    console.log('✅ Fix aplicado correctamente');
    console.log('📊 Ahora los montos deberían mostrarse correctamente en formato ₡');
}

// Función para verificar el estado actual
function checkCurrentAmounts() {
    console.log('🔍 Verificando montos actuales...');
    
    if (!filteredInvoices || filteredInvoices.length === 0) {
        console.log('❌ No hay facturas vencidas para verificar');
        return;
    }
    
    filteredInvoices.slice(0, 3).forEach((invoice, index) => {
        const originalAmount = invoice.MontoBase;
        const parsedAmount = parseAmountFixed(originalAmount);
        const fineAmount = calculateFineFixed(invoice);
        const totalAmount = parsedAmount + fineAmount;
        
        console.log(`📄 Factura ${index + 1} (${invoice.NumeroFactura}):`);
        console.log(`  - Monto original: "${originalAmount}"`);
        console.log(`  - Monto parseado: ${parsedAmount}`);
        console.log(`  - Multa: ${fineAmount}`);
        console.log(`  - Total: ${totalAmount}`);
        console.log(`  - Formateado: ₡${formatNumberFixed(totalAmount)}`);
        console.log('');
    });
}

console.log('✅ Script de corrección cargado');
console.log('📝 Para aplicar el fix: applyAmountFix()');
console.log('📝 Para verificar montos: checkCurrentAmounts()');
