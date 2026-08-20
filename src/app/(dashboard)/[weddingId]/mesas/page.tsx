import { prisma } from "@/lib/prisma"
import { MesasClient } from "@/components/tables/mesas-client"

export default async function MesasPage({
  params,
}: {
  params: Promise<{ weddingId: string }>
}) {
  const { weddingId } = await params;

  // Busca mesas do casamento
  const tables = await prisma.table.findMany({
    where: { wedding: { slug: weddingId } },
    include: { guests: true }
  });

  // Busca todos os convidados (para sabermos quem não tem mesa ainda)
  const allGuests = await prisma.guest.findMany({
    where: { wedding: { slug: weddingId } },
    include: { family: { include: { guests: true } } },
    orderBy: { name: 'asc' }
  });

  const venueElements = await prisma.venueElement.findMany({
    where: { wedding: { slug: weddingId } }
  });

  return (
    <div className="flex flex-col space-y-6 h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa de Mesas</h1>
          <p className="text-muted-foreground">
            Arraste os convidados para as mesas e posicione os elementos no salão.
          </p>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <MesasClient 
          weddingId={weddingId} 
          initialTables={tables} 
          initialGuests={allGuests} 
          initialVenueElements={venueElements}
        />
      </div>
    </div>
  )
}
