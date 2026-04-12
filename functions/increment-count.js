export async function onRequestPost(context) {
  try {
    const { token } = await context.request.json();
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseSecret = context.env.SUPABASE_SECRET_KEY;

    if (context.env.AUTH_REQUIRED !== 'true') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!token) return new Response(JSON.stringify({ ok: false }), { status: 200 });

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': supabaseSecret }
    });
    const user = await userRes.json();

    await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseSecret,
        'Authorization': `Bearer ${supabaseSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ generation_count: user.generation_count + 1, updated_at: new Date().toISOString() })
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
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
