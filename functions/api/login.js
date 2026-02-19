// =====================================================
// POST /api/login - Autenticacao admin server-side
// Cloudflare Pages Function (Web Crypto API)
// =====================================================

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export async function onRequestPost(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    try {
        const { senha } = await context.request.json();

        if (!senha) {
            return new Response(
                JSON.stringify({ ok: false, erro: 'Senha nao informada.' }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Verificar senha contra variavel de ambiente (suporta multiplas separadas por virgula)
        const senhasValidas = (context.env.ADMIN_PASSWORD || '').split(',').map(s => s.trim()).filter(Boolean);

        if (senhasValidas.length === 0) {
            return new Response(
                JSON.stringify({ ok: false, erro: 'Configuracao de autenticacao ausente.' }),
                { status: 500, headers: corsHeaders }
            );
        }

        const senhaCorreta = senhasValidas.includes(senha);

        if (!senhaCorreta) {
            return new Response(
                JSON.stringify({ ok: false, erro: 'Senha incorreta.' }),
                { status: 401, headers: corsHeaders }
            );
        }

        // Gerar token HMAC-SHA256 assinado com expiracao de 24h
        const secret = context.env.TOKEN_SECRET || context.env.ADMIN_PASSWORD;
        const expira = Date.now() + 24 * 60 * 60 * 1000; // 24h
        const payload = `admin:${expira}`;

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            new TextEncoder().encode(payload)
        );

        const sigHex = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const token = `${payload}.${sigHex}`;

        return new Response(
            JSON.stringify({ ok: true, token }),
            { status: 200, headers: corsHeaders }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ ok: false, erro: 'Erro interno do servidor.' }),
            { status: 500, headers: corsHeaders }
        );
    }
}
