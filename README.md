# ERP

## Autenticación por OTP (WhatsApp) en Netlify

Este proyecto usa funciones serverless de Netlify para enviar y validar códigos OTP por WhatsApp usando UltraMSG. El frontend nunca expone el `instanceId` ni el `token`.

Rutas:
- `/.netlify/functions/request-otp` (POST): recibe `{ vendorId }`, busca el teléfono del usuario en SheetDB y envía el código por WhatsApp.
- `/.netlify/functions/verify-otp` (POST): recibe `{ vendorId, code, otpSession }` y valida el código de forma stateless.

Variables de entorno (Netlify > Site settings > Environment):
- `ULTRAMSG_INSTANCE_ID` → ID de instancia UltraMSG (p.ej. `instance112077`)
- `ULTRAMSG_TOKEN` → Token de UltraMSG (no exponer en el frontend)
- `OTP_SECRET_SESSION` → Secreto para firmar la sesión OTP (valor alfanumérico largo)
- `OTP_SECRET_CODE` → Secreto para hashear/verificar el código OTP (valor alfanumérico largo)

Estructura de funciones:
- `netlify/functions/request-otp.js`
- `netlify/functions/verify-otp.js`

Notas:
- El código OTP actual es de 4 dígitos para compatibilidad con la UI. Se puede subir a 6 dígitos ampliando el UI.
- Reintentos: el botón “Reenviar” se habilita cada 60s en el cliente.
- Expiración: 5 minutos.

Despliegue:
1. Configura las variables de entorno anteriores en Netlify.
2. Despliega normalmente. Las funciones estarán disponibles bajo `/.netlify/functions/*`.
3. Prueba el flujo en `login.html` ingresando el ID de vendedor y verificando el OTP recibido por WhatsApp.
