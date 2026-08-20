"use client"

import * as React from "react"
import { useState, useEffect, useTransition } from "react"
import { toast } from "sonner"
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  UserPlus,
  Link2,
  Heart,
  User,
  Mail,
  ShieldCheck,
  Plus,
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

import { createWedding, checkSlugAvailability } from "@/app/actions/weddings"
import { createCoupleAccount } from "@/app/actions/planner-users"
import { generateWeddingSlug } from "@/lib/slug"

export interface CreateWeddingDialogProps {
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

export function CreateWeddingDialog({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess,
  trigger,
}: CreateWeddingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = externalOpen !== undefined
  const isOpen = isControlled ? externalOpen : internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
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
  const [isSlugEdited, setIsSlugEdited] = useState(false)

  // Couple Account State
  const [enableCoupleAccount, setEnableCoupleAccount] = useState(false)
  const [coupleName, setCoupleName] = useState("")
  const [coupleEmail, setCoupleEmail] = useState("")

  // Slug Availability State
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugMessage, setSlugMessage] = useState("")

  // Submit & Modal Success Screen State
  const [isPending, startTransition] = useTransition()
  const [tempPasswordResult, setTempPasswordResult] = useState<{
    tempPassword: string
    email: string
    coupleName: string
    weddingSlug: string
  } | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const resetForm = () => {
    setPartner1Name("")
    setPartner1Role("Noiva")
    setPartner2Name("")
    setPartner2Role("Noivo")
    setDate("")
    setSlug("")
    setIsSlugEdited(false)
    setEnableCoupleAccount(false)
    setCoupleName("")
    setCoupleEmail("")
    setIsCheckingSlug(false)
    setSlugAvailable(null)
    setSlugMessage("")
    setTempPasswordResult(null)
    setCopiedPassword(false)
  }

  // Auto-generate slug when names change (if user hasn't manually edited the slug)
  useEffect(() => {
    if (!isSlugEdited && (partner1Name.trim() || partner2Name.trim())) {
      const generated = generateWeddingSlug(partner1Name, partner2Name)
      setSlug(generated)
    }
  }, [partner1Name, partner2Name, isSlugEdited])

