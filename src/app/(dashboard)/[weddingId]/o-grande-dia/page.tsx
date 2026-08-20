import { getWeddingDetails } from "@/app/actions/wedding-details"
import { WeddingDetailsForm } from "@/components/forms/wedding-details-form"
import { GrandeDiaAIAssistant } from "./ai-wrapper"

export default async function GrandeDiaPage({
  params,
}: {
  params: Promise<{ weddingId: string }>
}) {
  const { weddingId } = await params
  const wedding = await getWeddingDetails(weddingId)

  return (
    <GrandeDiaAIAssistant weddingSlug={weddingId}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">O Grande Dia</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie os detalhes do seu casamento. Estas informações darão vida à sua plataforma e ao site dos convidados.
        </p>
      </div>
      
      <WeddingDetailsForm wedding={wedding} weddingId={weddingId} />
    </GrandeDiaAIAssistant>
  )
}
