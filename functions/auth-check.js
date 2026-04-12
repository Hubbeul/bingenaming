export async function onRequestPost(context) {
  try {
    const { token } = await context.request.json();
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseSecret = context.env.SUPABASE_SECRET_KEY;

    // Si AUTH_REQUIRED est false, on laisse passer tout le monde
    if (context.env.AUTH_REQUIRED !== 'true') {
      return new Response(JSON.stringify({
        allowed: true,
        role: 'admin',
        generationCount: 0
      }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    if (!token) {
      return new Response(JSON.stringify({ allowed: false, reason: 'not_authenticated' }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Vérifier le token Supabase
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseSecret
      }
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ allowed: false, reason: 'invalid_token' }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const user = await userRes.json();
    const userId = user.id;

    // Récupérer le rôle et le compteur
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=role,generation_count`, {
        headers: {
          'apikey': supabaseSecret,
          'Authorization': `Bearer ${supabaseSecret}`
        }
      }
    );

    const profiles = await profileRes.json();
    const profile = profiles[0];

    if (!profile) {
      return new Response(JSON.stringify({ allowed: false, reason: 'no_profile' }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const { role, generation_count } = profile;

    // Rôles sans restriction
    if (role === 'admin' || role === 'beta') {
      return new Response(JSON.stringify({ allowed: true, role, generationCount: generation_count }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Rôle free : 1 génération gratuite
    if (role === 'free' && generation_count === 0) {
      return new Response(JSON.stringify({ allowed: true, role, generationCount: generation_count }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Sinon : paywall
    return new Response(JSON.stringify({ allowed: false, reason: 'paywall', role, generationCount: generation_count }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ allowed: false, reason: 'error', detail: e.message }), {
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
