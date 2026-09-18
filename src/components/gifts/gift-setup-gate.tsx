"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";

/** Bloqueio do passo 1: sem recebimento configurado, sem gestão/categorias. */
export function GiftSetupGate({ weddingSlug }: { weddingSlug: string }) {
  return (
    <Card className="border-primary/30 shadow-sm">
      <CardContent className="flex flex-col items-center text-center gap-4 py-12 px-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="font-display text-2xl font-medium">Passo 1: configure o recebimento 💛</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Antes de cadastrar presentes, diga como os noivos querem receber:
            conta do <strong>Mercado Pago</strong> (cartão) e/ou <strong>chave PIX direta</strong> (sem taxa).
            Sem isso não há como cobrar — por isso a gestão fica bloqueada.
          </p>
        </div>
        <Button render={<Link href={`/${weddingSlug}/presentes/recebimento`} />} className="rounded-full px-6">
          Configurar recebimento <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
