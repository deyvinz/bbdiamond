export default function AdminHome(){
    return <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <a className="border border-gold-100 rounded-xl p-4" href="/admin/guests">Guests</a>
      <a className="border border-gold-100 rounded-xl p-4" href="/admin/seating">Seating</a>
      <a className="border border-gold-100 rounded-xl p-4" href="/admin/checkin">Check‑In</a>
    </div>
  }
  