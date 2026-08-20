import { z } from "zod"

export const guestSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório e deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  rsvpStatus: z.enum(["PENDING", "CONFIRMED", "DECLINED", "WAITLIST"]).default("PENDING"),
  dietaryRestrictions: z.string().optional(),
  ageCategory: z.enum(["Adulto", "Criança", "Bebê"]).default("Adulto"),
  companions: z.array(z.object({
    name: z.string().min(2, "Nome é obrigatório"),
    phone: z.string().optional().or(z.literal("")),
    dietaryRestrictions: z.string().optional(),
    ageCategory: z.enum(["Adulto", "Criança", "Bebê"]).default("Adulto"),
  })).default([]),
})

export type GuestFormValues = z.infer<typeof guestSchema>
