function buildPrompt(description, strategy, impression, market) {
  return `Tu es un expert senior en naming de marques et de noms de domaine.

Ta mission :
Générer des noms de domaine de haute qualité pour des entrepreneurs, freelances, associations, créateurs de projets ou petites entreprises.

Le but n'est pas de produire des mots aléatoires.
Le but est de proposer des noms :
* crédibles comme marque
* agréables à l'oreille
* faciles à prononcer
* mémorisables
* cohérents avec l'activité décrite
* compatibles avec un usage en nom de domaine
* avec une probabilité raisonnable d'être encore disponibles

PARAMÈTRES UTILISATEUR

Description de l'activité : ${description}

Stratégie de naming choisie : ${strategy || 'marque_inventee'}

Impression recherchée : ${impression || 'confiance'}

Marché cible : ${market || 'france'}

CONTRAINTES GÉNÉRALES

1. Tous les noms doivent être adaptés à un nom de domaine, en priorité .com.
2. Évite les noms trop longs. Vise idéalement 5 à 10 lettres.
3. Évite les tirets, chiffres, orthographes confuses, doubles lettres inutiles.
4. Évite les noms trop proches de marques mondialement connues.
5. Évite les noms laids, bancals, imprononçables ou composés de syllabes qui sonnent faux.
6. Évite les noms trop génériques sauf si la stratégie est "descriptif_fort".
7. Évite les noms trop probablement déjà pris : mots du dictionnaire très simples, noms de startups célèbres, assemblages très évidents.
8. Privilégie des noms fluides, distinctifs, cohérents avec le territoire de marque.

ADAPTATION SELON LA STRATÉGIE

Si stratégie = marque_inventee : crée des noms inventés mais naturels, élégants, crédibles. Éviter les suites de syllabes absurdes.
Si stratégie = mot_detourne : partir d'un mot existant, le transformer subtilement, conserver une familiarité.
Si stratégie = sens_cache : suggérer indirectement une idée ou une valeur. Éviter le trop opaque.
Si stratégie = histoire_courte : noms évocateurs, narratifs, avec un imaginaire léger. Rester courts.
Si stratégie = descriptif_fort : noms lisibles et immédiatement compréhensibles, avec une qualité de marque suffisante.

ADAPTATION SELON L'IMPRESSION

confiance → stabilité, clarté, sérieux, équilibre sonore
elan → énergie, mouvement, dynamique, rythme
precision → netteté, structure, maîtrise, rigueur
douceur → fluidité, rondeur, simplicité, chaleur
audace → singularité, tension créative, impact
profondeur → densité, élégance, gravité, relief
legerete → souplesse, simplicité, fraîcheur
puissance → assise, intensité, force, autorité

ADAPTATION SELON LE MARCHÉ

france → faciles à lire et prononcer pour un francophone
europe → prononçables dans plusieurs langues européennes
international → très fluides, simples, courts, robustes en anglais

PROCESSUS OBLIGATOIRE (sans afficher les brouillons) :
1. Analyse le territoire de marque implicite.
2. Génère un grand pool interne de noms potentiels.
3. Élimine les noms laids, absurdes, artificiels, banals, trop proches d'une marque connue.
4. Classe les meilleurs par qualité de marque.
5. Retourne seulement les 60 meilleurs.

FORMAT DE SORTIE

Retourne exactement 60 noms en JSON, répartis en 3 groupes :
* 20 noms "safe" : les plus crédibles, sobres, exploitables
* 20 noms "distinctif" : plus originaux mais encore sérieux
* 20 noms "creatif" : plus audacieux, tout en restant prononçables

Pour chaque proposition :
{
  "name": "le nom seul sans extension",
  "style": "safe" | "distinctif" | "creatif",
  "short_reason": "5 à 10 mots expliquant l'intérêt du nom"
}

IMPORTANT :
* Retourne UNIQUEMENT le tableau JSON, rien d'autre
* Pas de commentaires, pas de markdown, pas de backticks
* Aucun doublon
* Aucun nom volontairement absurde`;
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { description, strategy, impression, market } = body;

    if (!description) {
      return new Response(JSON.stringify({ error: 'Description manquante' }), {
        status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const apiKey = context.env.ANTHROPIC_API_KEY;
    const prompt = buildPrompt(description, strategy, impression, market);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const text = (data.content?.[0]?.text || '').trim();

    let names = [];
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      names = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      // Fallback : extraire les noms bruts si JSON invalide
      const fallback = text.split('\n')
        .map(l => l.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter(n => n.length >= 4 && n.length <= 12);
      names = fallback.map(n => ({ name: n, style: 'safe', short_reason: '' }));
    }

    // Dédoublonnage
    const seen = new Set();
    const unique = names.filter(n => {
      if (!n.name || seen.has(n.name.toLowerCase())) return false;
      seen.add(n.name.toLowerCase());
      return true;
    });

    return new Response(JSON.stringify({ names: unique }), {
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
