const crypto = require('crypto');

function base64urlToBuffer(input) {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return Buffer.from(b64, 'base64');
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Fallbacks embebidos para pruebas (no usar en producción)
  const SESSION_SECRET = process.env.OTP_SECRET_SESSION || 'dev_session_secret_change_me';
  const CODE_SECRET = process.env.OTP_SECRET_CODE || 'dev_code_secret_change_me';
  if (!SESSION_SECRET || !CODE_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  try {
    const { vendorId, code, otpSession } = JSON.parse(event.body || '{}');
    if (!vendorId || !code || !otpSession) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Datos incompletos' }) };
    }

    // Validar firma del otpSession
    const parts = String(otpSession).split('.');
    if (parts.length !== 2) {
      return { statusCode: 400, body: JSON.stringify({ error: 'otpSession inválido' }) };
    }
    const [payloadB64, signatureB64] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest();
    const providedSig = base64urlToBuffer(signatureB64);
    if (!crypto.timingSafeEqual(expectedSig, providedSig)) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Firma inválida' }) };
    }

    // Decodificar payload
    const payloadJson = base64urlToBuffer(payloadB64).toString('utf8');
    const payload = JSON.parse(payloadJson);
    const now = Date.now();
    if (now > Number(payload.exp)) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Código expirado' }) };
    }
    if (String(payload.vendorId) !== String(vendorId)) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Vendor no coincide' }) };
    }

    // Validar código
    const recomputedHash = crypto.createHmac('sha256', CODE_SECRET).update(`${payload.nonce}:${code}`).digest('base64');
    const valid = crypto.timingSafeEqual(Buffer.from(recomputedHash), Buffer.from(payload.otpHash));
    if (!valid) {
      return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Código incorrecto' }) };
    }

    // Éxito
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error', detail: String(e && e.message || e) }) };
  }
};


