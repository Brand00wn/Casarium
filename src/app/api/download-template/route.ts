import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const weddingId = searchParams.get("weddingId")

  let p1Role = "Noiva"
  let p2Role = "Noivo"

  if (weddingId) {
    const wedding = await prisma.wedding.findFirst({
      where: { slug: weddingId },
      select: { partner1Role: true, partner2Role: true }
    })
    if (wedding) {
      p1Role = wedding.partner1Role
      p2Role = wedding.partner2Role
    }
  }

  // Remove duplicadas (Ex: se for Noiva e Noiva, fica só "Ambos,Noiva")
  const sideOptionsArray = Array.from(new Set(["Ambos", p1Role, p2Role]))
  const sideOptionsStr = sideOptionsArray.join(",")
  const sideHeaderTitle = `Lado (${sideOptionsArray.join("/")})`

  const workbook = new ExcelJS.Workbook()
  
  // Metadados
  workbook.creator = "ConciWedding"
  workbook.lastModifiedBy = "ConciWedding"
  workbook.created = new Date()

  // Criar Aba
  const sheet = workbook.addWorksheet("Convidados", {
    views: [{ state: 'frozen', ySplit: 1 }] // Fixar cabeçalho
  })

  // Configurar colunas
  sheet.columns = [
    { header: "Família / Convite", key: "familia", width: 35 },
    { header: "Nome do Convidado", key: "nome", width: 40 },
    { header: "É Titular? (S/N)", key: "titular", width: 22 },
    { header: "WhatsApp (Somente Números)", key: "whatsapp", width: 35 },
    { header: "Idade (Adulto/Criança/Bebê)", key: "idade", width: 32 },
    { header: sideHeaderTitle, key: "lado", width: 35 },
  ]

  // Estilizar o cabeçalho (Linha 1)
  const headerRow = sheet.getRow(1)
  headerRow.height = 30
  headerRow.eachCell((cell) => {
    // Fundo Sálvia (oklch 0.55 0.12 150 convertido para HEX aprox)
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF5C8B6B" } // Sage Green
    }
    // Letra branca e em negrito
    cell.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" }
    }
    // Bordas (Sálvia mais escuro)
    cell.border = {
      top: { style: "thin", color: { argb: "FF3E6149" } },
      left: { style: "thin", color: { argb: "FF3E6149" } },
      bottom: { style: "thin", color: { argb: "FF3E6149" } },
      right: { style: "thin", color: { argb: "FF3E6149" } }
    }
    // Alinhamento centralizado
    cell.alignment = { vertical: "middle", horizontal: "center" }
  })

  // Adicionar dados de exemplo
  const exampleRows = [
    ["Família Souza", "Carlos Souza", "S", "11999999999", "Adulto", p1Role],
    ["Família Souza", "Ana Souza", "N", "", "Adulto", p1Role],
    ["Família Souza", "Pedrinho Souza", "N", "", "Criança", p1Role],
    ["João e Maria", "João Pedro", "S", "11888888888", "Adulto", "Ambos"],
    ["João e Maria", "Maria Joaquina", "N", "11777777777", "Adulto", "Ambos"],
    ["Amigos", "Marcos", "S", "11666666666", "Adulto", p2Role],
  ]

  exampleRows.forEach((row, index) => {
    const sheetRow = sheet.addRow(row)
    
    // Cor de fundo alternada para as linhas (Zebra striping)
    const isEven = index % 2 === 0
    sheetRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFF9FAFB" : "FFFFFFFF" } // bg-gray-50 / white
      }
      cell.font = {
        name: "Arial",
        size: 11,
        color: { argb: "FF374151" } // text-gray-700
      }
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } }, // border-gray-200
        right: { style: "thin", color: { argb: "FFE5E7EB" } }
      }
      cell.alignment = { vertical: "middle" }
    })
  })

  // Aplicar validação de dados nas colunas
  // Coluna C: Titular (S/N)
  // @ts-expect-error - ExcelJS types missing dataValidations
  sheet.dataValidations.add("C2:C1000", {
    type: "list",
    allowBlank: false,
    formulae: ['"S,N"'],
    showErrorMessage: true,
    errorTitle: 'Valor Inválido',
    error: 'Por favor, selecione S para Sim ou N para Não.'
  })

  // Coluna E: Idade
  // @ts-expect-error - ExcelJS types missing dataValidations
  sheet.dataValidations.add("E2:E1000", {
    type: "list",
    allowBlank: true,
    formulae: ['"Adulto,Criança,Bebê"'],
  })

  // Coluna F: Lado (Dinâmico conforme casamento)
  // @ts-expect-error - ExcelJS types missing dataValidations
  sheet.dataValidations.add("F2:F1000", {
    type: "list",
    allowBlank: true,
    formulae: [`"${sideOptionsStr}"`],
  })

  // Proteger o cabeçalho? Opcional.

  // Gerar o buffer
  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="ConciWedding - Lista de Convidados.xlsx"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  })
}
