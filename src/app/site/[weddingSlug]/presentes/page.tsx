import { prisma } from "@/lib/prisma";
import { getSiteGuestBySlug } from "@/lib/site-guest";
import { getGiftQuotaSold, getGiftQuotaHeld } from "@/app/actions/gifts";
import { isGiftListVisible } from "@/app/actions/payments";
import { notFound } from "next/navigation";
import { PageHero, CoupleNames } from "@/components/site/site-ui";
import GiftGrid from "./GiftGrid";
import { QuotaExplainer } from "./quota-explainer";

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

  // Sem recebimento ou sem presentes, a lista não existe no site.
  if (!(await isGiftListVisible(weddingSlug))) {
    notFound();
  }

  const gifts = await prisma.gift.findMany({
    where: { weddingId: wedding.id },
    include: { categories: true },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.giftCategory.findMany({
    where: { weddingId: wedding.id },
    orderBy: { name: "asc" },
  });

  const siteGuest = await getSiteGuestBySlug(weddingSlug);
  const soldByGift = await getGiftQuotaSold(weddingSlug);
  const heldByGift = await getGiftQuotaHeld(weddingSlug);

  return (
    <div className="pb-16">
      <div className="bg-gradient-to-b from-primary/[0.10] via-primary/[0.04] to-background pt-16 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <PageHero
            eyebrow="Lista de presentes"
            title={<CoupleNames partner1={wedding.partner1Name} partner2={wedding.partner2Name} />}
            description="Sua presença é o maior presente — mas se quiser nos mimar, escolha com carinho."
          />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <QuotaExplainer gifts={gifts.map(g => ({ id: g.id, name: g.name, price: g.price, quotaCount: g.quotaCount }))} />
        {gifts.length === 0 ? (
          <div className="text-center text-muted-foreground font-light mt-12">
            A lista de presentes ainda não foi montada.
          </div>
        ) : (
          <GiftGrid
            gifts={gifts}
            categories={categories}
            soldByGift={soldByGift}
            heldByGift={heldByGift}
            weddingId={wedding.id}
            weddingSlug={wedding.slug}
            siteGuest={siteGuest ? { id: siteGuest.id, name: siteGuest.name } : null}
          />
        )}
      </div>
    </div>
  );
}
