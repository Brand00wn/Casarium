"use client"

import { createContext, useContext, ReactNode } from "react"
import { MemberRole } from "@prisma/client"
import { Permission } from "@/lib/permissions"

type WeddingContextType = {
  weddingSlug: string
  memberRole: MemberRole | null
  can: (action: Permission) => boolean
}

const WeddingContext = createContext<WeddingContextType | undefined>(undefined)

export function WeddingProvider({ 
  children, 
  weddingSlug,
  memberRole,
  permissions
}: { 
  children: ReactNode,
  weddingSlug: string,
  memberRole: MemberRole | null,
  permissions: Record<Permission, boolean>
}) {
  const can = (action: Permission) => {
    return permissions[action] || false;
  }

  return (
    <WeddingContext.Provider value={{ weddingSlug, memberRole, can }}>
      {children}
    </WeddingContext.Provider>
  )
}

export function useWedding() {
  const context = useContext(WeddingContext)
  if (context === undefined) {
    throw new Error("useWedding must be used within a WeddingProvider")
  }
  return context
}
