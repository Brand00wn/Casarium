import { cn } from "@/lib/utils";

/** Rótulo pequeno em caixa alta que abre cada seção do site. */
export function Eyebrow({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-[0.3em] text-primary", className)}>
      {children}
    </p>
  );
}

/** Título serifado grande das seções. */
export function SectionTitle({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <h2 className={cn("font-display text-4xl md:text-5xl font-medium text-foreground", className)}>
      {children}
    </h2>
  );
}

/** Nomes do casal com quebra elegante: cada nome inteiro nunca parte no meio. */
export function CoupleNames({ partner1, partner2, className }: { partner1: string, partner2: string, className?: string }) {
  return (
    <span className={cn("inline", className)}>
      <span className="whitespace-nowrap">{partner1}</span>
      <span className="whitespace-nowrap"> & </span>
      <span className="whitespace-nowrap">{partner2}</span>
    </span>
  );
}
/** Ornamento divisor — filete com detalhe central. */
export function Ornament({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)} aria-hidden>
      <span className="h-px w-16 bg-primary/40" />
      <span className="text-primary text-sm">❦</span>
      <span className="h-px w-16 bg-primary/40" />
    </div>
  );
}

/** Cabeçalho padrão das páginas internas (RSVP, Presentes). */
export function PageHero({ eyebrow, title, description }: { eyebrow: string, title: React.ReactNode, description?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto space-y-4">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="font-display text-5xl md:text-6xl font-medium text-foreground">{title}</h1>
      {description && <p className="text-lg text-muted-foreground font-light">{description}</p>}
      <Ornament className="pt-2" />
    </div>
  );
}
