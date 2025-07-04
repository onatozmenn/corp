"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  Search,
  MoreHorizontal,
  Phone,
  Video,
  UserPlus,
  MessageCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"

export default function MessagesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/")
      return
    }
    setUser(user)
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Mesajlar
            </h1>
            <p className="text-gray-600 text-lg">
              Arkadaşlarınızla özel mesajlaşın
            </p>
          </div>
        </motion.div>

        {/* Coming Soon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">
            Yakında Geliyor!
          </h3>
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            Mesajlaşma özelliği şu anda geliştirme aşamasında. Arkadaşlarınızla özel mesajlaşabilmek için çok yakında burada olacak!
          </p>
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => router.push('/social')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Sosyal Akışa Git
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
            >
              Dashboard'a Dön
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 