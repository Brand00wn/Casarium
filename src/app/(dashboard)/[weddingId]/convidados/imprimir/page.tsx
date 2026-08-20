import React from "react"
import { prisma } from "@/lib/prisma"
import { PrintButton } from "./print-button"

export default async function PrintGuestsPage({
  params,
}: {
  params: Promise<{ weddingId: string }>
}) {
  const { weddingId } = await params;

  const wedding = await prisma.wedding.findUnique({
    where: { slug: weddingId },
    select: { partner1Name: true, partner2Name: true, date: true }
  });

  if (!wedding) return <div>Casamento não encontrado.</div>;

  const guests = await prisma.guest.findMany({
    where: {
      wedding: { slug: weddingId },
    },
    include: {
      family: true,
      group: true
    },
    orderBy: [
      { isPrimary: 'desc' },
      { name: 'asc' }
    ]
  });

  // Agrupar por família para exibir de forma estruturada
  const families = new Map<string, any[]>();
  
  for (const guest of guests) {
    const familyId = guest.familyId || 'sem-familia';
    if (!families.has(familyId)) {
      families.set(familyId, []);
    }
    families.get(familyId)!.push(guest);
  }

  // Ordenar o mapa de famílias (as que tem titular vem primeiro)
  const sortedFamilies = Array.from(families.values()).sort((a, b) => {
    const aName = a.find(g => g.isPrimary)?.name || a[0].name;
    const bName = b.find(g => g.isPrimary)?.name || b[0].name;
    return aName.localeCompare(bName);
  });

  const totalGuests = guests.length;
  const confirmedCount = guests.filter(g => g.rsvpStatus === "CONFIRMED").length;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/20 p-8 print:p-0 print:bg-white">
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Modo de Impressão</h1>
          <p className="text-muted-foreground">Apenas o documento abaixo será impresso.</p>
        </div>
        <PrintButton />
      </div>

      <div id="print-area" className="w-full max-w-4xl bg-white p-8 sm:p-12 shadow-sm border rounded-xl print:shadow-none print:border-none print:p-0">
        
        {/* Cabeçalho do Documento */}
        <div className="text-center mb-10 pb-6 border-b-2">
          <h1 className="text-3xl font-serif mb-2">{wedding.partner1Name} & {wedding.partner2Name}</h1>
          <h2 className="text-xl text-gray-600 font-medium">Lista de Controle de Presença</h2>
          <div className="flex justify-center gap-6 mt-4 text-sm text-gray-500">
            <span className="font-semibold px-3 py-1 bg-gray-100 rounded-md">Total de Convidados: {totalGuests}</span>
            <span className="font-semibold px-3 py-1 bg-green-50 text-green-700 rounded-md">Confirmados: {confirmedCount}</span>
          </div>
        </div>

        {/* Tabela de Convidados */}
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800 text-gray-800">
              <th className="pb-3 px-2 font-bold w-16 text-center">Status</th>
              <th className="pb-3 px-2 font-bold">Convidado / Família</th>
              <th className="pb-3 px-2 font-bold w-32">Grupo/Lado</th>
              <th className="pb-3 px-2 font-bold w-24 text-center">Check-in</th>
            </tr>
          </thead>
          <tbody>
            {sortedFamilies.map((familyMembers, fIdx) => {
              // Coloca o titular primeiro
              const primary = familyMembers.find(g => g.isPrimary) || familyMembers[0];
              const dependents = familyMembers.filter(g => g.id !== primary.id);
              
              return (
                <React.Fragment key={fIdx}>
                  {/* Linha do Titular */}
                  <tr className="border-t border-gray-200">
                    <td className="py-3 px-2 text-center align-middle">
                      {primary.rsvpStatus === "CONFIRMED" && <div className="mx-auto w-4 h-4 bg-black rounded-full print:bg-black" style={{ printColorAdjust: 'exact' }}></div>}
                      {primary.rsvpStatus === "DECLINED" && <span className="text-red-500 font-bold">X</span>}
                      {primary.rsvpStatus === "PENDING" && <span className="text-gray-300">?</span>}
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-base">{primary.name}</div>
                      {(primary.notes || primary.phone) && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {[primary.phone, primary.notes].filter(Boolean).join(" • ")}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-gray-600 text-xs">
                      {primary.group?.name || "-"}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-sm mx-auto"></div>
                    </td>
                  </tr>

                  {/* Linhas dos Acompanhantes */}
                  {dependents.map((dep, dIdx) => (
                    <tr key={dep.id} className={dIdx === dependents.length - 1 ? "" : ""}>
                      <td className="py-2 px-2 text-center align-middle">
                        {dep.rsvpStatus === "CONFIRMED" && <div className="mx-auto w-3 h-3 bg-black rounded-full print:bg-black" style={{ printColorAdjust: 'exact' }}></div>}
                        {dep.rsvpStatus === "DECLINED" && <span className="text-red-500 font-bold text-sm">X</span>}
                        {dep.rsvpStatus === "PENDING" && <span className="text-gray-300 text-sm">?</span>}
                      </td>
                      <td className="py-2 px-2 pl-6">
                        <div className="text-gray-800 flex items-center gap-2">
                          <span className="w-1 h-1 bg-gray-400 rounded-full inline-block"></span>
                          {dep.name}
                        </div>
                        {(dep.notes || dep.phone) && (
                          <div className="text-xs text-gray-500 mt-0.5 pl-3">
                            {[dep.phone, dep.notes].filter(Boolean).join(" • ")}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-gray-500 text-xs italic">
                        Acompanhante
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-sm mx-auto"></div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        
        <div className="mt-12 pt-4 border-t text-center text-xs text-gray-400 print:block">
          Lista gerada pela plataforma ConciWedding em {new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>
    </div>
  )
}
