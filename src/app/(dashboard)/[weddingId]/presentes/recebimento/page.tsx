"use client";

import { use } from "react";
import { PaymentConfigCard } from "@/components/gifts/payment-config-card";

export default function RecebimentoPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = use(params);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[900px] mx-auto min-h-screen items-stretch">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Passo 1 de 2</p>
        <h1 className="text-3xl font-bold mt-1">Recebimento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure como os noivos recebem os presentes. Só depois disso a gestão e as categorias liberam o cadastro.
        </p>
      </div>
      <PaymentConfigCard weddingSlug={weddingId} />
    </div>
  );
}
