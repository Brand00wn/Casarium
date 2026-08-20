import React, { Fragment } from "react"
import { prisma } from "@/lib/prisma"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { GuestDialog } from "@/components/guests/guest-dialog"
import { DeleteGuestButton } from "@/components/guests/delete-guest-button"
import { WhatsAppButton } from "@/components/guests/whatsapp-button"
import { ImportGuestsDialog } from "@/components/guests/import-guests-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Edit, Sparkles, Phone, Printer } from "lucide-react"
import Link from "next/link"

const PARTY_ROLES: Record<string, string> = {
  FATHER: "Pai",
  MOTHER: "Mãe",
  GRANDFATHER: "Avô",
  GRANDMOTHER: "Avó",
  BROTHER: "Irmão",
  SISTER: "Irmã",
  SPONSOR: "Testemunha",
  BRIDESMAID: "Madrinha",
  GROOMSMAN: "Padrinho",
  RING_BEARER: "Pajem",
  PAGE_BOY: "Pajem",
  FLOWER_GIRL: "Daminha",
  DEMOISELLE: "Demoiselle",
  CELEBRANT: "Celebrante",
  RELATIVE: "Familiar",
  FRIEND: "Amigo(a)",
  OTHER: "Outro"
};

const extractAge = (notes: string | null) => {
  if (!notes) return "Adulto";
  const match = notes.match(/Idade:\s*(Adulto|Criança|Bebê)/i);
  return match ? match[1] : "Adulto";
}

export default async function ConvidadosPage({
  params,
}: {
  params: Promise<{ weddingId: string }>
}) {
  const { weddingId } = await params;

  // Busca os convidados do banco de dados filtrando pelo casamento
  const primaryGuests = await prisma.guest.findMany({
    where: {
      wedding: { slug: weddingId },
      isPrimary: true
    },
    include: {
      family: {
        include: { guests: true }
      },
      partyMember: true
    },
    orderBy: { name: 'asc' }
  });

  let totalGuests = 0;
  let confirmedGuests = 0;
  let declinedGuests = 0;
  let pendingGuests = 0;
  
  primaryGuests.forEach(guest => {
    const familyGuests = guest.family ? [guest, ...guest.family.guests.filter(g => !g.isPrimary)] : [guest];
    
    familyGuests.forEach(g => {
      totalGuests++;
      if (g.rsvpStatus === "CONFIRMED") confirmedGuests++;
      else if (g.rsvpStatus === "DECLINED") declinedGuests++;
      else pendingGuests++;
    });
  });

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Convidados</h1>
            <Badge variant="secondary" className="h-6">
              {totalGuests} {totalGuests === 1 ? 'total' : 'total'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-medium">
              {confirmedGuests} Confirmados
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">
              {pendingGuests} Pendentes
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-medium">
              {declinedGuests} Recusados
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link 
            href={`/${weddingId}/convidados/imprimir`} 
            target="_blank"
            className={buttonVariants({ variant: "outline", className: "hidden md:flex gap-2 text-muted-foreground" })}
          >
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </Link>
          <ImportGuestsDialog weddingId={weddingId} />
          <GuestDialog weddingId={weddingId} />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome (Titular)</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status RSVP</TableHead>
              <TableHead className="text-right">Acompanhantes</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {primaryGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhum convidado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              primaryGuests.map((guest) => {
                const dependents = guest.family ? guest.family.guests.filter(g => !g.isPrimary) : [];
                const dependentsCount = dependents.length;
                const initialData = {
                  name: guest.name,
                  email: guest.email || "",
                  phone: guest.phone || "",
                  rsvpStatus: guest.rsvpStatus as any,
                  dietaryRestrictions: guest.dietaryRestrictions ? guest.dietaryRestrictions.join(", ") : "",
                  ageCategory: extractAge(guest.notes),
                  companions: dependents.map(d => ({
                    name: d.name,
                    phone: d.phone || "",
                    dietaryRestrictions: d.dietaryRestrictions ? d.dietaryRestrictions.join(", ") : "",
                    ageCategory: extractAge(d.notes),
                  }))
                };
                return (
                  <Fragment key={guest.id}>
                    <TableRow className={dependentsCount > 0 ? "border-b-0" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{guest.name}</span>
                            {guest.notes && <span className="text-[10px] italic text-muted-foreground">({guest.notes})</span>}
                            {guest.phone && (
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md flex items-center gap-1 text-muted-foreground">
                                <Phone className="w-2.5 h-2.5"/> {guest.phone}
                              </span>
                            )}
                          </div>
                          {guest.partyMember && (
                            <div className="flex items-center">
                              <span className="text-[10px] bg-pink-100 text-pink-800 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium w-fit">
                                <Sparkles className="w-3 h-3"/> {PARTY_ROLES[guest.partyMember.type] || "Cortejo"}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{guest.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={guest.rsvpStatus === "CONFIRMED" ? "default" : "secondary"}>
                          {guest.rsvpStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {dependentsCount > 0 ? <span className="text-xs bg-muted px-2 py-1 rounded-md">{dependentsCount} acompanhante(s)</span> : <span className="text-muted-foreground text-xs">-</span>}
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end space-x-2">
                        <WhatsAppButton weddingId={weddingId} guestId={guest.id} />
                        <GuestDialog 
                          weddingId={weddingId} 
                          guestId={guest.id}
                          initialData={initialData}
                          mode="edit"
                        />
                        <DeleteGuestButton 
                          weddingId={weddingId} 
                          guestId={guest.id} 
                          guestName={guest.name}
                          dependentsCount={dependentsCount}
                        />
                      </TableCell>
                    </TableRow>
                    
                    {/* Linhas de Acompanhantes Aninhadas */}
                    {dependents.map((dep, idx) => (
                      <TableRow key={dep.id} className={`bg-muted/10 hover:bg-muted/20 ${idx === dependentsCount - 1 ? "" : "border-b-0"}`}>
                        <TableCell>
                          <div className="pl-6 flex flex-wrap items-center gap-2 text-muted-foreground">
                            <div className="w-1 h-1 rounded-full bg-primary/40" />
                            <span className="text-sm">{dep.name}</span>
                            {dep.notes && <span className="text-[10px] italic">({dep.notes})</span>}
                            {dep.phone && (
                              <span className="text-[10px] bg-background border px-1.5 py-0.5 rounded-md flex items-center gap-1 text-muted-foreground">
                                <Phone className="w-2.5 h-2.5"/> {dep.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{dep.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={dep.rsvpStatus === "CONFIRMED" ? "default" : "secondary"} className="opacity-70 scale-90 origin-left">
                            {dep.rsvpStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground italic">
                          Acompanhante
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
