import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    
    const supabase = await supabaseServer()
    
    // Test a simple query
    const { data, error } = await supabase
      .from('guests')
      .select('count')
      .limit(1)
    
    
    return Response.json({
      success: true,
      data,
      error: error?.message || null,
      env: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
      }
    })
  } catch (err) {
    return Response.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      env: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
      }
    }, { status: 500 })
  }
}
