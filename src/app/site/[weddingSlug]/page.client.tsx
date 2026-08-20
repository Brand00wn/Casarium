"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getMessages, postMessage } from "@/app/actions/rsvp"
import { format, differenceInSeconds } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function WeddingSitePage() {
  const params = useParams()
  const slug = params.weddingSlug as string

  const [wedding, setWedding] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [authorName, setAuthorName] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Countdown state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    // Fetch wedding data and messages in a real app, 
    // for this demo we'll fetch messages via server action
    // We should ideally fetch the wedding details via a server action or API route.
    // Let's create an inline fetch or just use a dummy for now since we don't have a getWedding action yet, 
    // wait, we can just fetch messages and get the wedding from a new action.
    fetchData()
  }, [slug])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/site/${slug}`) // we might need this API or just a server action. 
      // Actually since this is a client component, I can't fetch the wedding directly without an action.
      // Let's change this to be a Server Component that passes data to a Client Component, or just make it a Server Component with a Client component inside.
    } catch (e) {
      console.error(e)
    }
  }

  // Instead of the above, let's just write this properly as a Server Component that renders Client Components.
}
