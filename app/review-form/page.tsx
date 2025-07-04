"use client"

import { Separator } from "@/components/ui/separator"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Star, Building2, DollarSign, ThumbsUp, ThumbsDown } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import Navigation from "@/components/navigation"

interface Company {
  id: number
  name: string
}

interface City {
  id: number
  name: string
}

interface Position {
  id: number
  title: string
}

export default function ReviewFormPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    company_id: "",
    city_id: "",
    position_id: "",
    new_position: "",
    salary: "",
    pros: "",
    cons: "",
    overall_rating: [4],
    work_life_balance: [4],
    culture_rating: [4],
    career_opportunities: [4],
    compensation_rating: [4],
    management_rating: [4],
    is_current_employee: true,
    employment_duration: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    checkUser()
    fetchData()
  }, [])

  // Set company from URL parameter
  useEffect(() => {
    const companyParam = searchParams.get('company')
    if (companyParam && companies.length > 0) {
      const company = companies.find(c => c.id.toString() === companyParam)
      if (company) {
        setFormData(prev => ({ ...prev, company_id: company.id.toString() }))
      }
    }
  }, [searchParams, companies])

  // Set company from URL parameter
  useEffect(() => {
    const companyParam = searchParams.get('company')
    if (companyParam && companies.length > 0) {
      setFormData(prev => ({ ...prev, company_id: companyParam }))
    }
  }, [searchParams, companies])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/")
      return
    }
    
    // Check if user exists in users table, if not create it
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single()
    
    if (!existingUser) {
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
      }
    }
    
    // Check if user exists in user_profiles table, if not create it
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .single()
    
    if (!existingProfile) {
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
      }
    }
    
    setUser(user)
  }

  const fetchData = async () => {

    try {
      const [companiesRes, citiesRes, positionsRes] = await Promise.all([
        supabase.from("companies").select("id, name").order("name"),
        supabase.from("cities").select("id, name").order("name"),
        supabase.from("positions").select("id, title").order("title"),
      ])

      if (companiesRes.data) setCompanies(companiesRes.data)
      if (citiesRes.data) setCities(citiesRes.data)
      if (positionsRes.data) setPositions(positionsRes.data)
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.company_id) newErrors.company_id = "Şirket seçimi zorunlu"
    if (!formData.city_id) newErrors.city_id = "Şehir seçimi zorunlu"
    if (!formData.position_id && !formData.new_position) {
      newErrors.position = "Pozisyon seçimi veya yeni pozisyon girişi zorunlu"
    }
    if (!formData.salary) newErrors.salary = "Maaş bilgisi zorunlu"
    if (!formData.pros.trim()) newErrors.pros = "Olumlu yönler zorunlu"
    if (!formData.cons.trim()) newErrors.cons = "Olumsuz yönler zorunlu"
    if (!formData.employment_duration) newErrors.employment_duration = "Çalışma süresi zorunlu"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user) return

    setIsLoading(true)
    try {
      let positionId = formData.position_id

      // Create new position if needed
      if (!positionId && formData.new_position) {
        const { data: newPosition, error: positionError } = await supabase
          .from("positions")
          .insert([{ title: formData.new_position, created_by: user.id }])
          .select()
          .single()

        if (positionError) throw positionError
        positionId = newPosition.id
      }

      // Create review
      const { error: reviewError } = await supabase.from("company_reviews").insert([
        {
          user_id: user.id,
          company_id: Number.parseInt(formData.company_id),
          city_id: Number.parseInt(formData.city_id),
          position_id: Number.parseInt(positionId),
          salary: Number.parseFloat(formData.salary),
          pros: formData.pros,
          cons: formData.cons,
          overall_rating: formData.overall_rating[0],
          work_life_balance: formData.work_life_balance[0],
          culture_rating: formData.culture_rating[0],
          career_opportunities: formData.career_opportunities[0],
          compensation_rating: formData.compensation_rating[0],
          management_rating: formData.management_rating[0],
          is_current_employee: formData.is_current_employee,
          employment_duration: formData.employment_duration,
        },
      ])

      if (reviewError) throw reviewError

      // Update user profile
      await supabase
        .from("user_profiles")
        .update({
          has_reviewed_company: true,
          current_position_id: Number.parseInt(positionId),
        })
        .eq("user_id", user.id)

      // Redirect to company page if company was specified in URL
      const companyParam = searchParams.get('company')
      if (companyParam) {
        router.push(`/companies/${companyParam}`)
      } else {
        router.push("/companies")
      }
    } catch (error: any) {
      setErrors({ general: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const ratingLabels = {
    overall_rating: "Genel Değerlendirme",
    work_life_balance: "İş-Yaşam Dengesi",
    culture_rating: "Şirket Kültürü",
    career_opportunities: "Kariyer Fırsatları",
    compensation_rating: "Maaş & Yan Haklar",
    management_rating: "Yönetim",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Şirket Değerlendirmesi
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Deneyimlerini paylaşarak diğer çalışanlara yardımcı ol. Tüm bilgiler anonim kalacak.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-purple-600" />
                <span>Çalışma Bilgilerin</span>
              </CardTitle>
              <CardDescription>Mevcut veya geçmiş çalışma deneyimin hakkında bilgi ver</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company">Şirket *</Label>
                    <Select
                      value={formData.company_id}
                      onValueChange={(value) => handleInputChange("company_id", value)}
                      disabled={!!searchParams.get('company')}
                    >
                      <SelectTrigger className={errors.company_id ? "border-red-500" : ""}>
                        <SelectValue placeholder="Şirket seç..." />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {searchParams.get('company') && (
                      <p className="text-sm text-blue-600">Şirket URL'den otomatik seçildi</p>
                    )}
                    {errors.company_id && <p className="text-sm text-red-500">{errors.company_id}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Şehir *</Label>
                    <Select value={formData.city_id} onValueChange={(value) => handleInputChange("city_id", value)}>
                      <SelectTrigger className={errors.city_id ? "border-red-500" : ""}>
                        <SelectValue placeholder="Şehir seç..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id.toString()}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.city_id && <p className="text-sm text-red-500">{errors.city_id}</p>}
                  </div>
                </div>

                {/* Position Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">Pozisyon *</Label>
                    <Select
                      value={formData.position_id}
                      onValueChange={(value) => handleInputChange("position_id", value)}
                    >
                      <SelectTrigger className={errors.position ? "border-red-500" : ""}>
                        <SelectValue placeholder="Pozisyon seç..." />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((position) => (
                          <SelectItem key={position.id} value={position.id.toString()}>
                            {position.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_position">Veya Yeni Pozisyon Ekle</Label>
                    <Input
                      id="new_position"
                      placeholder="Örn: Senior Frontend Developer"
                      value={formData.new_position}
                      onChange={(e) => handleInputChange("new_position", e.target.value)}
                      disabled={!!formData.position_id}
                    />
                    {errors.position && <p className="text-sm text-red-500">{errors.position}</p>}
                  </div>
                </div>

                {/* Employment Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="salary">Aylık Maaş (TL) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="salary"
                        type="number"
                        placeholder="15000"
                        value={formData.salary}
                        onChange={(e) => handleInputChange("salary", e.target.value)}
                        className={`pl-10 ${errors.salary ? "border-red-500" : ""}`}
                      />
                    </div>
                    {errors.salary && <p className="text-sm text-red-500">{errors.salary}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Çalışma Süresi *</Label>
                    <Select
                      value={formData.employment_duration}
                      onValueChange={(value) => handleInputChange("employment_duration", value)}
                    >
                      <SelectTrigger className={errors.employment_duration ? "border-red-500" : ""}>
                        <SelectValue placeholder="Süre seç..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-6 ay">0-6 ay</SelectItem>
                        <SelectItem value="6 ay - 1 yıl">6 ay - 1 yıl</SelectItem>
                        <SelectItem value="1-2 yıl">1-2 yıl</SelectItem>
                        <SelectItem value="2-5 yıl">2-5 yıl</SelectItem>
                        <SelectItem value="5+ yıl">5+ yıl</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.employment_duration && <p className="text-sm text-red-500">{errors.employment_duration}</p>}
                  </div>
                </div>

                {/* Current Employee Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="current_employee"
                    checked={formData.is_current_employee}
                    onCheckedChange={(checked) => handleInputChange("is_current_employee", checked)}
                  />
                  <Label htmlFor="current_employee">Halen bu şirkette çalışıyorum</Label>
                </div>

                <Separator className="my-8" />

                {/* Ratings Section */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span>Değerlendirmeler</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(ratingLabels).map(([key, label]) => (
                        <div key={key} className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label>{label}</Label>
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= formData[key as keyof typeof formData][0]
                                      ? "text-yellow-500 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-sm font-medium">
                                {formData[key as keyof typeof formData][0]}/5
                              </span>
                            </div>
                          </div>
                          <Slider
                            value={formData[key as keyof typeof formData] as number[]}
                            onValueChange={(value) => handleInputChange(key, value)}
                            max={5}
                            min={1}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Pros and Cons */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="pros" className="flex items-center space-x-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      <span>Şirketin İyi Yönleri *</span>
                    </Label>
                    <Textarea
                      id="pros"
                      placeholder="Şirketin beğendiğin yönlerini detaylı şekilde anlat..."
                      value={formData.pros}
                      onChange={(e) => handleInputChange("pros", e.target.value)}
                      className={`min-h-[120px] ${errors.pros ? "border-red-500" : ""}`}
                    />
                    {errors.pros && <p className="text-sm text-red-500">{errors.pros}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cons" className="flex items-center space-x-2">
                      <ThumbsDown className="h-4 w-4 text-red-500" />
                      <span>Şirketin Geliştirilmesi Gereken Yönleri *</span>
                    </Label>
                    <Textarea
                      id="cons"
                      placeholder="Şirketin geliştirilmesi gereken yönlerini detaylı şekilde anlat..."
                      value={formData.cons}
                      onChange={(e) => handleInputChange("cons", e.target.value)}
                      className={`min-h-[120px] ${errors.cons ? "border-red-500" : ""}`}
                    />
                    {errors.cons && <p className="text-sm text-red-500">{errors.cons}</p>}
                  </div>
                </div>

                {errors.general && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{errors.general}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-6">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isLoading ? "Gönderiliyor..." : "Değerlendirmeyi Gönder"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
