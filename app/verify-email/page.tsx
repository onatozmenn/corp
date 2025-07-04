"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, CheckCircle, AlertCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function VerifyEmailPage() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const type = searchParams.get('type')

    if (token && type === 'signup') {
      verifyEmail(token)
    }
  }, [searchParams])

  const verifyEmail = async (token: string) => {
    setIsVerifying(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      })

      if (error) {
        setVerificationStatus('error')
      } else {
        setVerificationStatus('success')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (error) {
      setVerificationStatus('error')
    } finally {
      setIsVerifying(false)
    }
  }

  const resendEmail = async () => {
    // Bu fonksiyon e-posta yeniden gönderme için kullanılabilir
    alert('E-posta yeniden gönderme özelliği yakında eklenecek.')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {verificationStatus === 'pending' && <Mail className="h-12 w-12 text-purple-600" />}
              {verificationStatus === 'success' && <CheckCircle className="h-12 w-12 text-green-600" />}
              {verificationStatus === 'error' && <AlertCircle className="h-12 w-12 text-red-600" />}
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {verificationStatus === 'pending' && 'E-posta Doğrulama'}
              {verificationStatus === 'success' && 'Doğrulama Başarılı!'}
              {verificationStatus === 'error' && 'Doğrulama Hatası'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {verificationStatus === 'pending' && 'E-posta adresinizi doğrulamak için lütfen bekleyin...'}
              {verificationStatus === 'success' && 'E-posta adresiniz başarıyla doğrulandı. Dashboard\'a yönlendiriliyorsunuz...'}
              {verificationStatus === 'error' && 'E-posta doğrulama sırasında bir hata oluştu.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verificationStatus === 'pending' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">
                  E-posta kutunuzu kontrol edin ve doğrulama linkine tıklayın.
                </p>
                <Button
                  onClick={resendEmail}
                  variant="outline"
                  className="mt-4 w-full"
                >
                  E-postayı Yeniden Gönder
                </Button>
              </div>
            )}
            
            {verificationStatus === 'error' && (
              <div className="text-center">
                <Button
                  onClick={() => router.push('/')}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Ana Sayfaya Dön
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 