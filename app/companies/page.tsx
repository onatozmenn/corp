"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, MapPin, Users, Star, TrendingUp, Search, Filter, Eye, Lock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Navigation from "@/components/navigation"

interface Company {
  id: number
  name: string
  logo_url?: string
  description?: string
  industry?: string
  employee_count?: string
  cities: {
    name: string
  }
  review_count?: number
  average_rating?: number
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [hasReviewed, setHasReviewed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    fetchCompanies()
  }, [])

  const checkUser = async () => {

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/")
      return
    }
    setUser(user)

    // Check if user has reviewed any company
    const { data: reviews } = await supabase.from("company_reviews").select("id").eq("user_id", user.id).limit(1)

    setHasReviewed(!!(reviews && reviews.length > 0))
  }

  const fetchCompanies = async () => {

    try {
      // Fetch companies with real review data
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select(`
          *,
          cities (name)
        `)
        .order("name")

      if (companiesError) throw companiesError

      // Fetch real review counts and ratings for each company
      const companiesWithReviews = await Promise.all(
        (companiesData || []).map(async (company) => {
          const { data: reviewsData, error: reviewsError } = await supabase
            .from("company_reviews")
            .select("overall_rating")
            .eq("company_id", company.id)

          if (reviewsError) {
            console.error("Error fetching reviews:", reviewsError)
            return {
              ...company,
              review_count: 0,
              average_rating: "0.0",
            }
          }

          const reviewCount = reviewsData?.length || 0
          const averageRating =
            reviewCount > 0
              ? (reviewsData.reduce((sum, review) => sum + review.overall_rating, 0) / reviewCount).toFixed(1)
              : "0.0"

          return {
            ...company,
            review_count: reviewCount,
            average_rating: averageRating,
          }
        }),
      )

      setCompanies(companiesWithReviews)
    } catch (error) {
      console.error("Error fetching companies:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCompanyClick = (companyId: number) => {
    if (!hasReviewed) {
      router.push(`/review-form?company=${companyId}`)
    } else {
      router.push(`/companies/${companyId}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Şirketleri Keşfet
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Türkiye'nin önde gelen şirketleri hakkında gerçek çalışan deneyimlerini keşfet
            </p>
          </div>

          {/* Access Warning */}
          {!hasReviewed && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6">
              <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Lock className="h-8 w-8 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-amber-900 mb-2">Şirket Detaylarına Erişim</h3>
                      <p className="text-amber-800 mb-4">
                        Şirket detaylarını görebilmek için önce bir şirket değerlendirmesi yapmalısın. Bu sayede
                        platformumuza katkıda bulunmuş olursun.
                      </p>
                      <Button
                        onClick={() => router.push("/review-form")}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      >
                        Şirket Değerlendir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Şirket adı veya sektör ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-0 shadow-lg"
              />
            </div>
            {/* Filtrele butonu kaldırıldı */}
          </div>
        </motion.div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company, index) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm border-0 shadow-lg group"
                onClick={() => handleCompanyClick(company.id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={company.logo_url || "/placeholder.svg?height=48&width=48"} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                          {company.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                          {company.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-500">{company.cities.name}</span>
                        </div>
                      </div>
                    </div>
                    {!hasReviewed && <Lock className="h-4 w-4 text-gray-400" />}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {company.industry && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        {company.industry}
                      </Badge>
                    )}

                    <p className="text-sm text-gray-600 line-clamp-2">
                      {company.description || "Şirket açıklaması mevcut değil."}
                    </p>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">{company.average_rating !== undefined ? company.average_rating.toString() : "0"}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">{company.employee_count}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {hasReviewed ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-500">{company.review_count !== undefined ? company.review_count.toString() : "0"} değerlendirme</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Şirket bulunamadı</h3>
            <p className="text-gray-500">Arama kriterlerinizi değiştirmeyi deneyin.</p>
          </motion.div>
        )}

        {/* Real Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card className="text-center bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-blue-900 mb-1">{companies.length}</div>
              <div className="text-sm text-blue-700">Kayıtlı Şirket</div>
            </CardContent>
          </Card>

          <Card className="text-center bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <Star className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-green-900 mb-1">
                {companies.reduce((total, company) => total + (company.review_count || 0), 0)}
              </div>
              <div className="text-sm text-green-700">Toplam Değerlendirme</div>
            </CardContent>
          </Card>

          <Card className="text-center bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-purple-900 mb-1">
                {companies.length > 0
                  ? (
                      companies.reduce(
                        (total, company) => total + Number.parseFloat(company.average_rating !== undefined ? company.average_rating.toString() : "0"),
                        0,
                      ) / companies.length
                    ).toFixed(1)
                  : "0.0"}
              </div>
              <div className="text-sm text-purple-700">Ortalama Puan</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
