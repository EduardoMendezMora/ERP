// ===== LOGO DE LA EMPRESA =====
const logoUrl = './Logotipo EasyCars Fondo Blanco con Slogan - Copy.jpg';
// ===== FUNCIONES PARA GENERAR RECIBOS =====
function generateReceipt(paymentReference, bankSource) {
    const payment = assignedPayments.find(p =>
        p.Referencia === paymentReference && p.BankSource === bankSource
    );

    if (!payment) {
        showToast('Pago no encontrado', 'error');
        return;
    }

    // Almacenar datos del recibo actual para WhatsApp y descarga
    currentReceiptData = {
        payment: payment,
        client: currentClient,
        paymentReference: paymentReference,
        bankSource: bankSource
    };

    const amount = parsePaymentAmount(payment.Créditos, payment.BankSource);
    const amountInWords = numberToWords(amount);

    // Obtener información de las facturas relacionadas
    const relatedInvoicesInfo = getRelatedInvoicesInfo(payment);

    const receiptHTML = `
        <div class="receipt-header">
            <div class="receipt-header-content">
                <img src="${logoUrl}"
                     alt="EasyCars Logo"
                     class="company-logo"
                     crossorigin="anonymous"
                     onload="this.style.opacity='1'"
                     onerror="console.warn('Logo no cargó, usando texto'); this.style.display='none'; this.nextElementSibling.style.fontWeight='bold';">
                <div class="receipt-header-text">
                    <div class="receipt-title">Recibo de Pago</div>
                    <div class="company-name">EasyCars</div>
                    <div class="company-details">
                        Sistema de Arrendamiento de Vehículos | Costa Rica<br>
                        Tel: (506) 8511-0601 | Email: emendez@autosubastas.com
                    </div>
                </div>
            </div>
        </div>

        <div class="receipt-info">
            <div class="info-section">
                <h4>Información del Cliente</h4>
                <div class="info-line">
                    <span class="info-label">Nombre:</span>
                    <span class="info-value">${currentClient.Nombre || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">ID Cliente:</span>
                    <span class="info-value">${currentClient.ID || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Teléfono:</span>
                    <span class="info-value">${currentClient.numeroTelefono || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Placa:</span>
                    <span class="info-value">${currentClient.Placa || 'N/A'}</span>
                </div>
            </div>

            <div class="info-section">
                <h4>Información del Pago</h4>
                <div class="info-line">
                    <span class="info-label">Referencia:</span>
                    <span class="info-value">${payment.Referencia || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Banco:</span>
                    <span class="info-value">${getBankDisplayName(payment.BankSource)}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Fecha Pago:</span>
                    <span class="info-value">${formatDateForDisplay(payment.Fecha)}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Fecha Aplicación:</span>
                    <span class="info-value">${formatDateForDisplay(payment.FechaAsignacion || payment.Fecha)}</span>
                </div>
            </div>
        </div>

        ${relatedInvoicesInfo}

        <div class="receipt-amount">
            <div class="amount-label">Monto Recibido</div>
            <div class="amount-value">₡${amount.toLocaleString('es-CR')}</div>
            <div class="amount-words">${amountInWords} colones exactos</div>
        </div>

        ${payment.Descripción && payment.Descripción !== 'Sin descripción' ? `
            <div class="description-compact">
                <h4>📝 Descripción del Pago</h4>
                <p style="margin: 0; font-size: 0.9rem;">${payment.Descripción}</p>
            </div>
        ` : ''}

        ${payment.Observaciones ? `
            <div class="observations-compact">
                <h4>⚠️ Observaciones</h4>
                <p style="margin: 0; font-size: 0.9rem;">${payment.Observaciones}</p>
            </div>
        ` : ''}

        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Recibido por</div>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Autorizado por</div>
            </div>
        </div>

        <div class="receipt-footer">
            <strong>Este documento constituye un recibo válido de pago.</strong><br>
            Fecha de emisión: ${formatDateForDisplay(formatDateForStorage(new Date()))} |
            <strong>EasyCars</strong> - Sistema de Arrendamiento de Vehículos<br>
            <em>Documento generado automáticamente</em>
        </div>
    `;

    document.getElementById('receiptContent').innerHTML = receiptHTML;
    document.getElementById('receiptModal').classList.add('show');
}

function getRelatedInvoicesInfo(payment) {
    if (!payment.Assignments || payment.Assignments.length === 0) {
        return '';
    }

    const relatedInvoices = payment.Assignments.map(assignment => {
        const invoice = clientInvoices.find(inv => inv.NumeroFactura === assignment.invoiceNumber);
        return {
            assignment: assignment,
            invoice: invoice
        };
    }).filter(item => item.invoice);

    if (relatedInvoices.length === 0) {
        return '';
    }

    if (relatedInvoices.length === 1) {
        // Pago aplicado a una sola factura
        const item = relatedInvoices[0];
        const invoice = item.invoice;
        const assignment = item.assignment;

        return `
            <div class="invoice-info-compact">
                <h4>📄 Factura Aplicada</h4>
                <div class="info-grid">
                    <div>
                        <strong>Número:</strong> ${invoice.NumeroFactura}<br>
                        <strong>Concepto:</strong> ${invoice.ConceptoManual || invoice.SemanaDescripcion || 'N/A'}
                    </div>
                    <div>
                        <strong>Vencimiento:</strong> ${formatDateForDisplay(invoice.FechaVencimiento)}<br>
                        <strong>Monto Aplicado:</strong> ₡${assignment.amount.toLocaleString('es-CR')}
                    </div>
                </div>
            </div>
        `;
    } else {
        // Pago distribuido entre múltiples facturas
        const invoicesListHTML = relatedInvoices.map(item => {
            const invoice = item.invoice;
            const assignment = item.assignment;

            return `
                <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                    <strong>${invoice.NumeroFactura}</strong> - ₡${assignment.amount.toLocaleString('es-CR')}<br>
                    <small style="color: #666;">${invoice.ConceptoManual || invoice.SemanaDescripcion || 'N/A'}</small>
                </div>
            `;
        }).join('');

        const totalDistributed = relatedInvoices.reduce((sum, item) => sum + item.assignment.amount, 0);

        return `
            <div class="invoice-info-compact">
                <h4>📄 Distribución del Pago (${relatedInvoices.length} facturas)</h4>
                ${invoicesListHTML}
                <div style="border-top: 1px solid #ddd; padding-top: 8px; margin-top: 8px;">
                    <strong>Total Distribuido: ₡${totalDistributed.toLocaleString('es-CR')}</strong>
                </div>
            </div>
        `;
    }
}

