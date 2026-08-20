"use client"

import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="gap-2">
      <Printer className="w-4 h-4" />
      Imprimir Lista
    </Button>
  )
}
