// ===== ACCOUNT STATEMENT FUNCTIONS =====

const ULTRAMSG_TOKEN = 'wp98xs1qrfhqg9ya';
const ULTRAMSG_INSTANCE_ID = 'instance112077';
const ULTRAMSG_API_URL = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat?token=${ULTRAMSG_TOKEN}`;

// Enviar estado de cuenta al cliente por UltraMSG
function sendAccountStatement() {
    const fechaHoy = new Date().toLocaleDateString('es-CR');
    const cliente = window.currentClient || { Nombre: 'NOMBRE CLIENTE', Placa: 'PLACA', Cedula: 'CEDULA' };
    const facturas = window.clientInvoices || [];
    const assignedPayments = window.assignedPayments || [];

    // Filtrar solo facturas pendientes con multas
    const facturasConMultas = facturas.filter(f => f.Estado === 'Pendiente' && f.DiasAtraso > 0);
    if (facturasConMultas.length === 0) {
        alert('No hay facturas pendientes con multas para este cliente.');
        return;
    }

    let totalPendiente = 0;
    let detalleFacturas = facturasConMultas.map(f => {
        const diasAtraso = f.DiasAtraso || 0;
        // CORREGIDO: Usar parseAmount en lugar de parseFloat
        const saldo = parseAmount(f.MontoBase || 0);
        const multa = parseAmount(f.MontoMultas || 0);
        
        // Buscar pagos aplicados a esta factura
        const pagosAplicados = assignedPayments.reduce((sum, p) => {
            if (p.Assignments && Array.isArray(p.Assignments)) {
                return sum + p.Assignments
                    .filter(a => a.invoiceNumber == f.NumeroFactura)
                    .reduce((aSum, a) => aSum + parseAmount(a.amount || 0), 0);
            }
            return sum;
        }, 0);
        
        // CORREGIDO: Calcular total correctamente (saldo + multa - pagos aplicados)
        const total = saldo + multa - pagosAplicados;
        totalPendiente += total;
        
        return (
            `* ${f.NumeroFactura} (${f.SemanaDescripcion || ''})\n` +
            `▶️ Fecha: ${f.FechaVencimiento}\n` +
            `▶️ Días vencido: ${diasAtraso}\n` +
            `▶️ Saldo: ₡ ${saldo.toLocaleString('es-CR')}\n` +
            `▶️ Multa: ₡ ${multa.toLocaleString('es-CR')}\n` +
            `▶️ Pagos aplicados: ₡ ${pagosAplicados.toLocaleString('es-CR')}\n` +
            `✅ Total con Multa y Pagos: ₡ ${total.toLocaleString('es-CR')}\n`
        );
    }).join('\n');

    const mensaje = `📱 Estado de cuenta - Arrendamiento\n` +
        `📅 Fecha: ${fechaHoy}\n\n` +
        `👤 ${cliente.Nombre || ''} / ${cliente.Placa || ''} / ${cliente.Cedula || cliente.cedula || ''}\n\n` +
        `${detalleFacturas}\n` +
        `\n📊 Total Pendiente: ₡ ${totalPendiente.toLocaleString('es-CR')}\n` +
        `────────────────────────────\n\n` +
        `Por favor atender los saldos pendientes. Si ya realizó el pago omita este mensaje nuestro Departamento Contable lo aplicará pronto. ¡Gracias! 🙌`;

    // Obtener destino WhatsApp (grupo o personal)
    const destino = window.getWhatsAppDestination ? window.getWhatsAppDestination(cliente) : null;
    if (!destino || !destino.id) {
        alert('No se encontró grupo de WhatsApp ni número personal del cliente.');
        return;
    }

    // Mostrar loading
    document.getElementById('loadingOverlay').style.display = 'flex';

    fetch(ULTRAMSG_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            to: destino.id,
            body: mensaje,
            priority: 10,
            referenceId: 'estado-cuenta',
        })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('loadingOverlay').style.display = 'none';
        if (data.sent || data.status === 'success') {
            alert('Estado de cuenta enviado correctamente al cliente por WhatsApp.');
        } else {
            alert('No se pudo enviar el estado de cuenta.\n' + (data.error || JSON.stringify(data)));
        }
    })
    .catch(err => {
        document.getElementById('loadingOverlay').style.display = 'none';
        alert('Error al enviar el estado de cuenta: ' + err);
    });
}

// Exportar función al scope global
window.sendAccountStatement = sendAccountStatement;

console.log('✅ account-statement.js cargado - Función sendAccountStatement disponible'); 