function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('show');
}

function printReceipt() {
    console.log('🖨️ Imprimiendo recibo...');
    window.print();
}

// ===== FUNCIONES DE WHATSAPP =====
async function sendToWhatsApp() {
    if (!currentReceiptData) {
        showToast('No hay datos de recibo disponibles', 'error');
        return;
    }

    // Obtener destinatario (grupo o número personal)
    const destination = getWhatsAppDestination(currentClient);

    if (!destination) {
        showToast('No se encontró grupo de WhatsApp ni número personal del cliente', 'error');
        return;
    }

    console.log('📱 Enviando recibo PDF por WhatsApp automáticamente...');
    console.log('Destinatario:', destination);

    try {
        // Mostrar loading
        showLoadingOverlay(true);

        // Generar PDF del recibo
        const pdfBlob = await generateReceiptPDF();

        if (!pdfBlob) {
            throw new Error('No se pudo generar el PDF del recibo');
        }

        // Convertir PDF a base64
        const base64PDF = await blobToBase64(pdfBlob);

        // Generar mensaje para WhatsApp
        const whatsappMessage = generateWhatsAppMessage();

        console.log('📱 Enviando PDF vía ULTRAMSG...');
        console.log('Tipo:', destination.type);
        console.log('Destinatario:', destination.name);
        console.log('ID:', destination.id);
        console.log('Tamaño PDF:', pdfBlob.size, 'bytes');

        // Enviar vía ULTRAMSG
        const response = await sendViaUltramsg(destination.id, base64PDF, whatsappMessage);

        if (response.sent) {
            const tipoDestino = destination.type === 'group' ? 'grupo' : 'número personal';
            showToast(`✅ Recibo PDF enviado automáticamente al ${tipoDestino} de ${destination.name}`, 'success');
            console.log('✅ PDF enviado exitosamente:', response);
        } else {
            throw new Error(response.message || 'Error al enviar PDF');
        }

    } catch (error) {
        console.error('❌ Error al enviar PDF por WhatsApp:', error);

        // Mostrar mensaje de error más informativo
        const errorMessage = error.message;
        showToast(`❌ Error ULTRAMSG: ${errorMessage}. Probando modo manual.`, 'error');

        // Fallback a método manual
        console.log('🔄 Iniciando modo manual como fallback...');
        await sendToWhatsAppManual();

    } finally {
        showLoadingOverlay(false);
    }
}

