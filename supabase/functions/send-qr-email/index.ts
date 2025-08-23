// supabase functions new send-qr-email
// supabase functions deploy send-qr-email
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "npm:resend@3.2.0";
import QRCode from "npm:qrcode@1.5.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

serve(async (req: { json: () => PromiseLike<{ email: any; token: any; eventTitle: any; eventStart: any; eventLocation: any; }> | { email: any; token: any; eventTitle: any; eventStart: any; eventLocation: any; }; }) => {
  try {
    const { email, token, eventTitle, eventStart, eventLocation } = await req.json();
    const png = await QRCode.toDataURL(token, { margin: 0 });
    const ics = [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Our Wedding//EN","BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}@ourwedding`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,
      `DTSTART:${eventStart}`, // e.g. 20251012T213000Z
      `SUMMARY:${eventTitle}`,
      `LOCATION:${eventLocation}`,
      "END:VEVENT","END:VCALENDAR"
    ].join('\r\n');

    await resend.emails.send({
      from: "RSVP <hello@yourdomain.com>",
      to: email,
      subject: `Your RSVP & QR Code • ${eventTitle}`,
      html: `<div style="font-family:Inter,system-ui">
        <h2 style="font-family:Playfair Display,serif">We can’t wait to see you!</h2>
        <p>Show this QR at check‑in:</p>
        <img src="${png}" alt="QR" style="width:180px;height:180px;border:1px solid #CDA349;padding:6px" />
      </div>`,
      attachments: [{ filename: "event.ics", content: btoa(ics) }]
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type":"application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 });
  }
});
