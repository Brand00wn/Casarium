import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Lista de Presentes
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            {wedding.partner1Name} & {wedding.partner2Name}
          </p>
        </div>

        {gifts.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            A lista de presentes ainda não foi montada.
          </div>
        ) : (
          <GiftGrid gifts={gifts} weddingId={wedding.id} />
        )}
      </div>
    </div>
  );
}
