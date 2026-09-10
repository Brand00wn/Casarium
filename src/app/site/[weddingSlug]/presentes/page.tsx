import { prisma } from "@/lib/prisma";
import { getSiteGuestBySlug } from "@/lib/site-guest";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/site-ui";
import GiftGrid from "./GiftGrid";

export default async function GiftsSitePage({
  params,
}: {
  params: Promise<{ weddingSlug: string }>;
}) {
  const { weddingSlug } = await params;
  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingSlug },
  });

  if (!wedding) {
    notFound();
  }

  const gifts = await prisma.gift.findMany({
    where: { weddingId: wedding.id },
    orderBy: { createdAt: "desc" },
  });

  const siteGuest = await getSiteGuestBySlug(weddingSlug);

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <PageHero
          eyebrow="Lista de presentes"
          title={`${wedding.partner1Name} & ${wedding.partner2Name}`}
          description="Sua presença é o maior presente — mas se quiser nos mimar, escolha com carinho."
        />

        {gifts.length === 0 ? (
          <div className="text-center text-muted-foreground font-light mt-12">
            A lista de presentes ainda não foi montada.
          </div>
        ) : (
          <GiftGrid
            gifts={gifts}
            weddingId={wedding.id}
            weddingSlug={wedding.slug}
            siteGuest={siteGuest ? { id: siteGuest.id, name: siteGuest.name } : null}
          />
        )}
      </div>
    </div>
  );
}
