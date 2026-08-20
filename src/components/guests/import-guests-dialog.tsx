"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { importGuests } from "@/app/actions/import-guests"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Download, UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export function ImportGuestsDialog({ weddingId }: { weddingId: string }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [summary, setSummary] = useState<{ families: number, guests: number } | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (selectedFile) {
      setFile(selectedFile)
      parseExcel(selectedFile)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  const parseExcel = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" })
        
        if (json.length === 0) {
          toast.error("A planilha parece estar vazia.")
          setFile(null)
          return
        }

        setParsedData(json)
        
        // Calcular resumo rápido
        const families = new Set(json.map((row: any) => row["Família / Convite"] || row["Familia"] || row["Convite"] || "Sem Família"))
        setSummary({ families: families.size, guests: json.length })
      } catch (err) {
        toast.error("Erro ao ler o arquivo. Certifique-se que é um Excel ou CSV válido.")
        setFile(null)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return
    setIsProcessing(true)
    try {
      const plainData = JSON.parse(JSON.stringify(parsedData))
      const result = await importGuests(weddingId, plainData)
      if (result.success) {
        toast.success(`Sucesso! ${result.importedCount} convidados importados em ${result.familiesCount} convites.`)
        setOpen(false)
        // Reset states
        setTimeout(() => {
          setFile(null)
          setParsedData([])
          setSummary(null)
        }, 500)
      } else {
        toast.error(`Erro ao importar: ${result.error}`)
      }
    } catch (err) {
      toast.error("Ocorreu um erro inesperado durante a importação.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary">
          <FileSpreadsheet className="w-4 h-4" />
          Importar Excel
        </Button>
      } />
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importar Convidados</DialogTitle>
          <DialogDescription>
            Importe sua lista de convidados facilmente usando nossa planilha modelo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!file ? (
            <>
              <div className="bg-muted/40 p-4 rounded-lg flex items-center justify-between border">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Passo 1: Baixe o modelo</h4>
                  <p className="text-xs text-muted-foreground">Preencha com os dados dos seus convidados seguindo as colunas.</p>
                </div>
                <a 
                  href={`/api/download-template?weddingId=${weddingId}`} 
                  download 
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  <Download className="w-4 h-4 mr-2" /> Baixar Modelo
                </a>
              </div>

              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <UploadCloud className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Passo 2: Envie sua planilha preenchida</p>
                    <p className="text-xs text-muted-foreground">Clique para selecionar ou arraste o arquivo .xlsx aqui</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium">Arquivo lido com sucesso!</p>
                    <p className="text-xs text-emerald-700">{file.name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={isProcessing} className="hover:bg-emerald-100 hover:text-emerald-900">
                  Trocar arquivo
                </Button>
              </div>

              {summary && (
                <div className="p-4 bg-muted/40 rounded-lg border space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500" /> Resumo da Leitura
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background p-3 rounded-md border text-center">
                      <p className="text-2xl font-bold text-primary">{summary.guests}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Convidados</p>
                    </div>
                    <div className="bg-background p-3 rounded-md border text-center">
                      <p className="text-2xl font-bold text-primary">{summary.families}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Convites (Famílias)</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Nossa inteligência agrupará os convidados nos respectivos Lados e Famílias automaticamente!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {file ? (
            <Button onClick={handleImport} disabled={isProcessing || parsedData.length === 0} className="w-full sm:w-auto">
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
              ) : (
                "Confirmar Importação"
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
