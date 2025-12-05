import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingId } from '@/lib/api-wedding-context'
import { getAppConfig, updateAppConfig } from '@/lib/config-service'
import { z } from 'zod'

// Validation schema for notification config updates
const notificationConfigSchema = z.object({
  notification_email_enabled: z.boolean().optional(),
  notification_whatsapp_enabled: z.boolean().optional(),
  notification_sms_enabled: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const config = await getAppConfig(weddingId)

    return NextResponse.json({
      success: true,
      config: {
        notification_email_enabled: config.notification_email_enabled,
        notification_whatsapp_enabled: config.notification_whatsapp_enabled,
        notification_sms_enabled: config.notification_sms_enabled,
      },
    })
  } catch (error) {
    console.error('Error fetching notification config:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const body = await request.json()

    // Validate the request body
    const parseResult = notificationConfigSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    const updates = parseResult.data

    // Update the config
    const updatedConfig = await updateAppConfig(updates, weddingId)

    return NextResponse.json({
      success: true,
      config: {
        notification_email_enabled: updatedConfig.notification_email_enabled,
        notification_whatsapp_enabled: updatedConfig.notification_whatsapp_enabled,
        notification_sms_enabled: updatedConfig.notification_sms_enabled,
      },
    })
  } catch (error) {
    console.error('Error updating notification config:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
