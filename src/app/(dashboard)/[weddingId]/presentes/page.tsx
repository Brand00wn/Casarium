"use client";

import { use, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Plus, Trash2, Gift, Edit2, ListOrdered, Loader2, ChevronsUpDown, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getGifts, createGift, deleteGift, getTransactions, updateGift, seedDefaultGifts, deleteMultipleGifts } from "@/app/actions/gifts";
import { getGiftCategories } from "@/app/actions/gift-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadButton } from "@/lib/uploadthing";
import { AIGiftAssistant } from "./ai-assistant";

export default function GiftsDashboardPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = use(params);
  const [gifts, setGifts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(true);
  const [editingGift, setEditingGift] = useState<any | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedGifts, setSelectedGifts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  
  const formPrice = watch("price") || 0;
  const formQuotas = watch("quotaCount") || 1;
  const valPrice = typeof formPrice === 'string' ? parseFloat(formPrice) : formPrice;
  const valQuotas = typeof formQuotas === 'string' ? parseInt(formQuotas, 10) : formQuotas;
  const quotaValue = (valQuotas > 0 && valPrice > 0) ? (valPrice / valQuotas) : valPrice;

  const loadData = async () => {
    const fetchedGifts = await getGifts(weddingId);
    const fetchedTransactions = await getTransactions(weddingId);
    const fetchedCategories = await getGiftCategories(weddingId);
    setGifts(fetchedGifts);
    setTransactions(fetchedTransactions);
    setCategories(fetchedCategories);
  };

  useEffect(() => {
    loadData();
  }, [weddingId]);

  const openNewModal = () => {
    setEditingGift(null);
    reset();
    setSelectedCategories([]);
    setIsOpen(true);
  };

  const handleEdit = (gift: any) => {
    setEditingGift(gift);
    setValue("name", gift.name);
    setValue("description", gift.description || "");
    setValue("price", gift.price);
    setValue("imageUrl", gift.imageUrl || "");
    setValue("quotaCount", gift.quotaCount);
    
    if (gift.categories) {
      const catIds = gift.categories.map((c: any) => c.id);
      setSelectedCategories(catIds);
    } else {
      setSelectedCategories([]);
    }
    
    setIsOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        imageUrl: data.imageUrl,
        quotaCount: parseInt(data.quotaCount) || 1,
        categoryIds: selectedCategories,
      };

      if (editingGift) {
        await updateGift(editingGift.id, payload);
        toast.success("Presente atualizado com sucesso!");
      } else {
        await createGift(weddingId, payload);
        toast.success("Presente adicionado com sucesso!");
      }
      setIsOpen(false);
      reset();
      setSelectedCategories([]);
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar presente.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este presente?")) {
      try {
        await deleteGift(id);
        toast.success("Presente excluído com sucesso!");
        loadData();
      } catch (error) {
        toast.error("Erro ao excluir presente.");
      }
    }
  };

  const handleSeedDefaults = () => {
    if (confirm("Isso vai adicionar 50 presentes básicos na sua lista. Deseja continuar?")) {
      startTransition(async () => {
        try {
          await seedDefaultGifts(weddingId);
          toast.success("50 presentes foram adicionados com sucesso!");
          loadData();
        } catch (error: any) {
          console.error(error);
          toast.error("Erro ao gerar lista: " + (error.message || "Erro desconhecido"));
        }
      });
    }
  };

  const handleDeleteMultiple = () => {
    if (selectedGifts.length === 0) return;
    if (confirm(`Tem certeza que deseja excluir ${selectedGifts.length} presentes selecionados?`)) {
      startTransition(async () => {
        try {
          await deleteMultipleGifts(selectedGifts, weddingId);
          toast.success(`${selectedGifts.length} presentes excluídos com sucesso!`);
          setSelectedGifts([]);
          loadData();
        } catch (error: any) {
          toast.error("Erro ao excluir presentes selecionados.");
        }
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedGifts.length === filteredGifts.length) {
      setSelectedGifts([]);
    } else {
      setSelectedGifts(filteredGifts.map(g => g.id));
    }
  };

  const toggleSelectGift = (id: string) => {
    setSelectedGifts(prev => prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]);
  };

  const totalArrecadado = transactions
    .filter((t) => t.status === "PAID")
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredGifts = selectedCategoryFilter === "all" 
    ? gifts 
    : gifts.filter(g => g.categories?.some((c: any) => c.id === selectedCategoryFilter));

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-[1400px] mx-auto min-h-screen items-start">
      <div className="flex-1 space-y-8 min-w-0 pb-10">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gestão de Presentes</h1>
          
          <div className="flex items-center gap-4">
            {selectedGifts.length > 0 && (
              <Button variant="destructive" onClick={handleDeleteMultiple} disabled={isPending}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir ({selectedGifts.length})
              </Button>
            )}
            <Button variant="outline" onClick={handleSeedDefaults} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ListOrdered className="w-4 h-4 mr-2" />}
              Lista Pronta (50)
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2" onClick={openNewModal}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar Presente
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingGift ? "Editar Presente" : "Adicionar Novo Presente"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Presente</Label>
                    <Input {...register("name", { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea {...register("description")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input type="number" step="0.01" {...register("price", { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Imagem do Presente</Label>
                    {watch("imageUrl") ? (
                      <div className="relative rounded-md overflow-hidden h-32 w-full border">
                        <img src={watch("imageUrl")} alt="Preview" className="object-cover w-full h-full" />
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="absolute top-2 right-2 w-8 h-8"
                          onClick={() => setValue("imageUrl", "")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <UploadButton
                        endpoint="imageUploader"
                        onClientUploadComplete={(res) => {
                          setValue("imageUrl", res[0].url);
                          toast.success("Imagem enviada com sucesso!");
                        }}
                        onUploadError={(error: Error) => {
                          toast.error(`Erro ao enviar: ${error.message}`);
                        }}
                      />
                    )}
                    <Input type="hidden" {...register("imageUrl")} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Quantidade de Cotas</Label>
                    <Input type="number" min="1" step="1" {...register("quotaCount", { valueAsNumber: true })} required />
                    {valPrice > 0 && (
                      <span className="text-xs text-muted-foreground mt-1 leading-tight">
                        {valQuotas === 1 ? (
                          <>Presente de cota única. Um convidado pagará o valor total de <strong className="text-primary font-semibold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valPrice)}</strong>.</>
                        ) : (
                          <>Dividido em {valQuotas} cotas de <strong className="text-primary font-semibold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(quotaValue || 0)}</strong>. Os convidados poderão comprar de 1 até {valQuotas} cotas.</>
                        )}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Categorias</Label>
                    <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-[2.5rem] py-2">
                          <div className="flex flex-wrap gap-1 items-center">
                            {selectedCategories.length === 0 && <span className="text-muted-foreground font-normal">Selecione as categorias...</span>}
                            {selectedCategories.map(catId => {
                              const cat = categories.find(c => c.id === catId);
                              if (!cat) return null;
                              return (
                                <Badge key={cat.id} variant="secondary" className="mr-1 shadow-sm" style={{ borderLeft: `3px solid ${cat.color}` }}>
                                  {cat.name}
                                </Badge>
                              );
                            })}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      } />
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar categoria..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                            <CommandGroup>
                              {categories.map((cat: any) => {
                                const isSelected = selectedCategories.includes(cat.id);
                                return (
                                  <CommandItem
                                    key={cat.id}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                                      } else {
                                        setSelectedCategories([...selectedCategories, cat.id]);
                                      }
                                    }}
                                  >
                                    <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                      <Check className={cn("h-4 w-4")} />
                                    </div>
                                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
                                    {cat.name}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button type="submit" className="w-full">Salvar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Arrecadado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalArrecadado)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Presentes Recebidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transactions.filter((t) => t.status === "PAID").length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Itens na Lista</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gifts.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold">Lista de Presentes</h2>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Filtrar Categoria:</Label>
              <select 
                className="flex h-9 w-full sm:w-[200px] items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={filteredGifts.length > 0 && selectedGifts.length === filteredGifts.length} 
                      onCheckedChange={toggleSelectAll} 
                      aria-label="Selecionar todos" 
                    />
                  </TableHead>
                  <TableHead>Imagem</TableHead>
                  <TableHead>Presente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Cotas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                      Nenhum presente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGifts.map((gift) => {
                    const isSelected = selectedGifts.includes(gift.id);
                    return (
                      <TableRow key={gift.id} className={isSelected ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox 
                            checked={isSelected} 
                            onCheckedChange={() => toggleSelectGift(gift.id)} 
                            aria-label={`Selecionar ${gift.name}`} 
                          />
                        </TableCell>
                        <TableCell>
                        {gift.imageUrl ? (
                          <img src={gift.imageUrl} alt={gift.name} className="w-12 h-12 object-cover rounded-md" />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                            <Gift className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{gift.name}</span>
                          {gift.categories && gift.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {gift.categories.map((cat: any) => (
                                <Badge key={cat.id} variant="outline" className="text-[10px] px-1" style={{ borderColor: cat.color }}>
                                  {cat.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(gift.price)}
                      </TableCell>
                      <TableCell>{gift.quotaCount}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(gift)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(gift.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      
      {/* Botão FAB */}
      {!isAIOpen && (
        <Button
          onClick={() => setIsAIOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 transition-all duration-500 z-50 p-0 hover:scale-110 group"
          title="Abrir IA Concierge"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      )}

      {/* IA Assistant Container */}
      <div 
        className={`
          ${isAIOpen ? 'w-full lg:w-[380px] opacity-100 translate-y-0' : 'w-full lg:w-0 opacity-0 translate-y-full lg:translate-y-0'}
          transition-all duration-300 ease-in-out
          fixed lg:sticky
          bottom-0 lg:top-6
          right-0 lg:right-auto
          h-[85vh] lg:h-[calc(100vh-8rem)]
          z-40 lg:z-10
          flex-shrink-0
          overflow-hidden
        `}
      >
        <div className="w-full lg:w-[380px] h-full">
          <AIGiftAssistant 
            weddingSlug={weddingId} 
            onGiftAdded={() => loadData()}
            onClose={() => setIsAIOpen(false)} 
          />
        </div>
      </div>
    </div>
  );
}
