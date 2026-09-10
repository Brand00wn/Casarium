import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MapPin, Shirt, Gift, Clock, Navigation, BedDouble, Car, Sparkles, Scissors, Hotel, Store, Flower2, Gem, type LucideIcon } from "lucide-react"
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

const VENDOR_ICONS: Record<string, LucideIcon> = {
  SALON: Scissors,
  BARBERSHOP: Scissors,
  SUIT_SHOP: Store,
  HOTEL: Hotel,
  BEAUTY_CLINIC: Sparkles,
  MAKEUP_ARTIST: Sparkles,
  HAIR_STYLIST: Scissors,
  MANICURE: Sparkles,
  SPA: Flower2,
  DRESS_SHOP: Store,
  JEWELRY: Gem,
}

function MapsButton({ address, children }: { address: string, children?: React.ReactNode }) {
  return (
    <a
      href={mapsUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-[0.12em] hover:bg-primary/90 transition-colors shadow-sm"
    >
      <Navigation className="w-3.5 h-3.5" />
      {children || "Como chegar"}
    </a>
  );
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

  const eventHour = eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const eventDateShort = eventDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })

  const hasTraje = !!wedding.dressCode

  const first1 = wedding.partner1Name.split(" ")[0]
  const first2 = wedding.partner2Name.split(" ")[0]
  const padrinhos = wedding.partyMembers || []
  const vendors = wedding.vendorRecommendations || []

  const showReceptionSetting = wedding.showReceptionInfo !== false && !!wedding.receptionLocation;
  // Revelação programada: esconde até faltar X horas (calculado ao vivo, sem cron)
  const revealAt = wedding.receptionRevealHoursBefore != null
    ? new Date(eventDate.getTime() - wedding.receptionRevealHoursBefore * 3600_000)
    : null;
  const showReception = showReceptionSetting && (!revealAt || Date.now() >= revealAt.getTime());
  const receptionPending = showReceptionSetting && revealAt && Date.now() < revealAt.getTime();

  const parkingOf = (kind: "ceremony" | "reception") => {
    const raw = kind === "ceremony" ? wedding.ceremonyParkingType : wedding.receptionParkingType;
    if (!raw || raw === "none") return null;
    return PARKING_LABELS[raw] || raw;
  };

  const ceremonyParking = parkingOf("ceremony");
  const receptionParking = showReception ? parkingOf("reception") : null;

  const hasLogistics =
    hasTraje ||
    !!wedding.ceremonyLocation || showReception || receptionPending ||
    !!ceremonyParking || !!receptionParking ||
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

      {/* O grande dia — quando, traje, locais e infos, tudo junto */}

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

      {/* O grande dia — quando, traje, locais e infos, tudo numa seção só */}
      {hasLogistics && (
        <section className="bg-card border-y border-border/60">
          <div className="mx-auto max-w-5xl px-4 py-20">
            <div className="text-center space-y-3 mb-12">
              <Eyebrow>O grande dia</Eyebrow>
              <h2 className="font-display text-4xl md:text-5xl font-medium">Tudo para você chegar bem</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background p-8 text-center shadow-sm">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Quando</p>
                <p className="mt-2 font-display text-2xl leading-snug">{eventDateShort} · {eventHour}</p>
              </div>

              {hasTraje && (
                <div className="rounded-2xl border border-border/70 bg-background p-8 text-center shadow-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Shirt className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Traje</p>
                  <p className="mt-2 font-display text-2xl leading-snug">{wedding.dressCode}</p>
                </div>
              )}

              {receptionPending && (
                <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-8 text-center shadow-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Recepção</p>
                  <p className="mt-2 font-display text-2xl leading-snug">Surpresa em breve 🎉</p>
                  <p className="mt-2 text-sm text-muted-foreground">O endereço da festa será revelado aqui pertinho da data.</p>
                </div>
              )}
              {wedding.ceremonyLocation && (
                <div className="rounded-2xl border border-border/70 bg-background p-8 text-center shadow-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Cerimônia</p>
                  <p className="mt-2 font-display text-2xl leading-snug">{wedding.ceremonyLocation}</p>
                  {ceremonyParking && (
                    <p className="mt-2 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                      <Car className="w-3.5 h-3.5" /> {ceremonyParking}
                    </p>
                  )}
                  <div className="mt-4">
                    <MapsButton address={wedding.ceremonyLocation} />
                  </div>
                </div>
              )}

              {showReception && (
                <div className="rounded-2xl border border-border/70 bg-background p-8 text-center shadow-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Recepção</p>
                  <p className="mt-2 font-display text-2xl leading-snug">{wedding.receptionLocation}</p>
                  {receptionParking && (
                    <p className="mt-2 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                      <Car className="w-3.5 h-3.5" /> {receptionParking}
                    </p>
                  )}
                  <div className="mt-4">
                    <MapsButton address={wedding.receptionLocation!} />
                  </div>
                </div>
              )}

              {wedding.hasAccommodationTips && wedding.accommodationTips && (
                <div className="rounded-2xl border border-border/70 bg-background p-8 text-center shadow-sm md:col-span-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <BedDouble className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Onde ficar</p>
                  <p className="mt-2 text-base leading-relaxed whitespace-pre-wrap max-w-2xl mx-auto">{wedding.accommodationTips}</p>
                </div>
              )}

              {(ceremonyParking && !wedding.ceremonyLocation) || (receptionParking && !showReception) ? (
                <div className="rounded-2xl border border-border/70 bg-background p-8 text-center shadow-sm md:col-span-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Estacionamento</p>
                  <div className="mt-2 space-y-1 text-sm">
                    {ceremonyParking && !wedding.ceremonyLocation && <p><span className="font-medium">Cerimônia:</span> {ceremonyParking}</p>}
                    {receptionParking && !showReception && <p><span className="font-medium">Recepção:</span> {receptionParking}</p>}
                  </div>
                </div>
              ) : null}
            </div>

            {vendors.length > 0 && (
              <div className="mt-6 rounded-2xl border border-border/70 bg-background p-8 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <h3 className="font-display text-2xl">Indicados pelos noivos</h3>
                </div>
                <p className="text-sm text-muted-foreground font-light mb-6">
                  Profissionais de confiança para você se preparar para o grande dia.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {vendors.map((v) => {
                    const Icon = VENDOR_ICONS[v.type] || Sparkles;
                    return (
                      <div key={v.id} className="rounded-xl bg-muted/40 border border-border/50 p-5 hover:border-primary/40 hover:shadow-md transition-all">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                            {VENDOR_LABELS[v.type] || v.type}
                          </p>
                        </div>
                        <p className="mt-3 font-display text-2xl leading-snug">{v.name}</p>
                        {v.recommendedProfessional && (
                          <p className="mt-1 text-sm">
                            <span className="text-muted-foreground">Falar com</span>{" "}
                            <span className="font-medium">{v.recommendedProfessional}</span>
                          </p>
                        )}
                        {v.address && (
                          <div className="mt-3">
                            <MapsButton address={v.address} />
                          </div>
                        )}
                        {v.notes && <p className="mt-2 text-sm font-light italic border-t border-border/50 pt-2">“{v.notes}”</p>}
                      </div>
                    );
                  })}
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
