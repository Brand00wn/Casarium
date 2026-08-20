import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { getMessages } from "@/app/actions/rsvp"
import { SiteInteractive } from "./interactive"

export default async function WeddingSitePage({ params }: { params: Promise<{ weddingSlug: string }> }) {
  const wedding = await prisma.wedding.findUnique({
    where: { slug: (await params).weddingSlug }
  })

  if (!wedding) {
    notFound()
  }

  const initialMessages = await getMessages(wedding.slug)

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-background/95 z-0" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-30 z-0" />
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto backdrop-blur-sm bg-background/30 p-12 rounded-3xl border border-white/20 shadow-2xl">
          <h1 className="text-5xl md:text-7xl font-serif text-primary-foreground mb-4 drop-shadow-md">
            {wedding.partner1Name} <span className="text-foreground/80">&</span> {wedding.partner2Name}
          </h1>
          <p className="text-xl md:text-2xl text-foreground/90 font-light mb-8">
            {wedding.date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {wedding.venue && (
            <p className="text-lg text-foreground/80 mb-12">
              📍 {wedding.venue}
            </p>
          )}
          
          <SiteInteractive weddingDate={wedding.date.toISOString()} slug={wedding.slug} initialMessages={initialMessages} />
        </div>
      </section>
    </div>
  )
}
