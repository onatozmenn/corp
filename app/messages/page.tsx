"use client"

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Navigation from "@/components/navigation";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  position_title?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch conversations: unique users with whom the user has exchanged messages
  const fetchConversations = async (userId: string) => {
    setLoading(true);
    // Get all messages where user is sender or receiver
    const { data: allMessages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (!allMessages) {
      setConversations([]);
      setLoading(false);
      return;
    }
    // Find unique conversation partners
    const partnersMap: Record<string, any> = {};
    for (const msg of allMessages) {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!partnersMap[partnerId]) {
        partnersMap[partnerId] = {
          user_id: partnerId,
          last_message: msg,
        };
      }
    }
    const partnerIds = Object.keys(partnersMap);
    if (partnerIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }
    // Fetch user info for all partners
    // 1. users tablosundan username çek
    const { data: usersData } = await supabase
      .from("users")
      .select("id, username")
      .in("id", partnerIds);
    // 2. user_profiles tablosundan avatar çek
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, avatar_url")
      .in("user_id", partnerIds);
    // Fetch last reviewed position for each partner
    let positionsMap: Record<string, string> = {};
    if (profiles && profiles.length > 0) {
      const { data: reviews } = await supabase
        .from("company_reviews")
        .select("user_id, position_id, created_at")
        .in("user_id", partnerIds)
        .order("created_at", { ascending: false });
      if (reviews) {
        const latestByUser: Record<string, number> = {};
        for (const r of reviews) {
          if (!latestByUser[r.user_id]) latestByUser[r.user_id] = r.position_id;
        }
        const positionIds = Object.values(latestByUser);
        if (positionIds.length > 0) {
          const { data: positions } = await supabase
            .from("positions")
            .select("id, title")
            .in("id", positionIds);
          if (positions) {
            for (const [uid, pid] of Object.entries(latestByUser)) {
              const pos = positions.find((p: any) => p.id === pid);
              if (pos) positionsMap[uid] = pos.title;
            }
          }
        }
      }
    }
    // Merge profiles and last message
    const convs = partnerIds.map(pid => {
      const userObj = usersData?.find((u: any) => u.id === pid);
      const profile = profiles?.find((p: any) => p.user_id === pid);
      return {
        user_id: pid,
        username: userObj?.username || "Kullanıcı",
        avatar_url: profile?.avatar_url || "/placeholder-user.jpg",
        position_title: positionsMap[pid] || undefined,
        last_message: partnersMap[pid].last_message,
      };
    });
    setConversations(convs);
    setLoading(false);
  };

  // Sayfa açıldığında ve yeni mesaj gönderildiğinde conversations fetch et
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchConversations(user.id);
        
        // Real-time mesaj dinleme
        const channel = supabase
          .channel('messages')
          .on('postgres_changes', 
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'messages',
              filter: `sender_id=eq.${user.id} OR receiver_id=eq.${user.id}`
            }, 
            (payload) => {
              console.log('New message received:', payload);
              // Yeni mesaj geldiğinde conversations'ı güncelle
              fetchConversations(user.id);
              
              // Eğer seçili kullanıcıdan mesaj geldiyse, mesajları da güncelle
              if (selectedUser && 
                  (payload.new.sender_id === selectedUser.user_id || 
                   payload.new.receiver_id === selectedUser.user_id)) {
                fetchMessages(selectedUser.user_id);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } else {
        // Kullanıcı giriş yapmamışsa ana sayfaya yönlendir
        router.push("/");
      }
    });
  }, [selectedUser, router]);

  // Yeni mesaj gönderildiğinde conversations'ı güncelle
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !selectedUser) return;
    
    // Mesajı gönder
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedUser.user_id,
      content: input,
      is_read: false,
    });
    
    if (error) {
      console.error('Error sending message:', error);
      return;
    }
    
    // Input'u temizle
    setInput("");
    
    // Mesajı hemen UI'a ekle (optimistic update)
    const newMessage = {
      id: Date.now().toString(), // Geçici ID
      sender_id: user.id,
      receiver_id: selectedUser.user_id,
      content: input,
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Fetch messages with selected user
  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;
    
    // Daha spesifik sorgu - sadece iki kullanıcı arasındaki mesajları çek
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }
    
    // Sadece content'i boş olmayan mesajları filtrele
    const filtered = (data || []).filter(
      (msg: any) => msg.content && msg.content.trim() !== ""
    );
    
    setMessages(filtered);
    
    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Kişi seçilince
  const handleSelectUser = (conv: any) => {
    setSelectedUser(conv);
    fetchMessages(conv.user_id);
  };

  // Kullanıcı arama fonksiyonu
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchLoading(true);
    const { data } = await supabase
      .from("users")
      .select("id, username")
      .ilike("username", `%${search}%`);
    // user_profiles ile avatar çek
    let results = data || [];
    if (results.length > 0) {
      const ids = results.map((u: any) => u.id);
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, avatar_url")
        .in("user_id", ids);
      results = results.map((u: any) => ({
        ...u,
        avatar_url: profiles?.find((p: any) => p.user_id === u.id)?.avatar_url || "/placeholder-user.jpg"
      }));
    }
    setSearchResults(results);
    setSearchLoading(false);
  };

  // Arama sonucundan kişi seçilince
  const handleStartChat = async (userObj: any) => {
    // Eğer zaten listede varsa direkt seç
    const existing = conversations.find(c => c.user_id === userObj.id);
    if (existing) {
      handleSelectUser(existing);
      setSearchResults([]);
      setSearch("");
      return;
    }
    // Yoksa yeni bir sohbet başlat (listeye ekle)
    const newConv: UserProfile = {
      id: userObj.id,
      user_id: userObj.id,
      username: userObj.username,
      avatar_url: userObj.avatar_url,
      position_title: undefined,
    };
    setConversations([newConv, ...conversations]);
    setSelectedUser(newConv);
    setMessages([]);
    setSearchResults([]);
    setSearch("");
  };

  // Tarih formatı
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("tr-TR");
  };

  // URL'den user parametresiyle gelen kişiyi conversations fetch edildikten sonra kesinlikle seçili yap
  useEffect(() => {
    const userParam = searchParams.get("user");
    if (userParam && conversations.length > 0) {
      const existing = conversations.find(c => c.user_id === userParam);
      if (existing && (!selectedUser || selectedUser.user_id !== userParam)) {
        setSelectedUser(existing);
        fetchMessages(existing.user_id);
      }
    }
    // eslint-disable-next-line
  }, [conversations, searchParams]);

  // Mesaj silme fonksiyonu
  const handleDeleteMessage = async (msgId: string) => {
    await supabase.from("messages").delete().eq("id", msgId);
    if (selectedUser) fetchMessages(selectedUser.user_id);
    if (user) fetchConversations(user.id);
  };

  // Tüm konuşmayı silme fonksiyonu
  const handleDeleteConversation = async (partnerId: string) => {
    if (!user) return;
    // Sadece iki kullanıcı arasındaki mesajları sil
    await supabase.from("messages")
      .delete()
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .or(`sender_id.eq.${partnerId},receiver_id.eq.${partnerId}`);
    // Local conversations state'inden çıkar
    setConversations(prev => prev.filter(c => c.user_id !== partnerId));
    if (selectedUser && selectedUser.user_id === partnerId) {
      setSelectedUser(null);
      setMessages([]);
    }
    // Supabase'dan tekrar fetch et
    await fetchConversations(user.id);
  };

  // Kullanıcı giriş yapmamışsa loading göster
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="flex h-[80vh] max-w-4xl mx-auto mt-10 border rounded-lg shadow bg-white overflow-hidden">
        {/* Sol Panel */}
        <div className="w-1/3 border-r bg-gray-50 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">Mesajlar</h2>
            {/* Kullanıcı arama kutusu */}
            <form onSubmit={handleSearch} className="flex gap-2 mt-3 mb-1">
              <input
                type="text"
                className="border px-3 py-2 rounded w-full"
                placeholder="Kullanıcı adı ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="submit" className="bg-purple-600 text-white px-3 py-2 rounded">Ara</button>
            </form>
            {searchLoading && <div className="text-xs text-gray-400 mt-1">Aranıyor...</div>}
            {searchResults.length > 0 && (
              <ul className="bg-white border rounded shadow mt-2 max-h-48 overflow-y-auto z-5 absolute w-72">
                {searchResults.map(u => (
                  <li key={u.id}>
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-purple-50 text-left"
                      onClick={() => handleStartChat(u)}
                    >
                      <img src={u.avatar_url} alt="avatar" className="w-7 h-7 rounded-full object-cover border" />
                      <span className="truncate">{u.username}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-gray-400">Yükleniyor...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-gray-400">Henüz kimseyle mesajlaşmadın.</div>
            ) : (
              conversations.map(conv => (
                <ConversationRow
                  key={conv.user_id}
                  conv={conv}
                  isSelected={selectedUser?.user_id === conv.user_id}
                  onSelect={() => handleSelectUser(conv)}
                  onDelete={() => handleDeleteConversation(conv.user_id)}
                />
              ))
            )}
          </div>
        </div>
        {/* Sağ Panel */}
        <div className="flex-1 flex flex-col">
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">Bir sohbet seçin</div>
          ) : (
            <>
              {/* Üstte kişi bilgisi */}
              <div className="flex items-center gap-4 border-b px-6 py-4 bg-white">
                <Link href={`/profile/${selectedUser.user_id}`} className="flex-shrink-0">
                  <img src={selectedUser.avatar_url} alt="avatar" className="w-12 h-12 rounded-full object-cover border hover:opacity-80 transition" />
                </Link>
                <div>
                  <Link href={`/profile/${selectedUser.user_id}`} className="font-bold text-lg hover:underline">
                    {selectedUser.username}
                  </Link>
                  {selectedUser.position_title && (
                    <div className="text-xs text-gray-500 mt-1">{selectedUser.position_title}</div>
                  )}
                </div>
              </div>
              {/* Mesajlar */}
              <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4">
                {messages.length === 0 ? (
                  <div className="text-gray-400 text-center mt-10">Henüz mesaj yok.</div>
                ) : (
                  messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isOwn={msg.sender_id === user?.id}
                      onDelete={handleDeleteMessage}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              {/* Mesaj yazma kutusu */}
              <form onSubmit={handleSend} className="flex gap-2 border-t px-6 py-4 bg-white">
                <input
                  type="text"
                  className="border px-3 py-2 rounded w-full"
                  placeholder="Mesaj yaz..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded">Gönder</button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function MessageBubble({ msg, isOwn, onDelete }: { msg: any, isOwn: boolean, onDelete: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`mb-2 flex ${isOwn ? "justify-end" : "justify-start"} relative group`}>
      <div className={`px-3 py-2 rounded-lg max-w-xs ${isOwn ? "bg-purple-500 text-white" : "bg-white border"}`}>
        {msg.content}
        <div className="flex items-center justify-end gap-1 mt-1">
          <div className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
          {isOwn && (
            <button
              className="ml-1 text-gray-400 hover:text-black px-1"
              onClick={() => setMenuOpen(v => !v)}
              tabIndex={-1}
            >
              <span style={{ fontSize: 18, fontWeight: "bold" }}>⋯</span>
            </button>
          )}
        </div>
        {menuOpen && isOwn && (
          <div className="absolute right-0 top-8 z-10 bg-white border rounded shadow min-w-[120px] text-sm">
            <button className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-black" onClick={() => { onDelete(msg.id); setMenuOpen(false); }}>Mesajı Sil</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationRow({ conv, isSelected, onSelect, onDelete }: { conv: any, isSelected: boolean, onSelect: () => void, onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`w-full flex items-center gap-3 px-4 py-3 border-b hover:bg-purple-50 transition text-left relative ${isSelected ? "bg-purple-100" : ""}`}
      onClick={onSelect}
    >
      <img src={conv.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover border" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{conv.username}</div>
        <div className="text-xs text-gray-500 truncate">
          {conv.last_message.content.slice(0, 40)}{conv.last_message.content.length > 40 ? "..." : ""}
        </div>
      </div>
      <div className="text-xs text-gray-400 ml-2 whitespace-nowrap">
        {conv.last_message.created_at && new Date(conv.last_message.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <button
        className="ml-2 text-gray-400 hover:text-black px-1 z-10"
        onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
        tabIndex={-1}
      >
        <span style={{ fontSize: 18, fontWeight: "bold" }}>⋯</span>
      </button>
      {menuOpen && (
        <div className="absolute right-2 top-12 z-10 bg-white border rounded shadow min-w-[140px] text-sm">
          <button className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-black" onClick={() => { onDelete(); setMenuOpen(false); }}>Mesajları Sil</button>
        </div>
      )}
    </div>
  );
} 