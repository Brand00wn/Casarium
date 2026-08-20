import { redirect } from "next/navigation"
import { getDashboardData } from "@/app/actions/dashboard"
import { CountdownHero } from "@/components/dashboard/countdown-hero"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { RsvpChart } from "@/components/dashboard/rsvp-chart"
import { GuestDemographics } from "@/components/dashboard/guest-demographics"
import { FinancialSummary } from "@/components/dashboard/financial-summary"
import { WhatsappStatus } from "@/components/dashboard/whatsapp-status"
import { SeatingOverview } from "@/components/dashboard/seating-overview"
import { MessagesFeed } from "@/components/dashboard/messages-feed"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { PartySummary } from "@/components/dashboard/party-summary"

interface DashboardPageProps {
  params: Promise<{
    weddingId: string
  }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { weddingId } = await params;
  const data = await getDashboardData(weddingId);

  if (!data) {
    redirect("/");
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <CountdownHero wedding={data.wedding} />
      
      <StatsGrid guests={data.guests} gifts={data.gifts} seating={data.seating} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <RsvpChart guests={data.guests} />
          <GuestDemographics guests={data.guests} />
          <WhatsappStatus whatsapp={data.whatsapp} totalGuests={data.guests.total} weddingId={weddingId} />
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <FinancialSummary gifts={data.gifts} />
          <SeatingOverview seating={data.seating} weddingId={weddingId} />
          <PartySummary party={data.party} />
        </div>
        
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          <QuickActions weddingId={weddingId} />
          <div className="flex-1 min-h-[400px]">
            <MessagesFeed messages={data.messages} />
          </div>
        </div>
      </div>
    </div>
  )
}
