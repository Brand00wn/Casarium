"use client"

import * as React from "react"
import { useState, useEffect, useTransition } from "react"
import { toast } from "sonner"
import {
  TriangleAlert,
  Trash2,
  Loader2,
  AlertOctagon,
  ShieldAlert,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { deleteWedding } from "@/app/actions/weddings"

export interface DeleteWeddingDialogProps {
  weddingId: string
  expectedText: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  trigger?: React.ReactElement
}

export function DeleteWeddingDialog({
  weddingId,
  expectedText,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess,
  trigger,
}: DeleteWeddingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = externalOpen !== undefined
  const isOpen = isControlled ? externalOpen : internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmInput("")
    }
    if (isControlled) {
      externalOnOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  const [confirmInput, setConfirmInput] = useState("")
  const [isPending, startTransition] = useTransition()

  // Reset confirmation input when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmInput("")
    }
  }, [isOpen])

  const cleanExpected = (expectedText || "").trim().toLowerCase()
  const cleanInput = confirmInput.trim().toLowerCase()
  const isMatched = cleanExpected.length > 0 && cleanInput === cleanExpected

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isMatched) {
      toast.error("O texto digitado não confere exatamente com o nome esperado.")
      return
    }

    startTransition(async () => {
      try {
        const res = await deleteWedding(weddingId, confirmInput.trim())

        if (!res.success) {
          toast.error(res.error || "Erro ao excluir o casamento.")
          return
        }

        toast.success("Casamento excluído com sucesso!")
        onSuccess?.()
        handleOpenChange(false)
      } catch (err: any) {
        console.error("Delete wedding error:", err)
        toast.error("Ocorreu um erro inesperado ao tentar excluir.")
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : !isControlled ? (
        <DialogTrigger render={
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 shrink-0 gap-1"
            title="Excluir casamento"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="sr-only sm:not-sr-only sm:inline-block">Excluir</span>
          </Button>
        } />
      ) : null}

      <DialogContent className="max-w-lg p-6 sm:p-8 rounded-2xl border border-destructive/20 bg-background shadow-2xl">
        <form onSubmit={handleDelete} className="space-y-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2.5 text-destructive">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-destructive/80 block">
                  Ação Crítica Irreversível
                </span>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  Excluir Casamento
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {/* SEVERE WARNING CONTAINER */}
          <div className="rounded-xl bg-destructive/10 border border-destructive/25 p-4 text-xs text-destructive dark:text-red-400 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <TriangleAlert className="w-4 h-4 shrink-0" />
              <span>Atenção: Todos os dados serão apaga dos permanentemente</span>
            </div>
            <p className="leading-relaxed opacity-90">
              Esta ação <strong>não pode ser desfeita</strong>. Ao excluir este casamento, todos os convidados, lista de presentes, confirmações de presença (RSVP), mesas, fornecedores e configurações associadas serão apagados do sistema.
            </p>
          </div>

          {/* CONFIRMATION INPUT */}
          <div className="space-y-2">
            <Label htmlFor="deleteConfirmationInput" className="text-xs font-medium text-foreground">
              Para confirmar, digite exatamente <strong className="text-destructive underline select-all">"{expectedText}"</strong> abaixo:
            </Label>
            <Input
              id="deleteConfirmationInput"
              placeholder={expectedText}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="border-destructive/30 focus-visible:ring-destructive/50"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!isMatched || isPending}
              className="gap-2 min-w-[150px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Casamento</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
