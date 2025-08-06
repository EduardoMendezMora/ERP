# Sistema de Pagos Manuales

## 📋 Descripción General

El sistema de pagos manuales permite crear, editar, eliminar y asignar pagos que NO provienen de conciliación bancaria. Estos pagos se almacenan en la hoja "PagosManuales" y funcionan de manera similar a los pagos bancarios existentes.

## 🎯 Funcionalidades Implementadas

### ✅ **Crear Pagos Manuales**
- Modal para crear nuevos pagos manuales
- Campos: Referencia, Monto, Fecha, Descripción (opcional)
- Generación automática de referencia única
- Validación de campos requeridos

### ✅ **Editar Pagos Manuales**
- Modal para modificar pagos existentes
- Actualización de todos los campos
- Validación de datos

### ✅ **Eliminar Pagos Manuales**
- Modal de confirmación
- Eliminación segura con validación
- Limpieza de asignaciones

### ✅ **Asignar a Facturas**
- Integración con sistema de asignación existente
- Aparecen en "Pagos Sin Asignar" cuando están disponibles
- Se mueven a "Pagos Aplicados" cuando se asignan
- Actualización automática del estado de facturas

## 🏗️ Arquitectura del Sistema

### **Archivos Principales**

1. **`facturas.html`** - Modales HTML y botón de acción
2. **`manual-payments.js`** - Lógica principal del sistema
3. **`main.js`** - Integración con sistema existente
4. **`styles.css`** - Estilos específicos para pagos manuales

### **Estructura de Datos**

```javascript
// Pago Manual
{
    Referencia: "PAGO-MANUAL-1234567890",
    Monto: 125000,
    Fecha: "2025-01-15",
    Descripcion: "Pago en efectivo",
    ID_Cliente: "401380887",
    Disponible: 125000, // Monto disponible para asignar
    FacturasAsignadas: "", // Facturas asignadas
    FechaAsignacion: "", // Fecha de asignación
    TipoPago: "Manual",
    Assignments: "[]" // JSON de asignaciones
}
```

## 🔧 Funciones Principales

### **Gestión de Pagos**
- `createManualPayment()` - Crear nuevo pago
- `updateManualPayment()` - Actualizar pago existente
- `deleteManualPayment()` - Eliminar pago
- `loadManualPayments()` - Cargar pagos desde API

### **Renderizado**
- `renderManualPayments()` - Renderizar en interfaz
- `renderUnassignedManualPayments()` - Pagos sin asignar
- `renderAssignedManualPayments()` - Pagos asignados

### **Asignación**
- `assignManualPaymentToInvoice()` - Asignar a factura
- Integración con `openAssignInvoiceModal()`

## 🎨 Interfaz de Usuario

