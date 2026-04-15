const STRATEGY_PROMPTS = {
  invented: `Crée des néologismes purs prononçables, inexistants dans tout dictionnaire. Chaque nom doit avoir une logique sonore interne défendable : une voyelle tonique identifiable, un rythme syllabique naturel (1-2 syllabes), une consonne dominante cohérente avec l'impression émotionnelle ciblée. Le nom doit sembler évident une fois entendu, comme s'il avait toujours existé. Inspire-toi de : Meetic, Zalando, Spotify, Kodak.`,
  detour: `Prends des mots existants dans n'importe quelle langue — anglais, français, latin, langues nordiques, japonais — et transplante-les dans un contexte inattendu. Le décalage entre le sens original et le secteur crée la mémorabilité. Le mot doit être court, prononçable universellement, et créer une image mentale forte même hors de son contexte original. Inspire-toi de : Apple (pomme → tech), Slack (mou → collaboration), Amazon (fleuve → immensité).`,
  hidden: `Construis des noms à double lecture simultanée : une couche immédiate accessible à tous, une couche profonde qui récompense ceux qui la découvrent. Fusions de mots partiels, glissements étymologiques, jeux sémantiques. Les deux lectures doivent coexister harmonieusement. Inspire-toi de : Meetic (meet+mythique), Reddit (read it), Pinterest (pin+interest), Figma (fig+ma).`,
  story: `Génère des expressions courtes de 2 à 4 mots qui racontent quelque chose, créent une connivence immédiate avec la cible, et sonnent comme une phrase naturelle prononcée dans une conversation. L'expression doit avoir un rythme oral, une intention claire, et provoquer soit un sourire, soit une identification immédiate. Maximum 25 caractères au total. Inspire-toi de : WelcomeToTheJungle, DollarShaveClub.`,
  descriptive: `Assemble des mots-clés qui disent clairement ce que fait l'entreprise, avec une économie de mots extrême et une sonorité forte. Évite le générique. Cherche l'évidence bien tournée : un mot simple qui dit tout sans en avoir l'air. Doit être immédiatement compréhensible et projeter la clarté et la compétence. Inspire-toi de : Booking, Canva, Stripe, Zoom.`
};

const IMPRESSION_PROMPTS = {
  confiance: `Phonosémantique CONFIANCE : utilise des consonnes nasales (M, N) et liquides (L, R) qui résonnent. Voyelles graves et ouvertes (O, OU, A). Évite les plosives agressives. Le nom doit sonner stable et ancré, comme quelque chose sur lequel on peut s'appuyer.`,
  trust: `Phonosemantics TRUST: use nasal (M, N) and liquid consonants (L, R) that resonate. Dark, open vowels (O, U, A). Avoid aggressive plosives. The name must sound stable and grounded.`,
  élan: `Phonosémantique ÉLAN : commence par une fricative fluide (S, F, L, R) qui donne l'élan, termine par une plosive nette (T, K) qui donne la direction. Le mouvement doit s'entendre dans la prononciation.`,
  momentum: `Phonosemantics MOMENTUM: start with a flowing fricative (S, F, L, R) for momentum, end with a clean plosive (T, K) for direction. Motion must be audible in pronunciation.`,
  précision: `Phonosémantique PRÉCISION : consonnes plosives dures (K, T, P) et voyelles antérieures hautes (I, É). Court, sec, net. Doit sonner comme une décision prise sans hésitation.`,
  precision: `Phonosemantics PRECISION: hard plosive consonants (K, T, P) with high front vowels (I, E). Short, dry, sharp. Must sound like a decision made without hesitation.`,
  douceur: `Phonosémantique DOUCEUR : consonnes liquides et nasales (L, M, N, V). Voyelles ouvertes et rondes (A, E, O). Aucune plosive agressive. Le nom doit couler naturellement dans la bouche.`,
  softness: `Phonosemantics SOFTNESS: liquid and nasal consonants (L, M, N, V). Open, round vowels (A, E, O). No aggressive plosives. The name must flow naturally.`,
  audace: `Phonosémantique AUDACE : attaque plosive forte dès la première syllabe (B, D, G, K). Voyelle tonique ouverte et portante (A, O). Le nom doit frapper avant même qu'on ait fini de le prononcer.`,
  boldness: `Phonosemantics BOLDNESS: strong plosive attack on the first syllable (B, D, G, K). Open, carrying tonic vowel (A, O). The name must strike before you've finished saying it.`,
  profondeur: `Phonosémantique PROFONDEUR : voyelles graves et arrondies (O, U, OU) avec résonance nasale. Doit résonner, pas claquer. Terminaison ouverte, pas coupée.`,
  depth: `Phonosemantics DEPTH: dark, rounded vowels (O, U) with nasal resonance. Must resonate, not snap. Open ending, not cut short.`,
  légèreté: `Phonosémantique LÉGÈRETÉ : consonnes légères (F, V, L, S). Voyelles hautes et claires (I, É, E). Peu de syllabes, tonalité haute. Doit sembler léger à prononcer.`,
  lightness: `Phonosemantics LIGHTNESS: light consonants (F, V, L, S). High, clear vowels (I, E). Few syllables, high register. Must feel effortless to say.`,
  puissance: `Phonosémantique PUISSANCE : attaque plosive forte (B, K, D, G), voyelle tonique grave (O, A), terminaison nette. Une ou deux syllabes maximum. Doit imposer dès le premier phonème.`,
  power: `Phonosemantics POWER: strong plosive attack (B, K, D, G), dark tonic vowel (O, A), clean ending. One or two syllables max. Must impose from the first phoneme.`
};

