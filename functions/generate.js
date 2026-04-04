export async function onRequestPost(context) {
  try {
    const { description, territory, mechanic, tone, market } = await context.request.json();

    if (!description) {
      return new Response(JSON.stringify({ error: 'Description manquante' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = context.env.ANTHROPIC_API_KEY;

    const expertPrompt = `Tu es un expert senior en naming de marque, avec 15 ans d'expérience en agence internationale.

Génère exactement 200 noms de domaine pour cette activité : "${description}"

PARAMÈTRES DE NAMING CHOISIS PAR LE CLIENT :
- Territoire sémantique (ce que le nom évoque) : ${territory || 'libre'}
- Mécanique linguistique (comment le nom est construit) : ${mechanic || 'libre'}
- Ton de marque : ${tone || 'professionnel'}
- Marché cible : ${market || 'France'}

RÈGLES ABSOLUES :
- Retourne UNIQUEMENT les noms bruts, un par ligne, sans extension, sans numérotation, sans commentaire
- Longueur : 4 à 11 caractères maximum
- Prononçable facilement dans la langue du marché cible
- Pas de tirets, pas de chiffres
- Chaque nom doit respecter la mécanique linguistique choisie
- Chaque nom doit évoquer le territoire sémantique choisi
- Chaque nom doit projeter le ton de marque choisi

INTERDICTIONS STRICTES (patterns saturés, .com tous pris) :
- Suffixes : -ify, -ly, -io, -hub, -nest, -lab, -labs, -hq, -app, -ware, -soft, -tech, -digital
- Préfixes : e-, i-, my-, get-, go-, on-, be-
- Mots trop génériques : flow, boost, smart, fast, quick, easy, pro, plus, max, prime, nova, next
- Noms de plus de 12 caractères

CRITÈRES DE QUALITÉ D'UN GRAND NOM :
- Mémorable en une lecture (test des 2 secondes)
- Aucune connotation négative dans les langues du marché
- Suggère sans décrire littéralement
- Sonne comme une marque établie, pas comme un domaine de seconde zone
- Potentiellement défendable comme marque déposée

Inspire-toi des mécaniques qui ont produit : Stripe, Figma, Notion, Slack, Zoom, Canva, Prism, Bolt — chacun court, original, disponible à l'époque, prononçable partout.

Réponds UNIQUEMENT avec les 200 noms, un par ligne.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: expertPrompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const seen = new Set();
    const names = text.split('\n')
      .map(l => l.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter(n => n.length >= 3 && n.length <= 12 && !seen.has(n) && seen.add(n))
      .slice(0, 200);

    return new Response(JSON.stringify({ names }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
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
