import AdminWrapper from '@/components/AdminWrapper'
import SignOutButton from '@/components/SignOutButton'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminWrapper>
      <div className="min-h-screen bg-white">
        <section className="container max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-3xl">Admin</h1>
            <div className="text-sm opacity-70">Hi, Admin • <SignOutButton /></div>
          </div>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </AdminWrapper>
  )
}
