"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Receipt, CreditCard, Banknote } from "lucide-react"

interface FinancialSummaryProps {
  gifts: {
    totalGiftsValue: number;
    totalRaised: number;
    totalPending: number;
    recentTransactions: any[];
  }
}

export function FinancialSummary({ gifts }: FinancialSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const progressPercent = gifts.totalGiftsValue > 0 
    ? Math.min(100, Math.round((gifts.totalRaised / gifts.totalGiftsValue) * 100)) 
    : 0;

  return (
    <Card className="border-muted/60 shadow-sm flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
            <CardDescription>Presentes em dinheiro arrecadados</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{formatCurrency(gifts.totalRaised)}</p>
            <p className="text-xs text-muted-foreground">de {formatCurrency(gifts.totalGiftsValue)} da lista</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 flex-1 pt-2">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso da Lista</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-muted [&>div]:bg-emerald-500" />
          {gifts.totalPending > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatCurrency(gifts.totalPending)} pendente de pagamento
            </p>
          )}
        </div>

        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-semibold border-b pb-2">Últimos Recebimentos</h4>
          
          {gifts.recentTransactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm flex flex-col items-center">
              <Receipt className="w-8 h-8 mb-2 opacity-20" />
              Nenhum presente recebido ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {gifts.recentTransactions.map((t, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm group">
                  <div className="flex gap-3">
                    <div className="mt-0.5 p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-md shrink-0">
                      {t.paymentMethod === 'PIX' ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{t.guestName}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{t.giftName}</p>
                      {t.guestMessage && (
                        <p className="text-xs italic text-muted-foreground mt-1 border-l-2 pl-2 border-muted">"{t.guestMessage}"</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-emerald-600">{formatCurrency(t.amount)}</p>
                    <Badge variant="outline" className="text-[10px] mt-1 uppercase bg-emerald-50 text-emerald-700 border-emerald-200">
                      {t.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Clock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
