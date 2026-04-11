export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { description, territory, mechanic, tone, market } = body;

    if (!description) {
      return new Response(JSON.stringify({ error: 'Description manquante' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = context.env.ANTHROPIC_API_KEY;

    const prompt = `Tu es un expert senior en naming de marque.

Genere exactement 200 noms courts pour : "${description}"

Parametres : territoire=${territory||'libre'}, mecanique=${mechanic||'libre'}, ton=${tone||'pro'}, marche=${market||'France'}

REGLES ABSOLUES :
- Un nom par ligne, UNIQUEMENT les noms bruts, sans extension ni numerotation
- 4 a 10 caracteres, pas de tirets ni chiffres
- Interdits : -ify,-ly,-io,-hub,-lab,-hq,-app, prefixes e-/i-/my-/get-/go-/on-/be-
- Mots generiques interdits : flow,boost,smart,fast,easy,pro,nova,next,sync,link,snap
- Favorise les noms rares, originaux, memorables
- Inspire-toi de : Stripe, Figma, Notion, Slack, Zoom, Canva

Reponds avec exactement 200 noms, un par ligne.`;

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
    const names = text.split('\n')
      .map(l => l.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter(n => n.length >= 4 && n.length <= 10 && !seen.has(n) && seen.add(n))
      .slice(0, 200);

    return new Response(JSON.stringify({ names }), {
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
