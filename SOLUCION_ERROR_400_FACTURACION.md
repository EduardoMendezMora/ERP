# Solución para Error 400 en Proceso de Facturación

## 🔍 Análisis del Problema

El error `400 (Bad Request)` en el proceso de facturación indica que la API de SheetDB está rechazando los datos enviados. Esto puede deberse a varios factores:

### Posibles Causas Identificadas:

1. **Validación de fechas demasiado estricta**: La función `parseDate` requiere `year >= 2025`
2. **Tipos de datos incorrectos**: Algunos campos podrían estar enviando tipos de datos no esperados
3. **Estructura de datos incompleta**: Faltan campos requeridos por la API
4. **Formato de datos incorrecto**: La API espera un formato específico

## 🛠️ Solución Paso a Paso

### Paso 1: Diagnosticar el Problema

1. **Abrir la consola del navegador** en `clientes.html`
2. **Cargar el script de debug**:
   ```javascript
   // Copiar y pegar el contenido de debug-billing-issue.js en la consola
   ```

3. **Ejecutar el debug** con el ID del cliente que está fallando:
   ```javascript
   runBillingDebug(ID_DEL_CLIENTE);
   ```

### Paso 2: Verificar la API

1. **Cargar el script de test**:
   ```javascript
   // Copiar y pegar el contenido de test-api-endpoint.js en la consola
   ```

2. **Ejecutar tests completos**:
   ```javascript
   runTest("all");
   ```

### Paso 3: Aplicar el Fix

1. **Cargar las funciones corregidas**:
   ```javascript
   // Copiar y pegar el contenido de fix-billing-400-error.js en la consola
   ```

2. **Reemplazar la función original**:
   - Las nuevas funciones tienen el sufijo `Fixed`
   - Usar `billClient` corregida en lugar de la original

## 🔧 Funciones Corregidas

### Principales Mejoras:

1. **Validación de fechas más flexible**:
   - Cambio de `year >= 2025` a `year >= 2000`
   - Mejor manejo de formatos de fecha

2. **Tipos de datos consistentes**:
   - Todos los campos numéricos se convierten a string
   - Validación de tipos antes del envío

3. **Validación completa de datos**:
   - Verificación de campos requeridos
   - Validación de montos válidos

4. **Mejor logging y debugging**:
   - Logs detallados en cada paso
   - Información clara de errores

## 📋 Estructura de Datos Esperada

La API espera los siguientes campos con estos tipos:

```javascript
{
    ID_Cliente: "string",
    NumeroFactura: "string",
    SemanaNumero: "string",
    SemanaDescripcion: "string",
    FechaVencimiento: "DD/MM/YYYY",
    MontoBase: "string",
    DiasAtraso: "string",
    MontoMultas: "string",
    MontoTotal: "string",
    Estado: "string",
    FechaCreacion: "DD/MM/YYYY",
    FechaPago: "string",
    Observaciones: "string"
}
```

## 🚀 Instrucciones de Uso

### Para Aplicar el Fix Temporalmente:

1. Abrir `clientes.html` en el navegador
2. Abrir la consola del desarrollador (F12)
3. Copiar y pegar el contenido de `fix-billing-400-error.js`
4. Intentar facturar el cliente nuevamente

### Para Aplicar el Fix Permanentemente:

1. Abrir `clientes.html` en el editor
2. Buscar la función `billClient` (alrededor de la línea 1500)
3. Reemplazar con la versión corregida del archivo `fix-billing-400-error.js`
4. Buscar y reemplazar las funciones auxiliares:
   - `parseDate` → `parseDateFixed`
   - `parseAmount` → `parseAmountFixed`
   - `generateInvoicesForClient` → `generateInvoicesForClientFixed`

## 🔍 Verificación

Después de aplicar el fix:

1. **Verificar en consola** que no hay errores
2. **Intentar facturar** un cliente de prueba
3. **Confirmar** que las facturas se crean correctamente
4. **Verificar** que aparecen en la hoja de Google Sheets

## 📞 Soporte

Si el problema persiste después de aplicar el fix:

1. Ejecutar `runBillingDebug(ID_CLIENTE)` y compartir los logs
2. Ejecutar `runTest("all")` y compartir los resultados
3. Verificar que la API de SheetDB esté funcionando correctamente

## 🎯 Resultado Esperado

- ✅ Eliminación del error 400
- ✅ Facturas generadas correctamente
- ✅ Datos consistentes en Google Sheets
- ✅ Proceso de facturación estable

---

**Nota**: Este fix es compatible con la estructura actual del sistema y mantiene toda la funcionalidad existente mientras corrige los problemas de validación y formato de datos.
