"use client";

import { use, useEffect, useState } from "react";
import { PaymentConfigCard } from "@/components/gifts/payment-config-card";
import { isPaymentConfigured } from "@/app/actions/payments";
import { TriangleAlert } from "lucide-react";

export default function RecebimentoPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = use(params);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    isPaymentConfigured(weddingId)
      .then((c) => setNeedsSetup(!c.configured))
      .catch(() => setNeedsSetup(true));
  }, [weddingId]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[900px] mx-auto min-h-screen items-stretch">
      <div>
        <h1 className="text-3xl font-bold mt-1">Configuração</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure como os noivos recebem os presentes. Só depois disso a gestão e as categorias liberam o cadastro.
        </p>
      </div>
      {needsSetup && (
        <div className="flex items-start gap-2.5 text-sm bg-amber-50 border border-amber-300/70 text-amber-900 rounded-2xl p-4 leading-relaxed">
          <TriangleAlert className="w-5 h-5 mt-0.5 shrink-0" />
          <p>
            <strong>Antes de cadastrar os presentes</strong>, configure ao menos uma forma de recebimento:
            a conta do <strong>Mercado Pago</strong> (cartão) e/ou a <strong>chave PIX direta</strong> (sem taxa).
            Gestão e Categorias aparecem no menu assim que salvar.
          </p>
        </div>
      )}
      <PaymentConfigCard weddingSlug={weddingId} />
    </div>
  );
}
