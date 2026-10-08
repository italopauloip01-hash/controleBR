// Edge Function: lê fotos do abastecimento (bomba + painel) e devolve KM, litros, valor e combustível.
// A chave da Anthropic fica só no servidor: defina o secret ANTHROPIC_API_KEY no projeto Supabase.
import Anthropic from 'npm:@anthropic-ai/sdk';

const MODEL = Deno.env.get('ANTHROPIC_MODEL') || 'claude-opus-5-5';
const MAX_IMAGES = 4;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };

const READING_SCHEMA = {
    type: 'object',
    properties: {
        odometro_km: nullableNumber,
        litros: nullableNumber,
        valor_total: nullableNumber,
        preco_litro: nullableNumber,
        combustivel: { anyOf: [{ type: 'string', enum: ['gasolina', 'etanol', 'diesel', 'gnv'] }, { type: 'null' }] },
        observacoes: { type: 'string' },
    },
    required: ['odometro_km', 'litros', 'valor_total', 'preco_litro', 'combustivel', 'observacoes'],
    additionalProperties: false,
};

const PROMPT = `Você recebe fotos tiradas por um motorista brasileiro ao abastecer: normalmente uma da bomba de combustível e uma do painel do carro.

Extraia:
- odometro_km: o número do hodômetro TOTAL do painel (display digital ou mecânico), em km, como inteiro. Ignore o hodômetro parcial (TRIP A/B) quando houver os dois; se só existir um número com "TRIP", use null. Não confunda com velocímetro, conta-giros ou relógio.
- litros: o volume do display "LITROS" da bomba (ex.: "24,233" = 24.233).
- valor_total: o valor do display "TOTAL A PAGAR" / "R$" da bomba, em reais (ex.: "150,00" = 150).
- preco_litro: o display "PREÇO POR LITRO" (ex.: "6,190" = 6.19).
- combustivel: pelo rótulo da bomba ("GASOLINA COMUM/ADITIVADA" = gasolina, "ETANOL"/"ÁLCOOL" = etanol, "DIESEL S10/S500" = diesel, "GNV" = gnv). null se não der para saber.
- observacoes: frase curta em português sobre algo duvidoso (dígito ilegível, reflexo). String vazia se tudo estiver claro.

Displays de bomba usam vírgula decimal e dígitos de 7 segmentos; leia com cuidado cada dígito. Confira se litros × preço ≈ total. Use null para qualquer campo que não aparece nas fotos — nunca invente.`;

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

    if (!Deno.env.get('ANTHROPIC_API_KEY')) {
        return json({ error: 'ANTHROPIC_API_KEY não configurada no Supabase.' }, 500);
    }

    let images: { data: string; media_type: string }[];
    try {
        ({ images } = await req.json());
    } catch {
        return json({ error: 'Corpo da requisição inválido.' }, 400);
    }

    if (!Array.isArray(images) || images.length === 0) return json({ error: 'Envie ao menos uma foto.' }, 400);
    if (images.length > MAX_IMAGES) return json({ error: `Envie no máximo ${MAX_IMAGES} fotos.` }, 400);
    if (images.some(img => typeof img?.data !== 'string' || !ALLOWED_TYPES.includes(img?.media_type))) {
        return json({ error: 'Formato de imagem não suportado.' }, 400);
    }

    const client = new Anthropic();

    try {
        const response = await client.beta.messages.create({
            model: MODEL,
            max_tokens: 4000,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: {
                effort: 'low',
                format: { type: 'json_schema', schema: READING_SCHEMA },
            },
            messages: [{
                role: 'user',
                content: [
                    ...images.map(img => ({
                        type: 'image' as const,
                        source: { type: 'base64' as const, media_type: img.media_type as 'image/jpeg', data: img.data },
                    })),
                    { type: 'text' as const, text: PROMPT },
                ],
            }],
        } as any);

        if (response.stop_reason === 'refusal') {
            return json({ error: 'Não foi possível analisar essas fotos.' }, 422);
        }

        const textBlock = response.content.find((b: any) => b.type === 'text') as { text: string } | undefined;
        if (!textBlock) return json({ error: 'Resposta vazia da leitura.' }, 502);

        const reading = JSON.parse(textBlock.text);

        // Completa o campo faltante quando dois dos três valores da bomba foram lidos
        const { litros, valor_total, preco_litro } = reading;
        if (litros == null && valor_total != null && preco_litro) reading.litros = +(valor_total / preco_litro).toFixed(3);
        if (valor_total == null && litros != null && preco_litro != null) reading.valor_total = +(litros * preco_litro).toFixed(2);

        return json(reading);
    } catch (error) {
        console.error('ler-abastecimento error:', error);
        if (error instanceof Anthropic.RateLimitError) return json({ error: 'Muitas leituras seguidas, tente em instantes.' }, 429);
        if (error instanceof Anthropic.AuthenticationError) return json({ error: 'Chave da Anthropic inválida no servidor.' }, 500);
        if (error instanceof Anthropic.APIError) return json({ error: `Falha na leitura (${error.status}).` }, 502);
        return json({ error: 'Falha ao ler as fotos.' }, 500);
    }
});
