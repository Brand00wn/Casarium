"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { forgetSiteGuest } from "@/app/actions/rsvp"

export function SiteGuestBadge({ guestName, weddingSlug }: { guestName: string, weddingSlug: string }) {
  const router = useRouter()
  const firstName = guestName.split(" ")[0]

  const handleForget = async () => {
    await forgetSiteGuest(weddingSlug)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href={`/site/${weddingSlug}/rsvp`}
        className="font-medium text-primary hover:underline"
        title="Ver meu convite"
      >
        Olá, {firstName}!
      </Link>
      <button
        onClick={handleForget}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        title="Sair deste convite"
      >
        Não é você?
      </button>
    </div>
  )
}