async function sendViaUltramsg(phoneNumber, base64PDF, message) {
    try {
        const url = `${ULTRAMSG_CONFIG.BASE_URL}/${ULTRAMSG_CONFIG.INSTANCE_ID}/messages/document`;

        // Generar nombre de archivo único
        const { payment, client } = currentReceiptData;
        const filename = `Recibo_${client.Nombre.replace(/\s+/g, '_')}_${payment.Referencia}_${formatDateForStorage(new Date()).replace(/\//g, '-')}.pdf`;

        const requestBody = {
            token: ULTRAMSG_CONFIG.TOKEN,
            to: phoneNumber,
            document: base64PDF,
            filename: filename,
            caption: message,
            priority: 1,
            referenceId: `receipt_${Date.now()}`
        };

        console.log('🚀 Enviando PDF a ULTRAMSG:', {
            url: url,
            to: phoneNumber,
            filename: filename,
            hasPDF: base64PDF.length > 0,
            messageLength: message.length
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();

        console.log('📱 Respuesta de ULTRAMSG:', responseData);

        if (!response.ok) {
            // Mensajes de error específicos de ULTRAMSG
            let errorMessage = 'Error en la API de ULTRAMSG';

            if (response.status === 401) {
                errorMessage = 'Token inválido o expirado';
            } else if (response.status === 404) {
                errorMessage = 'Instancia no encontrada';
            } else if (response.status === 429) {
                errorMessage = 'Límite de mensajes excedido';
            } else if (response.status === 413) {
                errorMessage = 'Archivo PDF muy grande (máx. 16MB)';
            } else if (responseData.error) {
                errorMessage = responseData.error;
            }

            throw new Error(`${errorMessage} (${response.status})`);
        }

        // Verificar si el mensaje fue enviado exitosamente
        if (!responseData.sent) {
            throw new Error(responseData.message || 'El PDF no pudo ser enviado');
        }

        return responseData;

    } catch (error) {
        console.error('❌ Error en sendViaUltramsg:', error);
        throw error;
    }
}

function generateWhatsAppMessage() {
    const { payment } = currentReceiptData;
    const reference = payment.Referencia || 'Sin referencia';

    // Si es un pago manual, usar el mensaje específico para pagos manuales
    if (currentReceiptData.isManualPayment) {
        return generateManualPaymentWhatsAppMessage();
    }

    // Mensaje simplificado SOLAMENTE para pagos bancarios
    const message = `Recibo de Dinero # ${reference}`;
    console.log('📱 Mensaje generado:', message);
    return message;
}

async function sendToWhatsAppManual() {
    console.log('📱 Modo manual: Preparando envío por WhatsApp...');

    try {
        // Generar PDF del recibo
        let pdfBlob = null;
        try {
            pdfBlob = await generateReceiptPDF();
        } catch (error) {
            console.warn('No se pudo generar PDF para modo manual:', error);
        }

        // Generar mensaje para WhatsApp
        const whatsappMessage = generateWhatsAppMessage();

        // Crear URL de WhatsApp
        const phoneNumber = formatPhoneForWhatsApp(currentClient.numeroTelefono);
        const encodedMessage = encodeURIComponent(whatsappMessage);

        // Crear enlace de WhatsApp
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        console.log('📱 Abriendo WhatsApp con mensaje (modo manual)...');

        // Abrir WhatsApp
        window.open(whatsappUrl, '_blank');

        // Mostrar instrucciones al usuario si hay PDF
        if (pdfBlob) {
            showWhatsAppInstructions(pdfBlob, 'pdf');
        }

        showToast('WhatsApp abierto en modo manual. Siga las instrucciones', 'warning');

    } catch (error) {
        console.error('Error en modo manual:', error);
        showToast('Error al preparar el envío manual: ' + error.message, 'error');
    }
}

function showWhatsAppInstructions(fileBlob, fileType = 'pdf') {
    // Crear URL temporal para el archivo
    const fileUrl = URL.createObjectURL(fileBlob);
    const fileExtension = fileType === 'pdf' ? 'pdf' : 'png';
    const fileIcon = fileType === 'pdf' ? '📄' : '🖼️';
    const fileTypeName = fileType === 'pdf' ? 'PDF' : 'imagen';

    // Crear modal de instrucciones
    const instructionsHTML = `
        <div class="modal-overlay" id="whatsappInstructionsModal" onclick="closeWhatsAppInstructions()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>📱 Instrucciones para WhatsApp</h3>
                    <button class="modal-close" onclick="closeWhatsAppInstructions()">✕</button>
                </div>
               
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 3rem; margin-bottom: 16px;">📱</div>
                        <h4 style="color: #25d366; margin-bottom: 16px;">WhatsApp está abierto</h4>
                        <p style="color: #666; margin-bottom: 20px;">
                            El mensaje se ha preparado automáticamente. Ahora siga estos pasos:
                        </p>
                    </div>
                   
                    <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <h5 style="margin: 0 0 12px 0; color: #333;">📋 Pasos a seguir:</h5>
                        <ol style="margin: 0; padding-left: 20px; line-height: 1.6;">
                            <li>Verifique que el mensaje está completo en WhatsApp</li>
                            <li>Haga clic en "Descargar ${fileTypeName}" abajo</li>
                            <li>Adjunte el archivo ${fileTypeName} descargado al chat de WhatsApp</li>
                            <li>Envíe el mensaje con el recibo ${fileTypeName}</li>
                        </ol>
                    </div>
                   
                    <div style="text-align: center; margin-bottom: 20px; padding: 20px; border: 2px dashed #ddd; border-radius: 8px;">
                        <div style="font-size: 4rem; margin-bottom: 8px;">${fileIcon}</div>
                        <p style="margin: 0; color: #666;">Recibo en formato ${fileTypeName.toUpperCase()}</p>
                        <small style="color: #999;">Listo para adjuntar en WhatsApp</small>
                    </div>
                   
                    <div class="form-actions" style="margin-top: 0; border: none; padding: 0;">
                        <button type="button" class="btn btn-secondary" onclick="closeWhatsAppInstructions()">
                            Cerrar
                        </button>
                        <button type="button" class="btn btn-whatsapp" onclick="downloadReceiptFromInstructions('${fileUrl}', '${fileExtension}')">
                            📥 Descargar ${fileTypeName}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remover modal existente si hay uno
    const existingModal = document.getElementById('whatsappInstructionsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', instructionsHTML);

    // Mostrar modal
    setTimeout(() => {
        document.getElementById('whatsappInstructionsModal').classList.add('show');
    }, 100);
}

function downloadReceiptFromInstructions(fileUrl, fileExtension) {
    const { payment, client } = currentReceiptData;
    const filename = `Recibo_${client.Nombre.replace(/\s+/g, '_')}_${payment.Referencia}_${formatDateForStorage(new Date()).replace(/\//g, '-')}.${fileExtension}`;

    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const fileType = fileExtension === 'pdf' ? 'PDF' : 'imagen';
    showToast(`${fileType} del recibo descargado. Ahora puede adjuntarlo en WhatsApp`, 'success');
}

function closeWhatsAppInstructions() {
    const modal = document.getElementById('whatsappInstructionsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// ===== FUNCIÓN PARA GENERAR PDF =====
async function generateReceiptPDF() {
    console.log('📄 Generando PDF del recibo...');

    try {
        const receiptElement = document.getElementById('receiptContent');

        if (!receiptElement) {
            throw new Error('Elemento del recibo no encontrado');
        }

        // Esperar a que las imágenes carguen completamente
        const images = receiptElement.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = resolve;
                    img.onerror = resolve; // También resolver en error para no bloquear
                    // Timeout de seguridad
                    setTimeout(resolve, 3000);
                }
            });
        });

        // Esperar que todas las imágenes carguen (máximo 3 segundos)
        await Promise.all(imagePromises);
        console.log('🖼️ Imágenes cargadas, generando PDF...');

        // Esperar un poco más para asegurar el renderizado
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generar canvas con configuración optimizada
        const canvas = await html2canvas(receiptElement, {
            scale: 1.5,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            width: receiptElement.scrollWidth,
            height: receiptElement.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 1200,
            windowHeight: receiptElement.scrollHeight + 100,
            removeContainer: false,
            foreignObjectRendering: false,
            logging: false,
            imageTimeout: 0
        });

        // Crear PDF usando jsPDF con configuración optimizada
        const { jsPDF } = window.jspdf;

        // Configuración A4 con márgenes
        const pageWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const margin = 10; // Margen en mm
        const contentWidth = pageWidth - (margin * 2);
        const contentHeight = pageHeight - (margin * 2);

        // Calcular dimensiones proporcionales
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        // Crear nuevo documento PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        // Agregar imagen al PDF con márgenes
        const imgData = canvas.toDataURL('image/jpeg', 0.9);

        if (imgHeight <= contentHeight) {
            // Cabe en una página
            const yPosition = margin + (contentHeight - imgHeight) / 2;
            pdf.addImage(imgData, 'JPEG', margin, yPosition, imgWidth, imgHeight);
        } else {
            // Dividir en múltiples páginas
            let currentY = 0;
            let pageNum = 0;

            while (currentY < imgHeight) {
                if (pageNum > 0) {
                    pdf.addPage();
                }

                const remainingHeight = imgHeight - currentY;
                const currentPageHeight = Math.min(contentHeight, remainingHeight);

                // Calcular la posición de corte en el canvas
                const sourceY = (currentY / imgHeight) * canvas.height;
                const sourceHeight = (currentPageHeight / imgHeight) * canvas.height;

                // Crear un canvas temporal para esta sección
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = sourceHeight;

                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);

                const tempImgData = tempCanvas.toDataURL('image/jpeg', 0.9);
                pdf.addImage(tempImgData, 'JPEG', margin, margin, imgWidth, currentPageHeight);

                currentY += currentPageHeight;
                pageNum++;
            }
        }

        // Convertir PDF a Blob
        const pdfBlob = pdf.output('blob');

        console.log('✅ PDF generado exitosamente, tamaño:', pdfBlob.size, 'bytes');

        return pdfBlob;

    } catch (error) {
        console.error('❌ Error al generar PDF:', error);
        throw error;
    }
}

