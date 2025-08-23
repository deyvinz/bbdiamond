'use client'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase-browser'
import Section from '@/components/Section'
import Card from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'

type FormValues = { token: string; response: 'accepted'|'declined'|'waitlist'; partySize: number; message?: string; email?: string }

export default function RSVPForm(){
  const {register, handleSubmit, setValue, formState:{isSubmitting}} = useForm<FormValues>({ defaultValues:{ partySize:1, response:'accepted' }})
  const [done,setDone] = useState<string| null>(null)

  const onSubmit = async (v: FormValues) => {
    const { error } = await supabase.rpc('submit_rsvp', {
      p_token: v.token, p_response: v.response, p_party_size: v.partySize, p_message: v.message ?? null
    })
    if (error) return alert(error.message)
    setDone('Thanks! Your RSVP is confirmed.')
  }

  return (
    <Section title="RSVP" subtitle="Enter the invite code from your card or email" narrow>
      <Card>
        {done ? <p>{done}</p> : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm mb-1">Invite code</label>
              <Input required placeholder="Paste your code" {...register('token')} />
            </div>
            <div className="flex justify-between gap-4">
              <div className="w-1/2">
                <label className="block text-sm mb-1">Response</label>
                <Select onValueChange={(v)=>setValue('response', v as any)} defaultValue="accepted">
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accepted">Accept with joy</SelectItem>
                    <SelectItem value="declined">Regretfully decline</SelectItem>
                    <SelectItem value="waitlist">Waitlist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-1/2">
                <label className="block text-sm mb-1">Attending (incl. you)</label>
                <Input type="number" min={1} max={10} {...register('partySize', { valueAsNumber:true })} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Email (to receive QR)</label>
              <Input type="email" placeholder="you@example.com" {...register('email')} />
            </div>
            <div>
              <label className="block text-sm mb-1">Note</label>
              <Textarea rows={4} {...register('message')} />
            </div>
           <div className="flex justify-end">
            <Button type="submit" variant="gold" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit RSVP'}
            </Button>
           </div>
          </form>
        )}
      </Card>
    </Section>
  )
}
