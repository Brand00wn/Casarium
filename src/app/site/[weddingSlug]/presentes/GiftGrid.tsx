"use client";

import { useState } from "react";
import { Gift, GiftCategory } from "@prisma/client";
import { simulateCheckout } from "@/app/actions/gifts";
import { toast } from "sonner";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QrCode, CreditCard, Gift as GiftIcon } from "lucide-react";

type GiftWithCategories = Gift & { categories?: GiftCategory[] };

export default function GiftGrid({
  gifts,
  categories,
  weddingId,
  weddingSlug,
  siteGuest,
}: {
  gifts: GiftWithCategories[];
  categories: GiftCategory[];
  weddingId: string;
  weddingSlug: string;
  siteGuest?: { id: string, name: string } | null;
}) {
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [guestName, setGuestName] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCheckout = (gift: Gift) => {
    setSelectedGift(gift);
    setGuestName(siteGuest?.name || "");
    setGuestMessage("");
    setPaymentMethod("PIX");
    setIsOpen(true);
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
      await simulateCheckout(weddingSlug, selectedGift?.id || null, {
        guestName,
        guestMessage,
        amount: selectedGift!.price,
        paymentMethod,
        ...(siteGuest ? { guestId: siteGuest.id } : {}),
      });
      toast.success("Pagamento realizado com sucesso! Muito obrigado pelo presente.");
      setIsOpen(false);
    } catch (error) {
      toast.error("Ocorreu um erro ao processar o pagamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleGifts = gifts.filter(g => categoryFilter === "all" || g.categories?.some(c => c.id === categoryFilter));

  return (
    <>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleGifts.map((gift) => (
          <Card key={gift.id} className="group overflow-hidden flex flex-col rounded-2xl border-border/70 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            {gift.imageUrl ? (
              <div className="w-full h-52 bg-muted">
                <img src={gift.imageUrl} alt={gift.name} className="w-full h-full object-cover" />
              </div>
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
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground font-light mb-4">{gift.description}</p>
              <p className="text-2xl font-bold text-primary">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(gift.price)}
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full rounded-full h-11 text-sm font-semibold uppercase tracking-[0.1em]" onClick={() => openCheckout(gift)}>
                Presentear
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      {visibleGifts.length === 0 && (
        <p className="text-center text-muted-foreground font-light py-12">
          Nenhum presente nesta categoria ainda.
        </p>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Presentear os Noivos</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {selectedGift && (
              <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold">{selectedGift.name}</p>
                  <p className="text-sm text-muted-foreground">Valor do presente</p>
                </div>
                <p className="font-bold text-lg">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(selectedGift.price)}
                </p>
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
                <RadioGroup value={paymentMethod} onValueChange={(v: "PIX" | "CREDIT_CARD") => setPaymentMethod(v)} className="flex gap-4">
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

              {paymentMethod === "CREDIT_CARD" && (
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

              {paymentMethod === "PIX" && (
                <div className="flex flex-col items-center justify-center space-y-2 bg-muted/50 p-6 rounded-lg border">
                  <QrCode className="w-24 h-24 text-primary" />
                  <p className="text-sm text-center text-muted-foreground">
                    Ao confirmar, você gerará o PIX Copia e Cola para pagamento.
                  </p>
                </div>
              )}
            </div>

            <Button onClick={handleCheckout} className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Processando..." : "Confirmar Pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
