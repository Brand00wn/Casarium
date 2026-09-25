import React from "react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { PrintButton } from "./print-button"

type PageProps = {
  params: Promise<{ weddingId: string }>
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "-"
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export default async function PrintMesasPage({ params }: PageProps) {
  const { weddingId } = await params

  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingId },
    select: { partner1Name: true, partner2Name: true, date: true, venue: true },
  })

  if (!wedding) return <div>Casamento não encontrado.</div>

  const tables = await prisma.table.findMany({
    where: { wedding: { slug: weddingId } },
    include: { guests: { orderBy: { name: "asc" } } },
  })

  const venueElements = await prisma.venueElement.findMany({
    where: { wedding: { slug: weddingId } },
  })

  const unseatedGuests = await prisma.guest.findMany({
    where: { wedding: { slug: weddingId }, tableId: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, rsvpStatus: true, dietaryRestrictions: true },
  })

  // Numeração automática: ordena por nome (pt-BR) e numera 1..N.
  // Mesma regra usada no mapa interativo (getTableNumberMap).
  const orderedTables = [...tables].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  )
  const numberById = new Map(orderedTables.map((t, idx) => [t.id, idx + 1]))

  const totalSeated = tables.reduce((acc, t) => acc + t.guests.length, 0)
  const totalDietary = tables.reduce(
    (acc, t) => acc + t.guests.filter((g) => g.dietaryRestrictions.length > 0).length,
    0
  )
  const unseatedDietary = unseatedGuests.filter((g) => g.dietaryRestrictions.length > 0)

  // Limites do mapa para normalizar as coordenadas (x/y do ReactFlow) em %
  const TABLE_SIZE = 128
  const xs: number[] = []
  const ys: number[] = []
  tables.forEach((t) => {
    xs.push(t.x, t.x + TABLE_SIZE)
    ys.push(t.y, t.y + TABLE_SIZE)
  })
  venueElements.forEach((v) => {
    xs.push(v.x, v.x + v.width)
    ys.push(v.y, v.y + v.height)
  })
  const minX = xs.length ? Math.min(...xs) - 60 : 0
  const maxX = xs.length ? Math.max(...xs) + 60 : 1000
  const minY = ys.length ? Math.min(...ys) - 60 : 0
  const maxY = ys.length ? Math.max(...ys) + 60 : 700
  const spanX = Math.max(1, maxX - minX)
  const spanY = Math.max(1, maxY - minY)
  const toLeft = (x: number) => 2 + ((x - minX) / spanX) * 88
  const toTop = (y: number) => 4 + ((y - minY) / spanY) * 78

  return (
    <div className="flex flex-col items-center min-h-screen bg-muted/20 p-8 print:p-0 print:bg-white print:block">
      <div className="w-full max-w-5xl flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Mapa de Mesas — Impressão p/ Buffet</h1>
          <p className="text-muted-foreground">
            Página 1: mapa numerado. Página 2+: lista de convidados por mesa com restrições alimentares.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${weddingId}/mesas`}
            className="inline-flex items-center justify-center rounded-md border px-4 h-10 text-sm font-medium hover:bg-muted"
          >
            Voltar ao mapa
          </Link>
          <PrintButton />
        </div>
      </div>

      <div
        id="print-area"
        className="w-full max-w-5xl bg-white p-8 sm:p-10 shadow-sm border rounded-xl print:shadow-none print:border-none print:p-0 print:max-w-none"
      >
        {/* ===== Cabeçalho ===== */}
        <div className="text-center mb-6 pb-5 border-b-2 border-gray-800">
          <h1 className="text-3xl font-serif mb-1">
            {wedding.partner1Name} & {wedding.partner2Name}
          </h1>
          <h2 className="text-lg text-gray-600 font-medium">
            Mapa de Mesas — Buffet / Cerimonial
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(wedding.date)}
            {wedding.venue ? ` • ${wedding.venue}` : ""}
          </p>
          <div className="flex justify-center flex-wrap gap-2 mt-4 text-sm">
            <span className="font-semibold px-3 py-1 bg-gray-100 rounded-md">
              {orderedTables.length} mesas
            </span>
            <span className="font-semibold px-3 py-1 bg-gray-100 rounded-md">
              {totalSeated} sentados
            </span>
            <span
              className="font-bold px-3 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300"
              style={{ printColorAdjust: "exact" }}
            >
              ⚠ {totalDietary} com restrição alimentar
            </span>
          </div>
          <div className="flex justify-center flex-wrap gap-4 mt-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-black text-white text-[11px] font-bold" style={{ printColorAdjust: "exact" }}>3</span>
              Número da mesa (vale mesmo se o nome não tiver número)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-amber-950 text-[11px] font-bold px-2 py-0.5 border border-amber-500" style={{ printColorAdjust: "exact" }}>⚠ 2</span>
              Mesas com pessoas com restrição alimentar
            </span>
          </div>
        </div>

        {/* ===== PÁGINA 1: MAPA ===== */}
        <div>
          <h3 className="text-base font-bold mb-3">
            Página 1 — Mapa do salão (com numeração)
          </h3>
          {orderedTables.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Nenhuma mesa cadastrada.</p>
          ) : (
            <div
              className="relative w-full border-2 border-gray-300 rounded-lg bg-gray-50 overflow-hidden"
              style={{ height: 560, printColorAdjust: "exact" }}
            >
              {/* Elementos do salão (palco, buffet, bar...) */}
              {venueElements.map((v) => (
                <div
                  key={v.id}
                  className="absolute border-2 border-dashed border-gray-400 rounded-md bg-white flex items-center justify-center"
                  style={{
                    left: `${toLeft(v.x)}%`,
                    top: `${toTop(v.y)}%`,
                    width: `${Math.max(6, (v.width / spanX) * 92)}%`,
                    height: `${Math.max(7, (v.height / spanY) * 84)}%`,
                    printColorAdjust: "exact",
                  }}
                >
                  <span className="text-[11px] font-semibold text-gray-500 text-center px-1">
                    {v.name}
                  </span>
                </div>
              ))}

              {/* Mesas numeradas */}
              {orderedTables.map((t) => {
                const number = numberById.get(t.id)
                const dietary = t.guests.filter((g) => g.dietaryRestrictions.length > 0)
                return (
                  <div
                    key={t.id}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: `${toLeft(t.x)}%`,
                      top: `${toTop(t.y)}%`,
                      width: 104,
                      height: 104,
                    }}
                  >
                    <div
                      className="relative w-[96px] h-[96px] rounded-full border-[3px] bg-white flex flex-col items-center justify-center shadow"
                      style={{
                        borderColor: t.color || "#1f2937",
                        printColorAdjust: "exact",
                      }}
                    >
                      <span
                        className="absolute -top-2 -left-2 flex items-center justify-center w-6 h-6 rounded-full bg-black text-white text-xs font-bold"
                        style={{ printColorAdjust: "exact" }}
                      >
                        {number}
                      </span>
                      {dietary.length > 0 && (
                        <span
                          className="absolute -top-2 -right-2 inline-flex items-center gap-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold px-1.5 py-0.5 border border-amber-500"
                          style={{ printColorAdjust: "exact" }}
                        >
                          ⚠ {dietary.length}
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-center leading-tight px-2">
                        {t.name}
                      </span>
                      <span className="text-[10px] text-gray-500 mt-0.5">
                        {t.guests.length}/{t.capacity}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-2">
            Numeração automática por ordem alfabética do nome da mesa. A mesma numeração é usada na lista da página 2.
          </p>
        </div>

        {/* ===== PÁGINA 2+: LISTA POR MESA ===== */}
        <div className="break-before-page print:break-before-page pt-2">
          <h3 className="text-base font-bold mb-1">
            Página 2 — Convidados por mesa (atenção às restrições alimentares)
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            O buffet deve conferir as linhas marcadas com ⚠ antes de servir cada mesa.
          </p>

          <div className="space-y-5">
            {orderedTables.map((t) => {
              const number = numberById.get(t.id)
              const dietary = t.guests.filter((g) => g.dietaryRestrictions.length > 0)
              return (
                <div key={t.id} className="border border-gray-300 rounded-lg overflow-hidden break-inside-avoid">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-300" style={{ printColorAdjust: "exact" }}>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-sm font-bold"
                        style={{ printColorAdjust: "exact" }}
                      >
                        {number}
                      </span>
                      <div>
                        <p className="font-bold text-sm leading-tight">{t.name}</p>
                        <p className="text-[11px] text-gray-500">
                          {t.guests.length}/{t.capacity} lugares ocupados
                        </p>
                      </div>
                    </div>
                    {dietary.length > 0 ? (
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-400"
                        style={{ printColorAdjust: "exact" }}
                      >
                        ⚠ {dietary.length} com restrição
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">Sem restrições</span>
                    )}
                  </div>
                  {t.guests.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-gray-400 italic">Mesa vazia.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                          <th className="px-4 py-1.5 font-semibold">#</th>
                          <th className="px-2 py-1.5 font-semibold">Convidado</th>
                          <th className="px-2 py-1.5 font-semibold">RSVP</th>
                          <th className="px-4 py-1.5 font-semibold">Restrição alimentar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.guests.map((g, idx) => {
                          const hasDiet = g.dietaryRestrictions.length > 0
                          return (
                            <tr
                              key={g.id}
                              className={`border-b border-gray-100 last:border-0 ${hasDiet ? "bg-amber-50" : ""}`}
                              style={hasDiet ? { printColorAdjust: "exact" } : undefined}
                            >
                              <td className="px-4 py-1.5 text-gray-400 text-xs w-8">{idx + 1}</td>
                              <td className="px-2 py-1.5 font-medium">{g.name}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-500">
                                {g.rsvpStatus === "CONFIRMED" ? "Confirmado" : g.rsvpStatus === "DECLINED" ? "Recusou" : g.rsvpStatus === "WAITLIST" ? "Espera" : "Pendente"}
                              </td>
                              <td className="px-4 py-1.5 text-xs">
                                {hasDiet ? (
                                  <span className="font-bold text-amber-900">
                                    ⚠ {g.dietaryRestrictions.join(", ")}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>

          {/* Sem mesa */}
          {unseatedGuests.length > 0 && (
            <div className="border border-gray-300 rounded-lg overflow-hidden mt-5 break-inside-avoid">
              <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-300">
                <p className="font-bold text-sm">Sem mesa ({unseatedGuests.length})</p>
                <p className="text-[11px] text-gray-500">Convidados ainda não alocados no mapa.</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {unseatedGuests.map((g) => (
                    <tr key={g.id} className={`border-b border-gray-100 last:border-0 ${g.dietaryRestrictions.length > 0 ? "bg-amber-50" : ""}`} style={g.dietaryRestrictions.length > 0 ? { printColorAdjust: "exact" } : undefined}>
                      <td className="px-4 py-1.5 font-medium">{g.name}</td>
                      <td className="px-4 py-1.5 text-xs text-right">
                        {g.dietaryRestrictions.length > 0 ? (
                          <span className="font-bold text-amber-900">⚠ {g.dietaryRestrictions.join(", ")}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
            Lista gerada pela plataforma Casarium em {new Date().toLocaleDateString("pt-BR")} — {orderedTables.length} mesas • {totalSeated} sentados • {totalDietary + unseatedDietary.length} com restrição alimentar no total
          </div>
        </div>
      </div>
    </div>
  )
}
