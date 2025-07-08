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
  Star,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"
import { useSearchParams } from "next/navigation"
import React from "react"
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

interface Post {
  id: string
  user_id: string
  content: string
  image_url?: string
  video_url?: string
  likes_count: number
  comments_count: number
  created_at: string
  users: {
    username: string
  }
  position_title?: string // eklendi
}

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  users: {
    username: string
  }
}

const features = [
  {
    title: "Anonim Paylaşım",
    description: "Deneyimlerini özgürce ve anonim olarak paylaşabilirsin.",
    icon: Globe,
  },
  {
    title: "Şirket İncelemeleri",
    description: "Çalıştığın veya başvurduğun şirketler hakkında bilgi al.",
    icon: Users,
  },
  {
    title: "Puanlama Sistemi",
    description: "Şirketleri ve pozisyonları puanlayarak topluluğa katkı sağla.",
    icon: Star,
  },
];

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userStats, setUserStats] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
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
  const [usersUsername, setUsersUsername] = useState("");
  // Yeni: Beğenen kullanıcılar için state
  const [likers, setLikers] = useState<Record<string, any[]>>({});
  const [showLikersPopup, setShowLikersPopup] = useState<string | null>(null);
  // Yorum emojileri için state
  const [commentLikers, setCommentLikers] = useState<Record<string, any[]>>({});
  // Yeni: Emoji hover menüsü için state
  const [showEmojiMenu, setShowEmojiMenu] = useState<string | null>(null);
  const [showCommentEmojiMenu, setShowCommentEmojiMenu] = useState<string | null>(null);
  const [commentReactionFilter, setCommentReactionFilter] = useState<Record<string, string>>(/* commentId: emojiKey */{});
  const [showCommentBox, setShowCommentBox] = useState<Record<string, boolean>>({});
  const emojiMenuTimeout = useRef<NodeJS.Timeout | null>(null);
  const [loadingComments, setLoadingComments] = useState({});

  // Nested comment için state
  const [replyTo, setReplyTo] = useState<{ postId: string, parentId: string | null } | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

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
        const storedUsername = localStorage.getItem('currentUsername');
        
        // Eğer localStorage'da geçerli bir kullanıcı adı varsa modal'ı açma
        if (storedUsername && !storedUsername.startsWith("user_")) {
          setShowUsernameModal(false)
        } else if (!userRow || !userRow.username || userRow.username.startsWith("user_")) {
          setShowUsernameModal(true)
          // Modal açıldığında localStorage'dan kullanıcı adını yükle
          if (storedUsername && !storedUsername.startsWith("user_")) {
            setUsernameInput(storedUsername);
          }
          // Input'a focus ol
          setTimeout(() => {
            usernameInputRef.current?.focus();
          }, 100);
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
    
    // State'i güncelle - bu çok önemli!
    setCurrentUsername(username)
    setUsersUsername(username)
    setShowUsernameModal(false)
    
    // LocalStorage'a kaydet (navigation için)
    localStorage.setItem('currentUsername', username)
    
    // Kullanıcı istatistiklerini yeniden çek
    if (user) {
      fetchUserStats(user.id)
    }
    
    // Navigation'ı yeniden yükle (kullanıcı adı güncellemesi için)
    // Sayfa yenilemek yerine sadece navigation'ı güncelle
    const navigationElement = document.querySelector('nav');
    if (navigationElement) {
      // Navigation'ı yeniden render et
      const event = new CustomEvent('usernameUpdated', { detail: { username } });
      window.dispatchEvent(event);
    }
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
        const storedUsername = localStorage.getItem('currentUsername');
        setCurrentUsername(storedUsername || userRow?.username || "");
        setUsersUsername(storedUsername || userRow?.username || "");
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
      // Takipçi: addressee_id = userId, status = accepted
      const { count: followersCount } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", userId)
        .eq("status", "accepted")
      // Takip edilen: requester_id = userId, status = accepted
      const { count: followingCount } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("requester_id", userId)
        .eq("status", "accepted")
      setUserStats({
        postsCount: postsData?.length || 0,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
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
      // Her post için ilgili kullanıcının en son değerlendirmesindeki pozisyonu çek
      const postsWithPosition = await Promise.all((data || []).map(async (post: any) => {
        const { data: review } = await supabase
          .from("company_reviews")
          .select("position_id")
          .eq("user_id", post.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
        let positionTitle = "";
        if (review?.position_id) {
          const { data: position } = await supabase
            .from("positions")
            .select("title")
            .eq("id", review.position_id)
            .single()
          positionTitle = position?.title || "";
        }
        return { ...post, position_title: positionTitle };
      }));
      setPosts(postsWithPosition)
      // Her post için likers bilgisini çek
      postsWithPosition.forEach(post => {
        fetchLikers(post.id);
      });
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
        .select("id, user_id, content, created_at, parent_id, users(username), user_profiles!user_id(avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
      if (error) throw error
      setComments(prev => ({ ...prev, [postId]: data || [] }))
    } catch (error) {
      console.error("Error fetching comments:", error)
    }
  }

  // Yorumları ağaç yapısına dönüştür
  function buildCommentTree(commentsArr: Comment[]) {
    const map: Record<string, Comment> = {};
    const roots: Comment[] = [];
    commentsArr.forEach(c => { map[c.id] = { ...c, children: [] }; });
    commentsArr.forEach(c => {
      if (c.parent_id && c.parent_id !== '' && c.parent_id !== 'undefined') {
        map[c.parent_id]?.children.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    return roots;
  }

  // Yorumları recursive render eden component
  const CommentNode = React.memo(function CommentNode({ comment, postId, level = 0 }: { comment: Comment, postId: string, level?: number }) {
    const replyInputRef = React.useRef<HTMLTextAreaElement>(null);
    React.useEffect(() => {
      if (replyTo && replyTo.postId === postId && replyTo.parentId === comment.id) {
        replyInputRef.current?.focus();
      }
    }, [replyTo, postId, comment.id]);
    return (
      <div style={{ marginLeft: level * 24 }} className="mb-2 w-full min-w-0 flex-1">
        <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg w-full min-w-0 flex-1">
          <Link href={`/profile/${comment.user_id}`} className="flex items-center group cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.user_profiles?.avatar_url || "/placeholder-user.jpg"} />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs">
                {comment.users?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm group-hover:text-purple-700 transition-colors">{comment.users.username}</p>
              <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
            </div>
          </Link>
          <div className="flex-1">
            {user && comment.user_id === user.id && (
              <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 ml-2" onClick={() => deleteComment(comment.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
            <div className="flex space-x-2 mt-1 items-center">
              {/* YORUM BEĞENİ BUTONU (CommentNode içinde) */}
              {/* YORUM BEĞENİ BUTONU VE EMOJI MENÜSÜ */}
              <div
                className="relative group"
                onMouseEnter={() => { setShowCommentEmojiMenu(comment.id); setShowEmojiMenu(null); }}
                onMouseLeave={() => setShowCommentEmojiMenu(null)}
              >
                <Button
                  variant="ghost"
                  size="xs"
                  className={`text-xs flex items-center ${((commentLikers[comment.id] || []).find(l => l.user_id === user?.id)) ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'}`}
                  onClick={() => {
                    const userLike = (commentLikers[comment.id] || []).find(l => l.user_id === user?.id);
                    if (userLike) {
                      reactToCommentWithEmoji(comment.id, userLike.emoji); // Unlike
                    } else {
                      reactToCommentWithEmoji(comment.id, 'like'); // Default 👍
                    }
                  }}
                >
                  {(() => {
                    const userLike = (commentLikers[comment.id] || []).find(l => l.user_id === user?.id);
                    const emojiObj = EMOJIS.find(e => e.key === userLike?.emoji);
                    return <span className="mr-1 text-lg">{emojiObj ? emojiObj.symbol : '👍'}</span>;
                  })()}
                  {((commentLikers[comment.id] || []).find(l => l.user_id === user?.id)) ? 'Beğenildi' : 'Beğen'}
                </Button>
                {showCommentEmojiMenu === comment.id && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg flex space-x-1 px-2 py-1 z-20 border pointer-events-auto">
                    {EMOJIS.map(e => (
                      <button
                        key={e.key}
                        className="text-lg hover:scale-125 transition-transform"
                        onClick={ev => { ev.stopPropagation(); reactToCommentWithEmoji(comment.id, e.key); setShowCommentEmojiMenu(null); fetchCommentLikers(comment.id); }}
                      >
                        {e.symbol}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="xs" className="text-xs" onClick={() => setReplyTo({ postId, parentId: comment.id })}>Yanıtla</Button>
              {/* Reaksiyonlar */}
              <div className="flex items-center cursor-pointer ml-2" onClick={() => fetchCommentLikers(comment.id)}>
                {EMOJIS.map(e => {
                  const count = (commentLikers[comment.id] || []).filter(l => l.emoji === e.key).length;
                  return count > 0 ? <span key={e.key} className="text-base mr-0.5">{e.symbol}</span> : null;
                })}
                <span className="text-xs text-gray-500 ml-1">{(commentLikers[comment.id] || []).length > 0 ? (commentLikers[comment.id] || []).length : ''}</span>
              </div>
            </div>
            {/* Yanıt formu */}
            {replyTo && replyTo.postId === postId && replyTo.parentId === comment.id && (
              <div className="flex space-x-2 mt-2 w-full min-w-0 flex-1" dir="ltr" style={{ direction: 'ltr' }}>
                <Textarea
                  ref={replyInputRef}
                  dir="ltr"
                  style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}
                  placeholder="Yanıt yaz..."
                  value={replyInputs[comment.id] || ""}
                  onChange={e => setReplyInputs(prev => ({ ...prev, [comment.id]: e.target.value }))}
                  className="block flex-1 min-h-[40px] resize-none w-full min-w-0 text-left font-sans"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  autoComplete="off"
                />
                <Button
                  onClick={() => addComment({ postId, content: replyInputs[comment.id], parentId: comment.id })}
                  disabled={!replyInputs[comment.id]?.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        {/* Alt yorumlar */}
        {comment.children?.length > 0 && comment.children.map(child => (
          <CommentNode key={child.id} comment={child} postId={postId} level={level + 1} />
        ))}
      </div>
    );
  });

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

  // Yeni: Beğenen kullanıcıları çek
  const fetchLikers = async (postId: string) => {
    const { data, error } = await supabase
      .from("likes")
      .select("user_id, emoji, users(username)")
      .eq("post_id", postId);
    if (!error) {
      setLikers(prev => ({ ...prev, [postId]: data || [] }));
    }
  };

  // Emoji seçenekleri
  const EMOJIS = [
    { key: 'like', symbol: '👍' },
    { key: 'love', symbol: '❤️' },
    { key: 'funny', symbol: '😂' },
    { key: 'wow', symbol: '😮' },
    { key: 'clap', symbol: '👏' },
  ];

  // Emoji ile like atma/güncelleme fonksiyonu
  const reactWithEmoji = async (postId: string, emoji: string) => {
    if (!user) return;
    // Kullanıcının mevcut like'ı var mı ve hangi emojiyle?
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id, emoji")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingLike) {
      if (existingLike.emoji === emoji) {
        // Aynı emojiye tekrar tıklarsa like'ı kaldır
        await supabase.from("likes").delete().eq("id", existingLike.id);
      } else {
        // Farklı emojiye tıklarsa güncelle
        await supabase.from("likes").update({ emoji }).eq("id", existingLike.id);
      }
    } else {
      // Hiç like yoksa yeni ekle
      await supabase.from("likes").insert({ post_id: postId, user_id: user.id, emoji });
    }
    fetchLikers(postId); // HEMEN güncelle
  };

  // Nested comment ekleme fonksiyonu
  type AddCommentArgs = { postId: string, content: string, parentId?: string };
  const addComment = async ({ postId, content, parentId }: AddCommentArgs) => {
    if (!user || !content.trim()) return;
    try {
      const { error } = await supabase.from("comments").insert([
        {
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId || null,
        },
      ]);
      if (error) throw error;
      setNewComments(prev => ({ ...prev, [postId]: "" }));
      if (parentId) setReplyInputs(prev => ({ ...prev, [parentId]: "" }));
      // Sadece başarılı şekilde yanıt gönderilirse replyTo'yu kapat
      if (parentId) setReplyTo(null);
      fetchComments(postId);
    } catch (error) {
      console.error("Error adding comment:", error);
      // Hata olursa replyTo'yu kapatma
    }
  };

  // Yorum için beğenenleri çek
  const fetchCommentLikers = async (commentId: string) => {
    const { data, error } = await supabase
      .from("comment_likes")
      .select("user_id, emoji")
      .eq("comment_id", commentId);
    if (!error) {
      setCommentLikers(prev => ({ ...prev, [commentId]: data || [] }));
    }
  };

  // Yorum için emoji ile like atma/güncelleme fonksiyonu
  const reactToCommentWithEmoji = async (commentId: string, emoji: string) => {
    if (!user) return;
    const { data: existingLike } = await supabase
      .from("comment_likes")
      .select("id, emoji")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingLike) {
      if (existingLike.emoji === emoji) {
        await supabase.from("comment_likes").delete().eq("id", existingLike.id);
      } else {
        await supabase.from("comment_likes").update({ emoji }).eq("id", existingLike.id);
      }
    } else {
      await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id, emoji });
    }
    fetchCommentLikers(commentId);
  };

  // Yorumlar ilk render edildiğinde beğeni sayılarını çek
  useEffect(() => {
    Object.values(comments).flat().forEach(comment => {
      if (comment && comment.id) fetchCommentLikers(comment.id);
    });
  }, [comments]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    if (diffInHours < 1) return "Az önce"
    if (diffInHours < 24) return `${diffInHours} saat önce`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} gün önce`
    return date.toLocaleDateString("tr-TR")
  }

  // Paylaş fonksiyonu
  const sharePost = (postId: string) => {
    const postUrl = `${window.location.origin}/posts/${postId}`;
    if (navigator.share) {
      navigator.share({
        title: 'CorpOut Gönderisi',
        text: 'Bu gönderiyi kontrol et!',
        url: postUrl,
      });
    } else {
      // Fallback: URL'yi panoya kopyala
      navigator.clipboard.writeText(postUrl).then(() => {
        alert('Gönderi linki panoya kopyalandı!');
      });
    }
  }

  const commentTrees = React.useMemo(() => {
    const trees: Record<string, Comment[]> = {};
    Object.entries(comments).forEach(([postId, commentArr]) => {
      trees[postId] = buildCommentTree(commentArr || []);
    });
    return trees;
  }, [comments]);

  const [topCompanies, setTopCompanies] = useState<any[]>([]);

  useEffect(() => {
    // En iyi şirketleri çek
    const fetchTopCompanies = async () => {
      // Supabase client'ı oluştur
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);
      // Şirketleri ve review'ları çek
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, logo_url");
      if (!companies) return;
      // Her şirketin ortalama puanını çek
      const companiesWithRatings = await Promise.all(
        companies.map(async (company: any) => {
          const { data: reviews } = await supabase
            .from("company_reviews")
            .select("overall_rating")
            .eq("company_id", company.id);
          const reviewCount = reviews?.length || 0;
          const averageRating = reviewCount > 0 ? (reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviewCount) : 0;
          return { ...company, averageRating, reviewCount };
        })
      );
      // En yüksek puanlı 5 şirketi sırala
      const sorted = companiesWithRatings
        .filter(c => c.reviewCount > 0)
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 5);
      setTopCompanies(sorted);
    };
    fetchTopCompanies();
  }, []);

  // Profil kutusu için state
  const [profile, setProfile] = useState<any>(null);
  const [positionTitle, setPositionTitle] = useState<string>("");

  useEffect(() => {
    const fetchProfileAndPosition = async () => {
      // Giriş yapan kullanıcıyı al
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Profilini çek
      const { data: profileRow } = await supabase
        .from("user_profiles")
        .select("avatar_url, username, current_position_id")
        .eq("user_id", user.id)
        .single();
      setProfile(profileRow);
      // Pozisyonu çek
      if (profileRow?.current_position_id) {
        const { data: pos } = await supabase
          .from("positions")
          .select("title")
          .eq("id", profileRow.current_position_id)
          .single();
        setPositionTitle(pos?.title || "");
      } else {
        setPositionTitle("");
      }
    };
    fetchProfileAndPosition();
  }, []);

  useEffect(() => {
    const handleClickOrScroll = () => setReplyTo(null);
    window.addEventListener('click', handleClickOrScroll);
    window.addEventListener('scroll', handleClickOrScroll);
    return () => {
      window.removeEventListener('click', handleClickOrScroll);
      window.removeEventListener('scroll', handleClickOrScroll);
    };
  }, []);

  useEffect(() => {
    posts.forEach(post => {
      if (showCommentBox[post.id] && !comments[post.id] && !loadingComments[post.id]) {
        setLoadingComments(prev => ({ ...prev, [post.id]: true }));
        fetchComments(post.id).then(() => {
          setLoadingComments(prev => ({ ...prev, [post.id]: false }));
        });
      }
    });
  }, [posts, showCommentBox, comments, loadingComments]);

  // Giriş (Sign In) fonksiyonu
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        setErrors({ general: error.message });
      } else {
        // Başarılı girişte sayfayı yenile veya kullanıcıyı state'e ata
        window.location.reload();
      }
    } catch (err: any) {
      setErrors({ general: err.message || "Bir hata oluştu" });
    } finally {
      setAuthLoading(false);
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
            onFocus={() => {
              // Eğer localStorage'da kullanıcı adı varsa input'a yükle
              const storedUsername = localStorage.getItem('currentUsername');
              if (storedUsername && !storedUsername.startsWith("user_")) {
                setUsernameInput(storedUsername);
              }
            }}
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
      <div className="max-w-7xl mx-auto flex gap-8 px-4 py-8">
        {/* Sol sticky alan */}
        <div className="hidden lg:block w-full max-w-xs">
          <div className="sticky top-24 flex flex-col gap-6">
            {/* Dinamik Profil Kutusu */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100 flex flex-col items-center">
              <Link href="/profile" className="flex flex-col items-center group cursor-pointer">
                <img src={profile?.avatar_url || "/placeholder-user.jpg"} alt="Profil Fotoğrafı" className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-purple-200 shadow group-hover:scale-105 transition-transform" />
                <div className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">{usersUsername || "Kullanıcı"}</div>
              </Link>
              {positionTitle && (
                <div className="text-sm text-gray-700 mb-1 text-center">{positionTitle}</div>
              )}
            </div>
            {/* En iyi 5 şirket kutusu aşağıda */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-purple-100 flex flex-col items-center w-full">
              <h3 className="text-lg font-bold text-purple-700 mb-4 text-center">En yüksek puana sahip 5 şirket</h3>
              {topCompanies.length === 0 && <div className="text-gray-400 text-sm text-center">Yükleniyor...</div>}
              <ul className="space-y-4 w-full">
                {topCompanies.map((company, idx) => (
                  <li key={company.id} className="flex flex-row items-center gap-3 w-full min-h-[48px]">
                    <span className="text-lg font-bold text-purple-500 w-6 text-center">{idx + 1}</span>
                    <Link href={`/companies/${company.id}`} className="flex items-center gap-2 flex-1 min-w-0 group">
                      <img src={company.logo_url || "/placeholder-logo.png"} alt={company.name} className="h-10 w-10 rounded bg-gray-100 object-contain border group-hover:scale-105 transition-transform flex-shrink-0" />
                      <span className="font-semibold text-gray-800 text-sm group-hover:text-purple-700 transition-colors text-left break-words">{company.name}</span>
                    </Link>
                    <div className="flex flex-col items-end min-w-[60px]">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                        <span className="text-sm font-medium text-gray-700">{company.averageRating.toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-gray-400 mt-0.5">{company.reviewCount} değerlendirme</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        {/* Ana içerik */}
        <div className="flex-1 max-w-2xl mx-auto">
        {/* Welcome Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    Hoş geldin, {usersUsername || "Kullanıcı"}! 👋
                  </h1>
                  <p className="text-white/90">Bugün hangi deneyimini paylaşmak istiyorsun?</p>
                </div>
                <div className="hidden md:flex space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{userStats.followersCount}</div>
                    <div className="text-sm text-white/80">Takipçi</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{userStats.followingCount}</div>
                    <div className="text-sm text-white/80">Takip Edilen</div>
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
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">{user?.user_metadata?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{currentUsername || "Kullanıcı"}</p>
                  <p className="text-sm text-gray-500">Bir şeyler paylaş...</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Textarea placeholder="Bugün neler yaşadın? Deneyimlerini anonim olarak paylaş..." value={newPost} onChange={(e) => setNewPost(e.target.value)} className="min-h-[100px] border-0 bg-gray-50 resize-none focus:ring-2 focus:ring-purple-500" onFocus={() => setReplyTo(null)} />
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
            {posts.map((post, index) => {
              const commentTree = commentTrees[post.id] || [];
              return (
            <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + index * 0.1 }}>
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Link href={`/profile/${post.user_id}`} className="flex items-center group cursor-pointer">
                        <Avatar>
                          <AvatarImage src={"/placeholder-user.jpg"} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                            {post.users?.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div>
                        <p className="font-semibold group-hover:text-purple-700 transition-colors">{post.users.username}</p>
                        {post.position_title && (
                          <p className="text-xs text-gray-500">{post.position_title}</p>
                        )}
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
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex w-full">
                          {/* Beğen (hover ile emoji menüsü) */}
                          <div
                            className="relative inline-block"
                            onMouseEnter={() => {
                              if (emojiMenuTimeout.current) clearTimeout(emojiMenuTimeout.current);
                              setShowEmojiMenu(post.id);
                            }}
                            onMouseLeave={() => {
                              emojiMenuTimeout.current = setTimeout(() => setShowEmojiMenu(null), 120);
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`flex-1 flex items-center justify-center ${((likers[post.id] || []).find(l => l.user_id === user?.id)) ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'}`}
                              onClick={() => {
                                const userLike = (likers[post.id] || []).find(l => l.user_id === user?.id);
                                if (userLike) {
                                  // Beğeniyi geri çek (unlike)
                                  reactWithEmoji(post.id, userLike.emoji);
                                } else {
                                  // Hemen default emojiyle beğen
                                  reactWithEmoji(post.id, 'like');
                                }
                              }}
                            >
                              {(() => {
                                const userLike = (likers[post.id] || []).find(l => l.user_id === user?.id);
                                const emojiObj = EMOJIS.find(e => e.key === userLike?.emoji);
                                return <span className="mr-1 text-lg">{emojiObj ? emojiObj.symbol : '👍'}</span>;
                              })()}
                              {((likers[post.id] || []).find(l => l.user_id === user?.id)) ? 'Beğenildi' : 'Beğen'}
                      </Button>
                            {showEmojiMenu === post.id && (
                              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg flex space-x-2 px-4 py-2 z-20 border">
                                {EMOJIS.map(e => (
                                  <button
                                    key={e.key}
                                    className="text-2xl hover:scale-125 transition-transform"
                                    onClick={ev => { ev.stopPropagation(); reactWithEmoji(post.id, e.key); setShowEmojiMenu(null); fetchLikers(post.id); }}
                                  >
                                    {e.symbol}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Yorum Yap */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 flex items-center justify-center text-gray-600 hover:text-blue-600"
                            onClick={() => {
                              setReplyTo(null);
                              setShowCommentBox(prev => ({ ...prev, [post.id]: !prev[post.id] }));
                              if (!comments[post.id]) fetchComments(post.id);
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" /> Yorum Yap
                      </Button>
                          {/* Paylaş */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 flex items-center justify-center text-gray-600 hover:text-green-600"
                            onClick={() => sharePost(post.id)}
                          >
                            <Share className="h-4 w-4 mr-1" /> Paylaş
                      </Button>
                    </div>
                  </div>
                      {/* Reaksiyonlar ve yorum sayısı */}
                      <div className="flex items-center justify-between space-x-4 mt-2">
                        {/* Beğeni kısmı LinkedIn tarzı */}
                        <div className="flex items-center cursor-pointer" onClick={() => { fetchLikers(post.id); setShowLikersPopup(post.id); }}>
                          {/* En çok kullanılan 3 emoji */}
                          {(() => {
                            const emojiCounts = EMOJIS.map(e => ({
                              ...e,
                              count: (likers[post.id] || []).filter(l => l.emoji === e.key).length
                            })).filter(e => e.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
                            return emojiCounts.map(e => <span key={e.key} className="text-lg mr-0.5">{e.symbol}</span>);
                          })()}
                          {/* İlk beğenenin adı ve diğer kişi sayısı */}
                          {(() => {
                            const likersArr = likers[post.id] || [];
                            if (likersArr.length === 0) return null;
                            // İlk beğenenin adı
                            const firstLiker = likersArr[0]?.users?.username || 'Bir kullanıcı';
                            // Diğer kişi sayısı
                            const others = likersArr.length - 1;
                            return (
                              <span className="text-sm text-gray-700 ml-1">
                                {firstLiker}{others > 0 ? ` ve ${others} diğer kişi` : ''}
                              </span>
                            );
                          })()}
                              </div>
                        {/* Yorum sayısı sağda, tıklanınca yorum kutusu açılır */}
                        <div className="text-sm text-gray-500 cursor-pointer" onClick={() => { setShowCommentBox(prev => ({ ...prev, [post.id]: true })); if (!comments[post.id]) fetchComments(post.id); }}>
                          {post.comments_count} yorum
                            </div>
                          </div>
                      {/* Yorum kutusu ve yorumlar */}
                      {showCommentBox[post.id] ? (
                        loadingComments[post.id] ? (
                          <div className="mt-4 text-center text-gray-400 text-sm">Yorumlar yükleniyor...</div>
                        ) : (() => {
                          const allComments = comments[post.id] || [];
                          const commentTree = buildCommentTree(allComments);
                          return (
                            <div className="mt-4 space-y-4">
                              <Separator />
                              <div className="space-y-3">
                                {commentTree.length > 0 && commentTree.map(comment => (
                                  <CommentNode key={comment.id} comment={comment} postId={post.id} />
                                ))}
                              </div>
                              {/* Add Comment (root) */}
                              <div className="flex space-x-2 w-full min-w-0 flex-1" dir="ltr" style={{ direction: 'ltr' }}>
                                <Textarea
                                  dir="ltr"
                                  style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}
                                  placeholder="Yorum ekle..."
                                  value={newComments[post.id] || ""}
                                  onChange={e => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  onFocus={() => setReplyTo(null)}
                                  className="block flex-1 min-h-[40px] resize-none w-full min-w-0 text-left font-sans"
                                  autoCorrect="off"
                                  autoCapitalize="off"
                                  spellCheck={false}
                                  autoComplete="off"
                                />
                                <Button 
                                  onClick={() => addComment({ postId: post.id, content: newComments[post.id] })}
                                  disabled={!newComments[post.id]?.trim()}
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        // Yorum kutusu kapalıysa sadece en yeni 2 root yorumu ve onların altlarını göster
                        (() => {
                          if (!comments[post.id] && post.comments_count > 0) {
                            return null;
                          }
                          const allComments = comments[post.id] || [];
                          if (allComments.length === 0) return null;
                          // Sadece root (parent_id olmayan) yorumları sırala
                          const rootComments = allComments.filter(c => !c.parent_id);
                          // En yeni 2 root yorumu al
                          const visibleRootComments = rootComments.slice(-2);
                          // Alt yanıtlarıyla birlikte CommentNode ile göster
                          const commentTree = buildCommentTree(allComments);
                          // Sadece visibleRootComments'teki id'lere sahip rootları ve altlarını göster
                          const visibleTree = commentTree.filter(c => visibleRootComments.some(v => v.id === c.id));
                          const hasMoreComments = rootComments.length > 2;
                          return (
                            <div className="mt-4 space-y-3">
                              {visibleTree.map(comment => (
                                <CommentNode key={comment.id} comment={comment} postId={post.id} />
                              ))}
                              {hasMoreComments && (
                                <div className="text-center pt-2">
                                  <button 
                                    className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                                    onClick={() => {
                                      setShowCommentBox(prev => ({ ...prev, [post.id]: true }));
                                    }}
                                  >
                                    {rootComments.length - 2} yorum daha gör
                                  </button>
                    </div>
                              )}
                            </div>
                          );
                        })()
                  )}
                </CardContent>
              </Card>
            </motion.div>
              );
            })}
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
        {/* Likers Popup */}
        {showLikersPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setShowLikersPopup(null)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 min-w-[300px] max-w-xs" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4">Reaksiyonlar</h3>
              <div className="flex space-x-2 mb-4">
                <button onClick={() => setCommentReactionFilter(prev => ({ ...prev, [showLikersPopup]: '' }))} className={`px-2 py-1 rounded ${!commentReactionFilter[showLikersPopup] ? 'bg-purple-100' : ''}`}>Tümü</button>
                {EMOJIS.map(e => (
                  <button key={e.key} onClick={() => setCommentReactionFilter(prev => ({ ...prev, [showLikersPopup]: e.key }))} className={`px-2 py-1 rounded ${commentReactionFilter[showLikersPopup] === e.key ? 'bg-purple-200' : ''}`}>{e.symbol}</button>
                ))}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(likers[showLikersPopup] || []).filter(l => !commentReactionFilter[showLikersPopup] || l.emoji === commentReactionFilter[showLikersPopup]).length === 0 && <p className="text-gray-500 text-sm">Henüz beğeni yok.</p>}
                {(likers[showLikersPopup] || []).filter(l => !commentReactionFilter[showLikersPopup] || l.emoji === commentReactionFilter[showLikersPopup]).map(liker => (
                  <div key={liker.user_id} className="flex items-center space-x-2">
                    <Avatar className="h-7 w-7"><AvatarFallback>{liker.users?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback></Avatar>
                    <span className="font-medium text-gray-800">{liker.users?.username || "Kullanıcı"}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-4 w-full" onClick={() => setShowLikersPopup(null)}>Kapat</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}