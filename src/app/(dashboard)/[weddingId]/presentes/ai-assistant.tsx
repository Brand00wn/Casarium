// @ts-nocheck
"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Send, X, Gift, Bot } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolInvocations?: any[];
};

export function AIGiftAssistant({ weddingSlug, onGiftAdded, onClose }: { weddingSlug: string, onGiftAdded: () => void, onClose?: () => void }) {
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
      const response = await fetch("/api/chat/gifts", {
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
          toolCallId: t.toolCallId,
          state: "result",
          result: t.result,
        })),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onGiftAdded();
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
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Gemini 3.6 Flash</p>
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
                <p>Olá! Aqui é o seu <strong>IA Concierge</strong>. ✨</p>
                <p>Como estamos na seção de Presentes, basta colar aqui o link de qualquer produto (Mercado Livre, Amazon, Magalu) que eu extraio os dados e adiciono à sua lista automaticamente!</p>
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
                {m.toolInvocations?.map(tool => (
                  <div key={tool.toolCallId} className="mt-2 text-xs opacity-80 bg-background/20 p-2 rounded">
                    {tool.state === "call" && (
                      <span className="flex items-center gap-1 animate-pulse">
                        <Sparkles className="w-3 h-3" /> Lendo link...
                      </span>
                    )}
                    {tool.state === "result" && tool.result && (
                      <div className="flex flex-col gap-1">
                        {tool.result.success ? (
                           <>
                            <span className="font-semibold border-b border-border/20 pb-1 mb-1">
                              ✅ {tool.result.giftName || "Presente Cadastrado"}
                            </span>
                            <span>Preço puxado: R$ {tool.result.giftPrice}</span>
                           </>
                        ) : (
                           <span className="text-destructive font-semibold">
                             ❌ {tool.result.message}
                           </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
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
                <span>Processando link...</span>
              </div>
            </div>
          )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t bg-card flex gap-2 items-end shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any) } }}
            placeholder="Cole o link do produto aqui..."
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
