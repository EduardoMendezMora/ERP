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
    const manualPayments = window.manualPayments || [];

    // Filtrar solo facturas vencidas (Estado: 'Vencido')
    const vencidas = facturas.filter(f => f.Estado === 'Vencido');
    if (vencidas.length === 0) {
        alert('No hay facturas vencidas para este cliente.');
        return;
    }

    let totalPendiente = 0;
    let detalleFacturas = vencidas.map(f => {
        const diasAtraso = f.DiasAtraso || 0;
        // CORREGIDO: Usar parseAmount en lugar de parseFloat
        const saldo = parseAmount(f.MontoBase || 0);
        const multa = parseAmount(f.MontoMultas || 0);
        
        // Buscar pagos bancarios aplicados a esta factura
        const pagosBancariosAplicados = assignedPayments.reduce((sum, p) => {
            if (p.Assignments && Array.isArray(p.Assignments)) {
                return sum + p.Assignments
                    .filter(a => a.invoiceNumber == f.NumeroFactura)
                    .reduce((aSum, a) => aSum + parseAmount(a.amount || 0), 0);
            }
            return sum;
        }, 0);

        // NUEVO: Buscar pagos manuales aplicados a esta factura
        const pagosManualesAplicados = manualPayments.reduce((sum, p) => {
            if (p.FacturasAsignadas && p.FacturasAsignadas.trim() !== '') {
                // Parsear asignaciones del pago manual
                const assignments = parseTransactionAssignments(p.FacturasAsignadas);
                return sum + assignments
                    .filter(a => a.invoiceNumber == f.NumeroFactura)
                    .reduce((aSum, a) => aSum + parseAmount(a.amount || 0), 0);
            }
            return sum;
        }, 0);

        // Total de pagos aplicados (bancarios + manuales)
        const pagosAplicados = pagosBancariosAplicados + pagosManualesAplicados;
        
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
    }).join('');

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

// Función auxiliar para parsear asignaciones de transacciones (pagos manuales)
function parseTransactionAssignments(assignmentsString) {
    if (!assignmentsString || assignmentsString.trim() === '') {
        return [];
    }

    try {
        return assignmentsString.split(';')
            .filter(assignment => assignment.trim() !== '')
            .map(assignment => {
                const parts = assignment.split(':');
                if (parts.length >= 2) {
                    return {
                        invoiceNumber: parts[0].trim(),
                        amount: parseAmount(parts[1].trim() || 0)
                    };
                }
                return null;
            })
            .filter(assignment => assignment !== null);
    } catch (error) {
        console.error('Error parseando asignaciones de transacciones:', error);
        return [];
    }
}

// Exportar función al scope global
window.sendAccountStatement = sendAccountStatement;

console.log('✅ account-statement.js cargado - Función sendAccountStatement disponible'); 