import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const wedding = await prisma.wedding.findFirst();
    if (!wedding) {
      console.log("No wedding found");
      return;
    }

    const giftsToSeed = [
    { name: "Liquidificador", price: 150, quotaCount: 1 },
    { name: "Batedeira", price: 200, quotaCount: 1 },
    { name: "Micro-ondas", price: 600, quotaCount: 2 },
    { name: "Geladeira", price: 3500, quotaCount: 10 },
    { name: "Fogão 4 bocas", price: 900, quotaCount: 3 },
    { name: "Jogo de Panelas", price: 350, quotaCount: 1 },
    { name: "Faqueiro 130 peças", price: 250, quotaCount: 1 },
    { name: "Aparelho de Jantar", price: 400, quotaCount: 1 },
    { name: "Jogo de Taças", price: 180, quotaCount: 1 },
    { name: "Máquina de Lavar Roupas", price: 2200, quotaCount: 5 },
    { name: "Ferro de Passar", price: 120, quotaCount: 1 },
    { name: "Aspirador de Pó", price: 280, quotaCount: 1 },
    { name: "Cafeteira Elétrica", price: 150, quotaCount: 1 },
    { name: "Sanduicheira", price: 90, quotaCount: 1 },
    { name: "Air Fryer", price: 450, quotaCount: 2 },
    { name: "Jogo de Cama Casal", price: 200, quotaCount: 1 },
    { name: "Jogo de Banho", price: 150, quotaCount: 1 },
    { name: "Edredom", price: 250, quotaCount: 1 },
    { name: "Travesseiros (Par)", price: 80, quotaCount: 1 },
    { name: "Tapete para Sala", price: 300, quotaCount: 1 },
    { name: "Smart TV 50\"", price: 2500, quotaCount: 5 },
    { name: "Rack para TV", price: 600, quotaCount: 2 },
    { name: "Sofá 3 lugares", price: 1800, quotaCount: 4 },
    { name: "Mesa de Jantar com 4 Cadeiras", price: 1200, quotaCount: 3 },
    { name: "Cama Box Casal", price: 1500, quotaCount: 4 },
    { name: "Guarda-roupas", price: 1600, quotaCount: 4 },
    { name: "Panela de Pressão Elétrica", price: 300, quotaCount: 1 },
    { name: "Processador de Alimentos", price: 220, quotaCount: 1 },
    { name: "Espremedor de Frutas", price: 100, quotaCount: 1 },
    { name: "Torradeira", price: 110, quotaCount: 1 },
    { name: "Mixer", price: 130, quotaCount: 1 },
    { name: "Grill", price: 180, quotaCount: 1 },
    { name: "Chaleira Elétrica", price: 120, quotaCount: 1 },
    { name: "Balança de Cozinha", price: 50, quotaCount: 1 },
    { name: "Conjunto de Potes", price: 80, quotaCount: 1 },
    { name: "Fruteira", price: 90, quotaCount: 1 },
    { name: "Lixeira Inox", price: 150, quotaCount: 1 },
    { name: "Tábua de Passar Roupas", price: 100, quotaCount: 1 },
    { name: "Varal de Chão", price: 80, quotaCount: 1 },
    { name: "Conjunto de Assadeiras", price: 120, quotaCount: 1 },
    { name: "Cota de Viagem (Cotas de R$100)", price: 100, quotaCount: 50 },
    { name: "Cota para Jantar Romântico", price: 300, quotaCount: 1 },
    { name: "Cota para Passeio Turístico", price: 200, quotaCount: 2 },
    { name: "Cota SPA Relaxante", price: 400, quotaCount: 1 },
    { name: "Cota Aluguel de Carro", price: 150, quotaCount: 3 },
    { name: "Cota Primeiro Mês de Mercado", price: 500, quotaCount: 2 },
    { name: "Cota Primeira Conta de Luz", price: 200, quotaCount: 1 },
    { name: "Cota Primeira Conta de Água", price: 100, quotaCount: 1 },
    { name: "Cota Netflix 1 Ano", price: 600, quotaCount: 1 },
    { name: "Cota Spotify 1 Ano", price: 250, quotaCount: 1 },
    ];

    await prisma.gift.createMany({
      data: giftsToSeed.map((g) => ({
        ...g,
        weddingId: wedding.id,
      })),
    });

    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
