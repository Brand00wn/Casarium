"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type GuestOption = {
  id: string
  name: string
}

interface GuestComboboxProps {
  guests: GuestOption[]
  valueName: string
  valueId: string | null
  onChange: (name: string, guestId: string | null) => void
  disabled?: boolean
  placeholder?: string
}

export function GuestCombobox({
  guests,
  valueName,
  valueId,
  onChange,
  disabled = false,
  placeholder = "Buscar convidado...",
}: GuestComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  // Update input value when open
  React.useEffect(() => {
    if (!open) {
      setInputValue("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-background px-3 font-normal h-9", disabled && "opacity-50 cursor-not-allowed")}
          disabled={disabled}
        >
          {valueName ? (
            <span className="truncate">{valueName}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      } />
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Digite o nome..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandEmpty className="py-2 px-2 flex flex-col gap-2">
            <span className="text-sm text-muted-foreground text-center">Nenhum convidado encontrado.</span>
            {inputValue.trim().length > 0 && (
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full justify-start font-normal"
                onClick={() => {
                  onChange(inputValue.trim(), null)
                  setOpen(false)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar "{inputValue.trim()}"
              </Button>
            )}
          </CommandEmpty>
          <CommandList>
            <CommandGroup>
              {guests.map((guest) => (
                <CommandItem
                  key={guest.id}
                  value={guest.name}
                  onSelect={() => {
                    onChange(guest.name, guest.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      valueId === guest.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {guest.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {inputValue.trim().length > 0 && !guests.some(g => g.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
              <CommandGroup>
                <CommandItem
                  value={`CREATE_${inputValue.trim()}`}
                  onSelect={() => {
                    onChange(inputValue.trim(), null)
                    setOpen(false)
                  }}
                  className="text-primary font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar novo: "{inputValue.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
