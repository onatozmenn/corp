"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Home, Building2, Users, MessageCircle, Bell, Search, Settings, LogOut, User, Globe } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"

export default function Navigation() {
  const [user, setUser] = useState<any>(null)
  const [usersUsername, setUsersUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    getUser()
    
    // Kullanıcı adı güncellemelerini dinle
    const handleUsernameUpdate = (event: CustomEvent) => {
      setUsersUsername(event.detail.username);
    };
    
    window.addEventListener('usernameUpdated', handleUsernameUpdate as EventListener);
    
    return () => {
      window.removeEventListener('usernameUpdated', handleUsernameUpdate as EventListener);
    };
  }, [])

  const getUser = async () => {

    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const { data: userRow } = await supabase.from("users").select("username").eq("id", user.id).single();
      const storedUsername = localStorage.getItem('currentUsername');
      setUsersUsername(storedUsername || userRow?.username || "");
      // user_profiles tablosundan avatar_url çek
      const { data: profileRow } = await supabase.from("user_profiles").select("avatar_url").eq("user_id", user.id).single();
      setAvatarUrl(profileRow?.avatar_url || null);
    }
  }

  const handleSignOut = async () => {
    try {
      console.log('Signing out...')
      await supabase.auth.signOut()
      localStorage.removeItem('currentUsername')
      console.log('Signed out successfully')
      
      // Force redirect to home page
      window.location.href = "/"
    } catch (error) {
      console.error('Error signing out:', error)
      // Fallback: force redirect anyway
      window.location.href = "/"
    }
  }

  const navItems = [
    { href: "/", icon: Home, label: "Sosyal" },
    { href: "/companies", icon: Building2, label: "Şirketler" },
    { href: "/messages", icon: MessageCircle, label: "Mesajlar" },
  ]

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-[9999]">
      <div className="container mx-auto px-8">
        <div className="flex items-center h-16 relative">
          {/* Sol: Logo */}
          <div className="flex-1 flex items-center justify-start">
            <Link href="/" className="flex items-center space-x-2">
              <Globe className="h-8 w-8 text-purple-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                CorpOut
              </span>
            </Link>
          </div>
          {/* Orta: Menü */}
          <div className="hidden md:flex items-center space-x-1 absolute left-[59%] -translate-x-1/2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                  pathname === item.href
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    : "text-gray-600 hover:text-purple-600"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
          {/* Sağ: Arama, bildirim, profil */}
          <div className="flex-1 flex items-center justify-end space-x-4">
            {/* Search */}
            <button type="button" className="text-gray-600 hover:text-purple-600 p-2 rounded-full">
              <Search className="h-4 w-4" />
            </button>
            {/* Notifications */}
            <button type="button" className="text-gray-600 hover:text-purple-600 relative p-2 rounded-full">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
            </button>
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl || "/placeholder.svg?height=32&width=32"} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      {(usersUsername?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 z-[10000]" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{usersUsername || "Kullanıcı"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/profile")}> <User className="mr-2 h-4 w-4" /> <span>Profil</span> </DropdownMenuItem>
                <DropdownMenuItem> <Settings className="mr-2 h-4 w-4" /> <span>Ayarlar</span> </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}> <LogOut className="mr-2 h-4 w-4" /> <span>Çıkış Yap</span> </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200 bg-white/90">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-md text-xs font-medium transition ${
                pathname === item.href ? "text-purple-600" : "text-gray-600"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
