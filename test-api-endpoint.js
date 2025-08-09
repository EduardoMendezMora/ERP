// Test script para verificar el endpoint de la API
// Ejecutar en la consola del navegador en clientes.html

console.log('🧪 INICIANDO TEST DEL ENDPOINT DE API');

// Función para probar la conexión básica a la API
async function testAPIConnection() {
    console.log('=== TEST: CONEXIÓN BÁSICA A LA API ===');
    
    try {
        // 1. Probar GET para ver si el endpoint responde
        console.log('📡 Probando GET a la API...');
        const getResponse = await fetch(`${API_URL_INVOICES}?sheet=Facturas`);
        console.log('  - Status:', getResponse.status);
        console.log('  - Status Text:', getResponse.statusText);
        
        if (getResponse.ok) {
            const data = await getResponse.json();
            console.log('  - Datos recibidos:', data.length, 'registros');
            if (data.length > 0) {
                console.log('  - Estructura del primer registro:', Object.keys(data[0]));
            }
        } else {
            console.error('  - Error en GET:', await getResponse.text());
        }
        
    } catch (error) {
        console.error('❌ Error de conexión:', error);
    }
}

// Función para probar el formato de datos que acepta la API
async function testDataFormat() {
    console.log('\n=== TEST: FORMATO DE DATOS ===');
    
    // Crear un registro de prueba simple
    const testRecord = {
        ID_Cliente: '999',
        NumeroFactura: 'TEST-001',
        SemanaNumero: '1',
        SemanaDescripcion: 'Semana de prueba',
        FechaVencimiento: '15/08/2025',
        MontoBase: '100000',
        DiasAtraso: '0',
        MontoMultas: '0',
        MontoTotal: '100000',
        Estado: 'Pendiente',
        FechaCreacion: '10/08/2025',
        FechaPago: '',
        Observaciones: 'Registro de prueba'
    };
    
    console.log('📄 Registro de prueba:', testRecord);
    
    try {
        console.log('📡 Enviando registro de prueba...');
        const response = await fetch(`${API_URL_INVOICES}?sheet=Facturas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([testRecord])
        });
        
        console.log('  - Status:', response.status);
        console.log('  - Status Text:', response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('  - Respuesta exitosa:', result);
        } else {
            const errorText = await response.text();
            console.error('  - Error de la API:', errorText);
            
            // Intentar con diferentes formatos
            await testAlternativeFormats();
        }
        
    } catch (error) {
        console.error('❌ Error de red:', error);
    }
}

// Función para probar formatos alternativos
async function testAlternativeFormats() {
    console.log('\n=== TEST: FORMATOS ALTERNATIVOS ===');
    
    const formats = [
        // Formato 1: Todos los campos como strings
        {
            ID_Cliente: '999',
            NumeroFactura: 'TEST-002',
            SemanaNumero: '1',
            SemanaDescripcion: 'Semana de prueba',
            FechaVencimiento: '15/08/2025',
            MontoBase: '100000',
            DiasAtraso: '0',
            MontoMultas: '0',
            MontoTotal: '100000',
            Estado: 'Pendiente',
            FechaCreacion: '10/08/2025',
            FechaPago: '',
            Observaciones: 'Registro de prueba'
        },
        // Formato 2: Algunos campos como números
        {
            ID_Cliente: 999,
            NumeroFactura: 'TEST-003',
            SemanaNumero: 1,
            SemanaDescripcion: 'Semana de prueba',
            FechaVencimiento: '15/08/2025',
            MontoBase: 100000,
            DiasAtraso: 0,
            MontoMultas: 0,
            MontoTotal: 100000,
            Estado: 'Pendiente',
            FechaCreacion: '10/08/2025',
            FechaPago: '',
            Observaciones: 'Registro de prueba'
        }
    ];
    
    for (let i = 0; i < formats.length; i++) {
        const format = formats[i];
        console.log(`📄 Probando formato ${i + 1}:`, format);
        
        try {
            const response = await fetch(`${API_URL_INVOICES}?sheet=Facturas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([format])
            });
            
            console.log(`  - Status formato ${i + 1}:`, response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log(`  - ✅ Formato ${i + 1} exitoso:`, result);
                break;
            } else {
                const errorText = await response.text();
                console.log(`  - ❌ Formato ${i + 1} falló:`, errorText);
            }
            
        } catch (error) {
            console.error(`  - ❌ Error en formato ${i + 1}:`, error);
        }
    }
}

// Función para verificar la estructura de la hoja de Google Sheets
async function checkSheetStructure() {
    console.log('\n=== TEST: ESTRUCTURA DE LA HOJA ===');
    
    try {
        const response = await fetch(`${API_URL_INVOICES}?sheet=Facturas`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('📊 Total de registros en la hoja:', data.length);
            
            if (data.length > 0) {
                const firstRecord = data[0];
                console.log('📋 Campos disponibles en la hoja:');
                Object.keys(firstRecord).forEach(field => {
                    console.log(`  - ${field}: ${typeof firstRecord[field]} = "${firstRecord[field]}"`);
                });
            } else {
                console.log('📋 La hoja está vacía');
            }
        } else {
            console.error('❌ No se pudo acceder a la hoja:', await response.text());
        }
        
    } catch (error) {
        console.error('❌ Error al verificar estructura:', error);
    }
}

// Función principal para ejecutar todos los tests
async function runAllTests() {
    console.log('🚀 Ejecutando todos los tests...');
    
    await testAPIConnection();
    await checkSheetStructure();
    await testDataFormat();
    
    console.log('\n✅ Todos los tests completados');
}

// Función para ejecutar un test específico
function runTest(testName) {
    switch (testName) {
        case 'connection':
            testAPIConnection();
            break;
        case 'format':
            testDataFormat();
            break;
        case 'structure':
            checkSheetStructure();
            break;
        case 'all':
            runAllTests();
            break;
        default:
            console.log('Tests disponibles: connection, format, structure, all');
            console.log('Ejemplo: runTest("all")');
    }
}

console.log('✅ Test script cargado');
console.log('📝 Para usar: runTest("all") o runTest("connection")');
