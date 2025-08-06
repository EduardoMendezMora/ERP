# Sistema de Pagos Manuales

## Descripción General

El sistema de pagos manuales permite crear, editar, eliminar y asignar pagos que no provienen de transacciones bancarias automáticas. Estos pagos se almacenan en la hoja "PagosManuales" de Google Sheets y se integran completamente con el sistema de asignación de pagos existente.

## Estructura de Datos

### Hoja: PagosManuales

La hoja utiliza la siguiente estructura de columnas:

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **Fecha** | Date | Fecha del pago (se selecciona) | 2025-01-15 |
| **Referencia** | Text | Número de referencia de fuente externa | PAGO-MANUAL-001 |
| **Descripción** | Text | Descripción del pago (se anota o toma desde la fuente) | Pago en efectivo |
| **Créditos** | Number | Monto que se recibe originalmente | 50000 |
| **Observaciones** | Text | Observaciones que coloca el usuario | Pago realizado en oficina |
| **ID_Cliente** | Text | ID del cliente (cuando se asigna) | 401380887 |
| **FacturasAsignadas** | Text | Números de facturas asignadas (cuando se asigna) | FAC-27896 |
| **FechaAsignacion** | Date | Fecha de asignación a facturas | 2025-01-16 |
| **Disponible** | Number | Monto disponible para asignar | 25000 |

## Funcionalidades

### 1. Crear Pago Manual

**Ubicación**: Página de facturas (`facturas.html`) → Sección "Acciones Rápidas" → Botón "💰 Crear Pago Manual"

**Campos requeridos**:
- **Referencia**: Identificador único del pago
- **Monto**: Cantidad en colones
- **Fecha de Pago**: Cuándo se realizó el pago

**Campos opcionales**:
- **Descripción**: Información adicional del pago
- **Observaciones**: Comentarios del usuario

### 2. Editar Pago Manual

**Acceso**: Desde las tarjetas de pagos manuales → Botón "✏️ Editar"

**Campos editables**:
- Referencia
- Monto
- Fecha de Pago
- Descripción
- Observaciones

### 3. Eliminar Pago Manual

**Acceso**: Desde las tarjetas de pagos manuales → Botón "🗑️ Eliminar"

**Confirmación**: Modal de confirmación que muestra los detalles del pago a eliminar.

### 4. Asignar Pago Manual a Facturas

**Proceso**:
1. Los pagos manuales aparecen en "Pagos Sin Asignar"
2. Se pueden asignar usando el sistema de asignación existente
3. Al asignarse, se mueven a "Pagos Aplicados"
4. Se actualiza el campo `Disponible` automáticamente

## Integración con el Sistema

### Visualización

Los pagos manuales se muestran con:
- **Tarjeta especial**: Borde azul (`#17a2b8`) para distinguirlos de pagos bancarios
- **Badge**: "💰 Manual" para identificación rápida
- **Sección**: Aparecen tanto en "Pagos Sin Asignar" como en "Pagos Aplicados"

### Asignación

El sistema de asignación maneja tanto pagos bancarios como manuales:
- **Pagos bancarios**: Usan las hojas BN, BAC, HuberBN, etc.
- **Pagos manuales**: Usan la hoja "PagosManuales"
- **Interfaz unificada**: Mismo modal de asignación para ambos tipos

### Cálculos

- **Monto disponible**: Se calcula como `Créditos - Monto asignado`
- **Validaciones**: Verifica que haya suficiente monto disponible antes de asignar
- **Actualización automática**: Los campos se actualizan en tiempo real

## Archivos del Sistema

### 1. `manual-payments.js`
**Funciones principales**:
- `createManualPayment()`: Crear nuevo pago
- `updateManualPayment()`: Actualizar pago existente
- `deleteManualPayment()`: Eliminar pago
- `loadManualPayments()`: Cargar pagos desde API
- `renderManualPayments()`: Renderizar en la interfaz
- `assignManualPaymentToInvoice()`: Asignar a factura

### 2. `facturas.html`
**Elementos agregados**:
- Botón "💰 Crear Pago Manual" en Acciones Rápidas
- Modal de creación de pago manual
- Modal de edición de pago manual
- Modal de eliminación de pago manual

### 3. `main.js`
**Integración**:
- Carga de pagos manuales en `initializeApp()`
- Renderizado en `renderPage()`
- Integración en sistema de asignación

### 4. `styles.css`
**Estilos especiales**:
- `.manual-payment`: Estilo para tarjetas de pagos manuales
- `.manual-payment-badge`: Badge identificador
- Colores y efectos visuales distintivos

## Flujo de Trabajo

### Crear un Pago Manual

1. **Navegar** a la página de facturas de un cliente
2. **Hacer clic** en "💰 Crear Pago Manual"
3. **Completar** los campos del formulario:
   - Referencia (automática o manual)
   - Monto en colones
   - Fecha de pago
   - Descripción (opcional)
   - Observaciones (opcional)
4. **Guardar** el pago
5. **Verificar** que aparece en "Pagos Sin Asignar"

### Asignar a Facturas

1. **Seleccionar** una factura pendiente
2. **Hacer clic** en "Asignar Pago"
3. **Elegir** el pago manual de la lista
4. **Confirmar** la asignación
5. **Verificar** que el pago se mueve a "Pagos Aplicados"

## Validaciones

### Al Crear
- Referencia obligatoria y única
- Monto mayor a cero
- Fecha válida

### Al Editar
- Mismos campos que al crear
- No permite editar pagos ya asignados completamente

### Al Asignar
- Verifica monto disponible
- Actualiza automáticamente el estado de la factura
- Recalcula montos disponibles

## Mensajes de Error

- **"Pago manual no encontrado"**: Error al buscar pago en la base de datos
- **"Monto insuficiente"**: No hay suficiente saldo disponible
- **"Factura no encontrada"**: Error al buscar la factura objetivo
- **"Error al crear pago manual"**: Problema de conexión o validación

## Consideraciones Técnicas

### API Integration
- Usa la misma API de SheetDB que los pagos bancarios
- Especifica `sheet=PagosManuales` en las consultas
- Maneja errores de red y validación

### Rendimiento
- Carga pagos manuales junto con pagos bancarios
- Renderizado eficiente con filtros por cliente
- Actualización incremental de datos

### Compatibilidad
- Funciona con el sistema de asignación existente
- Mantiene consistencia con pagos bancarios
- No afecta funcionalidades existentes

## Pruebas

Para verificar que el sistema funciona correctamente:

1. **Ejecutar** el script `test-manual-payments-structure.js`
2. **Verificar** que todos los campos están presentes
3. **Probar** la creación de un pago manual
4. **Comprobar** la asignación a facturas
5. **Validar** que los cálculos son correctos

## Mantenimiento

### Limpieza de Datos
- Los pagos manuales se mantienen por cliente
- Se pueden eliminar individualmente
- No hay limpieza automática

### Backup
- Los datos se almacenan en Google Sheets
- Se recomienda backup regular de la hoja "PagosManuales"
- Los cambios son reversibles manualmente

## Futuras Mejoras

- **Historial de cambios**: Registrar modificaciones a pagos
- **Búsqueda avanzada**: Filtrar por fecha, monto, descripción
- **Reportes**: Exportar pagos manuales a PDF/Excel
- **Notificaciones**: Alertas cuando se asignan pagos manuales 