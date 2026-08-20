"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { MessageCircleHeart, Lock, Globe } from "lucide-react"

interface MessagesFeedProps {
  messages: {
    total: number;
    recent: any[];
  }
}

export function MessagesFeed({ messages }: MessagesFeedProps) {
  // Simple hash function for avatar colors
  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 80%)`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card className="border-muted/60 shadow-sm flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircleHeart className="w-5 h-5 text-rose-500" />
              Recados de Convidados
            </CardTitle>
            <CardDescription>{messages.total} mensagens recebidas</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 flex-1 pt-2">
        {messages.recent.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-60">
            <MessageCircleHeart className="w-12 h-12 mb-4 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhum recado ainda</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Os recados deixados pelos convidados no site aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.recent.map((msg, idx) => (
              <div key={idx} className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm text-foreground/80"
                  style={{ backgroundColor: getAvatarColor(msg.authorName) }}
                >
                  {getInitials(msg.authorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm truncate pr-2">{msg.authorName}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {msg.isPublic ? (
                        <div title="Público"><Globe className="w-3 h-3 text-muted-foreground" /></div>
                      ) : (
                        <div title="Privado"><Lock className="w-3 h-3 text-muted-foreground" /></div>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic line-clamp-3">
                    "{msg.content}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
