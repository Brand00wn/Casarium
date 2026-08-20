"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { WeddingAIAssistant } from "@/components/forms/wedding-ai-assistant";

export function GrandeDiaAIAssistant({ weddingSlug, children }: { weddingSlug: string, children: React.ReactNode }) {
  const [isAIOpen, setIsAIOpen] = useState(true);
  const router = useRouter();

  const handleDataChanged = () => {
    router.refresh(); // Refreshes server components to get latest DB state
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 max-w-[1400px] mx-auto min-h-screen items-start">
      <div className="flex-1 space-y-8 min-w-0 pb-10 w-full">
        {children}
      </div>

      {/* Botão FAB */}
      {!isAIOpen && (
        <Button
          onClick={() => setIsAIOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 transition-all duration-500 z-50 p-0 hover:scale-110 group"
          title="Abrir IA Concierge"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      )}

      {/* IA Assistant Container */}
      <div 
        className={`
          ${isAIOpen ? 'w-full lg:w-[380px] opacity-100 translate-y-0' : 'w-full lg:w-0 opacity-0 translate-y-full lg:translate-y-0'}
          transition-all duration-300 ease-in-out
          fixed lg:sticky
          bottom-0 lg:top-6
          right-0 lg:right-auto
          h-[85vh] lg:h-[calc(100vh-8rem)]
          z-40 lg:z-10
          flex-shrink-0
          overflow-hidden
        `}
      >
        <div className="w-full lg:w-[380px] h-full">
          <WeddingAIAssistant 
            weddingSlug={weddingSlug} 
            onDataChanged={handleDataChanged} 
            onClose={() => setIsAIOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
