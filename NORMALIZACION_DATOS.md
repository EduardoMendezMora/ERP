# Normalización de Datos - Adaptación Frontend

## Resumen de Cambios

Este documento describe los cambios realizados para adaptar el frontend del sistema ERP a la nueva normalización de datos implementada en el backend.

## Cambio Principal

**Antes**: Los montos de transacciones (`Créditos`) se recibían como strings con formato variado:
- `"60.000,00"` (formato latino)
- `"1,000,000.00"` (formato inglés)
- `"105.000.00"` (formato BAC)

**Después**: Los montos se reciben como números float directamente:
- `60000.00`
- `1000000.00`
- `105000.00`

## Script de Backend

El script de Google Apps Script `normalizarNumerosHojas()` se ejecuta cada 5 minutos y convierte todos los valores de la columna D (Créditos) en las hojas:
- BN
- BAC
- HuberBN
- AutosubastasBAC
- AutosubastasBN

## Archivos Modificados

### 1. `utils.js`
- **Nueva función**: `parseFloatAmount(amount)` - Maneja float numbers directamente
- **Función actualizada**: `parsePaymentAmount(paymentAmount, bankSource)` - Ahora detecta si el valor ya es un número y lo retorna directamente

### 2. `main.js`
- **Corrección**: Reemplazado `parsePaymentAmountByBank` (función inexistente) por `parsePaymentAmount`
- **Mejora**: Todas las referencias a parsing de montos ahora usan la función correcta

### 3. `capturas.js`
- **Función actualizada**: `parsePaymentAmount(paymentAmount, bankSource)` - Agregada detección de float numbers

### 4. `debug-transaction.js`
- **Corrección**: Reemplazado `parsePaymentAmountByBank` por `parsePaymentAmount`

### 5. `transacciones.html`
- **Método actualizado**: `parseAmount(amountStr)` - Detecta float numbers directamente
- **Método actualizado**: `formatAmount(amount)` - Maneja float numbers para formateo

## Beneficios de la Normalización

1. **Mejor Rendimiento**: No se necesita parsing de strings en cada operación
2. **Mayor Precisión**: Eliminación de errores de redondeo por parsing
3. **Consistencia**: Formato uniforme en toda la aplicación
4. **Mantenibilidad**: Código más simple y menos propenso a errores

## Compatibilidad

Los cambios mantienen compatibilidad hacia atrás:
- Si se recibe un string, se usa la lógica de parsing existente
- Si se recibe un float, se usa directamente
- Esto permite una transición gradual sin interrumpir el funcionamiento

## Funciones Principales

### `parseFloatAmount(amount)`
```javascript
// Nueva función optimizada para float numbers
function parseFloatAmount(amount) {
    if (amount === null || amount === undefined || amount === '') return 0;
    
    // Si ya es un número, retornarlo directamente
    if (typeof amount === 'number') {
        return amount;
    }
    
    // Si es string, intentar parsearlo como float
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
}
```

### `parsePaymentAmount(paymentAmount, bankSource)`
```javascript
// Función actualizada con detección de float numbers
function parsePaymentAmount(paymentAmount, bankSource) {
    if (!paymentAmount) return 0;

    // Si ya es un número (float), retornarlo directamente
    if (typeof paymentAmount === 'number') {
        return paymentAmount;
    }

    // Si es string, usar la lógica de parseo existente para compatibilidad
    // ... resto de la lógica existente
}
```

## Verificación de Cambios

Para verificar que los cambios funcionan correctamente:

1. **Consola del navegador**: Verificar que no hay errores de JavaScript
2. **Transacciones**: Confirmar que los montos se muestran correctamente
3. **Cálculos**: Verificar que las sumas y restas de montos son precisas
4. **Formateo**: Confirmar que los números se formatean correctamente en la UI

## Notas Importantes

- Los cambios son **compatibles hacia atrás** - el sistema seguirá funcionando con datos antiguos
- La normalización del backend es **automática** cada 5 minutos
- No se requiere reinicio del frontend después de la normalización
- Los cálculos de saldo disponible ahora son más precisos

## Próximos Pasos

1. Monitorear el funcionamiento después de la normalización
2. Verificar que todas las operaciones de montos funcionan correctamente
3. Considerar optimizaciones adicionales una vez que todos los datos estén normalizados 