"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

interface Post {
  id: string
  content: string
  created_at: string
  user_id: string
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
}

export default function PostDetailPage() {
  const params = useParams()
  const postId = params.id as string
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (postId) {
      fetchPostAndComments()
    }
  }, [postId])

  const fetchPostAndComments = async () => {
    setLoading(true)
    // Gönderiyi çek
    const { data: postData } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id")
      .eq("id", postId)
      .single()
    setPost(postData)
    // Yorumları çek
    const { data: commentData } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
    setComments(commentData || [])
    setLoading(false)
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>
  }

  if (!post) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Gönderi bulunamadı.</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex flex-col items-center py-12 px-2">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Gönderi</h1>
        <div className="mb-4 text-gray-800 text-lg">{post.content}</div>
        <div className="text-sm text-gray-400 mb-6">{formatDate(post.created_at)}</div>
        <hr className="my-4" />
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Yorumlar</h2>
        {comments.length === 0 && <div className="text-gray-500">Henüz yorum yok.</div>}
        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="bg-gray-50 rounded p-3 border border-gray-100">
              <div className="text-gray-800">{comment.content}</div>
              <div className="text-xs text-gray-400 mt-1">{formatDate(comment.created_at)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 