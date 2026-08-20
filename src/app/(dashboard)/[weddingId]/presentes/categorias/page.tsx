"use client";

import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  getGiftCategories, 
  createGiftCategory, 
  updateGiftCategory, 
  deleteGiftCategory 
} from "@/app/actions/gift-categories";

export default function GiftCategoriesPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = use(params);
  const [categories, setCategories] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  
  const { register, handleSubmit, reset, setValue } = useForm();

  const loadData = async () => {
    const data = await getGiftCategories(weddingId);
    setCategories(data);
  };

  useEffect(() => {
    loadData();
  }, [weddingId]);

  const onSubmit = async (data: any) => {
    try {
      if (editingCategory) {
        await updateGiftCategory(editingCategory.id, data);
        toast.success("Categoria atualizada com sucesso!");
      } else {
        await createGiftCategory(weddingId, data);
        toast.success("Categoria criada com sucesso!");
      }
      setIsOpen(false);
      setEditingCategory(null);
      reset();
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar categoria.");
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setValue("name", category.name);
    setValue("color", category.color);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta categoria? Presentes associados perderão esta tag.")) {
      try {
        await deleteGiftCategory(id);
        toast.success("Categoria excluída com sucesso!");
        loadData();
      } catch (error) {
        toast.error("Erro ao excluir categoria.");
      }
    }
  };

  const openNewModal = () => {
    setEditingCategory(null);
    reset();
    setValue("color", "#64748b");
    setIsOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1000px] mx-auto min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Categorias de Presentes</h1>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2" onClick={openNewModal}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar Categoria
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Editar Categoria" : "Adicionar Nova Categoria"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Categoria</Label>
                <Input {...register("name", { required: true })} placeholder="Ex: Utensílios de Cozinha" />
              </div>
              <div className="space-y-2">
                <Label>Cor de Destaque</Label>
                <div className="flex gap-2 items-center">
                  <Input type="color" className="w-16 h-10 p-1" {...register("color", { required: true })} />
                  <span className="text-sm text-muted-foreground">Escolha uma cor para a tag visual</span>
                </div>
              </div>
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cor</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                  Nenhuma categoria cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div 
                      className="w-6 h-6 rounded-full shadow-sm border border-border" 
                      style={{ backgroundColor: category.color }} 
                    />
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
