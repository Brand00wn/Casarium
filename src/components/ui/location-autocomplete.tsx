"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { MapPin, Search, Loader2 } from "lucide-react"

interface LocationAutocompleteProps {
  value?: string
  onChange: (value: string, placeId?: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function LocationAutocomplete({ 
  value, 
  onChange,
  placeholder = "Digite o endereço ou nome do local...",
  className,
  disabled
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value || "")
  const [results, setResults] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  
  // Debounce ajustado para 200ms para responder mais rápido a cada letra
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(handler)
  }, [query])

  const updatePosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'absolute',
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        zIndex: 99999
      })
    }
  }

  useEffect(() => {
    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      setResults([])
      return
    }

    // Don't search if the query is exactly the value (means they just selected it)
    if (debouncedQuery === value) return

    const searchPlaces = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(debouncedQuery)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.predictions) {
            setResults(data.predictions)
            setIsOpen(true)
          }
        }
      } catch (error) {
        console.error("Erro ao buscar local:", error)
      } finally {
        setIsLoading(false)
      }
    }

    searchPlaces()
  }, [debouncedQuery, value])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current && 
        !wrapperRef.current.contains(event.target as Node) &&
        (!dropdownRef.current || !dropdownRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative w-full z-50" ref={wrapperRef}>
      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
      <Input 
        type="text" 
        placeholder={placeholder} 
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (e.target.value.length > 2) setIsOpen(true)
        }}
        onBlur={() => {
          // Atualiza o valor final quando o usuário sai do campo, permitindo texto livre
          if (query !== value) {
             onChange(query)
          }
          // setTimeout para dar tempo de clicar na sugestão antes de fechar
          setTimeout(() => setIsOpen(false), 200)
        }}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true)
        }}
        className={`pl-9 w-full ${className || ""}`}
        disabled={disabled}
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
      )}

      {isOpen && results.length > 0 && typeof document !== 'undefined' && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 overflow-y-auto">
          {results.map((result) => (
            <div 
              key={result.place_id}
              className="px-4 py-2 hover:bg-muted cursor-pointer text-sm"
              onMouseDown={(e) => {
                e.preventDefault(); // Evita que o input perca o foco imediatamente
                const address = result.description
                
                // Podemos injetar o place_id no onChange se você quiser estruturar isso depois
                // onChange(JSON.stringify({ address, placeId: result.place_id }))
                
                setQuery(address)
                onChange(address, result.place_id)
                setIsOpen(false)
              }}
            >
              <div className="font-medium truncate">{result.structured_formatting?.main_text || result.description.split(',')[0]}</div>
              <div className="text-xs text-muted-foreground truncate">{result.structured_formatting?.secondary_text || result.description}</div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
