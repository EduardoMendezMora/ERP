# Columna "Disponible" - Nueva Lógica de Transacciones

## Resumen de Cambios

Este documento describe la implementación de la nueva lógica que utiliza la columna "Disponible" para manejar los saldos disponibles de las transacciones de manera más directa y eficiente.

## Problema Resuelto

**Antes**: El sistema calculaba dinámicamente el saldo disponible restando las asignaciones del monto total en cada operación, lo que podía causar inconsistencias y problemas de rendimiento.

**Después**: El sistema utiliza una columna "Disponible" que almacena directamente el saldo disponible de cada transacción, simplificando la lógica y mejorando la precisión.

## Nueva Lógica Implementada

### 1. Prioridad de Cálculo de Saldo Disponible

El sistema ahora sigue esta jerarquía:

1. **PRIORIDAD 1**: Usar columna "Disponible" si existe y tiene valor
2. **PRIORIDAD 2**: Calcular dinámicamente si no hay columna "Disponible"

### 2. Lógica de Filtrado

```javascript
// PRIORIDAD 1: Usar columna "Disponible" si existe
if (transaction.Disponible !== undefined && transaction.Disponible !== null && transaction.Disponible !== '') {
    availableAmount = parseFloat(transaction.Disponible) || 0;
} else {
    // PRIORIDAD 2: Calcular dinámicamente
    const totalAmount = parsePaymentAmount(transaction.Créditos, transaction.banco);
    const assignments = parseAssignedInvoices(transaction.FacturasAsignadas || '');
    const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
    availableAmount = totalAmount - assignedAmount;
}
```

### 3. Gestión de Saldos

- **Inicialización**: Cuando se asigna una transacción parcialmente, se calcula y guarda el saldo disponible
- **Actualización**: Cuando se usa el saldo disponible, se actualiza la columna "Disponible"
- **Agotamiento**: Cuando el saldo se agota completamente, se pone en 0

## Archivos Modificados

### 1. `main.js`
- **`loadTransactionsTab()`**: Modificada para usar columna "Disponible" como prioridad
- **`assignTransactionToInvoice()`**: Implementada completamente para actualizar la columna "Disponible"

### 2. `debug-transaction.js`
- **`debugProblematicTransaction()`**: Actualizada para usar columna "Disponible" en el diagnóstico

### 3. `utils.js`
- **`initializeDisponibleColumn()`**: Nueva función para migrar datos existentes

## Funciones Principales

### `initializeDisponibleColumn()`
```javascript
// Función para inicializar la columna "Disponible" en transacciones existentes
async function initializeDisponibleColumn() {
    // Procesa todas las hojas (BAC, BN, HuberBN)
    // Calcula saldo disponible para transacciones sin columna "Disponible"
    // Actualiza solo transacciones con saldo disponible > 0.01
}
```

### `assignTransactionToInvoice()`
```javascript
// Función completa para asignar transacciones a facturas
async function assignTransactionToInvoice(transactionReference, bank, invoiceNumber, expectedAmount = null) {
    // Busca la transacción en todas las hojas
    // Verifica saldo disponible
    // Actualiza FacturasAsignadas y Disponible
    // Recarga el modal
}
```

## Caso de Uso: Transacción Problemática

**Transacción**: `970873893` del `03/08/2025`
- **Monto Total**: 60,000
- **Asignaciones**: 47,000 (FAC-19511:47000)
- **Saldo Esperado**: 13,000

### Antes (Cálculo Dinámico)
```javascript
const totalAmount = parsePaymentAmount('60.000,00', 'BAC'); // 60000
const assignments = parseAssignedInvoices('FAC-19511:47000'); // [{invoiceNumber: 'FAC-19511', amount: 47000}]
const assignedAmount = 47000;
const availableAmount = 60000 - 47000; // 13000
```

### Después (Columna "Disponible")
```javascript
// Si la columna "Disponible" tiene valor 13000
const availableAmount = parseFloat(transaction.Disponible); // 13000
```

## Beneficios de la Nueva Lógica

1. **Mayor Precisión**: Eliminación de errores de cálculo dinámico
2. **Mejor Rendimiento**: No se necesita recalcular en cada operación
3. **Consistencia**: Valores persistentes en la base de datos
4. **Simplicidad**: Lógica más clara y mantenible
5. **Trazabilidad**: Historial de saldos disponibles

## Migración de Datos

### Inicialización Automática
Para migrar datos existentes, ejecutar en la consola:
```javascript
initializeDisponibleColumn()
```

### Proceso de Migración
1. Lee todas las transacciones de las hojas (BAC, BN, HuberBN)
2. Calcula saldo disponible para transacciones sin columna "Disponible"
3. Actualiza solo transacciones con saldo disponible > 0.01
4. Muestra progreso y estadísticas

## Compatibilidad

La nueva lógica mantiene compatibilidad hacia atrás:
- Si no existe columna "Disponible", usa cálculo dinámico
- Si existe columna "Disponible", la usa como prioridad
- Permite migración gradual sin interrumpir funcionamiento

## Verificación

Para verificar que la nueva lógica funciona:

1. **Consola del navegador**: Ejecutar `debugProblematicTransaction()`
2. **Modal de transacciones**: Verificar que aparecen transacciones con saldo disponible
3. **Asignaciones**: Confirmar que se actualiza la columna "Disponible"
4. **Cálculos**: Verificar que los montos son precisos

## Notas Importantes

- La columna "Disponible" debe ser agregada manualmente a las hojas de Google Sheets
- La inicialización es opcional pero recomendada para datos existentes
- Los nuevos cálculos son más precisos y eficientes
- La transacción problemática (970873893) debería aparecer correctamente con saldo de 13,000

## Próximos Pasos

1. Agregar columna "Disponible" a las hojas de Google Sheets
2. Ejecutar `initializeDisponibleColumn()` para migrar datos existentes
3. Verificar funcionamiento con transacciones problemáticas
4. Monitorear precisión de cálculos en producción 