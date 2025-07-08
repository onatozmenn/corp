"use client"

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ChatPage() {
  const params = useParams();
  const otherUserId = params.id as string;
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchOtherUser();
      
      // Real-time mesaj dinleme
      const channel = supabase
        .channel('direct-messages')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `sender_id=eq.${user.id} OR receiver_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('New message received:', payload);
            // Yeni mesaj geldiğinde mesajları güncelle
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, otherUserId]);

  const fetchMessages = async () => {
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
    
    setMessages(data || []);
    
    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const fetchOtherUser = async () => {
    const { data } = await supabase.from("users").select("id, username").eq("id", otherUserId).single();
    setOtherUser(data);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    
    // Mesajı gönder
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: otherUserId,
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
      receiver_id: otherUserId,
      content: input,
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="max-w-md mx-auto py-10 flex flex-col h-[80vh]">
      <h1 className="text-xl font-bold mb-4 text-center">{otherUser ? otherUser.username : "Kullanıcı"} ile Mesajlaşma</h1>
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded p-4 mb-2 border">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`mb-2 flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
          >
            <div className={`px-3 py-2 rounded-lg max-w-xs ${msg.sender_id === user?.id ? "bg-purple-500 text-white" : "bg-white border"}`}>
              {msg.content}
              <div className="text-xs text-gray-400 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          className="border px-3 py-2 rounded w-full"
          placeholder="Mesaj yaz..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded">Gönder</button>
      </form>
    </div>
  );
} 