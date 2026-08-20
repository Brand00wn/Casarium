"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Collapsible } from "@/components/ui/collapsible";

export function SidebarCollapsibleItem({ children, className, activePathBase }: { children: React.ReactNode, className?: string, activePathBase?: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Fecha o submenu sempre que a rota mudar, exceto se a nova rota pertencer a este mesmo submenu
  useEffect(() => {
    if (activePathBase && pathname.includes(activePathBase)) {
      // Se a rota atual pertence a este submenu, ele pode se manter aberto ou ser aberto automaticamente.
      // Opcional: setIsOpen(true) para forçar aberto se entrar pela URL direto.
      return;
    }
    setIsOpen(false);
  }, [pathname, activePathBase]);

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen} 
      className={className}
    >
      {children}
    </Collapsible>
  );
}
