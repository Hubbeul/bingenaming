exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { description, univers } = JSON.parse(event.body);

  if (!description) {
    return { statusCode: 400, body: JSON.stringify({ error: "Description manquante" }) };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Tu es un expert en naming d'entreprise. Génère exactement 50 noms de domaine potentiels pour cette activité : "${description}".

Univers sémantiques souhaités : ${univers || "libre"}.

Règles strictes :
- Retourne UNIQUEMENT les noms bruts, un par ligne, sans extension, sans numérotation, sans commentaire
- Chaque nom : 4 à 12 caractères, mémorable, prononçable en français et en anglais
- Pas de tirets, pas de chiffres
- Mélange de noms inventés (racines latines/grecques), de mots anglais courts, et d'expressions contractées
- Pas de noms génériques comme "digital", "conseil", "solutions", "consulting"
- Chaque nom doit avoir une logique sémantique défendable en lien avec l'activité décrite

Réponds UNIQUEMENT avec les 50 noms, un par ligne.`
      }]
    })
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  const names = text.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 50);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ names })
  };
};
