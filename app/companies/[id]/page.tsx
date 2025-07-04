"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  Building2, 
  MapPin, 
  Users, 
  Star, 
  TrendingUp, 
  ArrowLeft,
  Calendar,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Globe,
  Phone,
  Mail,
  ExternalLink
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"
import Navigation from "@/components/navigation"

interface Company {
  id: number
  name: string
  logo_url?: string
  description?: string
  website?: string
  industry?: string
  employee_count?: string
  founded_year?: number
  city_id?: number
  cities?: {
    name: string
  }
}

interface Review {
  id: string
  pros: string
  cons: string
  overall_rating: number
  work_life_balance: number
  culture_rating: number
  career_opportunities: number
  compensation_rating: number
  management_rating: number
  salary: number
  is_current_employee: boolean
  employment_duration: string
  created_at: string
  users: {
    username: string
  }
  positions: {
    title: string
  }
  cities: {
    name: string
  }
}

interface CompanyStats {
  totalReviews: number
  averageRating: number
  averageSalary: number
  currentEmployees: number
  formerEmployees: number
  topPositions: string[]
  ratingBreakdown: {
    [key: number]: number
  }
}

export default function CompanyPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [hasReviewedThisCompany, setHasReviewedThisCompany] = useState(false)
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string
  const [positionFilter, setPositionFilter] = useState<string>("")
  const [cityFilter, setCityFilter] = useState<string>("")
  const [salarySort, setSalarySort] = useState<string>("")

  useEffect(() => {
    checkUser()
    fetchCompanyData()
  }, [companyId])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/")
      return
    }
    setUser(user)

    // Check if user has reviewed this specific company
    const { data: userReview } = await supabase
      .from("company_reviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", parseInt(companyId))
      .single()

    setHasReviewedThisCompany(!!userReview)
  }

  const fetchCompanyData = async () => {
    try {
      // Fetch company details
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select(`
          *,
          cities (name)
        `)
        .eq("id", parseInt(companyId))
        .single()

      if (companyError) throw companyError
      setCompany(companyData)

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("company_reviews")
        .select(`
          *,
          users (username),
          positions (title),
          cities (name)
        `)
        .eq("company_id", parseInt(companyId))
        .order("created_at", { ascending: false })

      if (reviewsError) throw reviewsError
      setReviews(reviewsData || [])

      // Calculate stats
      if (reviewsData && reviewsData.length > 0) {
        const totalReviews = reviewsData.length
        const averageRating = reviewsData.reduce((sum, review) => sum + review.overall_rating, 0) / totalReviews
        const averageSalary = reviewsData.reduce((sum, review) => sum + (review.salary || 0), 0) / totalReviews
        const currentEmployees = reviewsData.filter(review => review.is_current_employee).length
        const formerEmployees = totalReviews - currentEmployees

        // Get top positions
        const positionCounts: { [key: string]: number } = {}
        reviewsData.forEach(review => {
          const position = review.positions?.title || "Bilinmiyor"
          positionCounts[position] = (positionCounts[position] || 0) + 1
        })
        const topPositions = Object.entries(positionCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([position]) => position)

        // Rating breakdown
        const ratingBreakdown: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        reviewsData.forEach(review => {
          ratingBreakdown[review.overall_rating]++
        })

        setStats({
          totalReviews,
          averageRating,
          averageSalary,
          currentEmployees,
          formerEmployees,
          topPositions,
          ratingBreakdown
        })
      }
    } catch (error) {
      console.error("Error fetching company data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("tr-TR", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    })
  }

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary)
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ))
  }

  // Filtrelenmiş ve sıralanmış review listesi
  const filteredReviews = reviews
    .filter(r => (positionFilter ? r.positions?.title === positionFilter : true))
    .filter(r => (cityFilter ? r.cities?.name === cityFilter : true))
    .sort((a, b) => {
      if (salarySort === "asc") return (a.salary || 0) - (b.salary || 0)
      if (salarySort === "desc") return (b.salary || 0) - (a.salary || 0)
      return 0
    })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-600">Şirket bulunamadı</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push("/companies")}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Şirketlere Dön
          </Button>
        </motion.div>

        {/* Company Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <CardContent className="p-8">
              <div className="flex items-start space-x-6">
                <Avatar className="h-20 w-20 border-4 border-white/20">
                  <AvatarImage src={company.logo_url} />
                  <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                    {company.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{company.name}</h1>
                  <div className="flex items-center space-x-4 mb-4">
                    {company.industry && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {company.industry}
                      </Badge>
                    )}
                    {company.cities?.name && (
                      <div className="flex items-center text-white/90">
                        <MapPin className="h-4 w-4 mr-1" />
                        {company.cities.name}
                      </div>
                    )}
                    {company.employee_count && (
                      <div className="flex items-center text-white/90">
                        <Users className="h-4 w-4 mr-1" />
                        {company.employee_count}
                      </div>
                    )}
                  </div>
                  {company.description && (
                    <p className="text-white/90 text-lg leading-relaxed">{company.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Overview */}
        {stats && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{stats.averageRating.toFixed(1)}</div>
                  <div className="flex justify-center mb-2">{renderStars(Math.round(stats.averageRating))}</div>
                  <p className="text-sm text-gray-600">{stats.totalReviews} değerlendirme</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{stats.currentEmployees}</div>
                  <p className="text-sm text-gray-600">Mevcut Çalışan</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">{stats.formerEmployees}</div>
                  <p className="text-sm text-gray-600">Eski Çalışan</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Company Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Şirket Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {company.industry && (
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-semibold">Sektör</p>
                          <p className="text-gray-600">{company.industry}</p>
                        </div>
                      </div>
                    )}
                    
                    {company.founded_year && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-semibold">Kuruluş Yılı</p>
                          <p className="text-gray-600">{company.founded_year}</p>
                        </div>
                      </div>
                    )}
                    
                    {company.employee_count && (
                      <div className="flex items-center space-x-3">
                        <Users className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-semibold">Çalışan Sayısı</p>
                          <p className="text-gray-600">{company.employee_count}</p>
                        </div>
                      </div>
                    )}
                    
                    {company.cities?.name && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-semibold">Konum</p>
                          <p className="text-gray-600">{company.cities.name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {company.website && (
                    <div className="pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(company.website, '_blank')}
                        className="w-full"
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Şirket Web Sitesi
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            {/* Popüler Pozisyonlar kutusu tamamen kaldırıldı */}
          </div>
        </motion.div>

        {/* Reviews Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Çalışan Değerlendirmeleri</h2>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Pozisyon filtresi */}
              <select
                className="border rounded px-2 py-1 text-sm"
                value={positionFilter}
                onChange={e => setPositionFilter(e.target.value)}
              >
                <option value="">Tüm Pozisyonlar</option>
                {[...new Set(reviews.map(r => r.positions?.title).filter(Boolean))].map(pos => (
                  <option key={pos} value={pos!}>{pos}</option>
                ))}
              </select>
              {/* Şehir filtresi */}
              <select
                className="border rounded px-2 py-1 text-sm"
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
              >
                <option value="">Tüm Şehirler</option>
                {[...new Set(reviews.map(r => r.cities?.name).filter(Boolean))].map(city => (
                  <option key={city} value={city!}>{city}</option>
                ))}
              </select>
              {/* Maaş sıralama */}
              <select
                className="border rounded px-2 py-1 text-sm"
                value={salarySort}
                onChange={e => setSalarySort(e.target.value)}
              >
                <option value="">Sırala</option>
                <option value="desc">Maaş: Yüksekten Düşüğe</option>
                <option value="asc">Maaş: Düşükten Yükseğe</option>
              </select>
            </div>
            {!hasReviewedThisCompany && (
              <Button 
                onClick={() => router.push(`/review-form?company=${companyId}`)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Değerlendirme Yap
              </Button>
            )}
          </div>

          {filteredReviews.length > 0 ? (
            <div className="space-y-6">
              {filteredReviews.map((review, index) => (
                <motion.div 
                  key={review.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                              {review.users.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{review.users.username}</p>
                            <p className="text-sm text-gray-500">{review.positions?.title || "Bilinmiyor"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center mb-1">{renderStars(review.overall_rating)}</div>
                          <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                          <h4 className="font-semibold text-green-600 mb-2 flex items-center">
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Olumlu Yönler
                          </h4>
                          <p className="text-gray-700">{review.pros}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-red-600 mb-2 flex items-center">
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            Olumsuz Yönler
                          </h4>
                          <p className="text-gray-700">{review.cons}</p>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-semibold text-purple-600">{review.work_life_balance}/5</p>
                          <p className="text-gray-500">İş-Yaşam</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-purple-600">{review.culture_rating}/5</p>
                          <p className="text-gray-500">Kültür</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-purple-600">{review.career_opportunities}/5</p>
                          <p className="text-gray-500">Kariyer</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-purple-600">{review.compensation_rating}/5</p>
                          <p className="text-gray-500">Maaş</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-purple-600">{review.management_rating}/5</p>
                          <p className="text-gray-500">Yönetim</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            {formatSalary(review.salary)}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {review.employment_duration}
                          </span>
                          <Badge variant={review.is_current_employee ? "default" : "secondary"}>
                            {review.is_current_employee ? "Mevcut Çalışan" : "Eski Çalışan"}
                          </Badge>
                        </div>
                        {review.cities?.name && (
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {review.cities.name}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Henüz değerlendirme yok</h3>
                <p className="text-gray-500 mb-4">Bu şirket için ilk değerlendirmeyi sen yap!</p>
                <Button 
                  onClick={() => router.push(`/review-form?company=${companyId}`)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  İlk Değerlendirmeyi Yap
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
} 