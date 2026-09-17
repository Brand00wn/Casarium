"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, GiftCategory } from "@prisma/client";
import { simulateCheckout } from "@/app/actions/gifts";
import {
  createQuotaPayment,
  getCheckoutStatus,
  isPaymentConfigured,
  getPaymentPublicKey,
} from "@/app/actions/payments";
import { toast } from "sonner";
import { applyCardFee } from "@/lib/mercadopago";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeImage } from "@/components/ui/safe-image";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QrCode, CreditCard, Gift as GiftIcon, Minus, Plus, PartyPopper } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type GiftWithCategories = Gift & { categories?: GiftCategory[] };

/** CPF com máscara 000.000.000-00 enquanto digita. */
function maskCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Validação real de CPF (dígitos verificadores) — o MP recusa CPF inválido com 13253. */
function isValidCpf(raw: string): boolean {
  const d = (raw || "").replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== Number(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === Number(d[10]);
}

export default function GiftGrid({
  gifts,
  categories,
  soldByGift,
  weddingId,
  weddingSlug,
  siteGuest,
}: {
  gifts: GiftWithCategories[];
  categories: GiftCategory[];
  soldByGift: Record<string, number>;
  weddingId: string;
  weddingSlug: string;
  siteGuest?: { id: string, name: string } | null;
}) {
  const [selectedGift, setSelectedGift] = useState<GiftWithCategories | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "quota-asc" | "quota-desc" | "total-asc" | "total-desc">("recent");

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestCpf, setGuestCpf] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotas, setQuotas] = useState(1);

  // Pagamento real (MP) vs simulação (casamento sem credencial)
  const router = useRouter();
  const [payMode, setPayMode] = useState<"checking" | "mp" | "simulated">("checking");
  const [mpCard, setMpCard] = useState(false);
  const [cardFee, setCardFee] = useState({ pass: false, percent: 4.98 });
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [mpEnv, setMpEnv] = useState<"test" | "production" | null>(null);
  const [pix, setPix] = useState<{ qrCodeBase64: string | null, copyPaste: string | null, transactionId: string, amount: number } | null>(null);
  const brickController = useRef<any>(null);
  // O Brick é montado uma vez (useEffect sem guestName nas deps p/ não
  // remontar a cada tecla). Sem ref, o onSubmit enxergaria o nome/e-mail
  // antigos (stale closure) e barraria com "informe seu nome" mesmo preenchido.
  const guestRef = useRef({ name: "", email: "", message: "" });
  guestRef.current = { name: guestName, email: guestEmail, message: guestMessage };

  const soldOf = (gift: GiftWithCategories) => Math.min(soldByGift[gift.id] || 0, gift.quotaCount);
  const remainingOf = (gift: GiftWithCategories) => Math.max(gift.quotaCount - soldOf(gift), 0);
  const quotaValueOf = (gift: GiftWithCategories) => gift.price / gift.quotaCount;
  const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const openCheckout = async (gift: GiftWithCategories) => {
    setSelectedGift(gift);
    setGuestName(siteGuest?.name || "");
    setGuestEmail("");
    setGuestCpf("");
    setGuestMessage("");
    setPaymentMethod("PIX");
    setQuotas(1);
    setPix(null);
    setPayMode("checking");
    setIsOpen(true);
    try {
      const cfg = await isPaymentConfigured(weddingSlug);
      if (cfg.configured) {
        setPayMode("mp");
        setMpCard(cfg.hasCard);
        setCardFee({ pass: cfg.passCardFeeToGuest, percent: cfg.cardFeePercent });
        setMpEnv((cfg as any).env ?? null);
        if (cfg.hasCard) {
          const { publicKey: pk, env } = await getPaymentPublicKey(weddingSlug);
          setPublicKey(pk);
          if (env) setMpEnv(env);
        }
      } else {
        setPayMode("simulated");
      }
    } catch {
      setPayMode("simulated");
    }
  };

  const handleCheckout = async () => {
    if (!guestName.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }
    
    if (paymentMethod === "CREDIT_CARD") {
      const ccName = (document.getElementById("cc-name") as HTMLInputElement)?.value;
      const ccNum = (document.getElementById("cc-num") as HTMLInputElement)?.value;
      const ccExp = (document.getElementById("cc-exp") as HTMLInputElement)?.value;
      if (!ccName || !ccNum || !ccExp) {
        toast.error("Preencha todos os dados do cartão.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const qty = selectedGift!.quotaCount > 1 ? quotas : 1;
      await simulateCheckout(weddingSlug, selectedGift?.id || null, {
        guestName,
        guestMessage,
        amount: selectedGift!.price,
        paymentMethod,
        quantity: qty,
        ...(siteGuest ? { guestId: siteGuest.id } : {}),
      });
      toast.success(
        selectedGift!.quotaCount > 1
          ? `${qty} ${qty === 1 ? "cota presenteada" : "cotas presenteadas"} com sucesso! Muito obrigado.`
          : "Pagamento realizado com sucesso! Muito obrigado pelo presente."
      );
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro ao processar o pagamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPaidSuccess = (msg: string) => {
    toast.success(msg);
    setIsOpen(false);
    setPix(null);
    router.refresh();
  };

  const checkoutQty = () => (selectedGift && selectedGift.quotaCount > 1 ? quotas : 1);
  const checkoutBase = () => (selectedGift ? quotaValueOf(selectedGift) * checkoutQty() : 0);
  // Mesma fórmula do servidor (gross-up) — o total exibido é o total cobrado.
  const feeCalc = () => (paymentMethod === "CREDIT_CARD"
    ? applyCardFee(checkoutBase(), cardFee.percent, cardFee.pass)
    : { total: checkoutBase(), fee: 0 });
  const cardFeeValue = () => feeCalc().fee;
  const checkoutTotal = () => feeCalc().total;

  const validGuest = (requireCpf = false) => {
    if (!guestName.trim()) {
      toast.error("Por favor, informe seu nome.");
      return false;
    }
    if (requireCpf && guestName.trim().split(/\s+/).length < 2) {
      toast.error("Informe seu nome completo (nome e sobrenome) para gerar o PIX.");
      return false;
    }
    if (!guestEmail.trim() || !/^\S+@\S+\.\S+$/.test(guestEmail)) {
      toast.error("Informe um e-mail válido para o pagamento.");
      return false;
    }
    if (requireCpf && !isValidCpf(guestCpf)) {
      toast.error("Informe um CPF válido para gerar o PIX.");
      return false;
    }
    return true;
  };

  const handleGeneratePix = async () => {
    if (!selectedGift || !validGuest(true)) return;
    setIsSubmitting(true);
    try {
      const res = await createQuotaPayment(weddingSlug, {
        giftId: selectedGift.id,
        quantity: checkoutQty(),
        guestName,
        guestEmail: guestEmail.trim(),
        guestMessage,
        paymentMethod: "PIX",
        pixIdentification: { type: "CPF", number: guestCpf.replace(/\D/g, "") },
        ...(siteGuest ? { guestId: siteGuest.id } : {}),
      });
      if (res.ok === false) {
        toast.error(res.error || "Erro ao gerar PIX.");
        return;
      }
      if (res.status === "pending") {
        setPix({
          qrCodeBase64: res.qrCodeBase64,
          copyPaste: res.copyPaste,
          transactionId: res.transactionId,
          amount: res.amount,
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar PIX.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Polling do PIX
  useEffect(() => {
    if (!pix || !isOpen) return;
    const t = setInterval(async () => {
      try {
        const s = await getCheckoutStatus(pix.transactionId);
        if (s.status === "PAID") {
          clearInterval(t);
          onPaidSuccess("Pagamento confirmado! Muito obrigado pelo presente. 🎉");
        } else if (s.status === "FAILED") {
          clearInterval(t);
          toast.error("Pagamento expirado ou recusado. Gere um novo PIX.");
          setPix(null);
        }
      } catch { /* tenta de novo no próximo ciclo */ }
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pix, isOpen]);

  // Brick de cartão do Mercado Pago
  useEffect(() => {
    if (!isOpen || payMode !== "mp" || paymentMethod !== "CREDIT_CARD" || !publicKey || !selectedGift) return;

    const mount = () => {
      const w = window as any;
      if (!w.MercadoPago) {
        if (!document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]')) {
          const s = document.createElement("script");
          s.src = "https://sdk.mercadopago.com/js/v2";
          s.onload = mount;
          document.body.appendChild(s);
        } else {
          setTimeout(mount, 300);
        }
        return;
      }
      try { brickController.current?.unmount(); } catch { /* noop */ }
      const mp = new w.MercadoPago(publicKey, { locale: "pt-BR" });
      const bricks = mp.bricks();
      // Parcela mínima ~R$5: evita o Brick oferecer 12x num valor baixo que o
      // MP recusa com "excluded by a rule". Com repasse ligado, somente à
      // vista (1x): o parcelado tem custo extra da operadora que o repasse
      // não cobre — travar em 1x garante os noivos recebendo o valor cheio.
      const maxInstallments = cardFee.pass ? 1 : Math.min(12, Math.max(1, Math.floor(checkoutTotal() / 5)));
      bricks.create("cardPayment", "mp-card-brick", {
        initialization: { amount: checkoutTotal() },
        customization: {
          paymentMethods: { minInstallments: 1, maxInstallments },
        },
        callbacks: {
          onReady: () => {},
          onSubmit: (cardFormData: any) => new Promise<void>((resolve, reject) => {
            // O Brick tem o PRÓPRIO campo de e-mail (ver print) — ele é a fonte
            // da verdade p/ o MP, não o campo "Seu e-mail" de cima. Usa o do Brick.
            // Lê nome/e-mail/mensagem via ref (valor atual), não do closure da
            // montagem — senão o nome digitado depois é ignorado.
            const current = guestRef.current;
            const brickEmail = String(cardFormData.payer?.email || "").trim() || current.email.trim();
            if (!current.name.trim()) {
              toast.error("Por favor, informe seu nome.");
              return reject();
            }
            if (!brickEmail || !/^\S+@\S+\.\S+$/.test(brickEmail)) {
              toast.error("Informe um e-mail válido para o pagamento.");
              return reject();
            }
            if (brickEmail !== current.email) setGuestEmail(brickEmail);
            setIsSubmitting(true);
            createQuotaPayment(weddingSlug, {
              giftId: selectedGift!.id,
              quantity: checkoutQty(),
              guestName: current.name,
              guestEmail: brickEmail,
              guestMessage: current.message,
              paymentMethod: "CREDIT_CARD",
              cardToken: cardFormData.token,
              cardPaymentMethodId: cardFormData.payment_method_id,
              cardIdentification: cardFormData.payer?.identification
                ? { type: cardFormData.payer.identification.type || "CPF", number: String(cardFormData.payer.identification.number || "") }
                : undefined,
              installments: Number(cardFormData.installments) || 1,
              ...(siteGuest ? { guestId: siteGuest.id } : {}),
            }).then((res: any) => {
              setIsSubmitting(false);
              if (res.ok === false) {
                reject();
                toast.error(res.error || "Erro no pagamento.");
                return;
              }
              if (res.status === "approved") {
                resolve();
                onPaidSuccess("Pagamento aprovado! Muito obrigado pelo presente. 🎉");
              } else {
                reject();
                toast.error("Cartão recusado — confira os dados ou tente outro cartão.");
              }
            }).catch((e: any) => {
              setIsSubmitting(false);
              reject();
              toast.error(e.message || "Erro no pagamento.");
            });
          }),
          onError: (e: any) => { console.error("MP Brick:", e); },
        },
      }).then((c: any) => { brickController.current = c; }).catch((e: any) => console.error("MP Brick:", e));
    };

    const t = setTimeout(mount, 50);
    return () => {
      clearTimeout(t);
      try { brickController.current?.unmount(); } catch { /* noop */ }
      brickController.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, payMode, paymentMethod, publicKey, selectedGift?.id, quotas, cardFee.pass, cardFee.percent]);

  const copyPix = async () => {
    if (!pix?.copyPaste) return;
    try {
      await navigator.clipboard.writeText(pix.copyPaste);
      toast.success("Código PIX copiado!");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código manualmente.");
    }
  };

  const visibleGifts = gifts
    .filter(g => categoryFilter === "all" || g.categories?.some(c => c.id === categoryFilter))
    .sort((a, b) => {
      switch (sort) {
        case "quota-asc": return (a.price / a.quotaCount) - (b.price / b.quotaCount);
        case "quota-desc": return (b.price / b.quotaCount) - (a.price / a.quotaCount);
        case "total-asc": return a.price - b.price;
        case "total-desc": return b.price - a.price;
        default: return 0;
      }
    });

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`h-9 px-4 rounded-full text-[13px] font-semibold uppercase tracking-[0.1em] border transition-all ${categoryFilter === "all" ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border/70 hover:border-primary/50 hover:text-foreground"}`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`h-9 px-4 rounded-full text-[13px] font-semibold uppercase tracking-[0.1em] border transition-all inline-flex items-center gap-2 ${categoryFilter === cat.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border/70 hover:border-primary/50 hover:text-foreground"}`}
            >
              {cat.color && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />}
              {cat.name}
            </button>
          ))}
        </div>
      )}
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="gift-sort" className="text-muted-foreground whitespace-nowrap">Ordenar:</label>
          <select
            id="gift-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-9 rounded-full border border-border/70 bg-card px-4 text-[13px] font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="recent">Mais recentes</option>
            <option value="quota-asc">Menor valor da cota</option>
            <option value="quota-desc">Maior valor da cota</option>
            <option value="total-asc">Menor valor total</option>
            <option value="total-desc">Maior valor total</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleGifts.map((gift) => {
          const sold = soldOf(gift);
          const remaining = remainingOf(gift);
          const complete = remaining <= 0;
          const pct = Math.round((sold / gift.quotaCount) * 100);
          return (
          <Card key={gift.id} className="group overflow-hidden flex flex-col rounded-2xl border-border/70 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            {gift.imageUrl ? (
              <SafeImage src={gift.imageUrl} alt={gift.name} className="w-full h-52 bg-muted" imgClassName="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-52 bg-primary/10 flex items-center justify-center">
                <GiftIcon className="w-16 h-16 text-primary/40" />
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-2xl font-medium">{gift.name}</CardTitle>
              {gift.categories && gift.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {gift.categories.slice(0, 3).map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                      {c.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />}
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              <p className="text-sm text-muted-foreground font-light">{gift.description}</p>
              {gift.quotaCount > 1 ? (
                <div className="space-y-1.5">
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs font-medium text-muted-foreground">
                    {complete ? (
                      <span className="text-green-700 font-semibold inline-flex items-center gap-1">
                        <PartyPopper className="w-3.5 h-3.5" /> Presente completo!
                      </span>
                    ) : (
                      <>{sold} de {gift.quotaCount} cotas presenteadas · {brl(quotaValueOf(gift))} cada</>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-xs font-medium text-muted-foreground">Cota única · valor total</p>
              )}
              <p className="text-2xl font-bold text-primary">
                {brl(gift.price)}
              </p>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full rounded-full h-11 text-sm font-semibold uppercase tracking-[0.1em]"
                disabled={complete}
                onClick={() => openCheckout(gift)}
              >
                {complete ? "Completo 🎉" : "Presentear"}
              </Button>
            </CardFooter>
          </Card>
          );
        })}
      </div>
      {visibleGifts.length === 0 && (
        <p className="text-center text-muted-foreground font-light py-12">
          Nenhum presente nesta categoria ainda.
        </p>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Presentear os Noivos</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {selectedGift && (
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{selectedGift.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedGift.quotaCount > 1
                        ? `${brl(quotaValueOf(selectedGift))} por cota · restam ${remainingOf(selectedGift)} de ${selectedGift.quotaCount}`
                        : "Cota única · valor total"}
                    </p>
                  </div>
                  <p className="font-bold text-lg">
                    {brl(selectedGift.price)}
                  </p>
                </div>
                {selectedGift.quotaCount > 1 && (
                  <div className="flex items-center justify-between gap-3 bg-background rounded-lg border p-3">
                    <span className="text-sm font-medium">Quantas cotas?</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full"
                        disabled={quotas <= 1}
                        onClick={() => setQuotas(q => Math.max(1, q - 1))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="min-w-16 text-center font-bold text-lg tabular-nums">{quotas}</span>
                      <Button
                        type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full"
                        disabled={quotas >= remainingOf(selectedGift)}
                        onClick={() => setQuotas(q => Math.min(remainingOf(selectedGift), q + 1))}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <span className="font-bold text-primary whitespace-nowrap">
                      {brl(quotaValueOf(selectedGift) * quotas)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Seu Nome</Label>
                <Input
                  id="name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Como os noivos te conhecem?"
                />
              </div>

              {payMode === "mp" && paymentMethod === "PIX" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Seu e-mail (para o pagamento)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="voce@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">Seu CPF (exigido pelo Mercado Pago no PIX)</Label>
                    <Input
                      id="cpf"
                      inputMode="numeric"
                      value={guestCpf}
                      onChange={(e) => setGuestCpf(maskCpf(e.target.value))}
                      placeholder="000.000.000-00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Usado só para identificar o pagamento — sem ele o PIX é recusado (erro 13253).
                    </p>
                  </div>
                </>
              )}
              {payMode === "mp" && paymentMethod === "CREDIT_CARD" && (
                <p className="text-xs text-muted-foreground">
                  O e-mail é preenchido <strong>dentro do cartão</strong> abaixo (campo “Preencha seus dados”).
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem (opcional)</Label>
                <Textarea
                  id="message"
                  value={guestMessage}
                  onChange={(e) => setGuestMessage(e.target.value)}
                  placeholder="Deixe uma mensagem de carinho..."
                />
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v: "PIX" | "CREDIT_CARD") => { setPaymentMethod(v); setPix(null); }} className="flex gap-4">
                  <div className="flex items-center space-x-2 border p-3 rounded-md flex-1 cursor-pointer">
                    <RadioGroupItem value="PIX" id="pix" />
                    <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer">
                      <QrCode className="w-4 h-4" /> PIX
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-md flex-1 cursor-pointer">
                    <RadioGroupItem value="CREDIT_CARD" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="w-4 h-4" /> Cartão
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {payMode === "checking" && (
                <p className="text-sm text-center text-muted-foreground">Carregando formas de pagamento...</p>
              )}

              {payMode === "simulated" && paymentMethod === "PIX" && (
                <div className="flex flex-col items-center justify-center space-y-2 bg-muted/50 p-6 rounded-lg border">
                  <QrCode className="w-24 h-24 text-primary" />
                  <p className="text-sm text-center text-muted-foreground">
                    Pagamento demonstrativo — os noivos ainda não ativaram o recebimento online.
                  </p>
                </div>
              )}

              {payMode === "simulated" && paymentMethod === "CREDIT_CARD" && (
                <div className="space-y-4 bg-muted/50 p-4 rounded-lg border">
                  <div className="space-y-2">
                    <Label htmlFor="cc-name">Nome no Cartão</Label>
                    <Input id="cc-name" placeholder="NOME IMPRESSO" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cc-num">Número do Cartão</Label>
                    <Input id="cc-num" placeholder="0000 0000 0000 0000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cc-exp">Validade</Label>
                      <Input id="cc-exp" placeholder="MM/AA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cc-cvv">CVV</Label>
                      <Input id="cc-cvv" placeholder="123" />
                    </div>
                  </div>
                </div>
              )}

              {payMode === "mp" && paymentMethod === "PIX" && !pix && (
                <div className="flex flex-col items-center justify-center space-y-2 bg-muted/50 p-6 rounded-lg border">
                  <QrCode className="w-24 h-24 text-primary" />
                  <p className="text-sm text-center text-muted-foreground">
                    Ao confirmar, geramos o PIX com QR Code e copia e cola.
                  </p>
                </div>
              )}

              {payMode === "mp" && paymentMethod === "PIX" && pix && (
                <div className="flex flex-col items-center space-y-3 bg-muted/50 p-6 rounded-lg border">
                  {pix.qrCodeBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code PIX" className="w-52 h-52 rounded-lg bg-white p-2" />
                  ) : (
                    <QrCode className="w-24 h-24 text-primary" />
                  )}
                  <p className="font-bold text-xl">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pix.amount)}
                  </p>
                  {pix.copyPaste && (
                    <>
                      <p className="text-xs text-muted-foreground break-all max-h-20 overflow-y-auto bg-background p-2 rounded border w-full">
                        {pix.copyPaste}
                      </p>
                      <Button type="button" variant="outline" onClick={copyPix} className="w-full">
                        Copiar código PIX
                      </Button>
                    </>
                  )}
                  <p className="text-xs text-center text-muted-foreground animate-pulse">
                    Aguardando pagamento... confirmamos automaticamente aqui.
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPix(null)}>
                    Gerar outro código
                  </Button>
                </div>
              )}

              {payMode === "mp" && paymentMethod === "CREDIT_CARD" && !mpCard && (
                <div className="p-4 rounded-lg border bg-muted/50 text-sm text-center text-muted-foreground">
                  Cartão indisponível no momento — escolha o PIX. 💳
                </div>
              )}

              {payMode === "mp" && paymentMethod === "CREDIT_CARD" && mpCard && (
                <div className="space-y-2">
                  {mpEnv === "test" && (
                    <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-900 space-y-1">
                      <p className="font-bold">🧪 Modo TESTE ativo</p>
                      <p>Use e-mail <code className="font-mono">test@testuser.com</code>, nome <code className="font-mono">APRO</code>, CPF <code className="font-mono">12345678909</code>, cartão <code className="font-mono">4235 6477 2802 5682</code> (Visa) ou <code className="font-mono">5480 8328 0103 3311</code> (Master), validade 11/30, CVV 123, à vista (1x), valor de R$ 10+.</p>
                    </div>
                  )}
                  {cardFee.pass && cardFee.percent > 0 && selectedGift && (
                    <p className="text-xs text-muted-foreground text-center">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(checkoutBase())}
                      {" "} + taxa do cartão ({cardFee.percent}% ={" "}
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cardFeeValue())}
                      ) ={" "}
                      <strong className="text-foreground">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(checkoutTotal())}
                      </strong>
                      {" "}· somente à vista
                    </p>
                  )}
                  <div id="mp-card-brick" className="min-h-[200px]" />
                </div>
              )}
            </div>

            {payMode === "simulated" && (
              <Button onClick={handleCheckout} className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Processando..." : "Confirmar Pagamento"}
              </Button>
            )}
            {payMode === "mp" && paymentMethod === "PIX" && !pix && (
              <Button onClick={handleGeneratePix} className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Gerando..." : `Gerar PIX de ${selectedGift ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(checkoutTotal()) : ""}`}
              </Button>
            )}
            {payMode === "checking" && (
              <Button className="w-full" size="lg" disabled>
                Carregando...
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
