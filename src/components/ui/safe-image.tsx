"use client"

import { useState } from "react"
import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

/** Imagem com fallback elegante quando a URL quebra. */
export function SafeImage({
  src,
  alt,
  className,
  imgClassName,
}: {
  src: string,
  alt: string,
  className?: string,
  imgClassName?: string,
}) {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground", className)}>
        <ImageOff className="w-8 h-8 opacity-50" />
        <span className="text-xs px-2 text-center">Imagem indisponível</span>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={imgClassName}
        onError={() => setBroken(true)}
      />
    </div>
  )
}
