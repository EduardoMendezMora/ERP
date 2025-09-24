// ===== CONFIGURACIÓN DE API =====
const API_URL_CLIENTS = 'https://sheetdb.io/api/v1/qu62bagiwlgqy';

// ===== VARIABLES GLOBALES =====
let clients = [];
// Verificar si currentClient ya existe antes de declararlo
if (typeof currentClient === 'undefined') {
    let currentClient = null;
}
let isEditing = false;

// Exponer currentClient globalmente si no existe
if (typeof window.currentClient === 'undefined') {
    window.currentClient = currentClient;
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    loadClients();
    setupClientEventListeners();
});

async function loadClients() {
    showClientLoading(true);
    try {
        const response = await fetch(`${API_URL_CLIENTS}?sheet=Clientes`);
        if (!response.ok) throw new Error('Error al cargar clientes');
        const data = await response.json();
        clients = Array.isArray(data) ? data : [];
        renderClients(clients);
    } catch (error) {
        showToast('Error al cargar clientes: ' + error.message, 'error');
    } finally {
        showClientLoading(false);
    }
}

function setupClientEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filterClients(e.target.value);
        });
    }
    const form = document.getElementById('clientForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateClientForm()) saveClient();
        });
    }
}

function renderClients(clientsToRender, selectedClientId = null) {
    const grid = document.getElementById('clientsGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid || !emptyState) return;
    if (!clientsToRender || clientsToRender.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';
    grid.innerHTML = clientsToRender.map(client => `
        <div class="client-card${selectedClientId && client.ID.toString() === selectedClientId.toString() ? ' selected' : ''}" id="card-${client.ID}">
            <div class="client-header">
                <div class="client-info">
                    <div class="client-name">${client.Nombre || 'Sin nombre'}</div>
                    <div class="client-id">ID: ${client.ID || 'Sin ID'}</div>
                </div>
                <div class="client-actions">
                    <button class="btn btn-secondary" onclick="editClient('${client.ID}')">✏️ Editar</button>
                    <button class="btn btn-danger" onclick="deleteClient('${client.ID}')">🗑️ Eliminar</button>
                    <button class="btn btn-primary" onclick="selectClient('${client.ID}')">Seleccionar</button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterClients(searchTerm) {
    if (!searchTerm.trim()) {
        renderClients(clients);
        return;
    }
    const filtered = clients.filter(client => 
        (client.Nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.ID || '').toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderClients(filtered);
}

function showClientLoading(show) {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('clientsGrid');
    if (!loading || !grid) return;
    loading.style.display = show ? 'block' : 'none';
    grid.style.display = show ? 'none' : 'grid';
}

function validateClientForm() {
    const id = document.getElementById('ID').value.trim();
    const name = document.getElementById('Nombre').value.trim();
    if (!id || !name) {
        showToast('ID y Nombre son obligatorios', 'error');
        return false;
    }
    return true;
}

async function saveClient() {
    const formData = {
        ID: document.getElementById('ID').value.trim(),
        Nombre: document.getElementById('Nombre').value.trim(),
        numeroTelefono: document.getElementById('numeroTelefono').value.trim(),
        idGrupoWhatsapp: document.getElementById('idGrupoWhatsapp').value.trim(),
        Placa: document.getElementById('Placa').value.trim(),
        montoContrato: document.getElementById('montoContrato').value.trim(),
        fechaContrato: document.getElementById('fechaContrato').value.trim(),
        plazoContrato: document.getElementById('plazoContrato').value.trim(),
        diaPago: document.getElementById('diaPago').value.trim()
    };
    try {
        let response;
        if (isEditing && currentClient) {
            const updateUrl = `${API_URL_CLIENTS}/ID/${currentClient.ID}`;
            const params = new URLSearchParams();
            params.append('sheet', 'Clientes');
            Object.keys(formData).forEach(key => {
                if (formData[key] !== '' && key !== 'ID') {
                    params.append(key, formData[key]);
                }
            });
            response = await fetch(`${updateUrl}?${params.toString()}`, { method: 'PATCH' });
        } else {
            response = await fetch(`${API_URL_CLIENTS}?sheet=Clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        }
        if (!response.ok) throw new Error('Error al guardar cliente');
        cancelEdit();
        await loadClients();
        
        // Mejorar experiencia de usuario: filtrar y mostrar solo el cliente recién guardado
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            // Llenar el campo de búsqueda con el nombre del cliente
            searchInput.value = formData.Nombre;
            // Filtrar la lista para mostrar solo este cliente
            filterClients(formData.Nombre);
        }
        
        // Resaltar el cliente recién guardado
        renderClients(clients, formData.ID);
        
        // Hacer scroll hacia la tarjeta del cliente
        setTimeout(() => {
            const clientCard = document.getElementById(`card-${formData.ID}`);
            if (clientCard) {
                clientCard.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        }, 100);
        
        showToast(isEditing ? 'Cliente actualizado' : 'Cliente creado', 'success');
    } catch (error) {
        showToast('Error al guardar cliente: ' + error.message, 'error');
    }
}

function editClient(clientId) {
    const client = clients.find(c => c.ID.toString() === clientId.toString());
    if (!client) return;
    currentClient = client;
    window.currentClient = client;
    isEditing = true;
    document.getElementById('ID').value = client.ID || '';
    document.getElementById('Nombre').value = client.Nombre || '';
    document.getElementById('numeroTelefono').value = client.numeroTelefono || '';
    document.getElementById('idGrupoWhatsapp').value = client.idGrupoWhatsapp || '';
    document.getElementById('Placa').value = client.Placa || '';
    document.getElementById('montoContrato').value = client.montoContrato || '';
    document.getElementById('fechaContrato').value = client.fechaContrato || '';
    document.getElementById('plazoContrato').value = client.plazoContrato || '';
    document.getElementById('diaPago').value = client.diaPago || '';
}

function cancelEdit() {
    currentClient = null;
    window.currentClient = null;
    isEditing = false;
    document.getElementById('clientForm').reset();
}

async function deleteClient(clientId) {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
        const response = await fetch(`${API_URL_CLIENTS}/ID/${clientId}?sheet=Clientes`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar cliente');
        await loadClients();
        showToast('Cliente eliminado', 'success');
    } catch (error) {
        showToast('Error al eliminar cliente: ' + error.message, 'error');
    }
}

function selectClient(clientId) {
    const client = clients.find(c => c.ID.toString() === clientId.toString());
    if (!client) return;
    currentClient = client;
    window.currentClient = client;
    showToast(`Cliente seleccionado: ${client.Nombre}`, 'success');
    // Redirigir a la página de facturas
    window.location.href = `https://arrendautos.app/facturas.html?clientId=${clientId}`;
}

function viewInvoices(clientId) {
    window.location.href = `https://arrendautos.app/facturas.html?clientId=${clientId}`;
}

function showToast(message, type) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
} 