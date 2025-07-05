"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
  ImageIcon,
  Video,
  Send,
  Building2,
  Users,
  TrendingUp,
  Eye,
  EyeOff,
  Shield,
  Globe,
  Trash2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import { useSearchParams } from "next/navigation"

interface Post {
  id: string
  user_id: string // eklendi
  content: string
  image_url?: string
  video_url?: string
  likes_count: number
  comments_count: number
  created_at: string
  users: {
    username: string
  }
}

interface Comment {
  id: string
  user_id: string // eklendi
  content: string
  created_at: string
  users: {
    username: string
  }
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userStats, setUserStats] = useState({
    postsCount: 0,
    likesCount: 0,
    followersCount: 0,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [authLoading, setAuthLoading] = useState(false)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const router = useRouter()
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [usernameInput, setUsernameInput] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const usernameInputRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams();
  const [currentUsername, setCurrentUsername] = useState<string>("");

  // Close delete dialog when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDeleteDialog(null)
    }
    
    if (showDeleteDialog) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDeleteDialog])

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchPosts()
    }
  }, [user])

  // Username kontrolü ve modal açma
  useEffect(() => {
    if (user) {
      (async () => {
        const { data: userRow } = await supabase.from("users").select("username").eq("id", user.id).single()
        if (!userRow || !userRow.username || userRow.username.startsWith("user_")) {
          setShowUsernameModal(true)
        } else {
          setShowUsernameModal(false)
        }
      })()
    }
  }, [user])

  // Eğer e-mail confirmation sonrası gelindiyse giriş tabına yönlendir
  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "signup") {
      // Giriş tabını aktif et
      const signinTab = document.querySelector('[value="signin"]') as HTMLElement;
      if (signinTab) {
        signinTab.click();
      }
    }
  }, [searchParams]);

  // Username kaydetme fonksiyonu
  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    setUsernameError("")
    const username = usernameInput.trim()
    if (!username) {
      setUsernameError("Kullanıcı adı zorunlu!")
      return
    }
    // Unique kontrolü
    const { data: exists } = await supabase.from("users").select("id").eq("username", username).single()
    if (exists) {
      setUsernameError("Bu kullanıcı adı zaten alınmış!")
      return
    }
    // Güncelle
    const { error } = await supabase.from("users").update({ username }).eq("id", user.id)
    if (error) {
      setUsernameError("Kullanıcı adı kaydedilemedi!")
      return
    }
    setShowUsernameModal(false)
  }

  const checkUser = async () => {
    console.log('Checking user...')
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()
      
      console.log('User check result:', { user, userError })
      
      if (userError) {
        console.error('Error getting user:', userError)
      }
      
      if (user) {
        console.log('User found:', user)
        
        // Check if user exists in users table, if not create it
        const { data: existingUser, error: existingUserError } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single()
        
        console.log('Existing user check:', { existingUser, existingUserError })
        
        if (!existingUser) {
          console.log('Creating user record...')
          // Create user record if it doesn't exist
          const { error: userError } = await supabase
            .from("users")
            .insert([
              {
                id: user.id,
                email: user.email,
                username: user.user_metadata?.username || `user_${user.id.substring(0, 8)}`,
                password_hash: `placeholder_hash_${user.id}`, // Placeholder since we don't have actual password
                created_at: user.created_at,
                updated_at: user.updated_at,
                is_verified: user.email_confirmed_at !== null,
              },
            ])
          
          if (userError) {
            console.error("Error creating user record:", userError)
          } else {
            console.log('User record created successfully')
          }
        }
        
        // Check if user exists in user_profiles table, if not create it
        const { data: existingProfile, error: existingProfileError } = await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .single()
        
        console.log('Existing profile check:', { existingProfile, existingProfileError })
        
        if (!existingProfile) {
          console.log('Creating user profile record...')
          // Create user profile record if it doesn't exist
          const { error: profileError } = await supabase
            .from("user_profiles")
            .insert([
              {
                user_id: user.id,
                created_at: user.created_at,
                updated_at: user.updated_at,
              },
            ])
          
          if (profileError) {
            console.error("Error creating user profile record:", profileError)
          } else {
            console.log('User profile record created successfully')
          }
        }
        
        fetchUserStats(user.id)
        // Username'i kendi tablomuzdan çek
        const { data: userRow } = await supabase.from("users").select("username").eq("id", user.id).single();
        setCurrentUsername(userRow?.username || "");
      } else {
        console.log('No user found')
      }
      
      setUser(user)
    } catch (error) {
      console.error('Error in checkUser:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserStats = async (userId: string) => {
    try {
      const { data: postsData } = await supabase.from("posts").select("id").eq("user_id", userId)
      const { data: likesData } = await supabase
        .from("likes")
        .select("id")
        .in("post_id", postsData?.map((p) => p.id) || [])
      const { data: friendsData } = await supabase
        .from("friendships")
        .select("id")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq("status", "accepted")
      setUserStats({
        postsCount: postsData?.length || 0,
        likesCount: likesData?.length || 0,
        followersCount: friendsData?.length || 0,
      })
    } catch (error) {
      console.error("Error fetching user stats:", error)
    }
  }

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`*, user_id, users (username)`)
        .order("created_at", { ascending: false })
        .limit(20)
      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error("Error fetching posts:", error)
    }
  }

  const createPost = async () => {
    if (!newPost.trim() || !user) return
    try {
      const { error } = await supabase.from("posts").insert([
        {
          user_id: user.id,
          content: newPost.trim(),
        },
      ])
      if (error) throw error
      setNewPost("")
      fetchPosts()
      fetchUserStats(user.id)
    } catch (error) {
      console.error("Error creating post:", error)
    }
  }

  const likePost = async (postId: string) => {
    if (!user) return
    console.log("Like atılıyor:", { postId, userId: user.id });
    try {
      const { data: existingLike, error: selectError } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle()
      console.log("Like select sonucu:", { existingLike, selectError });

      if (existingLike) {
        const { error: deleteError, data: deleteData } = await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id)
        console.log("Like silme sonucu:", { deleteError, deleteData });
        if (deleteError) console.error("Like delete error:", deleteError);
      } else {
        const { error: insertError, data: insertData } = await supabase.from("likes").insert([
          {
            post_id: postId,
            user_id: user.id,
          },
        ])
        console.log("Like ekleme sonucu:", { insertError, insertData });
        if (insertError) console.error("Like insert error:", insertError);
      }
      fetchPosts()
    } catch (error) {
      console.error("Error toggling like:", error)
    }
  }

  const deletePost = async (postId: string) => {
    if (!user) return
    try {
      await supabase.from("posts").delete().eq("id", postId).eq("user_id", user.id)
      fetchPosts()
      setShowDeleteDialog(null)
    } catch (error) {
      console.error("Error deleting post:", error)
    }
  }

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`*, user_id, users (username)`)
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
      if (error) throw error
      setComments(prev => ({ ...prev, [postId]: data || [] }))
    } catch (error) {
      console.error("Error fetching comments:", error)
    }
  }

  const addComment = async (postId: string) => {
    if (!user || !newComments[postId]?.trim()) return
    try {
      const { error } = await supabase.from("comments").insert([
        {
          post_id: postId,
          user_id: user.id,
          content: newComments[postId].trim(),
        },
      ])
      if (error) throw error
      setNewComments(prev => ({ ...prev, [postId]: "" }))
      fetchComments(postId)
      fetchPosts() // Update comment count
    } catch (error) {
      console.error("Error adding comment:", error)
    }
  }

  const toggleComments = async (postId: string) => {
    const isVisible = showComments[postId]
    setShowComments(prev => ({ ...prev, [postId]: !isVisible }))
    if (!isVisible && !comments[postId]) {
      await fetchComments(postId)
    }
  }

  const sharePost = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId)
      if (post) {
        const shareText = `${post.users.username}: ${post.content}`
        if (navigator.share) {
          await navigator.share({
            title: 'CorpOut Paylaşımı',
            text: shareText,
            url: window.location.href,
          })
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(shareText)
          alert('Paylaşım linki kopyalandı!')
        }
      }
    } catch (error) {
      console.error("Error sharing post:", error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    if (diffInHours < 1) return "Az önce"
    if (diffInHours < 24) return `${diffInHours} saat önce`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} gün önce`
    return date.toLocaleDateString("tr-TR")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = (isSignUp: boolean) => {
    const newErrors: Record<string, string> = {}
    if (!formData.email) {
      newErrors.email = "E-posta adresi gerekli"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Geçerli bir e-posta adresi girin"
    }
    if (!formData.password) {
      newErrors.password = "Şifre gerekli"
    } else if (formData.password.length < 6) {
      newErrors.password = "Şifre en az 6 karakter olmalı"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm(true)) return
    setAuthLoading(true)
    try {
      console.log('Signup attempt with:', { email: formData.email, username: formData.username })
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      })
      
      console.log('Signup response:', { authData, authError })
      
      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }
      
      if (!authData.user) {
        console.error('No user returned from signup')
        throw new Error("User creation failed - no user returned")
      }
      
      console.log('User created successfully:', authData.user)
      
      // Başarılı kayıt mesajı göster
      setErrors({ general: "Kayıt başarılı! Giriş yapabilirsiniz." })
      
      // Formu temizle
      setFormData({
        email: "",
        password: "",
        username: "",
        confirmPassword: "",
      })
      
      // Kullanıcıyı giriş tabına yönlendir
      const signinTab = document.querySelector('[value="signin"]') as HTMLElement
      if (signinTab) {
        signinTab.click()
      }
      
    } catch (error: any) {
      console.error('Signup error:', error)
      let errorMessage = "Kayıt sırasında bir hata oluştu"
      
      if (error.message?.includes("Invalid API key")) {
        errorMessage = "Veritabanı yapılandırma hatası. Lütfen yöneticiye başvurun."
      } else if (error.message?.includes("User already registered")) {
        errorMessage = "Bu e-posta adresi zaten kayıtlı"
      } else if (error.message?.includes("Invalid email")) {
        errorMessage = "Geçersiz e-posta adresi"
      } else if (error.message?.includes("Password should be at least 6 characters")) {
        errorMessage = "Şifre en az 6 karakter olmalı"
      } else if (error.message?.includes("Email rate limit exceeded")) {
        errorMessage = "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin."
      } else if (error.message?.includes("signup is disabled")) {
        errorMessage = "Kayıt işlemi şu anda devre dışı. Lütfen daha sonra tekrar deneyin."
      } else if (error.message?.includes("Unable to validate email address")) {
        errorMessage = "E-posta adresi doğrulanamadı. Lütfen geçerli bir e-posta adresi girin."
      } else if (error.message?.includes("Signup is disabled")) {
        errorMessage = "Kayıt işlemi şu anda devre dışı. Lütfen daha sonra tekrar deneyin."
      }
      
      setErrors({ general: errorMessage })
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm(false)) return
    setAuthLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
      if (error) throw error
      setTimeout(() => checkUser(), 1000)
    } catch (error: any) {
      let errorMessage = "Giriş sırasında bir hata oluştu"
      if (error.message?.includes("Invalid API key")) {
        errorMessage = "Veritabanı yapılandırma hatası. Lütfen yöneticiye başvurun."
      } else if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "E-posta veya şifre hatalı"
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "E-posta adresinizi doğrulamanız gerekiyor. Lütfen e-posta kutunuzu kontrol edin."
      }
      setErrors({ general: errorMessage })
    } finally {
      setAuthLoading(false)
    }
  }

  const features = [
    {
      icon: Shield,
      title: "Tam Anonimlik",
      description: "Sadece kullanıcı adınızla görünün, gerçek kimliğiniz gizli kalır",
    },
    {
      icon: Building2,
      title: "Şirket Değerlendirmeleri",
      description: "Çalıştığınız şirketleri değerlendirin, diğerlerinin deneyimlerini okuyun",
    },
    {
      icon: MessageCircle,
      title: "Sosyal Etkileşim",
      description: "Paylaşım yapın, yorum yazın, arkadaşlarınızla mesajlaşın",
    },
    {
      icon: TrendingUp,
      title: "Kariyer İçgörüleri",
      description: "Sektör trendlerini takip edin, kariyer fırsatlarını keşfedin",
    },
  ]

  // Yorum silme fonksiyonu (doğru scope'ta, Home fonksiyonunun içinde ve JSX'ten önce)
  const deleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user.id);
      // Yorumun ait olduğu postu bul ve tekrar fetch et
      Object.keys(comments).forEach(postId => {
        if (comments[postId]?.some((c: any) => c.id === commentId)) {
          fetchComments(postId);
        }
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) {
    // Giriş/kayıt formunu göster
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>
      <div className="relative z-10 container mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }} className="mr-4">
              <Globe className="h-12 w-12 text-yellow-400" />
            </motion.div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">CorpOut</h1>
          </div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="text-2xl text-white/90 font-light">Kurumsal • Özgür • Filtresiz</motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.8 }} className="text-lg text-white/70 mt-4 max-w-2xl mx-auto">Türkiye'nin ilk anonim şirket değerlendirme ve sosyal platform. Gerçek deneyimleri paylaş, özgürce konuş.</motion.p>
          </motion.div>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="space-y-8">
            <div className="grid gap-6">
              {features.map((feature, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + index * 0.1 }} className="flex items-start space-x-4 p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <div className="flex-shrink-0">
                    <feature.icon className="h-8 w-8 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-white/70">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="flex justify-center">
            <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Platforma Katıl</CardTitle>
                <CardDescription className="text-gray-600">Anonim kimliğinle özgürce paylaş</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="signin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">Giriş Yap</TabsTrigger>
                      <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">Kayıt Ol</TabsTrigger>
                  </TabsList>
                  <TabsContent value="signin" className="space-y-4">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">E-posta</Label>
                          <Input id="signin-email" name="email" type="email" placeholder="ornek@email.com" value={formData.email} onChange={handleInputChange} className={errors.email ? "border-red-500" : ""} />
                        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Şifre</Label>
                        <div className="relative">
                            <Input id="signin-password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={handleInputChange} className={errors.password ? "border-red-500" : ""} />
                            <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                      </div>
                      {errors.general && <p className="text-sm text-red-500">{errors.general}</p>}
                        <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" disabled={authLoading}>
                          {authLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                        </Button>
                        <div className="text-center">
                          <Button variant="link" className="text-sm text-purple-600">Şifremi Unuttum</Button>
                      </div>
                    </form>
                  </TabsContent>
                  <TabsContent value="signup" className="space-y-4">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">E-posta</Label>
                        <Input id="signup-email" name="email" type="email" placeholder="ornek@email.com" value={formData.email} onChange={handleInputChange} className={errors.email ? "border-red-500" : ""} />
                        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Şifre</Label>
                        <div className="relative">
                          <Input id="signup-password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={handleInputChange} className={errors.password ? "border-red-500" : ""} />
                          <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                      </div>
                      {errors.general && <p className="text-sm text-red-500 text-center mt-2">{errors.general}</p>}
                        <Button type="submit" className="w-full" disabled={authLoading}>{authLoading ? "Kayıt Olunuyor..." : "Kayıt Ol"}</Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        </div>
      </div>
    )
  }

  // Username modalı
  if (showUsernameModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <form onSubmit={handleSaveUsername} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col gap-5 border border-purple-100">
          <div className="flex flex-col items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-3xl font-bold shadow-lg mb-2">
              <svg xmlns='http://www.w3.org/2000/svg' className='h-8 w-8' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z' /></svg>
            </span>
            <h2 className="text-2xl font-bold text-gray-800">Kullanıcı Adı Belirle</h2>
            <p className="text-gray-500 text-center text-sm max-w-xs">Anonim bir kullanıcı adı koymak sitede rahatça fikirlerinizi paylaşmanıza olanak sağlar. <b>Sadece bir öneri :)</b></p>
          </div>
          <Input
            ref={usernameInputRef}
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value)}
            placeholder="Kullanıcı adınızı girin"
            className={usernameError ? "border-red-500" : ""}
          />
          {usernameError && <p className="text-sm text-red-500">{usernameError}</p>}
          <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-2 rounded-lg shadow hover:from-purple-600 hover:to-pink-600 transition">Kaydet</Button>
        </form>
      </div>
    );
  }

  // Kullanıcı giriş yaptıysa sosyal akışı göster
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Welcome Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    Hoş geldin, {user?.user_metadata?.username || "Kullanıcı"}! 👋
                  </h1>
                  <p className="text-white/90">Bugün hangi deneyimini paylaşmak istiyorsun?</p>
                </div>
                <div className="hidden md:flex space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{userStats.postsCount}</div>
                    <div className="text-sm text-white/80">Gönderi</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{userStats.likesCount}</div>
                    <div className="text-sm text-white/80">Beğeni</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{userStats.followersCount}</div>
                    <div className="text-sm text-white/80">Arkadaş</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" onClick={() => router.push("/review-form")}> <CardContent className="p-4 text-center"> <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" /> <h3 className="font-semibold text-blue-900">Şirket Değerlendir</h3> <p className="text-sm text-blue-700">Deneyimini paylaş</p> </CardContent> </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-green-50 to-green-100 border-green-200" onClick={() => router.push("/companies")}> <CardContent className="p-4 text-center"> <Users className="h-8 w-8 text-green-600 mx-auto mb-2" /> <h3 className="font-semibold text-green-900">Şirketleri Keşfet</h3> <p className="text-sm text-green-700">İncelemeler oku</p> </CardContent> </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"> <CardContent className="p-4 text-center"> <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" /> <h3 className="font-semibold text-purple-900">Trendler</h3> <p className="text-sm text-purple-700">Popüler konular</p> </CardContent> </Card>
        </motion.div>
        {/* Create Post */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">{user?.user_metadata?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{currentUsername || "Kullanıcı"}</p>
                  <p className="text-sm text-gray-500">Bir şeyler paylaş...</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Textarea placeholder="Bugün neler yaşadın? Deneyimlerini anonim olarak paylaş..." value={newPost} onChange={(e) => setNewPost(e.target.value)} className="min-h-[100px] border-0 bg-gray-50 resize-none focus:ring-2 focus:ring-purple-500" />
              <div className="flex items-center justify-between mt-4">
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" className="text-purple-600 hover:bg-purple-50">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Fotoğraf
                  </Button>
                  <Button variant="ghost" size="sm" className="text-purple-600 hover:bg-purple-50">
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </Button>
                </div>
                <Button onClick={createPost} disabled={!newPost.trim()} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Send className="h-4 w-4 mr-2" />
                  Paylaş
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.map((post, index) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + index * 0.1 }}>
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src="/placeholder.svg?height=40&width=40" />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">{post.users.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{post.users.username}</p>
                        <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
                      </div>
                    </div>
                    {/* Sadece kendi postuysa sil butonunu göster */}
                    {user && post.user_id === user.id && (
                      <div className="relative">
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation()
                          setShowDeleteDialog(post.id)
                        }}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {showDeleteDialog === post.id && (
                          <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg p-2 z-10">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation()
                                deletePost(post.id)
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full justify-start"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-800 mb-4 leading-relaxed">{post.content}</p>
                  {post.image_url && (<div className="mb-4 rounded-lg overflow-hidden"><img src={post.image_url || "/placeholder.svg"} alt="Post image" className="w-full h-auto max-h-96 object-cover" /></div>)}
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-6">
                      <Button variant="ghost" size="sm" onClick={() => likePost(post.id)} className="text-gray-600 hover:text-red-500 hover:bg-red-50">
                        <Heart className="h-4 w-4 mr-2" />
                        {post.likes_count}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleComments(post.id)} className="text-gray-600 hover:text-blue-500 hover:bg-blue-50">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {post.comments_count}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => sharePost(post.id)} className="text-gray-600 hover:text-green-500 hover:bg-green-50">
                        <Share className="h-4 w-4 mr-2" />
                        Paylaş
                      </Button>
                    </div>
                  </div>
                  
                  {/* Comments Section */}
                  {showComments[post.id] && (
                    <div className="mt-4 space-y-4">
                      <Separator />
                      <div className="space-y-3">
                        {comments[post.id]?.map((comment) => (
                          <div key={comment.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs">
                                {comment.users.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-semibold text-sm">{comment.users.username}</p>
                                <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
                                {/* Sadece kendi yorumunsa sil butonunu göster */}
                                {user && comment.user_id === user.id && (
                                  <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 ml-2" onClick={() => deleteComment(comment.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Add Comment */}
                      <div className="flex space-x-2">
                        <Textarea
                          placeholder="Yorum yaz..."
                          value={newComments[post.id] || ""}
                          onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                          className="flex-1 min-h-[60px] resize-none"
                        />
                        <Button 
                          onClick={() => addComment(post.id)}
                          disabled={!newComments[post.id]?.trim()}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        {posts.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <MessageCircle className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Henüz gönderi yok</h3>
              <p>İlk gönderini paylaşarak başla!</p>
            </div>
        </motion.div>
        )}
      </div>
    </div>
  )
}