export default function AdminHome(){
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/guests"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Guests</h3>
          <p className="text-sm text-black/60 mt-1">Manage guest list and RSVPs</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/invitations"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Invitations</h3>
          <p className="text-sm text-black/60 mt-1">Create and manage invitations</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/events"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Events</h3>
          <p className="text-sm text-black/60 mt-1">Manage wedding events and ceremonies</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/seating"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Seating</h3>
          <p className="text-sm text-black/60 mt-1">Arrange seating charts</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/checkin"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Check‑In</h3>
          <p className="text-sm text-black/60 mt-1">QR code check-in system</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/announcements"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Announcements</h3>
          <p className="text-sm text-black/60 mt-1">Send announcements to guests</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/gallery"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Gallery</h3>
          <p className="text-sm text-black/60 mt-1">Manage wedding gallery images</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/config"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Configuration</h3>
          <p className="text-sm text-black/60 mt-1">Manage app settings and features</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/email"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Email Settings</h3>
          <p className="text-sm text-black/60 mt-1">Manage email configuration and branding</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/food-choices"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Food Choices</h3>
          <p className="text-sm text-black/60 mt-1">Manage meal options for RSVP</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/faq"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">FAQ</h3>
          <p className="text-sm text-black/60 mt-1">Manage frequently asked questions</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/wedding-party"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Wedding Party</h3>
          <p className="text-sm text-black/60 mt-1">Manage wedding party members</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/travel"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Travel</h3>
          <p className="text-sm text-black/60 mt-1">Manage travel information</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/things-to-do"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Things to Do</h3>
          <p className="text-sm text-black/60 mt-1">Manage local activities</p>
        </a>
        <a 
          className="border border-gold-200 rounded-xl p-4 lg:p-6 bg-white/70 backdrop-blur hover:bg-gold-50/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group" 
          href="/admin/registry"
        >
          <h3 className="font-medium text-base lg:text-lg group-hover:text-gold-700 transition-colors">Registry</h3>
          <p className="text-sm text-black/60 mt-1">Manage wedding registries</p>
        </a>
      </div>
    )
  }
  