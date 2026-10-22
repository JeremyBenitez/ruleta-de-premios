type PrizeKind = 'scare' | 'charge' | 'trick' | 'again_spin'

type PreviewRow = {
  prize_index: number
  prize_kind: PrizeKind
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

function isPreviewRow(value: unknown): value is PreviewRow {
  if (typeof value !== 'object' || value === null) return false
  if (!('prize_index' in value) || typeof value.prize_index !== 'number') return false
  if (!Number.isInteger(value.prize_index) || value.prize_index < 0 || value.prize_index > 5) return false
  if (!('prize_kind' in value) || typeof value.prize_kind !== 'string') return false

  const expectedKindByIndex: PrizeKind[] = [
    'scare',
    'charge',
    'trick',
    'charge',
    'trick',
    'again_spin',
  ]

  return expectedKindByIndex[value.prize_index] === value.prize_kind
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Método no permitido.' })
  }

  const origin = request.headers.get('origin')
  const allowedOrigins = [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(
    (value): value is string => Boolean(value)
  )
  const isLocalDevelopmentOrigin =
    origin !== null &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  if (origin && !allowedOrigins.includes(origin) && !isLocalDevelopmentOrigin) {
    return jsonResponse(403, { error: 'Origen no permitido.' })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse(400, { error: 'La solicitud debe incluir datos JSON válidos.' })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('allowAgain' in body) ||
    typeof body.allowAgain !== 'boolean' ||
    ('forceKind' in body &&
      body.forceKind !== undefined &&
      body.forceKind !== null &&
      body.forceKind !== 'scare' &&
      body.forceKind !== 'charge' &&
      body.forceKind !== 'trick' &&
      body.forceKind !== 'again_spin')
  ) {
    return jsonResponse(400, { error: 'La solicitud de prueba no es válida.' })
  }

  const forceKind =
    'forceKind' in body &&
    (body.forceKind === 'scare' ||
      body.forceKind === 'charge' ||
      body.forceKind === 'trick' ||
      body.forceKind === 'again_spin')
      ? body.forceKind
      : null

  if (forceKind === 'again_spin' && body.allowAgain === false) {
    return jsonResponse(400, {
      error: 'El giro extra solo se puede simular cuando allowAgain es true.',
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase raffle environment variables are not configured.')
    return jsonResponse(503, { error: 'El sorteo compartido aún no está configurado.' })
  }

  let supabaseResponse: Response
  try {
    supabaseResponse = await fetch(
      `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/preview_wiwu_prize`,
      {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          forceKind === null
            ? { p_allow_again: body.allowAgain }
            : {
                p_allow_again: body.allowAgain,
                p_forced_kind: forceKind,
              }
        ),
      }
    )
  } catch (error) {
    console.error('Supabase raffle preview request failed.', error)
    return jsonResponse(502, { error: 'No se pudo conectar con el sorteo compartido.' })
  }

  if (!supabaseResponse.ok) {
    console.error(
      'Supabase raffle preview RPC failed.',
      supabaseResponse.status,
      await supabaseResponse.text()
    )
    return jsonResponse(502, { error: 'No se pudo completar la prueba del sorteo.' })
  }

  let rows: unknown
  try {
    rows = await supabaseResponse.json()
  } catch {
    console.error('Supabase raffle preview RPC returned invalid JSON.')
    return jsonResponse(502, { error: 'Supabase devolvió una respuesta inválida.' })
  }

  if (!Array.isArray(rows) || rows.length !== 1 || !isPreviewRow(rows[0])) {
    console.error('Supabase raffle preview RPC returned an invalid result.')
    return jsonResponse(502, { error: 'Supabase devolvió un resultado de prueba inválido.' })
  }

  return jsonResponse(200, {
    dryRun: true,
    prizeIndex: rows[0].prize_index,
    kind: rows[0].prize_kind,
    forced: forceKind !== null,
  })
}
