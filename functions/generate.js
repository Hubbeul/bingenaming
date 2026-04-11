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

    const prompt = `Tu es un expert mondial en naming de marque (Nike, Spotify, Figma, Notion, Canva).

Mission : generer 200 noms de domaine ORIGINAUX pour : "${description}"
Territoire : ${territory||'libre'} | Mecanique : ${mechanic||'neologisme'} | Ton : ${tone||'pro'} | Marche : ${market||'France'}

STRATEGIE OBLIGATOIRE pour maximiser la disponibilite :
- Privilege les NEOLOGISMES PURS : mots inventés qui n'existent dans aucune langue (ex: Zalando, Spotify, Kodak)
- Utilise des RACINES RARES : termes issus du gaelique, basque, swahili, islandais, sanskrit — sonoritees exotiques mais prononçables
- FUSIONNE deux mots partiels de facon inattendue (ex: Figma = fig+ma, Pinterest = pin+interest)
- TRONQUE brutalement un concept (ex: Reddit, Tumblr)
- Cree des SONORITEES PURES sans signification directe mais memorables (ex: Zoom, Slack)

INTERDICTIONS ABSOLUES (noms certainement pris) :
- Mots anglais courants seuls : lens, forge, beacon, prism, vault, surge, bridge, craft, wave, peak, arc, core, axis, base, edge, node, root, stem, bolt, spark, glow, rise, lift, shift, pivot, frame, grid, beam, chain, flow, loop, gate, hub, lab, nest
- Suffixes usés : -ify, -ly, -io, -hub, -lab, -hq, -app, -ware, -tech, -soft, -digital, -online
- Prefixes usés : e-, i-, my-, get-, go-, on-, be-, re-
- Noms de plus de 11 caracteres

FORMAT : exactement 200 noms, un par ligne, sans extension, sans numero, sans commentaire.`;

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
      .filter(n => n.length >= 4 && n.length <= 11 && !seen.has(n) && seen.add(n))
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