### **Botón de Acción**
- Ubicado en sección "Quick Actions"
- Color azul (#17a2b8) para distinguirlo
- Texto: "💰 Crear Pago Manual"

### **Modales**
1. **Modal de Creación** - Formulario para nuevo pago
2. **Modal de Edición** - Modificar pago existente
3. **Modal de Eliminación** - Confirmación de eliminación

### **Tarjetas de Pago**
- Borde izquierdo azul (#17a2b8)
- Badge "💰 Pago Manual"
- Botones: Asignar, Editar, Eliminar
- Estado visual diferente cuando está asignado

## 🔄 Flujo de Trabajo

### **1. Crear Pago Manual**
```
Usuario → Botón "Crear Pago Manual" → Modal → Llenar formulario → 
API POST → Recargar datos → Renderizar → Mensaje de éxito
```

### **2. Asignar a Factura**
```
Pago Manual → Botón "Asignar" → Modal de asignación → 
Seleccionar factura → Confirmar → Actualizar ambos → 
Mover a "Pagos Aplicados"
```

### **3. Editar Pago**
```
Pago Manual → Botón "Editar" → Modal → Modificar campos → 
API PATCH → Recargar datos → Renderizar
```

### **4. Eliminar Pago**
```
Pago Manual → Botón "Eliminar" → Modal confirmación → 
API DELETE → Recargar datos → Renderizar
```

## 🔗 Integración con Sistema Existente

### **Carga de Datos**
- Se carga junto con pagos bancarios en `initializeApp()`
- Se renderiza en `renderPage()`
- Se integra con sistema de búsqueda existente

### **Asignación**
- Aparece en modal de asignación de facturas
- Usa misma lógica que pagos bancarios
- Actualiza estado de facturas automáticamente

### **Estados**
- **Sin Asignar**: En sección "Pagos Sin Asignar"
- **Asignado**: En sección "Pagos Aplicados"
- **Disponible**: Monto restante para asignar

## 🛡️ Validaciones y Seguridad

### **Validaciones de Entrada**
- Referencia requerida y única
- Monto mayor a cero
- Fecha válida
- Cliente válido

### **Validaciones de Asignación**
- Monto disponible suficiente
- Factura existe y está pendiente
- No asignación duplicada

### **Manejo de Errores**
- Try-catch en todas las operaciones
- Mensajes de error descriptivos
- Restauración de estado en caso de fallo

## 📊 API Endpoints

### **Base URL**: `API_CONFIG.PAYMENTS`

- **POST** `/` - Crear pago manual
- **PATCH** `/Referencia/{ref}?sheet=PagosManuales` - Actualizar
- **DELETE** `/Referencia/{ref}?sheet=PagosManuales` - Eliminar
- **GET** `/?sheet=PagosManuales` - Obtener todos

## 🎯 Casos de Uso

### **Escenario 1: Pago en Efectivo**
1. Cliente paga en efectivo
2. Usuario crea pago manual
3. Asigna a factura específica
4. Sistema marca factura como pagada

### **Escenario 2: Pago Parcial**
1. Cliente paga parte de una factura
2. Usuario crea pago manual por el monto
3. Asigna a factura
4. Monto disponible se reduce
5. Factura queda parcialmente pagada

### **Escenario 3: Corrección de Pago**
1. Usuario detecta error en pago bancario
2. Crea pago manual para corregir
3. Asigna a factura correcta
4. Sistema actualiza estados

## 🧪 Pruebas

### **Script de Prueba**
- `test-manual-payments.js` - Verificación de funcionalidad
- Simula creación, asignación y actualización
- Valida funciones disponibles

### **Pruebas Manuales Recomendadas**
1. Crear pago manual con diferentes montos
2. Asignar a facturas de diferentes estados
3. Editar pagos existentes
4. Eliminar pagos con y sin asignaciones
5. Verificar integración con búsqueda

## 🔧 Configuración

### **Variables Globales**
```javascript
let manualPayments = []; // Array de pagos manuales
let currentEditingManualPayment = null; // Pago en edición
let currentDeletingManualPayment = null; // Pago a eliminar
```

### **Configuración de API**
- Usa `API_CONFIG.PAYMENTS` existente
- Hoja específica: "PagosManuales"
- Misma estructura que pagos bancarios

## 📝 Notas de Implementación

### **Compatibilidad**
- Funciona con sistema existente sin conflictos
- Usa mismas funciones de utilidad (`parseAmount`, `formatDateForDisplay`, etc.)
- Integra con sistema de notificaciones existente

### **Rendimiento**
- Carga asíncrona de datos
- Renderizado eficiente
- Actualización incremental

### **Mantenibilidad**
- Código modular y bien documentado
- Separación clara de responsabilidades
- Fácil extensión para nuevas funcionalidades

## 🚀 Próximas Mejoras

### **Funcionalidades Futuras**
- Exportación de reportes de pagos manuales
- Historial de cambios
- Notificaciones automáticas
- Integración con WhatsApp para confirmaciones

### **Optimizaciones**
- Cache de datos locales
- Validación en tiempo real
- Autocompletado de referencias
- Plantillas de pagos frecuentes

---

**✅ Sistema implementado y funcional**
**📅 Fecha de implementación**: Enero 2025
**👨‍💻 Desarrollado por**: Asistente AI 