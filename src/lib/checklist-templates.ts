export const DEFAULT_CATEGORIES = [
  { name: "Local & Cerimônia",         emoji: "📍", color: "#ef4444" },
  { name: "Buffet & Bebidas",          emoji: "🍽️", color: "#f97316" },
  { name: "Trajes & Beleza",           emoji: "👗", color: "#ec4899" },
  { name: "Foto & Vídeo",             emoji: "📸", color: "#8b5cf6" },
  { name: "Música & Entretenimento",   emoji: "🎵", color: "#06b6d4" },
  { name: "Decoração & Flores",        emoji: "💐", color: "#10b981" },
  { name: "Convites & Papelaria",      emoji: "✉️", color: "#eab308" },
  { name: "Presentes & Lista",         emoji: "🎁", color: "#f43f5e" },
  { name: "Documentação & Burocracia", emoji: "📋", color: "#64748b" },
  { name: "Logística & Transporte",    emoji: "🚗", color: "#3b82f6" },
  { name: "Hospedagem",               emoji: "🏨", color: "#14b8a6" },
  { name: "Outros",                   emoji: "✨", color: "#a855f7" },
]

export const DEFAULT_TASKS = [
  // ===== 12 MESES ANTES (365 dias) =====
  { title: "Definir orçamento total do casamento",        category: "Documentação & Burocracia", relativeDays: 365, priority: "URGENT" },
  { title: "Escolher e reservar o local da cerimônia",     category: "Local & Cerimônia",         relativeDays: 365, priority: "URGENT" },
  { title: "Escolher e reservar o local da recepção",      category: "Local & Cerimônia",         relativeDays: 365, priority: "URGENT" },
  { title: "Contratar cerimonialista/assessora",           category: "Local & Cerimônia",         relativeDays: 365, priority: "HIGH" },
  { title: "Montar lista preliminar de convidados",        category: "Convites & Papelaria",      relativeDays: 365, priority: "HIGH" },

  // ===== 10 MESES ANTES (300 dias) =====
  { title: "Contratar fotógrafo",                          category: "Foto & Vídeo",              relativeDays: 300, priority: "HIGH" },
  { title: "Contratar cinegrafista/videomaker",            category: "Foto & Vídeo",              relativeDays: 300, priority: "HIGH" },
  { title: "Pesquisar e contratar buffet",                 category: "Buffet & Bebidas",          relativeDays: 300, priority: "HIGH" },
  { title: "Pesquisar e contratar banda/DJ",               category: "Música & Entretenimento",   relativeDays: 300, priority: "MEDIUM" },

  // ===== 8 MESES ANTES (240 dias) =====
  { title: "Escolher e encomendar vestido de noiva",       category: "Trajes & Beleza",           relativeDays: 240, priority: "HIGH" },
  { title: "Escolher e encomendar traje do noivo",         category: "Trajes & Beleza",           relativeDays: 240, priority: "MEDIUM" },
  { title: "Contratar decoradora",                         category: "Decoração & Flores",        relativeDays: 240, priority: "MEDIUM" },
  { title: "Definir paleta de cores e tema",               category: "Decoração & Flores",        relativeDays: 240, priority: "MEDIUM" },

  // ===== 6 MESES ANTES (180 dias) =====
  { title: "Fechar lista definitiva de convidados",        category: "Convites & Papelaria",      relativeDays: 180, priority: "HIGH" },
  { title: "Degustação do buffet",                         category: "Buffet & Bebidas",          relativeDays: 180, priority: "MEDIUM" },
  { title: "Encomendar convites impressos ou digitais",    category: "Convites & Papelaria",      relativeDays: 180, priority: "MEDIUM" },
  { title: "Definir lista de presentes",                   category: "Presentes & Lista",         relativeDays: 180, priority: "MEDIUM" },
  { title: "Reservar hotel/hospedagem para convidados",    category: "Hospedagem",                relativeDays: 180, priority: "LOW" },
  { title: "Iniciar ensaio das alianças",                  category: "Trajes & Beleza",           relativeDays: 180, priority: "LOW" },

  // ===== 4 MESES ANTES (120 dias) =====
  { title: "Primeira prova do vestido",                    category: "Trajes & Beleza",           relativeDays: 120, priority: "HIGH" },
  { title: "Contratar florista",                           category: "Decoração & Flores",        relativeDays: 120, priority: "MEDIUM" },
  { title: "Agendar teste de maquiagem e cabelo",          category: "Trajes & Beleza",           relativeDays: 120, priority: "MEDIUM" },
  { title: "Definir cardápio final com buffet",            category: "Buffet & Bebidas",          relativeDays: 120, priority: "MEDIUM" },
  { title: "Contratar transporte (noivos e/ou convidados)",category: "Logística & Transporte",    relativeDays: 120, priority: "LOW" },
  { title: "Verificar documentação para casamento civil",  category: "Documentação & Burocracia", relativeDays: 120, priority: "HIGH" },

  // ===== 3 MESES ANTES (90 dias) =====
  { title: "Enviar convites",                              category: "Convites & Papelaria",      relativeDays: 90, priority: "URGENT" },
  { title: "Definir padrinhos e madrinhas",                category: "Local & Cerimônia",         relativeDays: 90, priority: "HIGH" },
  { title: "Comprar alianças",                             category: "Trajes & Beleza",           relativeDays: 90, priority: "HIGH" },
  { title: "Agendar ensaio fotográfico (pré-wedding)",     category: "Foto & Vídeo",              relativeDays: 90, priority: "MEDIUM" },

  // ===== 2 MESES ANTES (60 dias) =====
  { title: "Última prova do vestido de noiva",             category: "Trajes & Beleza",           relativeDays: 60, priority: "HIGH" },
  { title: "Confirmar RSVP dos convidados",                category: "Convites & Papelaria",      relativeDays: 60, priority: "URGENT" },
  { title: "Definir layout das mesas",                     category: "Buffet & Bebidas",          relativeDays: 60, priority: "HIGH" },
  { title: "Agendar dia de beleza (spa day)",              category: "Trajes & Beleza",           relativeDays: 60, priority: "LOW" },

  // ===== 1 MÊS ANTES (30 dias) =====
  { title: "Ensaio da cerimônia",                          category: "Local & Cerimônia",         relativeDays: 30, priority: "HIGH" },
  { title: "Confirmar todos os fornecedores",              category: "Documentação & Burocracia", relativeDays: 30, priority: "URGENT" },
  { title: "Preparar timeline do grande dia",              category: "Local & Cerimônia",         relativeDays: 30, priority: "HIGH" },
  { title: "Montar kit de emergência (costura, remédios)", category: "Outros",                    relativeDays: 30, priority: "MEDIUM" },

  // ===== 1 SEMANA ANTES (7 dias) =====
  { title: "Confirmar número final de convidados com buffet",category: "Buffet & Bebidas",        relativeDays: 7, priority: "URGENT" },
  { title: "Separar documentos para o cartório",            category: "Documentação & Burocracia",relativeDays: 7, priority: "URGENT" },
  { title: "Fazer as unhas e cabelo (último retoque)",       category: "Trajes & Beleza",         relativeDays: 7, priority: "MEDIUM" },
  { title: "Embalar malas para lua de mel",                  category: "Outros",                  relativeDays: 7, priority: "LOW" },
]
