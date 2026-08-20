"use server"

import { prisma } from "@/lib/prisma"

export async function getDashboardData(weddingId: string) {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { slug: weddingId },
      include: {
        guests: true,
        partyMembers: true,
        vendorRecommendations: true,
        gifts: true,
        tables: true,
        transactions: true,
        GuestMessage: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!wedding) throw new Error("Wedding not found");

    // Wedding Base Data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weddingDate = new Date(wedding.date);
    weddingDate.setHours(0, 0, 0, 0);
    const daysUntilWedding = Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    let daysUntilRsvpDeadline = null;
    if (wedding.rsvpDeadline) {
      const deadline = new Date(wedding.rsvpDeadline);
      deadline.setHours(0, 0, 0, 0);
      daysUntilRsvpDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 3600 * 24));
    }

    // Guests & RSVP
    const guests = wedding.guests;
    const totalGuests = guests.length;
    const confirmedGuests = guests.filter(g => g.rsvpStatus === "CONFIRMED").length;
    const pendingGuests = guests.filter(g => g.rsvpStatus === "PENDING").length;
    const declinedGuests = guests.filter(g => g.rsvpStatus === "DECLINED").length;
    const waitlistGuests = guests.filter(g => g.rsvpStatus === "WAITLIST").length;
    const checkedInGuests = guests.filter(g => g.checkedIn).length;
    
    let children = 0;
    let adults = 0;
    let needsTransport = 0;
    const dietMap = new Map<string, number>();

    guests.forEach(g => {
      if (g.hasChildren) children += g.childrenCount;
      adults += 1; // Assuming each guest record is an adult
      if (g.needsTransport) needsTransport++;
      
      if (g.dietaryRestrictions && g.dietaryRestrictions.length > 0) {
        g.dietaryRestrictions.forEach(r => {
          dietMap.set(r, (dietMap.get(r) || 0) + 1);
        });
      }
    });

    // WhatsApp
    const whatsapp = {
      unsent: guests.filter(g => g.whatsappStatus === "UNSENT").length,
      sent: guests.filter(g => g.whatsappStatus === "SENT").length,
      delivered: guests.filter(g => g.whatsappStatus === "DELIVERED").length,
      read: guests.filter(g => g.whatsappStatus === "READ").length,
      replied: guests.filter(g => g.whatsappStatus === "REPLIED").length,
    }

    // Gifts & Finances
    const gifts = wedding.gifts;
    const transactions = wedding.transactions;
    const totalGifts = gifts.length;
    const totalGiftsValue = gifts.reduce((acc, g) => acc + (g.price * g.quotaCount), 0);
    
    const paidTransactions = transactions.filter(t => t.status === "PAID");
    const pendingTransactions = transactions.filter(t => t.status === "PENDING");
    
    const totalRaised = paidTransactions.reduce((acc, t) => acc + t.amount, 0);
    const totalPending = pendingTransactions.reduce((acc, t) => acc + t.amount, 0);
    
    // Enrich recent transactions with gift names
    const recentTransactions = [...paidTransactions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5).map(t => {
      const gift = gifts.find(g => g.id === t.giftId);
      return {
        ...t,
        giftName: gift ? gift.name : "Presente Excluído"
      };
    });

    // Tables
    const tables = wedding.tables;
    const totalTables = tables.length;
    const totalCapacity = tables.reduce((acc, t) => acc + t.capacity, 0);
    const seatedGuests = guests.filter(g => g.tableId).length;
    const unseatedGuests = confirmedGuests - seatedGuests; // Only care about confirmed guests needing seats
    const occupancyPercent = totalCapacity > 0 ? Math.round((seatedGuests / totalCapacity) * 100) : 0;

    // Party Members
    const party = wedding.partyMembers;
    const partyCounts = new Map<string, number>();
    party.forEach(p => {
      partyCounts.set(p.type, (partyCounts.get(p.type) || 0) + 1);
    });

    // Vendors
    const vendors = wedding.vendorRecommendations;
    const vendorTypeMap = new Map<string, number>();
    vendors.forEach(v => {
      vendorTypeMap.set(v.type, (vendorTypeMap.get(v.type) || 0) + 1);
    });

    return {
      wedding: {
        id: wedding.id,
        slug: wedding.slug,
        partner1Name: wedding.partner1Name,
        partner1Role: wedding.partner1Role,
        partner2Name: wedding.partner2Name,
        partner2Role: wedding.partner2Role,
        date: wedding.date,
        ceremonyDate: wedding.ceremonyDate,
        rsvpDeadline: wedding.rsvpDeadline,
        primaryColor: wedding.primaryColor,
        secondaryColor: wedding.secondaryColor,
        isPublicSiteEnabled: wedding.isPublicSiteEnabled
      },
      daysUntilWedding,
      daysUntilRsvpDeadline,
      guests: {
        total: totalGuests,
        confirmed: confirmedGuests,
        pending: pendingGuests,
        declined: declinedGuests,
        waitlist: waitlistGuests,
        checkedIn: checkedInGuests,
        adults,
        children,
        needsTransport,
        dietaryRestrictions: Array.from(dietMap.entries()).map(([restriction, count]) => ({ restriction, count })).sort((a, b) => b.count - a.count)
      },
      whatsapp,
      gifts: {
        totalGifts,
        totalGiftsValue,
        totalRaised,
        totalPending,
        transactionCount: paidTransactions.length,
        recentTransactions
      },
      seating: {
        totalTables,
        totalCapacity,
        seatedGuests,
        unseatedGuests: unseatedGuests > 0 ? unseatedGuests : 0,
        occupancyPercent
      },
      messages: {
        total: wedding.GuestMessage?.length || 0,
        recent: wedding.GuestMessage || []
      },
      party: {
        totalMembers: party.length,
        byType: Array.from(partyCounts.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
      },
      vendors: {
        total: vendors.length,
        byType: Array.from(vendorTypeMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
      }
    };
  } catch (error) {
    console.error("Failed to get dashboard data:", error);
    return null;
  }
}
