"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

type SidebarContext = {
  open: boolean
  setOpen: (v: boolean | ((v: boolean)=>boolean)) => void
}

const SidebarCtx = React.createContext<SidebarContext | null>(null)

export function SidebarProvider({ children, open: openProp, onOpenChange }:{ children:React.ReactNode; open?:boolean; onOpenChange?:(v:boolean)=>void }){
  const [openState, _setOpen] = React.useState<boolean>(openProp ?? false)
  const open = openProp ?? openState
  const setOpen = React.useCallback((value: boolean | ((v:boolean)=>boolean))=>{
    const next = typeof value === 'function' ? (value as any)(open) : value
    if(onOpenChange){ onOpenChange(next) } else { _setOpen(next) }
  },[onOpenChange, open])
  return <SidebarCtx.Provider value={{open, setOpen}}>{children}</SidebarCtx.Provider>
}

export function useSidebar(){
  const ctx = React.useContext(SidebarCtx)
  if(!ctx) throw new Error("useSidebar must be used within a SidebarProvider.")
  return ctx
}

export function Sidebar({ className, children }:{ className?:string; children:React.ReactNode }){
  const { open } = useSidebar()
  return (
    <aside
      data-open={open}
      className={cn(
        "fixed left-0 top-0 z-[60] h-full w-80 max-w-[80%] translate-x-[-100%] bg-white border-r border-gold-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-6 transition-transform md:hidden",
        "data-[open=true]:translate-x-0",
        className
      )}
    >
      {children}
    </aside>
  )
}

export function SidebarTrigger({ className, children }:{ className?:string; children?:React.ReactNode }){
  const { setOpen } = useSidebar()
  return (
    <button className={className} onClick={()=>setOpen((v)=>!v)} aria-label="Toggle sidebar">
      {children}
    </button>
  )
}

export const SidebarHeader = ({ children }:{children:React.ReactNode}) => (
  <div className="mb-4 flex items-center justify-between">{children}</div>
)

export const SidebarContent = ({ children }:{children:React.ReactNode}) => (
  <div className="overflow-y-auto h-[calc(100%-3.5rem)]">{children}</div>
)

export function SidebarBackdrop(){
  const { open, setOpen } = useSidebar()
  if(!open) return null
  return <div className="fixed inset-0 z-[50] bg-black/40 md:hidden" onClick={()=>setOpen(false)} />
}


