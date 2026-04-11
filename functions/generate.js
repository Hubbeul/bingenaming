const CACHE_MIN = 20;
const MAX_BATCHES = 2;
const ALLOWED_EXTENSIONS = ['.com', '.fr', '.io', '.org'];
const DNS_CONCURRENCY = 10;

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

async function checkDNSBatch(pairs) {
  const results = [];
  for (let i = 0; i < pairs.length; i += DNS_CONCURRENCY) {
    const chunk = pairs.slice(i, i + DNS_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async ({ name, ext }) => {
        const available = await checkDNS(name, ext);
        return { name, ext, available };
      })
    );
    results.push(...chunkResults);
    if (results.filter(r => r.available).length >= CACHE_MIN) break;
  }
  return results;
}

async function queryCache(supabaseUrl, supabaseKey, { territory, mechanic, extensions }) {
  const ext = extensions.filter(e => ALLOWED_EXTENSIONS.includes(e));
  if (!ext.length) return [];

  const params = new URLSearchParams({
    select: 'name,extension',
    available: 'eq.true',
    limit: '40',
    order: 'checked_at.desc'
  });

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
  return data.filter(d => ext.includes(d.extension)).slice(0, 30);
}

async function saveToCache(supabaseUrl, supabaseKey, rows) {
  if (!rows.length) return;
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
  const prompt = `Tu es un expert senior en naming de marque.

Genere exactement 80 noms courts pour : "${description}"

Parametres : territoire=${dims.territory||'libre'}, mecanique=${dims.mechanic||'libre'}, ton=${dims.tone||'pro'}, marche=${dims.market||'France'}

REGLES :
- Un nom par ligne, UNIQUEMENT les noms bruts
- 4 a 10 caracteres, pas de tirets ni chiffres
- Interdits : -ify,-ly,-io,-hub,-lab,-hq,-app, prefixes e-/i-/my-/get-/go-
- Mots generiques interdits : flow,boost,smart,fast,easy,pro,nova,next,sync

Reponds avec 80 noms, un par ligne.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const seen = new Set();
  return text.split('\n')
    .map(l => l.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(n => n.length >= 4 && n.length <= 10 && !seen.has(n) && seen.add(n))
    .slice(0, 80);
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
    if (!exts.length) exts.push('.com');

    let available = [];

    // 1. Cache Supabase (1 requête HTTP)
    try {
      const cached = await queryCache(supabaseUrl, supabaseKey, { ...dims, extensions: exts });
      if (cached.length > 0) {
        const pairs = cached.map(({ name, extension }) => ({ name, ext: extension }));
        const recheckResults = await checkDNSBatch(pairs);
        available = recheckResults.filter(r => r.available).map(r => `${r.name}${r.ext}`);

        // Invalider les noms pris (1 requête HTTP max)
        const taken = recheckResults.filter(r => !r.available);
        if (taken.length > 0) {
          const names = taken.map(r => r.name).join(',');
          fetch(`${supabaseUrl}/rest/v1/domains_cache?name=in.(${names})`, {
            method: 'PATCH',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ available: false })
          });
        }
      }
    } catch (_) {}

    // 2. Fallback génération si cache insuffisant
    if (available.length < CACHE_MIN) {
      for (let batch = 0; batch < MAX_BATCHES && available.length < CACHE_MIN; batch++) {
        const names = await generateNames(anthropicKey, description, dims);
        const pairs = [];
        for (const name of names) {
          for (const ext of exts) pairs.push({ name, ext });
        }

        const dnsResults = await checkDNSBatch(pairs);

        // Sauvegarder dans cache (1 requête HTTP)
        const cacheRows = dnsResults.map(({ name, ext, available: av }) => ({
          name, extension: ext, available: av,
          territory: territory || null, mechanic: mechanic || null,
          tone: tone || null, market: market || null,
          checked_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }));

        context.waitUntil(saveToCache(supabaseUrl, supabaseKey, cacheRows));

        const newAvail = dnsResults.filter(r => r.available).map(r => `${r.name}${r.ext}`);
        available.push(...newAvail);

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
