"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteGuest } from "@/app/actions/guests"

interface DeleteGuestButtonProps {
  weddingId: string
  guestId: string
  guestName: string
  dependentsCount: number
}

export function DeleteGuestButton({ weddingId, guestId, guestName, dependentsCount }: DeleteGuestButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGuest(weddingId, guestId)
      if (result.success) {
        setOpen(false)
      } else {
        alert(result.error)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      } />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Representante Familiar?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{guestName}</strong>? 
            {dependentsCount > 0 && (
              <span className="block mt-2 text-destructive font-medium">
                Atenção: Ao excluir o titular, todos os {dependentsCount} acompanhantes vinculados a ele também serão excluídos permanentemente.
              </span>
            )}
            {!dependentsCount && (
              <span className="block mt-2">Esta ação não pode ser desfeita.</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault() // Impede fechar automaticamente
              handleDelete()
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Excluindo..." : "Sim, excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
