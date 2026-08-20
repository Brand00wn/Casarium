import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"

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

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/site/${wedding.slug}`} className="text-xl font-serif text-primary">
            {wedding.partner1Name} & {wedding.partner2Name}
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href={`/site/${wedding.slug}`} className="hover:text-primary transition-colors">
              Início
            </Link>
            <Link href={`/site/${wedding.slug}/rsvp`} className="hover:text-primary transition-colors">
              Confirmar Presença
            </Link>
            <Link href={`/site/${wedding.slug}#mural`} className="hover:text-primary transition-colors">
              Mural de Recados
            </Link>
            <Link href={`/site/${wedding.slug}/presentes`} className="hover:text-primary transition-colors">
              Lista de Presentes
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="py-8 text-center text-sm text-muted-foreground border-t">
        <p>© {new Date().getFullYear()} {wedding.partner1Name} & {wedding.partner2Name}. Todos os direitos reservados.</p>
        <p className="mt-1 text-xs">Criado com ConciWedding</p>
      </footer>
    </div>
  )
}