async function downloadReceiptPDF() {
    if (!currentReceiptData) {
        showToast('No hay datos de recibo disponibles', 'error');
        return;
    }

    console.log('💾 Descargando PDF del recibo...');

    try {
        showLoadingOverlay(true);

        const pdfBlob = await generateReceiptPDF();

        if (!pdfBlob) {
            throw new Error('No se pudo generar el PDF del recibo');
        }

        const { payment, client } = currentReceiptData;
        const filename = `Recibo_${client.Nombre.replace(/\s+/g, '_')}_${payment.Referencia}_${formatDateForStorage(new Date()).replace(/\//g, '-')}.pdf`;

        // Crear URL y descargar
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpiar URL temporal
        URL.revokeObjectURL(url);

        showToast('PDF del recibo descargado exitosamente', 'success');

    } catch (error) {
        console.error('❌ Error al descargar PDF:', error);
        showToast('Error al descargar el PDF: ' + error.message, 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// ===== FUNCIONES DE RENDERIZADO DE PAGOS =====
function renderUnassignedPaymentsSection() {
    const container = document.getElementById('unassignedPayments');
    const emptyElement = document.getElementById('emptyUnassignedPayments');
    const countElement = document.getElementById('unassignedPaymentsCount');

    if (!container || !emptyElement || !countElement) {
        console.error('No se encontraron elementos para la sección de pagos no asignados');
        return;
    }

    countElement.textContent = unassignedPayments.length;

    if (unassignedPayments.length === 0) {
        container.innerHTML = '';
        emptyElement.style.display = 'block';
        return;
    }

    emptyElement.style.display = 'none';

    container.innerHTML = unassignedPayments.map(payment => {
        const totalAmount = parsePaymentAmount(payment.Créditos, payment.BankSource);
        const assignments = parseAssignedInvoices(payment.FacturasAsignadas || '');
        const assignedAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
        
        // ===== NUEVA LÓGICA: USAR COLUMNA DISPONIBLE DEL BACKEND =====
        const availableAmount = calculateAvailableAmount(payment);

        const reference = payment.Referencia || 'Sin referencia';
        const description = payment.Descripción || 'Sin descripción';
        const observations = payment.Observaciones || '';
        const date = payment.Fecha || '';

        // Indicador de cómo se identificó este pago
        const matchIndicator = payment._matchReason ? `
            <div style="background: #e6f3ff; border: 1px solid #007aff; border-radius: 6px; padding: 6px; margin: 8px 0; font-size: 0.8rem;">
                <strong>🎯 Identificado por:</strong> ${payment._matchReason}
                ${payment._matchReason === 'ID en Observaciones' ? `
                    <br><small style="color: #666;">ID ${currentClientId} encontrado en observaciones</small>
                ` : ''}
            </div>
        ` : '';

        // Mostrar información de asignaciones previas si las hay
        let previousAssignmentsInfo = '';
        if (assignments.length > 0) {
            const assignmentsList = assignments.map(a => `${a.invoiceNumber}: ₡${a.amount.toLocaleString('es-CR')}`).join('<br>');
            previousAssignmentsInfo = `
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 8px; border-radius: 6px; margin: 8px 0; font-size: 0.8rem;">
                    <strong>⚠️ Asignaciones previas:</strong><br>
                    ${assignmentsList}<br>
                    <strong>Disponible: ₡${availableAmount.toLocaleString('es-CR')}</strong>
                </div>
            `;
        }

        // Buscar facturas pendientes/vencidas que coincidan con el monto disponible
        const matchingInvoices = clientInvoices.filter(inv => {
            if (inv.Estado !== 'Pendiente' && inv.Estado !== 'Vencido') return false;

            const invoiceTotal = parseAmount(inv.MontoTotal || inv.MontoBase || 0);
            const difference = Math.abs(invoiceTotal - availableAmount);

            return difference < 1000;
        });

        let matchInfo = '';
        if (matchingInvoices.length > 0) {
            const matchType = matchingInvoices.some(inv =>
                Math.abs(parseAmount(inv.MontoTotal || inv.MontoBase || 0) - availableAmount) < 0.01
            ) ? 'exacta' : 'aproximada';

            matchInfo = `
                <div style="background: #e6ffe6; padding: 8px; border-radius: 6px; margin: 12px 0; font-size: 0.85rem;">
                    <strong>✅ Coincidencia ${matchType} (disponible):</strong><br>
                    ${matchingInvoices.map(inv => {
                const invTotal = parseAmount(inv.MontoTotal || inv.MontoBase || 0);
                const diff = availableAmount - invTotal;
                let diffText = '';
                if (Math.abs(diff) > 0.01) {
                    diffText = diff > 0 ? ` (+₡${Math.abs(diff).toLocaleString('es-CR')})` : ` (-₡${Math.abs(diff).toLocaleString('es-CR')})`;
                }
                return `${inv.NumeroFactura}: ₡${invTotal.toLocaleString('es-CR')}${diffText}`;
            }).join('<br>')}
                </div>
            `;
        }

        return `
            <div class="payment-card">
                <div class="payment-header">
                    <div>
                        <div class="payment-reference">${reference}</div>
                        <div class="payment-source">${getBankDisplayName(payment.BankSource)}</div>
                    </div>
                    <span class="bank-badge ${getBankBadgeClass(payment.BankSource)}">
                        ${payment.BankSource}
                    </span>
                </div>
               
                ${matchIndicator}
                ${previousAssignmentsInfo}
               
                <div class="payment-details">
                    <div class="payment-detail">
                        <div class="payment-detail-label">Fecha</div>
                        <div class="payment-detail-value">${formatDateForDisplay(date)}</div>
                    </div>
                    <div class="payment-detail">
                        <div class="payment-detail-label">Total</div>
                        <div class="payment-detail-value">₡${totalAmount.toLocaleString('es-CR')}</div>
                    </div>
                    ${assignedAmount > 0 ? `
                        <div class="payment-detail">
                            <div class="payment-detail-label">Disponible</div>
                            <div class="payment-detail-value payment-amount-highlight">₡${availableAmount.toLocaleString('es-CR')}</div>
                        </div>
                    ` : `
                        <div class="payment-detail">
                            <div class="payment-detail-label">Monto</div>
                            <div class="payment-detail-value payment-amount-highlight">₡${totalAmount.toLocaleString('es-CR')}</div>
                        </div>
                    `}
                    ${observations ? `
                        <div class="payment-detail">
                            <div class="payment-detail-label">Observaciones</div>
                            <div class="payment-detail-value">${observations}</div>
                        </div>
                    ` : ''}
                </div>
               
                ${description && description !== 'Sin descripción' ? `
                    <div class="payment-description">
                        <div class="payment-description-label">Descripción</div>
                        <div class="payment-description-text">${description}</div>
                    </div>
                ` : ''}
               
                ${matchInfo}
               
                <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
                    <button class="btn btn-print" onclick="generateUnassignedPaymentReceipt('${reference}', '${payment.BankSource}')" title="Imprimir Recibo de Depósito">
                        🧾 Imprimir Recibo
                    </button>
                    <button class="btn btn-primary" onclick="openAssignPaymentModal('${reference}', '${payment.BankSource}')" title="Asignar a Factura" ${availableAmount <= 0 ? 'disabled' : ''}>
                        📄 Asignar a Factura
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderAssignedPaymentsSection() {
    const container = document.getElementById('assignedPayments');
    const emptyElement = document.getElementById('emptyAssignedPayments');
    const countElement = document.getElementById('assignedPaymentsCount');

    if (!container || !emptyElement || !countElement) {
        console.error('No se encontraron elementos para la sección de pagos aplicados');
        return;
    }

    countElement.textContent = assignedPayments.length;

    if (assignedPayments.length === 0) {
        container.innerHTML = '';
        emptyElement.style.display = 'block';
        return;
    }

    emptyElement.style.display = 'none';

    container.innerHTML = assignedPayments.map(payment => {
        const amount = parsePaymentAmount(payment.Créditos, payment.BankSource);
        const reference = payment.Referencia || 'Sin referencia';
        const description = payment.Descripción || 'Sin descripción';
        const observations = payment.Observaciones || '';
        const date = payment.Fecha || '';
        const assignmentDate = payment.FechaAsignacion || '';
        const assignments = payment.Assignments || [];

        let invoicesInfo = '';
        if (assignments.length > 0) {
            if (assignments.length === 1) {
                // Pago a una sola factura
                const assignment = assignments[0];
                const relatedInvoice = payment.RelatedInvoices && payment.RelatedInvoices[0];

                if (relatedInvoice) {
                    invoicesInfo = `
                        <div style="background: #e6ffe6; padding: 8px; border-radius: 6px; margin: 12px 0; font-size: 0.85rem;">
                            <strong>📄 Factura Pagada:</strong><br>
                            ${relatedInvoice.NumeroFactura} - ₡${assignment.amount.toLocaleString('es-CR')}<br>
                            ${relatedInvoice.ConceptoManual || relatedInvoice.SemanaDescripcion || 'N/A'}
                        </div>
                    `;
                }
            } else {
                // Pago distribuido
                const assignmentsList = assignments.map(assignment => {
                    const relatedInvoice = payment.RelatedInvoices?.find(inv => inv.NumeroFactura === assignment.invoiceNumber);
                    const concept = relatedInvoice ? (relatedInvoice.ConceptoManual || relatedInvoice.SemanaDescripcion || 'N/A') : 'N/A';
                    return `${assignment.invoiceNumber}: ₡${assignment.amount.toLocaleString('es-CR')} (${concept})`;
                }).join('<br>');

                const totalDistributed = assignments.reduce((sum, a) => sum + a.amount, 0);

                invoicesInfo = `
                    <div style="background: #e6ffe6; padding: 8px; border-radius: 6px; margin: 12px 0; font-size: 0.85rem;">
                        <strong>📄 Pago Distribuido (${assignments.length} facturas):</strong><br>
                        ${assignmentsList}<br>
                        <strong>Total: ₡${totalDistributed.toLocaleString('es-CR')}</strong>
                    </div>
                `;
            }
        }

        return `
            <div class="assigned-payment-card">
                <div class="payment-header">
                    <div>
                        <div class="payment-reference">${reference}</div>
                        <div class="payment-source">${getBankDisplayName(payment.BankSource)}</div>
                    </div>
                    <span class="bank-badge ${getBankBadgeClass(payment.BankSource)}">
                        ${payment.BankSource}
                    </span>
                </div>
               
                <div class="payment-details">
                    <div class="payment-detail">
                        <div class="payment-detail-label">Fecha Pago</div>
                        <div class="payment-detail-value">${formatDateForDisplay(date)}</div>
                    </div>
                    <div class="payment-detail">
                        <div class="payment-detail-label">Monto</div>
                        <div class="payment-detail-value payment-amount-highlight">₡${amount.toLocaleString('es-CR')}</div>
                    </div>
                    ${assignmentDate ? `
                        <div class="payment-detail">
                            <div class="payment-detail-label">Fecha Aplicación</div>
                            <div class="payment-detail-value">${formatDateForDisplay(assignmentDate)}</div>
                        </div>
                    ` : ''}
                    ${observations ? `
                        <div class="payment-detail">
                            <div class="payment-detail-label">Observaciones</div>
                            <div class="payment-detail-value">${observations}</div>
                        </div>
                    ` : ''}
                </div>
               
                ${description && description !== 'Sin descripción' ? `
                    <div class="payment-description">
                        <div class="payment-description-label">Descripción</div>
                        <div class="payment-description-text">${description}</div>
                    </div>
                ` : ''}
               
                ${invoicesInfo}
               
                <div class="receipt-actions">
                    <button class="btn btn-print" onclick="generateReceipt('${reference}', '${payment.BankSource}')" title="Generar e Imprimir Recibo">
                        🧾 Imprimir Recibo
                    </button>
                    ${assignments.length > 0 ? `
                        <button class="btn btn-unassign" onclick="showMultipleUnassignConfirmation('${reference}', '${payment.BankSource}')" title="Desasignar Pagos">
                            🔄 Desasignar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function showMultipleUnassignConfirmation(paymentReference, bankSource) {
    const payment = assignedPayments.find(p => p.Referencia === paymentReference && p.BankSource === bankSource);
    if (!payment || !payment.Assignments) return;

    const assignments = payment.Assignments;
    const invoicesList = assignments.map(a => a.invoiceNumber).join(', ');

    const confirmed = confirm(`¿Está seguro de que desea desasignar el pago ${paymentReference} de las siguientes facturas?\n\n${invoicesList}\n\nEsto actualizará el estado de todas las facturas según las multas actuales.`);

    if (confirmed) {
        // Desasignar todas las facturas asociadas
        Promise.all(assignments.map(assignment =>
            unassignPaymentFromInvoice(paymentReference, bankSource, assignment.invoiceNumber)
        )).then(() => {
            console.log('✅ Todas las asignaciones fueron removidas');
        }).catch(error => {
            console.error('❌ Error al desasignar algunas facturas:', error);
        });
    }
}

// ===== FUNCIÓN PARA GENERAR RECIBOS DE PAGOS NO ASIGNADOS =====
function generateUnassignedPaymentReceipt(paymentReference, bankSource) {
    const payment = unassignedPayments.find(p =>
        p.Referencia === paymentReference && p.BankSource === bankSource
    );

    if (!payment) {
        showToast('Pago no encontrado', 'error');
        return;
    }

    // Almacenar datos del recibo actual para WhatsApp y descarga
    currentReceiptData = {
        payment: payment,
        client: currentClient,
        paymentReference: paymentReference,
        bankSource: bankSource,
        isUnassigned: true
    };

    const amount = parsePaymentAmount(payment.Créditos, payment.BankSource);
    const amountInWords = numberToWords(amount);

    const receiptHTML = `
        <div class="receipt-header">
            <img src="${logoUrl}"
                 alt="EasyCars Logo"
                 class="company-logo"
                 crossorigin="anonymous"
                 onload="this.style.opacity='1'"
                 onerror="console.warn('Logo no cargó, usando texto'); this.style.display='none'; this.nextElementSibling.style.fontWeight='bold';">
            <div class="company-name">EasyCars</div>
            <div class="company-details">
                Sistema de Arrendamiento de Vehículos | Costa Rica<br>
                Tel: (506) 8511-0601 | Email: emendez@autosubastas.com
            </div>
            <div class="receipt-title">Recibo de Depósito de Reserva</div>
        </div>

        <div class="receipt-info">
            <div class="info-section">
                <h4>Información del Cliente</h4>
                <div class="info-line">
                    <span class="info-label">Nombre:</span>
                    <span class="info-value">${currentClient.Nombre || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">ID Cliente:</span>
                    <span class="info-value">${currentClient.ID || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Teléfono:</span>
                    <span class="info-value">${currentClient.numeroTelefono || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Placa:</span>
                    <span class="info-value">${currentClient.Placa || 'N/A'}</span>
                </div>
            </div>

            <div class="info-section">
                <h4>Información del Depósito</h4>
                <div class="info-line">
                    <span class="info-label">Referencia:</span>
                    <span class="info-value">${payment.Referencia || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Banco:</span>
                    <span class="info-value">${getBankDisplayName(payment.BankSource)}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Fecha Depósito:</span>
                    <span class="info-value">${formatDateForDisplay(payment.Fecha)}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Estado:</span>
                    <span class="info-value">Pendiente de Aplicación</span>
                </div>
            </div>
        </div>

        <div class="receipt-amount">
            <div class="amount-label">Monto del Depósito</div>
            <div class="amount-value">₡${amount.toLocaleString('es-CR')}</div>
            <div class="amount-words">${amountInWords} colones exactos</div>
        </div>

        ${payment.Descripción && payment.Descripción !== 'Sin descripción' ? `
            <div class="description-compact">
                <h4>📝 Descripción del Depósito</h4>
                <p style="margin: 0; font-size: 0.9rem;">${payment.Descripción}</p>
            </div>
        ` : ''}

        ${payment.Observaciones ? `
            <div class="observations-compact">
                <h4>📋 Observaciones</h4>
                <p style="margin: 0; font-size: 0.9rem;">${payment.Observaciones}</p>
            </div>
        ` : ''}

        <div class="invoice-info-compact">
            <h4>📄 Concepto del Depósito</h4>
            <div class="info-grid">
                <div><strong>Tipo:</strong> Depósito de Reserva</div>
                <div><strong>Propósito:</strong> Reserva de Vehículo</div>
                <div><strong>Estado:</strong> Pendiente de Aplicación</div>
                <div><strong>Fecha Emisión:</strong> ${formatDateForDisplay(new Date())}</div>
            </div>
        </div>

        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Firma del Cliente</div>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Firma del Responsable</div>
            </div>
        </div>

        <div class="receipt-footer">
            <p><strong>EasyCars</strong> - Sistema de Arrendamiento de Vehículos</p>
            <p>Este documento certifica la recepción del depósito de reserva indicado</p>
            <p>El depósito será aplicado a la factura correspondiente una vez se proceda con la entrega del vehículo</p>
        </div>
    `;

    // Mostrar el modal con el recibo
    document.getElementById('receiptContent').innerHTML = receiptHTML;
    document.getElementById('receiptModal').classList.add('show');
}

// ===== FUNCIÓN PARA GENERAR RECIBOS DE PAGOS MANUALES ASIGNADOS =====
function generateManualPaymentReceipt(paymentReference) {
    const payment = manualPayments.find(p => p.Referencia === paymentReference);

    if (!payment) {
        showToast('Pago manual no encontrado', 'error');
        return;
    }

    // Almacenar datos del recibo actual para WhatsApp y descarga
    currentReceiptData = {
        payment: payment,
        client: currentClient,
        paymentReference: paymentReference,
        bankSource: 'PagosManuales',
        isManualPayment: true
    };

    const amount = parseAmount(payment.Créditos || 0);
    const amountInWords = numberToWords(amount);

    // Obtener información de las facturas relacionadas
    const relatedInvoicesInfo = getRelatedInvoicesInfoForManual(payment);

    const receiptHTML = `
        <div class="receipt-header">
            <div class="receipt-header-content">
                <img src="${logoUrl}"
                     alt="EasyCars Logo"
                     class="company-logo"
                     crossorigin="anonymous"
                     onload="this.style.opacity='1'"
                     onerror="console.warn('Logo no cargó, usando texto'); this.style.display='none'; this.nextElementSibling.style.fontWeight='bold';">
                <div class="receipt-header-text">
                    <div class="receipt-title">Recibo de Pago Manual</div>
                    <div class="company-name">EasyCars</div>
                    <div class="company-details">
                        Sistema de Arrendamiento de Vehículos | Costa Rica<br>
                        Tel: (506) 8511-0601 | Email: emendez@autosubastas.com
                    </div>
                </div>
            </div>
        </div>

        <div class="receipt-info">
            <div class="info-section">
                <h4>Información del Cliente</h4>
                <div class="info-line">
                    <span class="info-label">Nombre:</span>
                    <span class="info-value">${currentClient.Nombre || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">ID Cliente:</span>
                    <span class="info-value">${currentClient.ID || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Teléfono:</span>
                    <span class="info-value">${currentClient.numeroTelefono || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Placa:</span>
                    <span class="info-value">${currentClient.Placa || 'N/A'}</span>
                </div>
            </div>

            <div class="info-section">
                <h4>Información del Pago</h4>
                <div class="info-line">
                    <span class="info-label">Referencia:</span>
                    <span class="info-value">${payment.Referencia || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Tipo:</span>
                    <span class="info-value">💰 Pago Manual</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Fecha Pago:</span>
                    <span class="info-value">${formatDateForDisplay(payment.Fecha)}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Fecha Aplicación:</span>
                    <span class="info-value">${formatDateForDisplay(payment.FechaAsignacion || payment.Fecha)}</span>
                </div>
            </div>
        </div>

        ${relatedInvoicesInfo}

        <div class="receipt-amount">
            <div class="amount-label">Monto Recibido</div>
            <div class="amount-value">₡${amount.toLocaleString('es-CR')}</div>
            <div class="amount-words">${amountInWords} colones exactos</div>
        </div>

        ${payment.Descripción && payment.Descripción !== 'Sin descripción' ? `
            <div class="description-compact">
                <h4>📝 Descripción del Pago</h4>
                <p style="margin: 0; font-size: 0.9rem;">${payment.Descripción}</p>
            </div>
        ` : ''}

        ${payment.Observaciones ? `
            <div class="observations-compact">
                <h4>📋 Observaciones</h4>
                <p style="margin: 0; font-size: 0.9rem;">${payment.Observaciones}</p>
            </div>
        ` : ''}

        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Firma del Cliente</div>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Firma del Responsable</div>
            </div>
        </div>

        <div class="receipt-footer">
            <p><strong>EasyCars</strong> - Sistema de Arrendamiento de Vehículos</p>
            <p>Este documento certifica la recepción del pago manual realizado por el cliente.</p>
            <p>Fecha de emisión: ${formatDateForDisplay(new Date())}</p>
        </div>
    `;

    // Mostrar el recibo en el modal
    document.getElementById('receiptContent').innerHTML = receiptHTML;
    document.getElementById('receiptModal').classList.add('show');
}

// ===== FUNCIÓN PARA GENERAR RECIBOS DE PAGOS MANUALES NO ASIGNADOS =====
function generateUnassignedManualPaymentReceipt(paymentReference) {
    const payment = manualPayments.find(p => p.Referencia === paymentReference);

    if (!payment) {
        showToast('Pago manual no encontrado', 'error');
        return;
    }

    // Almacenar datos del recibo actual para WhatsApp y descarga
    currentReceiptData = {
        payment: payment,
        client: currentClient,
        paymentReference: paymentReference,
        bankSource: 'PagosManuales',
        isManualPayment: true,
        isUnassigned: true
    };

    const amount = parseAmount(payment.Créditos || 0);
    const amountInWords = numberToWords(amount);

    const receiptHTML = `
        <div class="receipt-header">
            <img src="${logoUrl}"
                 alt="EasyCars Logo"
                 class="company-logo"
                 crossorigin="anonymous"
                 onload="this.style.opacity='1'"
                 onerror="console.warn('Logo no cargó, usando texto'); this.style.display='none'; this.nextElementSibling.style.fontWeight='bold';">
            <div class="company-name">EasyCars</div>
            <div class="company-details">
                Sistema de Arrendamiento de Vehículos | Costa Rica<br>
                Tel: (506) 8511-0601 | Email: emendez@autosubastas.com
            </div>
            <div class="receipt-title">Recibo de Depósito Manual</div>
        </div>

        <div class="receipt-info">
            <div class="info-section">
                <h4>Información del Cliente</h4>
                <div class="info-line">
                    <span class="info-label">Nombre:</span>
                    <span class="info-value">${currentClient.Nombre || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">ID Cliente:</span>
                    <span class="info-value">${currentClient.ID || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Teléfono:</span>
                    <span class="info-value">${currentClient.numeroTelefono || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Placa:</span>
                    <span class="info-value">${currentClient.Placa || 'N/A'}</span>
                </div>
            </div>

            <div class="info-section">
                <h4>Información del Depósito</h4>
                <div class="info-line">
                    <span class="info-label">Referencia:</span>
                    <span class="info-value">${payment.Referencia || 'N/A'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Tipo:</span>
                    <span class="info-value">💰 Depósito Manual</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Fecha Depósito:</span>
                    <span class="info-value">${formatDateForDisplay(payment.Fecha)}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Estado:</span>
                    <span class="info-value">Pendiente de Aplicación</span>
                </div>
            </div>
        </div>

        <div class="receipt-amount">
            <div class="amount-label">Monto del Depósito</div>
            <div class="amount-value">₡${amount.toLocaleString('es-CR')}</div>
            <div class="amount-words">${amountInWords} colones exactos</div>
        </div>

        ${payment.Descripción && payment.Descripción !== 'Sin descripción' ? `
            <div class="description-compact">
                <h4>📝 Descripción del Depósito</h4>
                <p style="margin: 0; font-size: 0.9rem;">${payment.Descripción}</p>
            </div>
        ` : ''}

        ${payment.Observaciones ? `
            <div class="observations-compact">
                <h4>📋 Observaciones</h4>
                <p style="margin: 0; font-size: 0.9rem;">${payment.Observaciones}</p>
            </div>
        ` : ''}

        <div class="invoice-info-compact">
            <h4>📄 Concepto del Depósito</h4>
            <div class="info-grid">
                <div><strong>Tipo:</strong> Depósito Manual</div>
                <div><strong>Propósito:</strong> Reserva de Vehículo</div>
                <div><strong>Estado:</strong> Pendiente de Aplicación</div>
                <div><strong>Fecha Emisión:</strong> ${formatDateForDisplay(new Date())}</div>
            </div>
        </div>

        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Firma del Cliente</div>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Firma del Responsable</div>
            </div>
        </div>

        <div class="receipt-footer">
            <p><strong>EasyCars</strong> - Sistema de Arrendamiento de Vehículos</p>
            <p>Este documento certifica la recepción del depósito manual realizado por el cliente.</p>
            <p>Fecha de emisión: ${formatDateForDisplay(new Date())}</p>
        </div>
    `;

    // Mostrar el recibo en el modal
    document.getElementById('receiptContent').innerHTML = receiptHTML;
    document.getElementById('receiptModal').classList.add('show');
}

// ===== FUNCIÓN AUXILIAR PARA OBTENER INFORMACIÓN DE FACTURAS RELACIONADAS (PAGOS MANUALES) =====
function getRelatedInvoicesInfoForManual(payment) {
    if (!payment.FacturasAsignadas || payment.FacturasAsignadas.trim() === '') {
        return `
            <div class="invoice-info-compact">
                <h4>📄 Facturas Asignadas</h4>
                <div class="info-grid">
                    <div><strong>Estado:</strong> Sin asignar</div>
                    <div><strong>Monto disponible:</strong> ₡${parseAmount(payment.Disponible || payment.Créditos || 0).toLocaleString('es-CR')}</div>
                </div>
            </div>
        `;
    }

    // Buscar las facturas asignadas
    const invoiceNumbers = payment.FacturasAsignadas.split(',').map(num => num.trim());
    const relatedInvoices = clientInvoices.filter(invoice => 
        invoiceNumbers.includes(invoice.NumeroFactura)
    );

    if (relatedInvoices.length === 0) {
        return `
            <div class="invoice-info-compact">
                <h4>📄 Facturas Asignadas</h4>
                <div class="info-grid">
                    <div><strong>Referencias:</strong> ${payment.FacturasAsignadas}</div>
                    <div><strong>Estado:</strong> Facturas no encontradas en el sistema</div>
                </div>
            </div>
        `;
    }

    const invoicesHTML = relatedInvoices.map(invoice => {
        const baseAmount = parseAmount(invoice.MontoBase || 0);
        const fines = parseAmount(invoice.MontoMultas || 0);
        const totalAmount = parseAmount(invoice.MontoTotal || baseAmount);

        return `
            <div class="invoice-item">
                <div class="invoice-header">
                    <strong>${invoice.NumeroFactura}</strong>
                    <span class="invoice-status ${invoice.Estado === 'Pagado' ? 'paid' : 'pending'}">${invoice.Estado}</span>
                </div>
                <div class="invoice-details">
                    <div class="invoice-detail">
                        <span class="detail-label">Concepto:</span>
                        <span class="detail-value">${invoice.ConceptoManual || invoice.SemanaDescripcion || 'N/A'}</span>
                    </div>
                    <div class="invoice-detail">
                        <span class="detail-label">Vencimiento:</span>
                        <span class="detail-value">${formatDateForDisplay(invoice.FechaVencimiento)}</span>
                    </div>
                    <div class="invoice-detail">
                        <span class="detail-label">Monto Base:</span>
                        <span class="detail-value">₡${baseAmount.toLocaleString('es-CR')}</span>
                    </div>
                    <div class="invoice-detail">
                        <span class="detail-label">Multas:</span>
                        <span class="detail-value">₡${fines.toLocaleString('es-CR')}</span>
                    </div>
                    <div class="invoice-detail">
                        <span class="detail-label">Total:</span>
                        <span class="detail-value">₡${totalAmount.toLocaleString('es-CR')}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="invoice-info">
            <h4>📄 Facturas Asignadas</h4>
            ${invoicesHTML}
        </div>
    `;
}

// ===== FUNCIÓN PARA GENERAR MENSAJE DE WHATSAPP PARA PAGOS MANUALES =====
function generateManualPaymentWhatsAppMessage() {
    const { payment } = currentReceiptData;
    const reference = payment.Referencia || 'Sin referencia';
    const amount = parseAmount(payment.Créditos || 0);
    const date = formatDateForDisplay(payment.Fecha);
    const description = payment.Descripción || 'Sin descripción';
    const observations = payment.Observaciones || 'Sin observaciones';

    if (currentReceiptData.isUnassigned) {
        return `💰 *RECIBO DE DEPÓSITO MANUAL*

👤 *Cliente:* ${currentClient.Nombre || 'N/A'}
📅 *Fecha:* ${date}
🔢 *Referencia:* ${reference}
💵 *Monto:* ₡${amount.toLocaleString('es-CR')}

📝 *Descripción:*
${description}

💬 *Observaciones:*
${observations}

📄 *Estado:* Pendiente de aplicación a facturas

---
_Enviado desde Sistema EasyCars_`;
    } else {
        return `💰 *RECIBO DE PAGO MANUAL*

👤 *Cliente:* ${currentClient.Nombre || 'N/A'}
📅 *Fecha:* ${date}
🔢 *Referencia:* ${reference}
💵 *Monto:* ₡${amount.toLocaleString('es-CR')}

📝 *Descripción:*
${description}

💬 *Observaciones:*
${observations}

📄 *Facturas:* ${payment.FacturasAsignadas || 'Sin asignar'}

---
_Enviado desde Sistema EasyCars_`;
    }
}

// ===== EXPONER FUNCIONES AL SCOPE GLOBAL =====
window.generateReceipt = generateReceipt;
window.closeReceiptModal = closeReceiptModal;
window.printReceipt = printReceipt;
window.sendToWhatsApp = sendToWhatsApp;
window.sendToWhatsAppManual = sendToWhatsAppManual;
window.downloadReceiptPDF = downloadReceiptPDF;
window.closeWhatsAppInstructions = closeWhatsAppInstructions;
window.downloadReceiptFromInstructions = downloadReceiptFromInstructions;
window.renderUnassignedPaymentsSection = renderUnassignedPaymentsSection;
window.renderAssignedPaymentsSection = renderAssignedPaymentsSection;
window.showMultipleUnassignConfirmation = showMultipleUnassignConfirmation;
window.generateUnassignedPaymentReceipt = generateUnassignedPaymentReceipt;
window.generateManualPaymentReceipt = generateManualPaymentReceipt;
window.generateUnassignedManualPaymentReceipt = generateUnassignedManualPaymentReceipt;
window.generateManualPaymentWhatsAppMessage = generateManualPaymentWhatsAppMessage;

console.log('✅ receipt-whatsapp.js cargado - Sistema de recibos y WhatsApp con distribución múltiple');