"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { auditGiftImages, removeGiftImage } from "@/app/actions/gifts";

type Broken = { id: string, name: string, imageUrl: string, status: string };

/** Verifica quais imagens de presentes estão quebradas e permite removê-las. */
export function ImageAuditButton({ weddingSlug }: { weddingSlug: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number, broken: Broken[] } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await auditGiftImages(weddingSlug);
      setResult(res);
      if (res.broken.length === 0) toast.success(`Tudo certo! ${res.total} imagens verificadas.`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao verificar imagens.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (item: Broken) => {
    setRemoving(item.id);
    try {
      await removeGiftImage(weddingSlug, item.id, item.imageUrl);
      setResult(prev => prev ? { ...prev, broken: prev.broken.filter(b => b.id !== item.id) } : prev);
      toast.success(`Imagem de "${item.name}" removida.`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover.");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) runAudit(); }}>
      <DialogTrigger render={
        <Button variant="outline" size="sm" className="gap-2">
          <ImageOff className="w-4 h-4" /> Verificar imagens
        </Button>
      } />
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Imagens quebradas</DialogTitle>
        </DialogHeader>
        {loading && (
          <p className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Verificando {result ? "" : "imagens"}...
          </p>
        )}
        {!loading && result && result.broken.length === 0 && (
          <p className="py-6 text-center text-sm text-green-700">
            Nenhuma imagem quebrada entre {result.total} verificadas. 🎉
          </p>
        )}
        {!loading && result && result.broken.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {result.broken.length} de {result.total} com problema. Remova para o presente exibir o placeholder — depois suba outra imagem na edição.
            </p>
            {result.broken.map(b => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground truncate" title={b.imageUrl}>{b.imageUrl}</p>
                  <p className="text-xs text-red-500 font-medium">{b.status}</p>
                </div>
                <Button
                  variant="destructive" size="sm"
                  disabled={removing === b.id}
                  onClick={() => handleRemove(b)}
                  className="gap-1 shrink-0"
                >
                  {removing === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
