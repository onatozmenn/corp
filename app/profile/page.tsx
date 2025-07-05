"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRef } from "react"
import Navigation from "@/components/navigation"

interface UserProfile {
  id: string
  username: string
  current_position_id?: number
  avatar_url?: string
}

interface Company {
  id: number
  name: string
  logo_url?: string
}

interface Position {
  id: number
  title: string
  company_id: number
  company: Company
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [followers, setFollowers] = useState<number>(0)
  const [company, setCompany] = useState<Company | null>(null)
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [usersUsername, setUsersUsername] = useState<string>("");

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchActivities(user.id)
    }
  }, [user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/")
      return
    }
    setUser(user)
    fetchProfile(user.id)
    fetchFollowers(user.id)
    // Fetch username from users table
    const { data: userRow } = await supabase.from("users").select("username").eq("id", user.id).single()
    setUsersUsername(userRow?.username || "")
  }

  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, username, avatar_url")
      .eq("user_id", userId)
      .single()
    setProfile(profile)
    fetchLatestReview(userId)
  }

  const fetchLatestReview = async (userId: string) => {
    const { data: review } = await supabase
      .from("company_reviews")
      .select("position_id, company_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    if (review) {
      fetchPosition(review.position_id)
      fetchCompany(review.company_id)
    }
  }

  const fetchPosition = async (positionId: number) => {
    const { data: position } = await supabase
      .from("positions")
      .select("id, title")
      .eq("id", positionId)
      .single()
    setPosition(position)
  }

  const fetchCompany = async (companyId: number) => {
    const { data: company } = await supabase
      .from("companies")
      .select("id, name, logo_url")
      .eq("id", companyId)
      .single()
    setCompany(company)
  }

  const fetchFollowers = async (userId: string) => {
    // friendships tablosunda addressee_id = userId olanları say
    const { count } = await supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", userId)
      .eq("status", "accepted")
    setFollowers(count || 0)
  }

  // Faaliyetleri çek
  const fetchActivities = async (userId: string) => {
    // Şirket değerlendirmeleri
    const { data: reviews } = await supabase
      .from("company_reviews")
      .select("id, created_at, pros, cons, company_id, companies(name)")
      .eq("user_id", userId)
    // Gönderiler
    const { data: posts } = await supabase
      .from("posts")
      .select("id, created_at, content")
      .eq("user_id", userId)
    // Yorumlar
    const { data: comments } = await supabase
      .from("comments")
      .select("id, created_at, content, post_id")
      .eq("user_id", userId)
    // Hepsini tek diziye topla ve tür ekle
    const all = [
      ...(reviews || []).map(r => ({
        type: "review",
        id: r.id,
        created_at: r.created_at,
        company: r.companies?.name,
        company_id: r.company_id,
        pros: r.pros,
        cons: r.cons
      })),
      ...(posts || []).map(p => ({
        type: "post",
        id: p.id,
        created_at: p.created_at,
        content: p.content
      })),
      ...(comments || []).map(c => ({
        type: "comment",
        id: c.id,
        created_at: c.created_at,
        content: c.content,
        post_id: c.post_id
      })),
    ]
    // Tarihe göre sırala (en yeni en üstte)
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setActivities(all)
  }

  // Tarihi insan okunur formata çevir
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = (now.getTime() - date.getTime()) / 1000
    if (diff < 60) return "az önce"
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`
    if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`
    return date.toLocaleDateString("tr-TR")
  }

  // Profil fotoğrafı yükleme fonksiyonu
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `avatars/${user.id}.${fileExt}`
    let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    if (uploadError) {
      setUploading(false)
      alert('Fotoğraf yüklenemedi!')
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const avatarUrl = data.publicUrl
    // user_profiles tablosunda avatar_url güncelle
    await supabase.from('user_profiles').update({ avatar_url: avatarUrl }).eq('user_id', user.id)
    setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : prev)
    setUploading(false)
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex flex-col items-center py-12 px-2">
        <div className="relative w-full max-w-2xl mx-auto rounded-2xl shadow-xl bg-white overflow-visible border border-gray-100">
          {/* Kapak alanı */}
          <div className="h-44 w-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-t-2xl relative flex items-center justify-center">
            {/* Profil fotoğrafı */}
            <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
              <div className="relative group">
                <img
                  src={profile?.avatar_url || '/placeholder-user.jpg'}
                  alt="Profil Fotoğrafı"
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover bg-gray-100"
                />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
              {uploading && <div className="text-xs text-gray-500 mt-1">Yükleniyor...</div>}
            </div>
          </div>
          {/* Ana içerik */}
          <div className="flex flex-col items-center pt-20 pb-8 px-8 w-full">
            {/* Profili Düzenle, Kullanıcı Adı ve Takip et aynı satırda, üçlü hizalama */}
            <div className="w-full max-w-lg mx-auto mb-4 flex items-center justify-between gap-2" style={{ minHeight: 40 }}>
              <button
                className="px-2.5 py-1.5 rounded-md bg-black text-white font-medium text-sm flex items-center gap-2 shadow hover:bg-gray-800 transition ml-[-12px]"
                style={{ minWidth: 80 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2a2.828 2.828 0 11-4-4 2.828 2.828 0 014 4z" /></svg>
                Profili Düzenle
              </button>
              {/* <h1 className="text-2xl font-extrabold text-gray-900 text-center flex-1">
                {profile?.username || 'Kullanıcı'}
              </h1> */}
              <button
                className="px-3.5 py-1.5 rounded-md bg-[#32CD32] text-black font-medium text-sm shadow hover:bg-green-500 transition mr-[-12px]"
                style={{ minWidth: 70 }}
              >
                Takip et
              </button>
            </div>
            {/* Kullanıcı adı, pozisyon ve takipçi sayısı tekrar alt alta ortalanmış şekilde */}
            <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">
              {usersUsername || 'Kullanıcı'}
            </h1>
            {position && (
              <div className="text-base text-gray-700 mb-4 text-center">{position.title}</div>
            )}
            <div className="mb-2">
              <span className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow">
                {followers} takipçi
              </span>
            </div>

            {/* Faaliyet Bölümü */}
            <div className="w-full max-w-xl mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Faaliyet</h2>
              </div>
              <div className="space-y-4">
                {activities.length === 0 && (
                  <div className="text-gray-500 text-center">Henüz bir faaliyet yok.</div>
                )}
                {(showAllActivities ? activities : activities.slice(0, 3)).map((act, i) => (
                  <div key={act.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">
                        {act.type === "review" && (
                          <>
                            <Link href={`/companies/${act.company_id}`} className="text-black underline font-semibold">
                              Bir şirket değerlendirmesi yaptı{act.company && ` (${act.company})`}
                            </Link>
                          </>
                        )}
                        {act.type === "post" && (
                          <Link href={`/posts/${act.id}`} className="text-black underline font-semibold">
                            Bir gönderi paylaştı
                          </Link>
                        )}
                        {act.type === "comment" && (
                          <Link href={`/posts/${act.post_id}`} className="text-black underline font-semibold">
                            Bir gönderiye yorum yaptı
                          </Link>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(act.created_at)}</span>
                    </div>
                    <div className="text-gray-800 text-sm mt-1">
                      {act.type === "review" && (
                        <>
                          <span className="font-semibold text-green-700">Olumlu:</span> {act.pros}<br />
                          <span className="font-semibold text-red-700">Olumsuz:</span> {act.cons}
                        </>
                      )}
                      {act.type === "post" && <span>{act.content}</span>}
                      {act.type === "comment" && <span>{act.content}</span>}
                    </div>
                  </div>
                ))}
                {!showAllActivities && activities.length > 3 && (
                  <div className="text-center mt-2">
                    <button className="text-purple-600 hover:underline font-semibold" onClick={() => setShowAllActivities(true)}>
                      Daha fazla görüntüle →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 