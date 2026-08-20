// @ts-nocheck
"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Send, X, Bot } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolInvocations?: any[];
};

export function WeddingAIAssistant({ weddingSlug, onDataChanged, onClose }: { weddingSlug: string, onDataChanged: () => void, onClose?: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat/wedding-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, weddingSlug }),
      });

      if (!response.ok) {
        const textError = await response.text();
        throw new Error(textError);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text,
        toolInvocations: data.toolResults?.map((t: any) => ({
          toolCallId: "call_" + Math.random().toString(),
          state: "result",
          result: t,
        })),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onDataChanged();
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "Oops, ocorreu um erro. Tente novamente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-full h-full flex flex-col border rounded-xl bg-card overflow-hidden shadow-xl ring-1 ring-primary/20">
      <div className="p-4 border-b bg-gradient-to-r from-indigo-500/10 to-purple-500/10 flex flex-row items-center justify-between backdrop-blur-sm m-0">
        <div className="flex items-center">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg mr-3 shadow-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col items-start gap-0">
            <h3 className="font-semibold text-md text-foreground leading-none mb-1">IA Concierge</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">O Grande Dia</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:bg-black/5 hover:text-foreground h-8 w-8 rounded-full">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-gradient-to-b from-background to-muted/20" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex justify-start">
              <div className="bg-muted/80 p-3.5 rounded-2xl rounded-tl-sm text-sm shadow-sm border border-border/50 max-w-[90%] space-y-2">
                <p>Olá! Sou seu <strong>IA Concierge</strong>. ✨</p>
                <p>Você pode me pedir para alterar qualquer detalhe do casamento. Por exemplo:</p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>"Adiciona a madrinha Carla, ela entra com o padrinho Pedro"</li>
                  <li>"A avó do noivo vai entrar com ele"</li>
                  <li>"O dress code é Esporte Fino"</li>
                  <li>"Remove o padrinho João da lista"</li>
                </ul>
              </div>
            </div>
          )}
          
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[92%] p-3.5 rounded-2xl text-sm shadow-sm ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border/50 rounded-tl-sm"
                }`}
              >
                {m.content}
                
                {/* Render Tool Invocations if any */}
                {m.toolInvocations?.length > 0 && (
                  <div className="mt-3 text-xs flex flex-col gap-1.5 pt-2 border-t border-border/40">
                    {m.toolInvocations.map(tool => (
                      <div key={tool.toolCallId} className="flex items-center gap-1.5 opacity-90">
                        {tool.state === "call" && (
                          <span className="flex items-center gap-1 animate-pulse">
                            <Sparkles className="w-3 h-3" /> Processando...
                          </span>
                        )}
                        {tool.state === "result" && tool.result && (
                          <span className={tool.result.success ? "text-green-600 dark:text-green-400 font-medium" : "text-destructive font-medium"}>
                            {tool.result.success ? "✅" : "❌"} {tool.result.message}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-muted/50 p-3.5 rounded-2xl rounded-tl-sm text-sm text-muted-foreground flex items-center gap-3 border border-border/50">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span>Processando...</span>
              </div>
            </div>
          )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t bg-card flex gap-2 items-end shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any) } }}
            placeholder="O que você deseja fazer?"
            disabled={isLoading}
            className="flex-1 bg-muted/50 min-h-[44px] max-h-[200px] rounded-xl border-0 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 resize-y transition-colors hover:bg-muted/70"
            rows={1}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="shrink-0 h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 shadow-sm">
            <Send className="w-5 h-5 ml-0.5" />
          </Button>
      </form>
    </div>
  );
}
