import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MapPin, Shirt, Gift, Clock, Navigation, BedDouble, Car, Sparkles } from "lucide-react"
import { getMessages } from "@/app/actions/rsvp"
import { getSiteGuestBySlug } from "@/lib/site-guest"
import { Countdown, Mural } from "./interactive"
import { Eyebrow, Ornament } from "@/components/site/site-ui"
import { SafeImage } from "@/components/ui/safe-image"

const HERO_FALLBACK = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=2070&auto=format&fit=crop"

const PARKING_LABELS: Record<string, string> = {
  no_parking: "Sem estacionamento no local",
  free_on_site: "Estacionamento gratuito no local",
  paid_on_site: "Estacionamento pago no local",
  street: "Estacionamento na rua",
  valet: "Valet / Manobrista",
}

const VENDOR_LABELS: Record<string, string> = {
  SALON: "Salão de Beleza",
  BARBERSHOP: "Barbearia",
  SUIT_SHOP: "Trajes",
  HOTEL: "Hospedagem",
  BEAUTY_CLINIC: "Estética",
  MAKEUP_ARTIST: "Maquiagem",
  HAIR_STYLIST: "Cabelo",
  MANICURE: "Manicure",
  SPA: "Spa",
  DRESS_SHOP: "Vestidos",
  JEWELRY: "Joalheria",
}

const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

function formatLong(date: Date) {
  return date.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
}

