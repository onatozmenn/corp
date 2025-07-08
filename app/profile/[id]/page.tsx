"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [usersUsername, setUsersUsername] = useState<string>("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  const params = useParams();
  const profileUserId = params.id as string;

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && profileUserId) {
      fetchProfile(profileUserId)
      fetchFollowers(profileUserId)
      fetchActivities(profileUserId)
      checkIfFollowing()
    }
  }, [user, profileUserId])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/")
      return
    }
    setUser(user)
  }

  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, username, avatar_url")
      .eq("user_id", userId)
      .single()
    setProfile(profile)
    fetchLatestReview(userId)
    // Fetch username from users table
    const { data: userRow } = await supabase.from("users").select("username").eq("id", userId).single()
    setUsersUsername(userRow?.username || "")
  }

  const fetchLatestReview = async (userId: string) => {
    const { data: review } = await supabase
      .from("company_reviews")
      .select("position_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    if (review && review.position_id) {
      fetchPosition(review.position_id)
    }
  }

  const fetchPosition = async (positionId: number) => {
    const { data: position } = await supabase
      .from("positions")
      .select("title")
      .eq("id", positionId)
      .single()
    if (position) {
      setPosition(position)
    }
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
    const { count } = await supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", userId)
      .eq("status", "accepted")
    setFollowers(count || 0)
  }

  const fetchActivities = async (userId: string) => {
    const { data: reviews } = await supabase
      .from("company_reviews")
      .select("id, created_at, pros, cons, company_id, companies(name)")
      .eq("user_id", userId)
    const { data: posts } = await supabase
      .from("posts")
      .select("id, created_at, content, user_id, users(username), user_profiles!user_id(avatar_url)")
      .eq("user_id", userId)
    const { data: comments } = await supabase
      .from("comments")
      .select("id, created_at, content, post_id, user_id, users(username), user_profiles!user_id(avatar_url)")
      .eq("user_id", userId)
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
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setActivities(all)
  }

  const checkIfFollowing = async () => {
    if (!user || !profileUserId || user.id === profileUserId) return;
    const { data } = await supabase
      .from("friendships")
      .select("id")
      .eq("requester_id", user.id)
      .eq("addressee_id", profileUserId)
      .eq("status", "accepted")
      .single()
    setIsFollowing(!!data)
  }

  const handleFollow = async () => {
    if (!user || !profileUserId) return;
    setLoadingFollow(true)
    if (isFollowing) {
      // Unfollow
      await supabase
        .from("friendships")
        .delete()
        .eq("requester_id", user.id)
        .eq("addressee_id", profileUserId)
      setIsFollowing(false)
      setFollowers(f => Math.max(0, f - 1))
    } else {
      // Follow
      await supabase
        .from("friendships")
        .insert({ requester_id: user.id, addressee_id: profileUserId, status: "accepted" })
      setIsFollowing(true)
      setFollowers(f => f + 1)
    }
    setLoadingFollow(false)
  }

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

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>
  }

  const isOwnProfile = user && user.id === profileUserId;

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
              </div>
            </div>
          </div>
          {/* Ana içerik */}
          <div className="flex flex-col items-center pt-20 pb-8 px-8 w-full">
            {/* Kullanıcı adı ortada, profil fotoğrafının hemen altında */}
            <h1 className="text-2xl font-extrabold text-gray-900 text-center mt-4">{usersUsername || 'Kullanıcı'}</h1>
            {/* Profili header satırı: Sol = takipçi kutusu, Sağ = Profili Düzenle veya Takip Et butonu */}
            <div className="flex items-center justify-between w-full max-w-xl mx-auto mt-2 mb-2 px-2">
              {/* Takipçi kutusu, her profilde sol altta */}
              <span className="inline-block px-6 py-1 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-white text-base font-semibold shadow">
                {followers} takipçi
              </span>
              <div className="flex-1 flex justify-center">
                {position && (
                  <span className="text-base font-semibold text-gray-700 text-center">{position.title}</span>
                )}
              </div>
              {isOwnProfile ? (
                <button
                  className="px-2.5 py-1.5 rounded-md bg-black text-white font-medium text-sm flex items-center gap-2 shadow hover:bg-gray-800 transition"
                  style={{ minWidth: 80 }}
                  onClick={() => {/* openEditModal burada olmalı, ekle */}}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2a2.828 2.828 0 11-4-4 2.828 2.828 0 014 4z" /></svg>
                  Profili Düzenle
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    className={`px-3.5 py-1.5 rounded-md ${isFollowing ? 'bg-gray-300 text-black' : 'bg-[#32CD32] text-black'} font-medium text-sm shadow hover:bg-green-500 transition`}
                    style={{ minWidth: 70 }}
                    onClick={handleFollow}
                    disabled={loadingFollow}
                  >
                    {isFollowing ? 'Takipten Çık' : 'Takip Et'}
                  </button>
                  <button
                    className="px-3.5 py-1.5 rounded-md bg-purple-600 text-white font-medium text-sm shadow hover:bg-purple-700 transition"
                    style={{ minWidth: 70 }}
                    onClick={async () => {
                      if (!user) return;
                      // Sadece hiç mesaj yoksa boş mesaj gönder
                      const { data: existing } = await supabase
                        .from("messages")
                        .select("id, sender_id, receiver_id")
                        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                        .or(`sender_id.eq.${profileUserId},receiver_id.eq.${profileUserId}`);
                      const alreadyExists = (existing || []).some(
                        (msg: any) =>
                          (msg.sender_id === user.id && msg.receiver_id === profileUserId) ||
                          (msg.sender_id === profileUserId && msg.receiver_id === user.id)
                      );
                      if (!alreadyExists) {
                        await supabase.from("messages").insert({
                          sender_id: user.id,
                          receiver_id: profileUserId,
                          content: "",
                          is_read: false,
                        });
                      }
                      router.push(`/messages?user=${profileUserId}`);
                    }}
                  >
                    Mesaj At
                  </button>
                </div>
              )}
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