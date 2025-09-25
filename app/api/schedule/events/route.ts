import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer()
    
    const { data, error } = await supabase
      .from('events')
      .select('name, venue, address, starts_at')
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
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch events' 
    }, { status: 500 })
  }
}