export default async function WeddingSitePage({ params }: { params: Promise<{ weddingSlug: string }> }) {
  const wedding = await prisma.wedding.findUnique({
    where: { slug: (await params).weddingSlug },
    include: {
      partyMembers: {
        where: {
          type: { in: ["BRIDESMAID", "GROOMSMAN"] },
          isMentioned: true,
        },
        orderBy: [{ side: "asc" }, { name: "asc" }],
      },
      vendorRecommendations: {
        orderBy: { name: "asc" },
      },
    },
  })

  if (!wedding) {
    notFound()
  }

  const initialMessages = await getMessages(wedding.slug)
  const siteGuest = await getSiteGuestBySlug(wedding.slug)
  const eventDate = wedding.ceremonyDate ?? wedding.date

  const details: { icon: any, label: string, value: string }[] = []
  if (wedding.ceremonyLocation) details.push({ icon: MapPin, label: "Cerimônia", value: wedding.ceremonyLocation })
  if (wedding.receptionLocation) details.push({ icon: Clock, label: "Recepção", value: wedding.receptionLocation })
  if (wedding.dressCode) details.push({ icon: Shirt, label: "Traje", value: wedding.dressCode })

  const first1 = wedding.partner1Name.split(" ")[0]
  const first2 = wedding.partner2Name.split(" ")[0]
  const padrinhos = wedding.partyMembers || []
  const vendors = wedding.vendorRecommendations || []

  const parkingInfo = [
    wedding.ceremonyParkingType && wedding.ceremonyParkingType !== "none"
      ? { label: "Cerimônia", value: PARKING_LABELS[wedding.ceremonyParkingType] || wedding.ceremonyParkingType }
      : null,
    wedding.receptionParkingType && wedding.receptionParkingType !== "none"
      ? { label: "Recepção", value: PARKING_LABELS[wedding.receptionParkingType] || wedding.receptionParkingType }
      : null,
  ].filter((x): x is { label: string, value: string } => !!x && !!x.value)

  const hasLogistics =
    wedding.ceremonyLocation || wedding.receptionLocation ||
    parkingInfo.length > 0 ||
    (wedding.hasAccommodationTips && wedding.accommodationTips) ||
    vendors.length > 0

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative w-full min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wedding.coverImageUrl || HERO_FALLBACK}
          alt={`${wedding.partner1Name} e ${wedding.partner2Name}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-background" />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto py-24">
          <Eyebrow className="text-white/80">Save the date</Eyebrow>
          <h1 className="font-display text-white font-medium text-6xl md:text-8xl leading-[1.05] mt-4 drop-shadow-lg">
            {wedding.partner1Name}
            <span className="block italic font-normal text-white/90 text-5xl md:text-7xl my-1">&</span>
            {wedding.partner2Name}
          </h1>
          <Ornament className="my-8 [&_span]:bg-white/50 [&_span.text-primary]:text-white/90 [&_span.text-primary]:bg-transparent" />
          <p className="text-lg md:text-xl text-white/90 font-light capitalize">
            {formatLong(eventDate)}
          </p>
          {wedding.venue && (
            <p className="mt-2 text-white/80 flex items-center justify-center gap-1.5">
              <MapPin className="w-4 h-4" /> {wedding.venue}
            </p>
          )}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/site/${wedding.slug}/rsvp`}
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-white text-foreground text-sm font-semibold uppercase tracking-[0.12em] hover:bg-white/90 transition-colors w-full sm:w-auto"
            >
              Confirmar presença
            </Link>
            <Link
              href={`/site/${wedding.slug}/presentes`}
              className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-white/60 text-white text-sm font-semibold uppercase tracking-[0.12em] hover:bg-white/10 transition-colors w-full sm:w-auto"
            >
              Lista de presentes
            </Link>
          </div>
        </div>
      </section>

      {/* Contagem regressiva */}
      <section className="border-b border-border/60 bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center">
          <Eyebrow>Contagem regressiva</Eyebrow>
          <Countdown weddingDate={eventDate.toISOString()} />
        </div>
      </section>

      {/* Nossa história */}
      {wedding.ourStory && (
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <Eyebrow>Nossa história</Eyebrow>
          <p className="mt-6 text-lg md:text-xl leading-relaxed text-foreground/85 font-light whitespace-pre-wrap">
            {wedding.ourStory}
          </p>
          <Ornament className="mt-10" />
        </section>
      )}

      {/* Detalhes */}
      {details.length > 0 && (
        <section className="bg-card border-y border-border/60">
          <div className="mx-auto max-w-5xl px-4 py-20">
            <div className="text-center space-y-3 mb-12">
              <Eyebrow>O grande dia</Eyebrow>
              <h2 className="font-display text-4xl md:text-5xl font-medium">Detalhes</h2>
            </div>
            <div className={`grid gap-6 ${details.length === 1 ? "" : details.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {details.map((d, i) => (
                <div key={i} className="rounded-2xl border border-border/70 bg-background p-8 text-center shadow-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <d.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">{d.label}</p>
                  <p className="mt-2 font-display text-2xl">{d.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Padrinhos */}
      {padrinhos.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-20">
          <div className="text-center space-y-3 mb-12">
            <Eyebrow>Padrinhos & Madrinhas</Eyebrow>
            <h2 className="font-display text-4xl md:text-5xl font-medium">Quem está ao nosso lado</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {padrinhos.map((p) => (
              <div key={p.id} className="text-center space-y-3">
                {p.photoUrl ? (
                  <SafeImage
                    src={p.photoUrl}
                    alt={p.name}
                    className="mx-auto w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-primary/20 shadow-sm bg-muted"
                    imgClassName="w-full h-full object-cover"
                  />
                ) : (
                  <div className="mx-auto w-28 h-28 md:w-32 md:h-32 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-display text-4xl text-primary">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-display text-xl leading-tight">{p.name}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">
                    {p.side === "BOTH" ? "Do casal" : p.side === "PARTNER_1" ? `De ${first1}` : `De ${first2}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Ornament className="mt-12" />
        </section>
      )}

      {/* Informações úteis */}
      {hasLogistics && (
        <section className="bg-card border-y border-border/60">
          <div className="mx-auto max-w-5xl px-4 py-20">
            <div className="text-center space-y-3 mb-12">
              <Eyebrow>Informações úteis</Eyebrow>
              <h2 className="font-display text-4xl md:text-5xl font-medium">Tudo para você chegar bem</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {(wedding.ceremonyLocation || wedding.receptionLocation) && (
                <div className="rounded-2xl border border-border/70 bg-background p-8 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Navigation className="w-5 h-5 text-primary" />
                    <h3 className="font-display text-2xl">Como chegar</h3>
                  </div>
                  <div className="space-y-4">
                    {wedding.ceremonyLocation && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Cerimônia</p>
                        <p className="mt-1">{wedding.ceremonyLocation}</p>
                        <a href={mapsUrl(wedding.ceremonyLocation)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                          Abrir no Maps →
                        </a>
                      </div>
                    )}
                    {wedding.receptionLocation && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recepção</p>
                        <p className="mt-1">{wedding.receptionLocation}</p>
                        <a href={mapsUrl(wedding.receptionLocation)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                          Abrir no Maps →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(parkingInfo.length > 0 || (wedding.hasAccommodationTips && wedding.accommodationTips)) && (
                <div className="rounded-2xl border border-border/70 bg-background p-8 shadow-sm space-y-6">
                  {parkingInfo.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Car className="w-5 h-5 text-primary" />
                        <h3 className="font-display text-2xl">Estacionamento</h3>
                      </div>
                      <ul className="space-y-1.5 text-sm">
                        {parkingInfo.map((p, i) => (
                          <li key={i}><span className="font-medium">{p.label}:</span> {p.value}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {wedding.hasAccommodationTips && wedding.accommodationTips && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <BedDouble className="w-5 h-5 text-primary" />
                        <h3 className="font-display text-2xl">Onde ficar</h3>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{wedding.accommodationTips}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {vendors.length > 0 && (
              <div className="mt-6 rounded-2xl border border-border/70 bg-background p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-2xl">Indicados pelos noivos</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {vendors.map((v) => (
                    <div key={v.id} className="rounded-xl bg-muted/40 border border-border/50 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                        {VENDOR_LABELS[v.type] || v.type}
                      </p>
                      <p className="mt-1 font-display text-xl leading-snug">{v.name}</p>
                      {v.recommendedProfessional && (
                        <p className="mt-1 text-sm text-muted-foreground">Falar com: {v.recommendedProfessional}</p>
                      )}
                      {v.address && (
                        <a href={mapsUrl(v.address)} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-primary hover:underline">
                          {v.address} →
                        </a>
                      )}
                      {v.notes && <p className="mt-2 text-sm font-light">{v.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Presentes */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Gift className="w-6 h-6 text-primary" />
        </div>
        <Eyebrow>Lista de presentes</Eyebrow>
        <h2 className="font-display text-4xl md:text-5xl font-medium">Sua presença é o maior presente</h2>
        <p className="text-muted-foreground font-light text-lg">
          Mas se quiser nos mimar um pouco mais, preparamos uma lista com carinho.
        </p>
        <Link
          href={`/site/${wedding.slug}/presentes`}
          className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-[0.12em] hover:bg-primary/90 transition-colors"
        >
          Ver lista de presentes
        </Link>
      </section>

      {/* Mural */}
      <section id="mural" className="bg-card border-t border-border/60">
        <div className="mx-auto max-w-2xl px-4 py-20">
          <div className="text-center space-y-3 mb-10">
            <Eyebrow>Mural de recados</Eyebrow>
            <h2 className="font-display text-4xl md:text-5xl font-medium">Deixe seu carinho</h2>
          </div>
          <Mural slug={wedding.slug} initialMessages={initialMessages} guestName={siteGuest?.name ?? ""} />
        </div>
      </section>
    </div>
  )
}
