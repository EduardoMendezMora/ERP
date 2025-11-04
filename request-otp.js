const crypto = require('crypto');

function hmacBase64(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64');
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Fallbacks embebidos para pruebas (no usar en producción)
  const INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID || 'instance112077';
  const ULTRA_TOKEN = process.env.ULTRAMSG_TOKEN || 'wp98xs1qrfhqg9ya';
  const SESSION_SECRET = process.env.OTP_SECRET_SESSION || 'dev_session_secret_change_me';
  const CODE_SECRET = process.env.OTP_SECRET_CODE || 'dev_code_secret_change_me';

  if (!INSTANCE_ID || !ULTRA_TOKEN || !SESSION_SECRET || !CODE_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  try {
    const { vendorId } = JSON.parse(event.body || '{}');
    if (!vendorId || !/^\d{5,}$/.test(String(vendorId))) {
      return { statusCode: 400, body: JSON.stringify({ error: 'vendorId inválido' }) };
    }

    // Buscar usuario en SheetDB (privado desde función)
    const sheetUrl = `https://sheetdb.io/api/v1/qu62bagiwlgqy?sheet=Usuarios&id=${encodeURIComponent(vendorId)}`;
    const userResp = await fetch(sheetUrl);
    if (!userResp.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Error consultando usuarios' }) };
    }
    const users = await userResp.json();
    if (!Array.isArray(users) || users.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Usuario no encontrado' }) };
    }
    const user = users[0];
    const phone = user.telefono || user.telefonoWhatsapp || user.telefono_whatsapp || user.whatsapp || '';
    if (!phone) {
      return { statusCode: 422, body: JSON.stringify({ error: 'Usuario sin teléfono registrado' }) };
    }

    // Generar OTP de 4 dígitos (para encajar con la UI actual)
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Preparar sesión OTP stateless
    const nonce = crypto.randomBytes(16).toString('hex');
    const expMs = Date.now() + 5 * 60 * 1000; // 5 minutos
    const otpHash = hmacBase64(CODE_SECRET, `${nonce}:${otp}`);
    const payload = { vendorId: String(vendorId), nonce, exp: expMs, otpHash };
    const payloadJson = JSON.stringify(payload);
    const payloadB64 = base64url(payloadJson);
    const signature = base64url(crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest());
    const otpSession = `${payloadB64}.${signature}`;

    // Enviar WhatsApp por UltraMSG
    const ultraUrl = `https://api.ultramsg.com/${INSTANCE_ID}/messages/chat`;
    const message = `Tu código de acceso es ${otp}. Válido por 5 minutos. No lo compartas.`;
    const body = new URLSearchParams();
    body.append('token', ULTRA_TOKEN);
    body.append('to', phone);
    body.append('body', message);

    const sendResp = await fetch(ultraUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!sendResp.ok) {
      const errText = await sendResp.text().catch(() => '');
      return { statusCode: 502, body: JSON.stringify({ error: 'Error enviando WhatsApp', detail: errText }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, otpSession })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error', detail: String(e && e.message || e) }) };
  }
};


