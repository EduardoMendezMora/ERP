# Corrección: Monto Cero en Facturas y Cálculo Correcto de MontoTotal

## Problema Identificado

El sistema ERP tenía dos problemas principales relacionados con la edición de facturas:

1. **No permitía montos de 0**: Tanto en el frontend (HTML `min="1"`) como en el backend (JavaScript `numAmount <= 0`), el sistema impedía establecer un `MontoBase` de 0, lo cual es necesario para casos de negocio específicos (ej: autos que permanecen más de una semana en el taller).

2. **MontoTotal no se actualizaba correctamente**: Al editar una factura, el `MontoTotal` no incluía las multas acumuladas (`MontoMultas`) basadas en los días de atraso.

3. **Estado no se actualizaba automáticamente**: Cuando el `MontoBase` se establecía en 0, el `Estado` de la factura no se cambiaba automáticamente a "Pagado", a pesar de que no hay saldo pendiente.

## Solución Implementada

### 1. Permitir Montos de 0

**Archivos modificados:**
- `facturas.html`
- `facturasVencidas.html`
- `invoice-crud.js`

**Cambios realizados:**
- Cambio de `min="1"` a `min="0"` en los inputs de monto
- Cambio de validación JavaScript de `numAmount <= 0` a `numAmount < 0`

### 2. Cálculo Correcto de MontoTotal

**Archivo modificado:**
- `invoice-crud.js`

**Lógica implementada:**
```javascript
// Calcular multas acumuladas si la factura está vencida
let fines = 0;
let daysOverdue = 0;

if (finalStatus === 'Vencido') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(formattedDueDate);
    dueDateObj.setHours(0, 0, 0, 0);
    
    if (today > dueDateObj) {
        const diffTime = today.getTime() - dueDateObj.getTime();
        daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Solo aplicar multas si no es una factura manual
        const isManualInvoice = currentEditingInvoice.TipoFactura === 'Manual' ||
            currentEditingInvoice.NumeroFactura?.startsWith('MAN-') ||
            currentEditingInvoice.ConceptoManual;
        
        if (!isManualInvoice) {
            fines = daysOverdue * 2000; // ₡2,000 por día
        }
    }
}

const updateData = {
    // ... otros campos ...
    MontoBase: numAmount,
    MontoTotal: numAmount + fines, // Monto base + multas acumuladas
    MontoMultas: fines,
    DiasAtraso: daysOverdue,
    // ... otros campos ...
};
```

### 3. Cambio Automático de Estado

**Archivo modificado:**
- `invoice-crud.js`

**Lógica implementada:**
```javascript
// Si el monto es 0, automáticamente cambiar el estado a "Pagado"
let finalStatus = status;
let finalPaymentDate = paymentDate;

if (numAmount === 0) {
    finalStatus = 'Pagado';
    // Si no hay fecha de pago especificada, usar la fecha actual
    if (!finalPaymentDate) {
        finalPaymentDate = new Date().toISOString().split('T')[0];
    }
    console.log('💰 Monto 0 detectado: Estado cambiado automáticamente a "Pagado"');
}
```

## Beneficios

1. **Flexibilidad de negocio**: Permite ajustar facturas a 0 cuando es necesario (ej: compensaciones por demoras en el taller).

2. **Precisión en cálculos**: El `MontoTotal` ahora refleja correctamente el monto base más las multas acumuladas.

3. **Automatización**: El estado se actualiza automáticamente cuando no hay saldo pendiente, evitando inconsistencias.

4. **Consistencia de datos**: Las multas se calculan y almacenan correctamente en `MontoMultas` y `DiasAtraso`.

## Casos de Uso

### Caso 1: Auto en taller por más de una semana
- **Situación**: Cliente no paga factura por demora en el taller
- **Acción**: Editar factura, establecer `MontoBase` = 0
- **Resultado**: Estado automáticamente cambia a "Pagado", fecha de pago se establece automáticamente

### Caso 2: Factura vencida con multas
- **Situación**: Factura de ₡50,000 vencida por 5 días
- **Acción**: Editar factura, cambiar `MontoBase` a ₡40,000
- **Resultado**: `MontoTotal` = ₡40,000 + (5 × ₡2,000) = ₡50,000

### Caso 3: Compensación por servicio
- **Situación**: Descuento total por mal servicio
- **Acción**: Editar factura, establecer `MontoBase` = 0
- **Resultado**: Estado automáticamente cambia a "Pagado"

## Impacto en el Sistema

### Archivos Afectados
- ✅ `facturas.html` - Input de monto permite 0
- ✅ `facturasVencidas.html` - Input de monto permite 0
- ✅ `invoice-crud.js` - Validación, cálculo de multas y cambio automático de estado

### Archivos NO Afectados
- ❌ `manual-payments.js` - Los pagos manuales de 0 no tienen sentido de negocio

### Validaciones Mantenidas
- ✅ Montos negativos siguen siendo rechazados
- ✅ Fechas de pago requeridas para estado "Pagado"
- ✅ Multas solo aplican a facturas automáticas (no manuales)

## Testing

Se creó el archivo `test-invoice-zero-status.js` que verifica:
- ✅ Monto 0 cambia estado a "Pagado"
- ✅ Fecha de pago se agrega automáticamente si no está especificada
- ✅ Montos positivos mantienen estado original
- ✅ Montos negativos son rechazados
- ✅ Fecha de pago existente se mantiene

## Resultado Final

El sistema ahora permite:
1. **MontoBase = 0** ✅
2. **MontoTotal calculado correctamente** ✅
3. **Estado automático "Pagado" cuando MontoBase = 0** ✅
4. **Cálculo automático de multas** ✅
5. **Fecha de pago automática cuando es necesaria** ✅

Esto resuelve completamente los requerimientos de negocio para el manejo de facturas con monto cero. 