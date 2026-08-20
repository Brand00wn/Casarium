"use client"

import * as React from "react"
import { useState, useEffect, useTransition } from "react"
import { toast } from "sonner"
import {
  Pencil,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Link2,
  User,
  Save,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { updateWedding, checkSlugAvailability } from "@/app/actions/weddings"

export interface WeddingData {
  id: string
  slug: string
  partner1Name: string
  partner1Role?: string | null
  partner2Name: string
  partner2Role?: string | null
  date: Date | string
  venue?: string | null
  theme?: string | null
}

export interface EditWeddingDialogProps {
  wedding: WeddingData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  trigger?: React.ReactElement
}

const ROLES = [
  { value: "Noiva", label: "Noiva" },
  { value: "Noivo", label: "Noivo" },
  { value: "Cônjuge", label: "Cônjuge" },
]

function formatDateForInput(dateVal?: Date | string | null): string {
  if (!dateVal) return ""
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return ""
    return d.toISOString().split("T")[0]
  } catch {
    return ""
  }
}

export function EditWeddingDialog({
  wedding,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess,
  trigger,
}: EditWeddingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = externalOpen !== undefined
  const isOpen = isControlled ? externalOpen : internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      externalOnOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  // Form Fields State
  const [partner1Name, setPartner1Name] = useState("")
  const [partner1Role, setPartner1Role] = useState("Noiva")
  const [partner2Name, setPartner2Name] = useState("")
  const [partner2Role, setPartner2Role] = useState("Noivo")
  const [date, setDate] = useState("")
  const [slug, setSlug] = useState("")

  // Slug Availability State
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugMessage, setSlugMessage] = useState("")

  const [isPending, startTransition] = useTransition()

  // Populate initial values when wedding prop changes or modal opens
  useEffect(() => {
    if (wedding && isOpen) {
      setPartner1Name(wedding.partner1Name || "")
      setPartner1Role(wedding.partner1Role || "Noiva")
      setPartner2Name(wedding.partner2Name || "")
      setPartner2Role(wedding.partner2Role || "Noivo")
      setDate(formatDateForInput(wedding.date))
      setSlug(wedding.slug || "")
      setSlugAvailable(true)
      setSlugMessage("Link atual deste casamento")
    }
  }, [wedding, isOpen])

  // Debounced slug availability validation (only if slug changed)
  useEffect(() => {
    if (!wedding || !isOpen) return
    const clean = slug.trim()

    if (!clean) {
      setSlugAvailable(false)
      setSlugMessage("O link personalizado não pode ser vazio")
      setIsCheckingSlug(false)
      return
    }

    // If unchanged from current wedding slug
    if (clean === wedding.slug) {
      setSlugAvailable(true)
      setSlugMessage("Link atual deste casamento")
      setIsCheckingSlug(false)
      return
    }

    setIsCheckingSlug(true)
    setSlugAvailable(null)

    const timer = setTimeout(async () => {
      try {
        const res = await checkSlugAvailability(clean)
        setSlugAvailable(res.available)
        if (res.available) {
          setSlugMessage("Novo link disponível")
        } else {
          setSlugMessage("Este link já está em uso por outro casamento")
        }
      } catch {
        setSlugAvailable(false)
        setSlugMessage("Erro ao verificar disponibilidade do link")
      } finally {
        setIsCheckingSlug(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [slug, wedding, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!wedding) {
      toast.error("Nenhum casamento selecionado.")
      return
    }

    if (!partner1Name.trim() || !partner2Name.trim()) {
      toast.error("Preencha o nome dos dois noivos.")
      return
    }

    if (!date) {
      toast.error("Informe a data do casamento.")
      return
    }

    if (!slug.trim()) {
      toast.error("O link personalizado (slug) é obrigatório.")
      return
    }

    if (slugAvailable === false) {
      toast.error("O link escolhido é inválido ou já está em uso.")
      return
    }

    startTransition(async () => {
      try {
        const selectedDate = new Date(`${date}T12:00:00`)

        const res = await updateWedding(wedding.id, {
          partner1Name: partner1Name.trim(),
          partner1Role,
          partner2Name: partner2Name.trim(),
          partner2Role,
          date: selectedDate,
          slug: slug.trim(),
        })

        if (!res.success) {
          toast.error(res.error || "Erro ao atualizar casamento.")
          return
        }

        toast.success("Casamento atualizado com sucesso!")
        onSuccess?.()
        handleOpenChange(false)
      } catch (err: any) {
        console.error("Update wedding error:", err)
        toast.error("Ocorreu um erro ao salvar as alterações.")
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : !isControlled ? (
        <DialogTrigger render={
          <Button variant="outline" size="sm" className="gap-1.5 flex-1">
            <Pencil className="w-3.5 h-3.5" />
            <span>Editar</span>
          </Button>
        } />
      ) : null}

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-2xl border bg-background shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Pencil className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Edição de Dados
              </span>
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              Editar Casamento
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Altere o nome dos noivos, a data do evento ou o link personalizado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* PARTNERS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              {/* Partner 1 */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="editPartner1Name" className="text-xs font-semibold text-foreground/80">
                    1º Noivo(a) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <User className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="editPartner1Name"
                      placeholder="Nome completo ou primeiro nome"
                      className="pl-8"
                      value={partner1Name}
                      onChange={(e) => setPartner1Name(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editPartner1Role" className="text-xs font-semibold text-foreground/80">
                    Papel
                  </Label>
                  <Select value={partner1Role} onValueChange={(val) => setPartner1Role(val || "")}>
                    <SelectTrigger id="editPartner1Role" className="mt-1">
                      <SelectValue placeholder="Selecione o papel" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Partner 2 */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="editPartner2Name" className="text-xs font-semibold text-foreground/80">
                    2º Noivo(a) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <User className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="editPartner2Name"
                      placeholder="Nome completo ou primeiro nome"
                      className="pl-8"
                      value={partner2Name}
                      onChange={(e) => setPartner2Name(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editPartner2Role" className="text-xs font-semibold text-foreground/80">
                    Papel
                  </Label>
                  <Select value={partner2Role} onValueChange={(val) => setPartner2Role(val || "")}>
                    <SelectTrigger id="editPartner2Role" className="mt-1">
                      <SelectValue placeholder="Selecione o papel" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* DATE */}
            <div>
              <Label htmlFor="editWeddingDate" className="text-xs font-semibold text-foreground/80">
                Data do Casamento <span className="text-destructive">*</span>
              </Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="editWeddingDate"
                  type="date"
                  className="pl-8"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* SLUG FIELD WITH VALIDATION */}
            <div className="space-y-1.5">
              <Label htmlFor="editWeddingSlug" className="text-xs font-semibold text-foreground/80">
                Link Personalizado (URL) <span className="text-destructive">*</span>
              </Label>

              <div className="relative flex items-center">
                <div className="absolute left-3 text-xs text-muted-foreground select-none font-mono flex items-center gap-1 border-r pr-2 border-border">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>/</span>
                </div>
                <Input
                  id="editWeddingSlug"
                  placeholder="joao-e-maria"
                  className="pl-14 pr-10 font-mono text-sm"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
                <div className="absolute right-3 flex items-center pointer-events-none">
                  {isCheckingSlug ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : slugAvailable === true ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : slugAvailable === false ? (
                    <XCircle className="w-4 h-4 text-destructive" />
                  ) : null}
                </div>
              </div>

              {/* SLUG FEEDBACK */}
              <div className="text-xs flex items-center justify-between min-h-[18px] px-1">
                <span className="text-muted-foreground">
                  Link público do evento
                </span>

                {isCheckingSlug ? (
                  <span className="text-muted-foreground">Validando...</span>
                ) : slugAvailable === true ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {slugMessage}
                  </span>
                ) : slugAvailable === false ? (
                  <span className="text-destructive font-medium flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {slugMessage}
                  </span>
                ) : null}
              </div>
            </div>
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
              disabled={isPending || isCheckingSlug || slugAvailable === false}
              className="gap-2 min-w-[140px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
