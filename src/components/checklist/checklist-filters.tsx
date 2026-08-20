"use client"
import { Search, ListFilter, LayoutGrid, List, AlertCircle, Filter, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface ChecklistFiltersProps {
  viewMode: "kanban" | "list"
  setViewMode: (mode: "kanban" | "list") => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategories: string[]
  setSelectedCategories: (categories: string[]) => void
  selectedPriorities: string[]
  setSelectedPriorities: (priorities: string[]) => void
  filterOverdue: boolean
  setFilterOverdue: (val: boolean) => void
  filterOnTime: boolean
  setFilterOnTime: (val: boolean) => void
  categories: any[]
  onOpenCategoryManager: () => void
}

export function ChecklistFilters({ 
  viewMode, 
  setViewMode, 
  searchQuery, 
  setSearchQuery,
  selectedCategories,
  setSelectedCategories,
  selectedPriorities,
  setSelectedPriorities,
  filterOverdue,
  setFilterOverdue,
  filterOnTime,
  setFilterOnTime,
  categories,
  onOpenCategoryManager
}: ChecklistFiltersProps) {

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId))
    } else {
      setSelectedCategories([...selectedCategories, categoryId])
    }
  }

  const togglePriority = (priority: string) => {
    if (selectedPriorities.includes(priority)) {
      setSelectedPriorities(selectedPriorities.filter(p => p !== priority))
    } else {
      setSelectedPriorities([...selectedPriorities, priority])
    }
  }

  const priorityMap = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", URGENT: "Urgente" }
  const activeFiltersCount = selectedPriorities.length + (filterOverdue ? 1 : 0) + (filterOnTime ? 1 : 0)

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 py-4 w-full">
      <div className="relative flex-1 w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar tarefas..."
          className="pl-9 bg-background"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2">
              <ListFilter className="w-4 h-4" />
              Categorias
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 rounded-sm px-1.5 font-normal">
                  {selectedCategories.length}
                </Badge>
              )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Filtrar por Categoria</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categories.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={selectedCategories.includes(c.id)}
                  onCheckedChange={() => toggleCategory(c.id)}
                >
                  <span className="mr-2">{c.emoji}</span> {c.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="secondary" size="sm" className="w-full text-xs" onClick={onOpenCategoryManager}>
                Gerenciar Categorias
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2">
              <Filter className="w-4 h-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 rounded-sm px-1.5 font-normal">
                  {activeFiltersCount}
                </Badge>
              )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-[80vh] overflow-y-auto">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Prioridade</DropdownMenuLabel>
              {Object.entries(priorityMap).map(([key, label]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={selectedPriorities.includes(key)}
                  onCheckedChange={() => togglePriority(key)}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuLabel>Outros</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filterOverdue}
                onCheckedChange={setFilterOverdue}
              >
                <AlertCircle className="w-3 h-3 mr-2 text-red-500" /> Somente Atrasadas
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterOnTime}
                onCheckedChange={setFilterOnTime}
              >
                <CheckCircle2 className="w-3 h-3 mr-2 text-green-500" /> Somente Em Dia
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
            
            {(activeFiltersCount > 0 || selectedCategories.length > 0) && (
              <>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => {
                    setSelectedCategories([])
                    setSelectedPriorities([])
                    setFilterOverdue(false)
                    setFilterOnTime(false)
                  }}>
                    Limpar Filtros
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto sm:ml-0 flex items-center bg-background border rounded-md h-9 p-1 shrink-0">
          <Button 
            variant={viewMode === "kanban" ? "secondary" : "ghost"} 
            size="sm" 
            className="h-7 px-2"
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Quadro
          </Button>
          <Button 
            variant={viewMode === "list" ? "secondary" : "ghost"} 
            size="sm" 
            className="h-7 px-2"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4 mr-2" />
            Lista
          </Button>
        </div>
      </div>
    </div>
  )
}
