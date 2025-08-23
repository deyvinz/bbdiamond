export default function AdminLayout({children}:{children:React.ReactNode}){
    // TODO: gate by Supabase auth session
    return (
      <html lang="en"><body className="bg-white text-black">
        <div className="container py-6">
          <h1 className="font-serif text-3xl foil">Admin</h1>
          <div className="mt-6">{children}</div>
        </div>
      </body></html>
    )
  }
  