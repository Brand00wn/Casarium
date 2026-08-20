"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { sendInvite } from "@/app/actions/whatsapp";
import { toast } from "sonner";

export function WhatsAppButton({ weddingId, guestId }: { weddingId: string, guestId: string }) {
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    try {
      setLoading(true);
      const result = await sendInvite(weddingId, guestId);
      setLoading(false);

      if (result.success) {
        toast.success("Mensagem enviada com sucesso!");
      } else {
        toast.error(result.error || "Falha ao enviar mensagem");
      }
    } catch (error) {
      setLoading(false);
      toast.error("Ocorreu um erro ao enviar a mensagem");
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleSend} 
      disabled={loading}
      title="Disparar WhatsApp"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4 text-green-600" />}
    </Button>
  );
}
