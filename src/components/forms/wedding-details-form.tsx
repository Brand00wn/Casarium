"use client"

import { useState, useEffect, useRef } from "react"
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { toast } from "sonner"
import { Loader2, Heart, Calendar, Palette, Globe, CheckCircle2, Check, AlertCircle } from "lucide-react"
import { updateWeddingDetails } from "@/app/actions/wedding-details"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LocationAutocomplete } from "@/components/ui/location-autocomplete"
import { GuestCombobox } from "@/components/forms/guest-combobox"
import { Plus, Trash2, Eye } from "lucide-react"

export function WeddingDetailsForm({ wedding, weddingId }: { wedding: any, weddingId: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const partyContainerRef = useRef<HTMLDivElement>(null)

  const PARKING_TYPES: Record<string, string> = {
    "none": "Não informado",
    "no_parking": "Sem estacionamento",
    "free_on_site": "Gratuito no local",
    "paid_on_site": "Pago no local",
    "street": "Na rua",
    "valet": "Valet / Manobrista"
  }

  const VENDOR_TYPES: Record<string, string> = {
    "SALON": "Salão de Beleza",
    "BARBERSHOP": "Barbearia",
    "SUIT_SHOP": "Loja de Trajes",
    "BEAUTY_CLINIC": "Estética",
    "MAKEUP_ARTIST": "Maquiador(a)",
    "HAIR_STYLIST": "Cabelereiro / Penteado",
    "MANICURE": "Manicure e Pedicure",
    "SPA": "Spa / Dia da Noiva",
    "DRESS_SHOP": "Loja de Vestidos",
    "JEWELRY": "Joalheria"
  }

  const PARTY_MEMBER_TYPES: Record<string, string> = {
    "FATHER": "Pai",
    "MOTHER": "Mãe",
    "GRANDFATHER": "Avô",
    "GRANDMOTHER": "Avó",
    "BROTHER": "Irmão",
    "SISTER": "Irmã",
    "GROOMSMAN": "Padrinho",
    "BRIDESMAID": "Madrinha",
    "RING_BEARER": "Porta Alianças",
    "PAGE_BOY": "Pajem",
    "FLOWER_GIRL": "Daminha",
    "DEMOISELLE": "Demoiselle",
    "CELEBRANT": "Celebrante",
    "RELATIVE": "Familiar",
    "FRIEND": "Amigo(a)",
    "OTHER": "Outro"
  }

  const PARTY_MEMBER_SIDES: Record<string, string> = {
    "PARTNER_1": wedding.partner1Role || "Noiva",
    "PARTNER_2": wedding.partner2Role || "Noivo",
    "BOTH": "Ambos"
  }

  const formatDateForInput = (dateString?: string | Date | null) => {
    if (!dateString) return ""
    const d = new Date(dateString)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  const getFormValues = (w: any) => {
    let currentReceptionType = "none"
    if (w.hasReception) {
      currentReceptionType = w.isSameLocation ? "same" : "different"
    }
    
    return {
      partner1Name: w.partner1Name || "",
      partner1Role: w.partner1Role || "Noiva",
      partner2Name: w.partner2Name || "",
      partner2Role: w.partner2Role || "Noivo",
      coverImageUrl: w.coverImageUrl || "",
      ourStory: w.ourStory || "",
      ceremonyDate: formatDateForInput(w.ceremonyDate) || formatDateForInput(w.date),
      ceremonyLocation: w.ceremonyLocation || "",
      ceremonyPlaceId: w.ceremonyPlaceId || "",
      receptionType: currentReceptionType,
      receptionDate: formatDateForInput(w.receptionDate),
      receptionLocation: w.receptionLocation || "",
      receptionPlaceId: w.receptionPlaceId || "",
      dressCode: w.dressCode || "",
      primaryColor: w.primaryColor || "#5C8B6B",
      secondaryColor: w.secondaryColor || "#A3B8AA",
      isPublicSiteEnabled: w.isPublicSiteEnabled ?? true,
      sitePassword: w.sitePassword || "",
      spotifyLink: w.spotifyLink || "",
      hashtag: w.hashtag || "",
      moderateMessages: w.moderateMessages ?? false,
      hasAccommodationTips: w.hasAccommodationTips ?? false,
      accommodationTips: w.accommodationTips || "",
      ceremonyParkingType: w.ceremonyParkingType || "none",
      receptionParkingType: w.receptionParkingType || "none",
      vendorRecommendations: w.vendorRecommendations || [],
      partyMembers: (w.partyMembers || []).map((m: any) => ({
        ...m,
        clientId: m.id,
        pairedWithId: m.accompanies ? m.accompanies.toLowerCase() : (m.pairedWithId || (m.pairedOf ? m.pairedOf.id : "none")),
        attireColor: m.attireColor || "",
        hasTribute: m.hasTribute ?? false,
        guestId: m.guestId || null
      })),
      rsvpDeadline: formatDateForInput(w.rsvpDeadline),
      rsvpMessage: w.rsvpMessage || "",
    }
  }

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: getFormValues(wedding)
  })

  // Watch for external changes (like AI API calls that trigger router.refresh)
  useEffect(() => {
    reset(getFormValues(wedding))
  }, [wedding, reset])

  const { fields: vendorFields, append: appendVendor, remove: removeVendor } = useFieldArray({
    control,
    name: "vendorRecommendations"
  })

  const { fields: partyFields, append: appendParty, remove: removeParty } = useFieldArray({
    control,
    name: "partyMembers"
  })

  const previousPartyLength = useRef(partyFields.length)
  useEffect(() => {
    if (partyFields.length > previousPartyLength.current) {
      setTimeout(() => {
        const elements = partyContainerRef.current?.querySelectorAll('.party-member-card')
        if (elements && elements.length > 0) {
          const lastElement = elements[elements.length - 1]
          lastElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          const input = lastElement.querySelector('input[type="text"]') as HTMLInputElement
          if (input) input.focus()
        }
      }, 100)
    }
    previousPartyLength.current = partyFields.length
  }, [partyFields.length])

  const watchedParty = watch("partyMembers") || partyFields;
  const receptionType = watch("receptionType")
  const isPublicSiteEnabled = watch("isPublicSiteEnabled")

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      // Ignora alterações programáticas (ex: reset após AI terminar)
      if (!name) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        handleSubmit(onSubmit)()
      }, 1000)
    })
    return () => subscription.unsubscribe()
  }, [watch, handleSubmit])

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      // Map back to DB fields
      const hasReception = data.receptionType !== "none"
      const isSameLocation = data.receptionType === "same"

      const payload = {
        ...data,
        hasReception,
        isSameLocation,
        date: data.ceremonyDate || wedding.date
      }

      await updateWeddingDetails(weddingId, payload)
      // Removido toast.success para não poluir a tela no autosave
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro ao salvar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-8 relative">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm text-muted-foreground flex items-center h-6 transition-all">
          {isLoading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" /> <span className="animate-pulse">Salvando alterações...</span></>
          ) : (
            <><Check className="w-4 h-4 mr-2 text-green-500" /> <span>Todas as alterações salvas</span></>
          )}
        </div>
      </div>

      <Tabs defaultValue="noivos" className="w-full">
        <TabsList className="flex w-full p-1.5 bg-primary/10 rounded-full mb-8 gap-1">
          <TabsTrigger
            value="noivos"
            className="flex-1 py-2.5 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all text-primary/70 hover:text-primary hover:bg-primary/5 data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:!shadow-md"
          >
            <Heart className="w-4 h-4" /> <span className="hidden sm:inline">O Casal</span>
          </TabsTrigger>
          <TabsTrigger
            value="evento"
            className="flex-1 py-2.5 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all text-primary/70 hover:text-primary hover:bg-primary/5 data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:!shadow-md"
          >
            <Calendar className="w-4 h-4" /> <span className="hidden sm:inline">O Evento</span>
          </TabsTrigger>
          <TabsTrigger
            value="site"
            className="flex-1 py-2.5 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all text-primary/70 hover:text-primary hover:bg-primary/5 data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:!shadow-md"
          >
            <Globe className="w-4 h-4" /> <span className="hidden sm:inline">Site Público</span>
          </TabsTrigger>
          <TabsTrigger
            value="rsvp"
            className="flex-1 py-2.5 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all text-primary/70 hover:text-primary hover:bg-primary/5 data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:!shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" /> <span className="hidden sm:inline">Confirmações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="noivos" className="space-y-6">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Informações Principais</CardTitle>
              <CardDescription>Os nomes que aparecerão em destaque no site e convites.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="font-semibold text-foreground/80">Nome (Parceiro 1)</Label>
                      <Input {...register("partner1Name", { required: true })} placeholder="Ex: Maria" className="bg-background mt-2" />
                    </div>
                    <div className="w-1/3">
                      <Label className="font-semibold text-foreground/80">Título</Label>
                      <Input {...register("partner1Role", { required: true })} placeholder="Ex: Noiva" className="bg-background mt-2" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="font-semibold text-foreground/80">Nome (Parceiro 2)</Label>
                      <Input {...register("partner2Name", { required: true })} placeholder="Ex: João" className="bg-background mt-2" />
                    </div>
                    <div className="w-1/3">
                      <Label className="font-semibold text-foreground/80">Título</Label>
                      <Input {...register("partner2Role", { required: true })} placeholder="Ex: Noivo" className="bg-background mt-2" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="font-semibold text-foreground/80">Foto de Capa (Link)</Label>
                <Input {...register("coverImageUrl")} placeholder="https://..." className="bg-background" />
                <p className="text-xs text-muted-foreground">Cole a URL de uma foto do casal para o cabeçalho do site.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Nossa História</CardTitle>
              <CardDescription>Conte um pouquinho sobre a trajetória de vocês para emocionar os convidados.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                {...register("ourStory")}
                placeholder="Tudo começou quando..."
                className="min-h-[150px] resize-y bg-background"
              />
            </CardContent>
          </Card>

          {/* Cortejo e Homenagens */}
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Cortejo e Homenagens</CardTitle>
              <CardDescription>Adicione os pais, padrinhos e demais membros do cortejo para exibi-los no site.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Flagueie homenagens póstumas ou oculte do site caso necessário.</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendParty({ clientId: crypto.randomUUID(), type: "FATHER", side: "BOTH", name: "", pairedWithId: "none", attireColor: "", isDeceased: false, isMentioned: true, hasTribute: false })}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </div>
                {partyFields.length === 0 ? (
                  <div className="p-6 text-center border border-dashed rounded-lg bg-background/50 text-muted-foreground text-sm">
                    Nenhum membro adicionado. (Dica: adicione pais, mães e padrinhos)
                  </div>
                ) : (
                  <div className="space-y-4" ref={partyContainerRef}>
                    {partyFields.map((field, index) => (
                      <div key={field.id} className="party-member-card p-4 border rounded-lg bg-background/50 space-y-4 relative transition-colors hover:border-primary/30">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => removeParty(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pr-8">
                          <input type="hidden" {...register(`partyMembers.${index}.clientId` as const)} />
                          
                          {/* Variável auxiliar para legibilidade */}
                          {(() => {
                            const isDeceased = watchedParty[index]?.isDeceased;
                            return (
                              <>
                                <div className="space-y-2 md:col-span-3">
                                  <div className="h-5 flex items-center">
                                    <Label className="text-xs font-semibold">Tipo</Label>
                                  </div>
                            <Controller
                              name={`partyMembers.${index}.type`}
                              control={control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="w-full bg-background h-9">
                                    {field.value ? PARTY_MEMBER_TYPES[field.value] : <span className="text-muted-foreground">Selecione</span>}
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(PARTY_MEMBER_TYPES).map(([key, label]) => (
                                      <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          
                          <div className={`space-y-2 ${isDeceased ? 'md:col-span-9' : 'md:col-span-4'}`}>
                            <div className="h-5 flex justify-between items-center">
                              <Label className="text-xs font-semibold">Nome</Label>
                              {watchedParty[index]?.guestId ? (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium"><CheckCircle2 className="w-3 h-3"/> Convidado</span>
                              ) : !isDeceased ? (
                                <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium" title="Não vinculado à lista de convidados"><AlertCircle className="w-3 h-3"/> Não vinculado</span>
                              ) : null}
                            </div>
                            {isDeceased ? (
                              <Input {...register(`partyMembers.${index}.name` as const, { required: true })} placeholder="Nome completo" className="bg-background h-9" />
                            ) : (
                              <Controller
                                name={`partyMembers.${index}.name` as const}
                                control={control}
                                rules={{ required: true }}
                                render={({ field }) => (
                                  <GuestCombobox
                                    guests={wedding.guests || []}
                                    valueName={field.value}
                                    valueId={watchedParty[index]?.guestId || null}
                                    onChange={(name, guestId) => {
                                      field.onChange(name);
                                      setValue(`partyMembers.${index}.guestId` as const, guestId, { shouldDirty: true, shouldValidate: true });
                                    }}
                                  />
                                )}
                              />
                            )}
                          </div>

                          {(!isDeceased || (isDeceased && watchedParty[index]?.hasTribute)) && (
                            <div className="space-y-2 md:col-span-5">
                              <div className="h-5 flex items-center">
                                <Label className="text-xs font-semibold">
                                  {isDeceased ? "Representado por..." : "Entra com..."}
                                </Label>
                              </div>
                              <Controller
                                name={`partyMembers.${index}.pairedWithId`}
                                control={control}
                                render={({ field }) => {
                                  // Encontra o nome selecionado para mostrar no placeholder se customizado
                                  const selectedPerson = watchedParty.find((p: any) => p.clientId === field.value);
                                  return (
                                  <Select 
                                    onValueChange={(val) => {
                                      if (val === "add_new") {
                                        const newId = crypto.randomUUID();
                                        // @ts-ignore - partyFields structure
                                        appendParty({ clientId: newId, type: watchedParty[index].type || "FATHER", side: watchedParty[index].side || "BOTH", name: "", pairedWithId: watchedParty[index].clientId, attireColor: watchedParty[index].attireColor || "", isDeceased: false, isMentioned: true, hasTribute: false });
                                        field.onChange(newId);
                                      } else {
                                        field.onChange(val);
                                      }
                                    }} 
                                    value={field.value || "none"}
                                  >
                                    <SelectTrigger className="w-full bg-background h-9">
                                      {field.value === "none" ? (
                                        <span className="text-muted-foreground">{isDeceased ? "Selecione o representante..." : "Sozinho(a)"}</span>
                                      ) : field.value === "partner1" ? (
                                        watch("partner1Role") || "Parceiro 1"
                                      ) : field.value === "partner2" ? (
                                        watch("partner2Role") || "Parceiro 2"
                                      ) : selectedPerson ? (
                                        selectedPerson.name || "Novo Membro"
                                      ) : (
                                        <span className="text-muted-foreground">{isDeceased ? "Selecione o representante..." : "Sozinho(a)"}</span>
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none" className="text-muted-foreground">{isDeceased ? "Não definido" : "Sozinho(a)"}</SelectItem>
                                      <SelectItem value="add_new" className="text-primary font-medium focus:bg-primary/10 focus:text-primary">
                                        + Adicionar pessoa
                                      </SelectItem>
                                      <SelectItem value="partner1" className="text-pink-600 focus:bg-pink-100 focus:text-pink-700 font-medium">{watch("partner1Role") || "Parceiro 1"}</SelectItem>
                                      <SelectItem value="partner2" className="text-blue-600 focus:bg-blue-100 focus:text-blue-700 font-medium">{watch("partner2Role") || "Parceiro 2"}</SelectItem>
                                      {watchedParty.map((p: any, i: number) => {
                                        if (i === index) return null;
                                        return (
                                          <SelectItem key={p.clientId} value={p.clientId}>
                                            {p.name || `Pessoa ${i + 1}`}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                )}}
                              />
                            </div>
                          )}
                          </>
                        );
                      })()}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <Controller
                              name={`partyMembers.${index}.isDeceased`}
                              control={control}
                              render={({ field }) => (
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              )}
                            />
                            <Label className="text-sm cursor-pointer flex items-center gap-1.5">
                              In Memoriam <Heart className="w-3.5 h-3.5 text-foreground fill-foreground" />
                            </Label>
                          </div>
                          
                          {watchedParty[index]?.isDeceased && (
                            <div className="flex items-center gap-2 text-pink-600">
                              <Controller
                                name={`partyMembers.${index}.hasTribute`}
                                control={control}
                                render={({ field }) => (
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                )}
                              />
                              <Label className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                                Homenagem Presencial (relicário, foto)
                              </Label>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Controller
                              name={`partyMembers.${index}.isMentioned`}
                              control={control}
                              render={({ field }) => (
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              )}
                            />
                            <Label className="text-sm cursor-pointer flex items-center gap-1.5">
                              Mostrar no site <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            </Label>
                          </div>
                          
                          <div className="flex items-center gap-3 md:gap-5 flex-wrap ml-auto">
                            {!watchedParty[index]?.isDeceased && (
                              <div className="flex items-center gap-2">
                                <Controller
                                  name={`partyMembers.${index}.attireColor`}
                                control={control}
                                render={({ field }) => (
                                  <div className="flex items-center gap-1.5 cursor-pointer">
                                    <div 
                                      className="w-5 h-5 rounded-full border border-border flex items-center justify-center overflow-hidden relative cursor-pointer"
                                      style={{ backgroundColor: field.value || "transparent" }}
                                      title="Escolher cor"
                                    >
                                      {!field.value && <div className="w-full h-px bg-red-500/50 rotate-45 absolute" />}
                                      <input 
                                         type="color" 
                                         className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                         value={field.value || "#000000"} 
                                         onChange={field.onChange} 
                                      />
                                    </div>
                                    <Label className="text-sm cursor-pointer">Cor do traje</Label>
                                    {field.value && (
                                       <Button type="button" variant="ghost" className="h-5 px-1 ml-1 text-[10px] text-muted-foreground hover:bg-transparent" onClick={() => field.onChange("")}>Limpar</Button>
                                    )}
                                  </div>
                                )}
                              />
                            </div>
                            )}

                            <div className="ml-auto flex items-center gap-2">
                              <Label className="text-xs font-semibold text-muted-foreground">Lado (Noiva/Noivo):</Label>
                            <Controller
                              name={`partyMembers.${index}.side`}
                              control={control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="w-fit h-8 text-xs bg-background">
                                    {field.value ? PARTY_MEMBER_SIDES[field.value] : <span className="text-muted-foreground">Lado</span>}
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(PARTY_MEMBER_SIDES).map(([key, label]) => (
                                      <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="evento" className="space-y-6">
          <Card className="border-muted/60 shadow-sm relative z-[40]">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Cerimônia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-semibold text-foreground/80">Data e Horário</Label>
                  <Input type="datetime-local" {...register("ceremonyDate")} className="bg-background" />
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold text-foreground/80">Local da Cerimônia</Label>
                  <Controller
                    name="ceremonyLocation"
                    control={control}
                    render={({ field }) => (
                      <LocationAutocomplete
                        value={field.value}
                        onChange={(val, placeId) => {
                          field.onChange(val)
                          if (placeId) setValue("ceremonyPlaceId", placeId, { shouldDirty: true })
                        }}
                        placeholder="Ex: Igreja Matriz, Rua das Flores..."
                        className="bg-background"
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">Pesquise acima o nome ou endereço no Google Maps e clique para selecionar.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm relative z-[30]">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Recepção / Festa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold text-foreground/80">Como será a recepção?</Label>
                <Controller
                  name="receptionType"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                      <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${field.value === 'none' ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/30'}`} onClick={() => field.onChange("none")}>
                        <RadioGroupItem value="none" id="r1" />
                        <Label htmlFor="r1" className="cursor-pointer font-medium w-full">Não teremos festa</Label>
                      </div>
                      <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${field.value === 'same' ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/30'}`} onClick={() => field.onChange("same")}>
                        <RadioGroupItem value="same" id="r2" />
                        <Label htmlFor="r2" className="cursor-pointer font-medium w-full">No mesmo local</Label>
                      </div>
                      <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${field.value === 'different' ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/30'}`} onClick={() => field.onChange("different")}>
                        <RadioGroupItem value="different" id="r3" />
                        <Label htmlFor="r3" className="cursor-pointer font-medium w-full">Em outro local</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>

              {receptionType !== "none" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50 animate-in fade-in duration-500">
                  <div className="space-y-3">
                    <Label className="font-semibold text-foreground/80">Horário da Festa {receptionType === "same" ? "(se diferente)" : ""}</Label>
                    <Input type="datetime-local" {...register("receptionDate")} className="bg-background" />
                  </div>
                  {receptionType === "different" && (
                    <div className="space-y-3">
                      <Label className="font-semibold text-foreground/80">Local da Festa</Label>
                      <Controller
                        name="receptionLocation"
                        control={control}
                        render={({ field }) => (
                          <LocationAutocomplete
                            value={field.value}
                            onChange={(val, placeId) => {
                              field.onChange(val)
                              if (placeId) setValue("receptionPlaceId", placeId, { shouldDirty: true })
                            }}
                            placeholder="Ex: Salão de Festas Y..."
                            className="bg-background"
                          />
                        )}
                      />
                      <p className="text-xs text-muted-foreground">Pesquise acima o nome ou endereço no Google Maps e clique para selecionar.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm relative z-[20]">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Dress Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label className="font-semibold text-foreground/80">Qual o traje recomendado?</Label>
                <Input {...register("dressCode")} placeholder="Ex: Esporte Fino, Gala..." className="bg-background" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site" className="space-y-6">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Aparência do Site</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-semibold text-foreground/80">Cor Principal</Label>
                  <div className="flex gap-3 items-center">
                    <Input type="color" className="w-12 h-12 p-1 cursor-pointer rounded-md border-0 bg-transparent" {...register("primaryColor")} />
                    <Input type="text" className="uppercase font-mono text-sm bg-background flex-1" {...register("primaryColor")} />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold text-foreground/80">Cor Secundária</Label>
                  <div className="flex gap-3 items-center">
                    <Input type="color" className="w-12 h-12 p-1 cursor-pointer rounded-md border-0 bg-transparent" {...register("secondaryColor")} />
                    <Input type="text" className="uppercase font-mono text-sm bg-background flex-1" {...register("secondaryColor")} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm relative z-[20]">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Integrações & Interatividade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-semibold text-foreground/80">Trilha Sonora (Link do Spotify)</Label>
                  <Input {...register("spotifyLink")} placeholder="https://open.spotify.com/track/..." className="bg-background" />
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold text-foreground/80">Hashtag Oficial</Label>
                  <Input {...register("hashtag")} placeholder="#NossoCasamento2026" className="bg-background" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-muted mt-2">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">Aprovação de Recados</Label>
                  <p className="text-sm text-muted-foreground">Exigir sua aprovação antes de publicar mensagens no mural do site.</p>
                </div>
                <Controller name="moderateMessages" control={control} render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Dicas para Convidados</CardTitle>
              <CardDescription>Ajude seus convidados a se prepararem para o grande dia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Hospedagem */}
              <div className="space-y-4">
                <Label className="text-base font-semibold text-foreground/80">O casamento exige hospedagem para convidados?</Label>
                <Controller
                  name="hasAccommodationTips"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={(val) => field.onChange(val === "yes")}
                      value={field.value ? "yes" : "no"}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${field.value === false ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/30'}`} onClick={() => field.onChange(false)}>
                        <RadioGroupItem value="no" id="acc-no" />
                        <Label htmlFor="acc-no" className="cursor-pointer font-medium w-full">Não é necessário</Label>
                      </div>
                      <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${field.value === true ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/30'}`} onClick={() => field.onChange(true)}>
                        <RadioGroupItem value="yes" id="acc-yes" />
                        <Label htmlFor="acc-yes" className="cursor-pointer font-medium w-full">Sim, faremos sugestões</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
                {watch("hasAccommodationTips") && (
                  <div className="pt-2 animate-in fade-in">
                    <Textarea {...register("accommodationTips")} placeholder="Indicamos o Hotel XYZ, com o cupom NOSSOCASAMENTO..." className="bg-background min-h-[100px]" />
                  </div>
                )}
              </div>

              {/* Estacionamento */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <Label className="text-base font-semibold text-foreground/80">Estacionamento & Valet</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="font-semibold text-foreground/80">Na Cerimônia</Label>
                    <Controller
                      name="ceremonyParkingType"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-background">
                            {field.value ? PARKING_TYPES[field.value] : <span className="text-muted-foreground">Selecione o tipo...</span>}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não informado</SelectItem>
                            <SelectItem value="no_parking">Sem estacionamento</SelectItem>
                            <SelectItem value="free_on_site">Gratuito no local</SelectItem>
                            <SelectItem value="paid_on_site">Pago no local</SelectItem>
                            <SelectItem value="street">Na rua</SelectItem>
                            <SelectItem value="valet">Valet / Manobrista</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  {receptionType === "different" && (
                    <div className="space-y-3">
                      <Label className="font-semibold text-foreground/80">Na Festa</Label>
                      <Controller
                        name="receptionParkingType"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="bg-background">
                              {field.value ? PARKING_TYPES[field.value] : <span className="text-muted-foreground">Selecione o tipo...</span>}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Não informado</SelectItem>
                              <SelectItem value="no_parking">Sem estacionamento</SelectItem>
                              <SelectItem value="free_on_site">Gratuito no local</SelectItem>
                              <SelectItem value="paid_on_site">Pago no local</SelectItem>
                              <SelectItem value="street">Na rua</SelectItem>
                              <SelectItem value="valet">Valet / Manobrista</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Fornecedores Dinâmicos */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-foreground/80">Salões e Lojas Recomendadas</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendVendor({ type: "SALON", name: "", address: "", placeId: "", recommendedProfessional: "", notes: "" })}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar
                  </Button>
                </div>
                {vendorFields.length === 0 ? (
                  <div className="p-6 text-center border border-dashed rounded-lg bg-background/50 text-muted-foreground text-sm">
                    Nenhuma recomendação adicionada. (Dica: adicione salões de beleza, barbearias, ou lojas de trajes)
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vendorFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-lg bg-background/50 space-y-4 relative" style={{ zIndex: 50 - index }}>
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => removeVendor(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pr-8">
                          <div className="space-y-2 md:col-span-5">
                            <Label className="text-xs font-semibold">Buscar Estabelecimento (Google Maps)</Label>
                            <Controller
                              name={`vendorRecommendations.${index}.address`}
                              control={control}
                              render={({ field }) => (
                                <LocationAutocomplete
                                  value={field.value}
                                  onChange={(val, placeId) => {
                                    field.onChange(val)
                                    if (placeId) {
                                      setValue(`vendorRecommendations.${index}.placeId`, placeId, { shouldDirty: true })
                                    }
                                    setValue(`vendorRecommendations.${index}.name`, val.split(',')[0].trim(), { shouldDirty: true })
                                  }}
                                  placeholder="Digite o nome do estabelecimento..."
                                  className="bg-background"
                                />
                              )}
                            />
                            <p className="text-[10px] text-muted-foreground leading-tight">Clique na opção correspondente ao estabelecimento.</p>
                          </div>
                          <div className="space-y-2 md:col-span-3">
                            <Label className="text-xs font-semibold">Tipo</Label>
                            <Controller
                              name={`vendorRecommendations.${index}.type`}
                              control={control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="bg-background">
                                    {field.value ? VENDOR_TYPES[field.value] : <span className="text-muted-foreground">Selecione</span>}
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SALON">Salão de Beleza</SelectItem>
                                    <SelectItem value="BARBERSHOP">Barbearia</SelectItem>
                                    <SelectItem value="SUIT_SHOP">Loja de Trajes</SelectItem>
                                    <SelectItem value="BEAUTY_CLINIC">Estética</SelectItem>
                                    <SelectItem value="MAKEUP_ARTIST">Maquiador(a)</SelectItem>
                                    <SelectItem value="HAIR_STYLIST">Cabelereiro / Penteado</SelectItem>
                                    <SelectItem value="MANICURE">Manicure e Pedicure</SelectItem>
                                    <SelectItem value="SPA">Spa / Dia da Noiva</SelectItem>
                                    <SelectItem value="DRESS_SHOP">Loja de Vestidos</SelectItem>
                                    <SelectItem value="JEWELRY">Joalheria</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-4">
                            <Label className="text-xs font-semibold">Profissional (Opcional)</Label>
                            <Input {...register(`vendorRecommendations.${index}.recommendedProfessional` as const)} placeholder="Ex: Joana Silva" className="bg-background" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rsvp" className="space-y-6">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Privacidade do Site</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">Site Público Online</Label>
                  <p className="text-sm text-muted-foreground">Desative para ocultar o site temporariamente.</p>
                </div>
                <Controller name="isPublicSiteEnabled" control={control} render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )} />
              </div>

              {isPublicSiteEnabled && (
                <div className="space-y-3 pt-2 animate-in fade-in duration-300">
                  <Label className="font-semibold text-foreground/80">Senha de Acesso (Opcional)</Label>
                  <Input type="password" {...register("sitePassword")} placeholder="Deixe em branco para acesso livre" className="bg-background max-w-md" />
                  <p className="text-xs text-muted-foreground">Se preenchida, apenas convidados com a senha poderão ver seu site.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Configurações de RSVP</CardTitle>
              <CardDescription>Gerencie o formulário de confirmação de presença.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-semibold text-foreground/80">Data Limite para Confirmação</Label>
                  <Input type="datetime-local" {...register("rsvpDeadline")} className="bg-background" />
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold text-foreground/80">Mensagem de Agradecimento</Label>
                  <Textarea
                    {...register("rsvpMessage")}
                    placeholder="Obrigado por confirmar presença! Nos vemos lá!"
                    className="bg-background h-20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  )
}
