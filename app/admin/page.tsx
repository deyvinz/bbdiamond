export default function AdminHome(){
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <a 
          className="border border-gold-200 rounded-xl p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/guests"
        >
          <h3 className="font-medium text-lg group-hover:text-gold-700 transition-colors">Guests</h3>
          <p className="text-sm text-black/60 mt-1">Manage guest list and RSVPs</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/invitations"
        >
          <h3 className="font-medium text-lg group-hover:text-gold-700 transition-colors">Invitations</h3>
          <p className="text-sm text-black/60 mt-1">Create and manage invitations</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/events"
        >
          <h3 className="font-medium text-lg group-hover:text-gold-700 transition-colors">Events</h3>
          <p className="text-sm text-black/60 mt-1">Manage wedding events and ceremonies</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/seating"
        >
          <h3 className="font-medium text-lg group-hover:text-gold-700 transition-colors">Seating</h3>
          <p className="text-sm text-black/60 mt-1">Arrange seating charts</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/checkin"
        >
          <h3 className="font-medium text-lg group-hover:text-gold-700 transition-colors">Check‑In</h3>
          <p className="text-sm text-black/60 mt-1">QR code check-in system</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/config"
        >
          <h3 className="font-medium text-lg group-hover:text-gold-700 transition-colors">Configuration</h3>
          <p className="text-sm text-black/60 mt-1">Manage app settings and features</p>
        </a>
      </div>
    )
  }
  