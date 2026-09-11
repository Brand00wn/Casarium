"use client";

import { useMemo, useState } from "react";
import { Gift as GiftIcon, ChevronDown, HandCoins, MousePointerClick, QrCode, PartyPopper } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type SimpleGift = { id: string, name: string, price: number, quotaCount: number };

const STEPS = [
  { icon: MousePointerClick, title: "Escolha o presente", text: "Navegue pela lista e clique em Presentear no item que quiser dar." },
  { icon: HandCoins, title: "Escolha as cotas", text: "Presentes caros são divididos em cotas. Você decide quantas quer pagar — de 1 até todas." },
  { icon: QrCode, title: "Pague na hora", text: "PIX copia e cola ou cartão, com confirmação imediata." },
  { icon: PartyPopper, title: "Deixe seu recado", text: "Os noivos recebem seu nome, sua mensagem e o carinho. ❤" },
];

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function QuotaExplainer({ gifts }: { gifts: SimpleGift[] }) {
  const [open, setOpen] = useState(false);
  const quotable = useMemo(() => gifts.filter(g => g.quotaCount > 1), [gifts]);
  const [giftId, setGiftId] = useState<string>("");
  const gift = quotable.find(g => g.id === giftId) ?? quotable[0];
  const [quotas, setQuotas] = useState(1);

  const quotaValue = gift ? gift.price / gift.quotaCount : 0;
  const clamped = gift ? Math.min(Math.max(quotas, 1), gift.quotaCount) : 1;
  const total = quotaValue * clamped;
  const pct = gift ? Math.round((clamped / gift.quotaCount) * 100) : 0;

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.07] to-background overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-primary/[0.04] transition-colors rounded-2xl"
      >
        <span className="flex items-center gap-3">
          <span className="relative w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <GiftIcon className="w-5 h-5" />
            {!open && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary border-2 border-white text-[8px] font-bold text-white items-center justify-center">?</span>
              </span>
            )}
          </span>
          <span>
            <span className="block font-display text-2xl leading-tight">Como funcionam as cotas?</span>
            <span className="block text-sm text-primary font-semibold mt-0.5">
              {open ? "Toque para recolher ↑" : "Toque aqui e entenda em 10 segundos ↓"}
            </span>
          </span>
        </span>
        <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-5 pb-6 space-y-6">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={i} className="rounded-xl bg-card border border-border/60 p-4 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="w-4 h-4 text-primary" />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Passo {i + 1}</p>
                </div>
                <p className="mt-2 font-semibold leading-snug">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground font-light leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>

          <div className="rounded-xl bg-card border border-border/60 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Simulador interativo — teste você mesmo</p>
            {gift ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="text-sm text-muted-foreground shrink-0">Presente:</label>
                  <select
                    value={gift.id}
                    onChange={(e) => { setGiftId(e.target.value); setQuotas(1); }}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {quotable.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} — {brl(g.price)} em {g.quotaCount} cotas
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <label htmlFor="quota-range" className="font-medium">
                      Quantas cotas você quer dar? <span className="text-primary font-bold">{clamped} de {gift.quotaCount}</span>
                    </label>
                    <span className="text-muted-foreground text-xs">cada cota: {brl(quotaValue)}</span>
                  </div>
                  <input
                    id="quota-range"
                    type="range"
                    min={1}
                    max={gift.quotaCount}
                    value={clamped}
                    onChange={(e) => setQuotas(Number(e.target.value))}
                    className="w-full accent-primary h-2 cursor-pointer"
                  />
                  <Progress value={pct} className="mt-2 h-2" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    {clamped === 1 && "Só 1 cota? Pode — todo valor ajuda! 🎁"}
                    {clamped > 1 && clamped < gift.quotaCount && `${clamped} cotas cobrem ${pct}% deste presente.`}
                    {clamped === gift.quotaCount && "Você presentearia ele inteirinho! 👏"}
                  </p>
                  <p className="font-display text-3xl font-semibold text-primary whitespace-nowrap">
                    {brl(total)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground font-light">
                Todos os presentes desta lista são de <strong>cota única</strong>: você paga o valor total de uma vez. Simples assim — escolha, pague e deixe seu recado. 🎁
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground font-light">
              Dá para dividir com a família: cada pessoa compra suas cotas separadamente, no próprio nome.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
