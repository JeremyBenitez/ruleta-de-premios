// @ts-ignore
import { createClient } from '@supabase/supabase-js'

export async function handler(event: any, context: any) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { data, error } = await supabase
      .from('wiwu_stores')
      .select('*')
      .eq('is_active', true)
      .order('brand', { ascending: true })

    if (error) throw error

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  } catch (error) {
    console.error('Error obteniendo tiendas:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'No se pudieron cargar las sucursales' }),
    }
  }
}