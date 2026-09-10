import { prisma } from "@/lib/prisma"
import { getSiteGuestBySlug } from "@/lib/site-guest"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SiteGuestBadge } from "./site-guest-badge"

export default async function SiteLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ weddingSlug: string }>
}) {
  const wedding = await prisma.wedding.findUnique({
    where: { slug: (await params).weddingSlug }
  })

  if (!wedding) {
    notFound()
  }

  const siteGuest = await getSiteGuestBySlug(wedding.slug)
  const coupleShort = `${wedding.partner1Name.split(" ")[0]} & ${wedding.partner2Name.split(" ")[0]}`

  const nav = [
    { href: `/site/${wedding.slug}`, label: "Início" },
    { href: `/site/${wedding.slug}/rsvp`, label: "Confirmar Presença" },
    { href: `/site/${wedding.slug}/presentes`, label: "Lista de Presentes" },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
          <Link href={`/site/${wedding.slug}`} className="font-display text-2xl font-semibold text-foreground hover:text-primary transition-colors truncate">
            {coupleShort}
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium uppercase tracking-[0.15em]">
            {nav.map(item => (
              <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {siteGuest && (
              <SiteGuestBadge guestName={siteGuest.name} weddingSlug={wedding.slug} />
            )}
            <Link
              href={`/site/${wedding.slug}/rsvp`}
              className="hidden sm:inline-flex items-center justify-center h-9 px-5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold uppercase tracking-[0.12em] hover:bg-primary/90 transition-colors"
            >
              RSVP
            </Link>
          </div>
        </div>
        <nav className="md:hidden flex items-center justify-center gap-6 pb-3 text-xs font-medium uppercase tracking-[0.15em]">
          {nav.map(item => (
            <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="border-t border-border/60 py-10 text-center">
        <p className="font-display text-2xl text-foreground">{coupleShort}</p>
        {wedding.hashtag && (
          <p className="mt-1 text-sm font-medium text-primary">{wedding.hashtag}</p>
        )}
        <p className="mt-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">Feito com amor · Casarium</p>
      </footer>
    </div>
  )
}