  // Debounced slug check
  useEffect(() => {
    const clean = slug.trim()
    if (!clean) {
      setSlugAvailable(null)
      setSlugMessage("")
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
          setSlugMessage("Link disponível")
        } else {
          setSlugMessage("Este link já está em uso")
        }
      } catch {
        setSlugAvailable(false)
        setSlugMessage("Erro ao verificar disponibilidade")
      } finally {
        setIsCheckingSlug(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [slug])

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugEdited(true)
    setSlug(e.target.value)
  }

  const handleRegenerateSlug = () => {
    setIsSlugEdited(false)
    const generated = generateWeddingSlug(partner1Name, partner2Name)
    setSlug(generated)
  }

  const handleCopyPassword = async () => {
    if (!tempPasswordResult?.tempPassword) return
    try {
      await navigator.clipboard.writeText(tempPasswordResult.tempPassword)
      setCopiedPassword(true)
      toast.success("Senha copiada para a área de transferência!")
      setTimeout(() => setCopiedPassword(false), 3000)
    } catch {
      toast.error("Não foi possível copiar a senha automaticamente.")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

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
      toast.error("O link escolhido já está em uso. Por favor, altere o slug.")
      return
    }

    if (enableCoupleAccount && coupleEmail.trim() && !coupleEmail.includes("@")) {
      toast.error("Informe um e-mail válido para o casal.")
      return
    }

    startTransition(async () => {
      try {
        // Safe local date conversion to avoid timezone offset shifts
        const selectedDate = new Date(`${date}T12:00:00`)

        // 1. Create Wedding
        const weddingRes = await createWedding({
          partner1Name: partner1Name.trim(),
          partner1Role,
          partner2Name: partner2Name.trim(),
          partner2Role,
          date: selectedDate,
          slug: slug.trim(),
        })

        if (!weddingRes.success || !weddingRes.wedding) {
          toast.error(weddingRes.error || "Erro ao criar casamento.")
          return
        }

        const createdWedding = weddingRes.wedding

        // 2. Create Couple Account if email provided
        const targetEmail = enableCoupleAccount ? coupleEmail.trim() : ""
        if (targetEmail) {
          const finalCoupleName =
            coupleName.trim() || `${partner1Name.trim()} & ${partner2Name.trim()}`

          const coupleRes = await createCoupleAccount({
            weddingSlug: createdWedding.slug,
            coupleName: finalCoupleName,
            email: targetEmail,
          })

          if (coupleRes.success && coupleRes.tempPassword) {
            // Show Success Screen with Temp Password inside Modal
            setTempPasswordResult({
              tempPassword: coupleRes.tempPassword,
              email: targetEmail,
              coupleName: finalCoupleName,
              weddingSlug: createdWedding.slug,
            })
            toast.success("Casamento e conta do casal criados com sucesso!")
            onSuccess?.()
            return
          } else if (!coupleRes.success) {
            toast.warning(
              `Casamento criado, mas houve um problema na conta do casal: ${coupleRes.error}`
            )
          }
        }

        toast.success("Casamento criado com sucesso!")
        onSuccess?.()
        handleOpenChange(false)
      } catch (err: any) {
        console.error("Create wedding error:", err)
        toast.error("Ocorreu um erro ao criar o casamento. Tente novamente.")
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : !isControlled ? (
        <DialogTrigger render={
          <Button className="gap-2 shadow-sm font-medium">
            <Plus className="w-4 h-4" />
            <span>Novo Casamento</span>
          </Button>
        } />
      ) : null}

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-2xl border bg-background shadow-2xl">
        {tempPasswordResult ? (
          /* SUCCESS SCREEN INSIDE MODAL WHEN TEMP PASSWORD GENERATED */
          <div className="py-4 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Casamento Criado!
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm max-w-md mx-auto">
                O painel de casamento foi configurado e a conta de acesso para o casal foi gerada.
              </DialogDescription>
            </div>

            <div className="bg-muted/50 rounded-xl p-5 border space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Dados de Acesso do Casal
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Nome do Casal</span>
                  <span className="font-medium text-foreground">{tempPasswordResult.coupleName}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">E-mail de Login</span>
                  <span className="font-medium text-foreground">{tempPasswordResult.email}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60">
                <span className="text-xs text-muted-foreground block mb-1.5 font-medium">
                  Senha Temporária Gerada:
                </span>
                <div className="flex items-center gap-2 bg-background p-3 rounded-lg border">
                  <code className="font-mono text-base sm:text-lg font-bold text-primary tracking-wide flex-1 break-all select-all">
                    {tempPasswordResult.tempPassword}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleCopyPassword}
                    className="gap-1.5 shrink-0"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Copie e envie esta senha para o casal. Eles poderão utilizá-la no primeiro acesso ao sistema.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                className="w-full sm:w-auto min-w-[120px]"
                onClick={() => handleOpenChange(false)}
              >
                Concluir
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* CREATE WEDDING FORM */
          <form onSubmit={handleSubmit} className="space-y-6">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Painel Cerimonialista
                </span>
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Novo Casamento
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Cadastre os noivos, a data do evento e o link de acesso exclusivo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* PARTNER 1 & PARTNER 2 GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                {/* Partner 1 */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="partner1Name" className="text-xs font-semibold text-foreground/80">
                      1º Noivo(a) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <User className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="partner1Name"
                        placeholder="Nome completo ou primeiro nome"
                        className="pl-8"
                        value={partner1Name}
                        onChange={(e) => setPartner1Name(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="partner1Role" className="text-xs font-semibold text-foreground/80">
                      Papel
                    </Label>
                    <Select value={partner1Role} onValueChange={(val) => setPartner1Role(val || "")}>
                      <SelectTrigger id="partner1Role" className="mt-1">
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
                    <Label htmlFor="partner2Name" className="text-xs font-semibold text-foreground/80">
                      2º Noivo(a) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <User className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="partner2Name"
                        placeholder="Nome completo ou primeiro nome"
                        className="pl-8"
                        value={partner2Name}
                        onChange={(e) => setPartner2Name(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="partner2Role" className="text-xs font-semibold text-foreground/80">
                      Papel
                    </Label>
                    <Select value={partner2Role} onValueChange={(val) => setPartner2Role(val || "")}>
                      <SelectTrigger id="partner2Role" className="mt-1">
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

              {/* DATE PICKER */}
              <div>
                <Label htmlFor="weddingDate" className="text-xs font-semibold text-foreground/80">
                  Data do Casamento <span className="text-destructive">*</span>
                </Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="weddingDate"
                    type="date"
                    className="pl-8"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* SLUG FIELD WITH DEBOUNCED AVAILABILITY CHECK */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="weddingSlug" className="text-xs font-semibold text-foreground/80">
                    Link Personalizado (URL) <span className="text-destructive">*</span>
                  </Label>
                  {isSlugEdited && (
                    <button
                      type="button"
                      onClick={handleRegenerateSlug}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Recalcular link
                    </button>
                  )}
                </div>

                <div className="relative flex items-center">
                  <div className="absolute left-3 text-xs text-muted-foreground select-none font-mono flex items-center gap-1 border-r pr-2 border-border">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>/</span>
                  </div>
                  <Input
                    id="weddingSlug"
                    placeholder="joao-e-maria"
                    className="pl-14 pr-10 font-mono text-sm"
                    value={slug}
                    onChange={handleSlugChange}
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

                {/* SLUG STATUS FEEDBACK */}
                <div className="text-xs flex items-center justify-between min-h-[18px] px-1">
                  <span className="text-muted-foreground">
                    Link público do evento
                  </span>

                  {isCheckingSlug ? (
                    <span className="text-muted-foreground">Verificando...</span>
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

              {/* COUPLE ACCOUNT (OPTIONAL SECTION) */}
              <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      Criar Conta para o Casal (Opcional)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    id="enableCoupleAccount"
                    checked={enableCoupleAccount}
                    onChange={(e) => setEnableCoupleAccount(e.target.checked)}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Gere um acesso exclusivo para que o casal possa visualizar o convite e acompanhar os presentes.
                </p>

                {enableCoupleAccount && (
                  <div className="pt-2 space-y-3 animate-in fade-in duration-200">
                    <div>
                      <Label htmlFor="coupleName" className="text-xs font-medium">
                        Nome de Exibição do Casal
                      </Label>
                      <Input
                        id="coupleName"
                        placeholder={
                          partner1Name && partner2Name
                            ? `${partner1Name} & ${partner2Name}`
                            : "Ex: João & Maria"
                        }
                        className="mt-1 text-sm"
                        value={coupleName}
                        onChange={(e) => setCoupleName(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="coupleEmail" className="text-xs font-medium">
                        E-mail de Login do Casal <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="coupleEmail"
                          type="email"
                          placeholder="casal@email.com"
                          className="pl-8 text-sm"
                          value={coupleEmail}
                          onChange={(e) => setCoupleEmail(e.target.value)}
                          required={enableCoupleAccount}
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Criar Casamento</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
