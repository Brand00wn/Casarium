"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Boundary da lista de presentes: mostra o digest (útil p/ diagnóstico) e permite tentar de novo. */
export default function PresentesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na lista de presentes:", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
      <h2 className="font-display text-4xl">Algo falhou por aqui 😕</h2>
      <p className="text-muted-foreground font-light">
        Não foi possível carregar a lista. Tente novamente — seus dados estão a salvo.
      </p>
      {error?.digest && (
        <p className="text-xs font-mono bg-muted rounded px-3 py-2 inline-block">
          código: {error.digest}
        </p>
      )}
      <div>
        <Button onClick={reset} className="rounded-full px-8">
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
