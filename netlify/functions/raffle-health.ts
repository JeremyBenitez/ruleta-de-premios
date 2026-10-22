function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse(405, { error: 'Método no permitido.' })
  }

  const origin = request.headers.get('origin')
  const allowedOrigins = [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(
    (value): value is string => Boolean(value)
  )
  const isLocalDevelopmentOrigin =
    origin !== null &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  if (!origin || (!allowedOrigins.includes(origin) && !isLocalDevelopmentOrigin)) {
    return jsonResponse(403, { error: 'Origen no permitido.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase raffle environment variables are not configured.')
    return jsonResponse(503, { error: 'El sorteo compartido aún no está configurado.' })
  }

  let response: Response
  try {
    const url = new URL(
      `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/wiwu_raffle_state`
    )
    url.searchParams.set('id', 'eq.1')
    url.searchParams.set('select', 'id,consecutive_scares')

    response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    })
  } catch (error) {
    console.error('Supabase raffle health request failed.', error)
    return jsonResponse(502, { error: 'No se pudo conectar con Supabase.' })
  }

  if (!response.ok) {
    console.error(
      'Supabase raffle health request failed.',
      response.status,
      await response.text()
    )
    return jsonResponse(502, { error: 'Supabase no respondió correctamente.' })
  }

  let rows: unknown
  try {
    rows = await response.json()
  } catch {
    console.error('Supabase raffle health request returned invalid JSON.')
    return jsonResponse(502, { error: 'Supabase devolvió una respuesta inválida.' })
  }

  if (
    !Array.isArray(rows) ||
    rows.length !== 1 ||
    typeof rows[0] !== 'object' ||
    rows[0] === null ||
    !('id' in rows[0]) ||
    rows[0].id !== 1 ||
    !('consecutive_scares' in rows[0]) ||
    typeof rows[0].consecutive_scares !== 'number'
  ) {
    console.error('Supabase raffle health request returned an invalid state row.')
    return jsonResponse(502, { error: 'No se encontró el estado del sorteo en Supabase.' })
  }

  return jsonResponse(200, { ok: true, service: 'raffle' })
}
