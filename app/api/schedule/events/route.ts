import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    
    const { data, error } = await supabase
      .from('events')
      .select('name, venue, address, starts_at')
      .eq('wedding_id', weddingId)
      .order('starts_at', { ascending: true })

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch events' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      events: data || []
    })

  } catch (error) {
    console.error('Error fetching events:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch events'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json({ 
      success: false, 
      message 
    }, { status })
  }
}
