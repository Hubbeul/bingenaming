export async function onRequestPost(context) {
  try {
    const { description, univers } = await context.request.json();

    if (!description) {
      return new Response(JSON.stringify({ error: 'Description manquante' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = context.env.ANTHROPIC_API_KEY;

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
        messages: [{
          role: 'user',
          content: `Tu es un expert en naming d'entreprise. Génère exactement 200 noms de domaine potentiels pour cette activité : "${description}".

Univers sémantiques souhaités : ${univers || 'libre'}.

Règles strictes :
- Retourne UNIQUEMENT les noms bruts, un par ligne, sans extension, sans numérotation, sans commentaire
- Chaque nom : 4 à 12 caractères, mémorable, prononçable en français et en anglais
- Pas de tirets, pas de chiffres
- Grande variété : noms inventés (racines latines/grecques), mots anglais courts, expressions contractées, combinaisons originales
- Pas de noms génériques comme "digital", "conseil", "solutions", "consulting"
- Favorise les noms rares et originaux — les noms évidents sont déjà pris
- Varie les structures : préfixes, suffixes, fusions de mots, néologismes, racines peu exploitées

Réponds UNIQUEMENT avec les 200 noms, un par ligne.`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const names = text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 200);

    return new Response(JSON.stringify({ names }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
