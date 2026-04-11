const CACHE_MIN = 20;
const BATCH_SIZE = 300;
const MAX_BATCHES = 3;
const ALLOWED_EXTENSIONS = ['.com', '.fr', '.io', '.org'];

async function checkDNS(name, ext) {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${name}${ext}&type=A`, {
      headers: { Accept: 'application/dns-json' }
    });
    const j = await r.json();
    return j.Status === 3;
  } catch {
    return false;
  }
}

async function queryCache(supabaseUrl, supabaseKey, { territory, mechanic, tone, extensions }) {
  const ext = extensions.filter(e => ALLOWED_EXTENSIONS.includes(e));
  if (!ext.length) return [];

  const params = new URLSearchParams({
    select: 'name,extension',
    available: 'eq.true',
    limit: '60',
    order: 'checked_at.desc'
  });

  if (territory) params.append('territory', `ilike.%${territory.split(' et ')[0].substring(0, 15)}%`);
  if (mechanic) params.append('mechanic', `ilike.%${mechanic.substring(0, 15)}%`);

  const url = `${supabaseUrl}/rest/v1/domains_cache?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.filter(d => ext.includes(d.extension));
}

async function saveToCache(supabaseUrl, supabaseKey, names, dims) {
  if (!names.length) return;
  const rows = names.map(({ name, extension, available }) => ({
    name, extension, available,
    territory: dims.territory || null,
    mechanic: dims.mechanic || null,
    tone: dims.tone || null,
    market: dims.market || null,
    checked_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }));

  await fetch(`${supabaseUrl}/rest/v1/domains_cache`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=ignore-duplicates'
    },
    body: JSON.stringify(rows)
  });
}

async function generateNames(apiKey, description, dims) {
  const prompt = `Tu es un expert senior en naming de marque, avec 15 ans d experience en agence internationale.

Genere exactement ${BATCH_SIZE} noms de domaine pour cette activite : "${description}"

PARAMETRES DE NAMING :
- Territoire semantique : ${dims.territory || 'libre'}
- Mecanique linguistique : ${dims.mechanic || 'libre'}
- Ton de marque : ${dims.tone || 'professionnel'}
- Marche cible : ${dims.market || 'France'}

REGLES ABSOLUES :
- Retourne UNIQUEMENT les noms bruts, un par ligne, sans extension, sans numerotation
- Longueur : 4 a 11 caracteres
- Pas de tirets, pas de chiffres
- Chaque nom respecte la mecanique et le territoire choisis

INTERDICTIONS STRICTES :
- Suffixes : -ify, -ly, -io, -hub, -nest, -lab, -labs, -hq, -app, -ware, -soft, -tech
- Prefixes : e-, i-, my-, get-, go-, on-, be-
- Mots generiques : flow, boost, smart, fast, quick, easy, pro, nova, next, sync, link, snap

Inspire-toi de : Stripe, Figma, Notion, Slack, Zoom, Canva.

Reponds UNIQUEMENT avec les ${BATCH_SIZE} noms, un par ligne.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const seen = new Set();
  return text.split('\n')
    .map(l => l.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(n => n.length >= 4 && n.length <= 11 && !seen.has(n) && seen.add(n));
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { description, territory, mechanic, tone, market, extensions = ['.com'] } = body;

    if (!description) {
      return new Response(JSON.stringify({ error: 'Description manquante' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_SECRET_KEY;
    const anthropicKey = context.env.ANTHROPIC_API_KEY;
    const dims = { territory, mechanic, tone, market };
    const exts = extensions.filter(e => ALLOWED_EXTENSIONS.includes(e));

    let available = [];

    // 1. Cache Supabase
    try {
      const cached = await queryCache(supabaseUrl, supabaseKey, { ...dims, extensions: exts });
      const recheckResults = await Promise.all(
        cached.map(async ({ name, extension }) => {
          const ok = await checkDNS(name, extension);
          if (!ok) {
            fetch(`${supabaseUrl}/rest/v1/domains_cache?name=eq.${name}&extension=eq.${extension}`, {
              method: 'PATCH',
              headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ available: false })
            });
          }
          return ok ? `${name}${extension}` : null;
        })
      );
      available = recheckResults.filter(Boolean);
    } catch (_) {}

    // 2. Fallback generation si cache insuffisant
    if (available.length < CACHE_MIN) {
      for (let batch = 0; batch < MAX_BATCHES && available.length < CACHE_MIN; batch++) {
        const names = await generateNames(anthropicKey, description, dims);
        const checkResults = [];
        for (const name of names) {
          for (const ext of exts) {
            const isAvailable = await checkDNS(name, ext);
            checkResults.push({ name, extension: ext, available: isAvailable });
            if (isAvailable) available.push(`${name}${ext}`);
          }
        }
        context.waitUntil(saveToCache(supabaseUrl, supabaseKey, checkResults, dims));
        if (available.length >= CACHE_MIN) break;
      }
    }

    const seen = new Set();
    const final = available.filter(d => !seen.has(d) && seen.add(d)).slice(0, 50);

    return new Response(JSON.stringify({ names: final }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Erreur serveur', detail: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