const MARKET_PROMPTS = {
  france: `Marché FRANCE : prononçable naturellement par un francophone sans effort ni hésitation. Évite : TH anglais, SH, TZ, groupes consonantiques inexistants en français. Teste mentalement : un Français de 40 ans pourrait-il le dire sans qu'on le lui épelle ?`,
  europe: `Market EUROPE: pronounceable without effort in French, English, Spanish, German, Italian. No sounds specific to one language. Avoid: French nasal vowels (an, on, in), French R, closed French U, heavy German CH.`,
  international: `Market INTERNATIONAL: pronounceable in all major world languages. Avoid: French R, closed French U, nasal sounds, L/R distinction (difficult in Mandarin/Japanese), complex consonant clusters, ambiguous long vowels, sounds absent from Arabic (P is rare, V absent).`
};

function buildPrompt(description, strategy, impression, market) {
  const stratKey = strategy || 'invented';
  const impKey = impression || 'confiance';
  const mktKey = (market || 'france').toLowerCase();

  const stratPrompt = STRATEGY_PROMPTS[stratKey] || STRATEGY_PROMPTS.invented;
  const impPrompt = IMPRESSION_PROMPTS[impKey] || IMPRESSION_PROMPTS.confiance;
  const mktPrompt = MARKET_PROMPTS[mktKey] || MARKET_PROMPTS.france;

  return `Tu es un expert senior en naming de marque avec 15 ans d'expérience en agence internationale. Tu maîtrises la phonosémantique, la psychologie cognitive de la mémorisation et les contraintes du naming professionnel.

ACTIVITE CIBLE : "${description}"

STRATEGIE DE NAMING :
${stratPrompt}

PHONOSEMANTIQUE :
${impPrompt}

MARCHE :
${mktPrompt}

FILTRES AUTOMATIQUES (non négociables) :
- 4 à 12 caractères maximum pour les noms simples, 25 max pour les expressions en 2 mots collés
- 1 à 2 syllabes de préférence
- Pas de tirets, pas de chiffres
- Interdits absolus : -ify, -ly, -io, -hub, -lab, -hq, -app, -ware, -tech, -soft, -digital
- Préfixes interdits : e-, i-, my-, get-, go-, on-, be-
- Mots génériques interdits : flow, boost, smart, fast, easy, pro, nova, next, sync, link, snap, forge, lens, beacon, prism, vault, surge, bridge, wave, peak, arc, core, axis

DIVERSITE OBLIGATOIRE — règle la plus importante :
- Aucun nom ne doit partager les 3 premières lettres avec un autre nom de la liste
- Aucun nom ne doit être une simple variation d'un autre (même radical + terminaison différente)
- Exemples de ce qui est INTERDIT : drakso/dravso (même racine), groxek/groxol (même racine)
- Chaque nom doit être construit sur un radical phonétique DIFFERENT

VARIETE DE FORME OBLIGATOIRE :
Répartis tes 50 propositions ainsi :
- 10 noms très courts : 4-5 caractères (ex: Kora, Zeft, Obia)
- 25 noms courts : 6-7 caractères (ex: Vektro, Lumora)
- 10 noms moyens : 8-10 caractères (ex: Aerovance, Kryptalis)
- 5 expressions en 2 mots collés (ex: Boldmove, Clearspot)

REGISTRES A ALTERNER (ne pas rester dans un seul registre) :
- Noms inventés purs avec logique sonore
- Mots anglais courts détournés de leur sens
- Mots français rares ou oubliés remis au goût du jour
- Expressions familières ou idiomatiques contractées
- Références culturelles légères (sans copyright)

TEST ORAL OBLIGATOIRE avant de valider chaque nom :
1. "Je travaille chez [nom]" — sonne-t-il naturel ?
2. "Tu connais [nom] ?" — est-il facile à dire ?
3. "Bonjour, [nom], comment puis-je vous aider ?" — projette-t-il confiance ?
Ne retiens que les noms qui passent les 3.

EXIGENCE DE QUALITE : tu génères 50 noms, pas plus. Chaque nom doit être irréprochable. Un nom médiocre ne vaut pas sa place dans la liste — supprime-le plutôt que de remplir le quota.

FORMAT : réponds avec exactement 50 noms, un par ligne, sans extension, sans numéro, sans commentaire.`;
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { description, strategy, impression, market } = body;

    if (!description) {
      return new Response(JSON.stringify({ error: 'Description manquante' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
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
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const seen = new Set();
    const names = text.split('\n')
      .map(l => l.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter(n => n.length >= 4 && n.length <= 25 && !seen.has(n) && seen.add(n))
      .slice(0, 50);

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
