# Efecto Sticky Solo en Desktop

## Cambios Implementados

### 1. CSS (`styles.css`)

**Antes:**
```css
.client-info {
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.95);
    /* ... otros estilos ... */
}
```

**Después:**
```css
.client-info {
    /* Sticky effect only on desktop */
    position: static;
    /* ... otros estilos ... */
}

/* Desktop-only sticky effect */
@media (min-width: 769px) {
    .client-info {
        position: sticky;
        top: 0;
        z-index: 100;
        backdrop-filter: blur(10px);
        background: rgba(255, 255, 255, 0.95);
    }
}
```

### 2. JavaScript (`facturas.html`)

**Funcionalidades agregadas:**

1. **Detección de dispositivo:**
   - Función `isDesktop()` que verifica si el ancho de pantalla es ≥ 769px
   - Solo aplica el efecto sticky en dispositivos desktop

2. **Logs informativos:**
   - `📱 Dispositivo móvil detectado - efecto sticky deshabilitado`
   - `🖥️ Desktop detectado - aplicando efecto sticky`

3. **Responsive dinámico:**
   - Escucha cambios de tamaño de ventana (`resize`)
   - Habilita/deshabilita el efecto automáticamente al cambiar entre desktop y móvil
   - Logs para cambios de estado: `🖥️ Cambio a desktop` y `📱 Cambio a móvil`

## Comportamiento

### Desktop (≥ 769px)
- ✅ Efecto sticky habilitado
- ✅ La información del cliente se mantiene visible al hacer scroll
- ✅ Efectos visuales (sombra, blur) aplicados

### Móvil (< 769px)
- ❌ Efecto sticky deshabilitado
- ❌ Comportamiento normal (scroll con el contenido)
- ❌ Sin efectos visuales adicionales

## Beneficios

1. **Mejor UX en móvil:** Evita problemas de espacio en pantallas pequeñas
2. **Responsive automático:** Se adapta dinámicamente a cambios de tamaño
3. **Performance:** No ejecuta código innecesario en dispositivos móviles
4. **Debugging:** Logs claros para identificar el comportamiento actual

## Archivos Modificados

- `styles.css`: Media queries para desktop-only sticky
- `facturas.html`: JavaScript con detección de dispositivo y responsive dinámico 