import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterModal, FilterValues } from "@/components/search/FilterModal";
import { BusinessCard, Business } from "@/components/business/BusinessCard";
import { categories as baseCategories } from "@/data/mockData";
import { useEstablishments } from "@/hooks/useEstablishments";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  Scissors, 
  Sparkles, 
  Heart, 
  Eye, 
  Syringe, 
  User,
  HandMetal,
  Droplets,
  Flame,
  Pencil,
  Sun,
  Dumbbell,
  Activity,
  Stethoscope,
  PawPrint,
  MoreHorizontal,
  X,
  Loader2
} from "lucide-react";

const categoryIcons: Record<string, typeof Scissors> = {
  "all": Sparkles,
  "hair-salon": Scissors,
  "nails": HandMetal,
  "eyebrows-lashes": Eye,
  "beauty-salon": Heart,
  "medspa": Syringe,
  "barber": User,
  "massage": HandMetal,
  "spa-sauna": Droplets,
  "waxing": Flame,
  "tattoo-piercing": Pencil,
  "tanning": Sun,
  "fitness-recovery": Dumbbell,
  "physical-therapy": Activity,
  "health-practice": Stethoscope,
  "pet-grooming": PawPrint,
  "other": MoreHorizontal,
};

// Map establishment category to Business category
// Mapea todas las variaciones de categorías a categorías estándar
const mapCategory = (category: string | null): string => {
  if (!category) return "other";
  
  // Normalizar: convertir guiones bajos a guiones y lowercase, eliminar espacios
  const normalized = category.toLowerCase().replace(/_/g, "-").trim();
  
  const categoryMap: Record<string, string> = {
    // Variaciones de Peluquería / Hair Salon
    "salon": "hair-salon",
    "hair-salon": "hair-salon",
    "hair_salon": "hair-salon",
    "peluqueria": "hair-salon",
    "peluquería": "hair-salon",
    "peluquerias": "hair-salon",
    "peluquerías": "hair-salon",
    
    // Variaciones de Barbería / Barber
    "barberia": "barber",
    "barbería": "barber",
    "barber": "barber",
    "barberias": "barber",
    "barberías": "barber",
    
    // Variaciones de Uñas / Nails
    "nails": "nails",
    "uñas": "nails",
    "unas": "nails",
    "nail": "nails",
    "nail-art": "nails",
    "nail_art": "nails",
    "manicure": "nails",
    "pedicure": "nails",
    
    // Variaciones de Spa
    "spa": "spa-sauna",
    "spa-sauna": "spa-sauna",
    "spa_sauna": "spa-sauna",
    "sauna": "spa-sauna",
    
    // Variaciones de Beauty Salon
    "beauty": "beauty-salon",
    "beauty-salon": "beauty-salon",
    "beauty_salon": "beauty-salon",
    "maquillaje": "beauty-salon",
    "makeup": "beauty-salon",
    
    // Variaciones de Faciales / Facial
    "faciales": "beauty-salon",
    "facial": "beauty-salon",
    "facial-treatment": "beauty-salon",
    "tratamiento-facial": "beauty-salon",
    
    // Variaciones de Massage
    "massage": "massage",
    "masaje": "massage",
    "masajes": "massage",
    
    // Variaciones de Medspa
    "medspa": "medspa",
    "med-spa": "medspa",
    "medicina-estetica": "medspa",
    "medicina-estética": "medspa",
    
    // Variaciones de Eyebrows & Lashes
    "eyebrows-lashes": "eyebrows-lashes",
    "eyebrows_lashes": "eyebrows-lashes",
    "cejas": "eyebrows-lashes",
    "pestañas": "eyebrows-lashes",
    "pestanas": "eyebrows-lashes",
    "microblading": "eyebrows-lashes",
    
    // Variaciones de Waxing
    "waxing": "waxing",
    "depilacion": "waxing",
    "depilación": "waxing",
    "cera": "waxing",
    
    // Variaciones de Tattoo & Piercing
    "tattoo-piercing": "tattoo-piercing",
    "tattoo_piercing": "tattoo-piercing",
    "tattoo": "tattoo-piercing",
    "tatuaje": "tattoo-piercing",
    "tatuajes": "tattoo-piercing",
    "piercing": "tattoo-piercing",
    "piercings": "tattoo-piercing",
    
    // Variaciones de Tanning
    "tanning": "tanning",
    "bronceado": "tanning",
    "autobronceado": "tanning",
    
    // Variaciones de Fitness & Recovery
    "fitness-recovery": "fitness-recovery",
    "fitness_recovery": "fitness-recovery",
    "fitness": "fitness-recovery",
    "recovery": "fitness-recovery",
    "recuperacion": "fitness-recovery",
    "recuperación": "fitness-recovery",
    
    // Variaciones de Physical Therapy
    "physical-therapy": "physical-therapy",
    "physical_therapy": "physical-therapy",
    "fisioterapia": "physical-therapy",
    "fisio": "physical-therapy",
    "terapia-fisica": "physical-therapy",
    "terapia-física": "physical-therapy",
    
    // Variaciones de Health Practice
    "health-practice": "health-practice",
    "health_practice": "health-practice",
    "salud": "health-practice",
    "medicina-alternativa": "health-practice",
    "naturopatia": "health-practice",
    "naturopatía": "health-practice",
    
    // Variaciones de Pet Grooming
    "pet-grooming": "pet-grooming",
    "pet_grooming": "pet-grooming",
    "grooming": "pet-grooming",
    "peluqueria-canina": "pet-grooming",
    "peluquería-canina": "pet-grooming",
    "mascotas": "pet-grooming",
  };
  
  return categoryMap[normalized] || normalized;
};

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    sortBy: "best-match",
    maxPrice: 20000,
    minPrice: 0,
    hasPromotions: false,
    acceptsGroups: false,
    establishmentType: "all",
    country: "",
    city: "",
  });
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isGuest } = useAuth();

  // Load real data from Supabase
  const { establishments, loading, error } = useEstablishments();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Función para extraer TODAS las categorías de un establecimiento (category, primary_category, secondary_categories)
  const getAllCategories = useCallback((est: { category: string | null; primary_category: string | null; secondary_categories: string[] | null }): string[] => {
    const categories: string[] = [];
    
    // Agregar category (legacy)
    if (est.category) {
      categories.push(mapCategory(est.category));
    }
    
    // Agregar primary_category
    if (est.primary_category) {
      categories.push(mapCategory(est.primary_category));
    }
    
    // Agregar secondary_categories (array)
    if (est.secondary_categories && Array.isArray(est.secondary_categories)) {
      est.secondary_categories.forEach(cat => {
        if (cat) {
          categories.push(mapCategory(cat));
        }
      });
    }
    
    // Eliminar duplicados y retornar
    return [...new Set(categories)];
  }, []);

  // Convert establishments to Business format - memoized
  const businesses: Business[] = useMemo(() => {
    return establishments.map((est) => ({
      id: est.id,
      name: est.name,
      description: est.description || "",
      rating: Number(est.rating) || 0,
      reviewCount: est.review_count || 0,
      distance: "N/A",
      category: mapCategory(est.category || est.primary_category), // Mantener para compatibilidad
      imageUrl: est.main_image || "",
      images: est.main_image ? [est.main_image] : [],
      isFavorite: isFavorite(est.id),
      closingTime: "8:00 PM",
      address: est.address || undefined, // Agregar dirección
      // Agregar todas las categorías como propiedad adicional
      allCategories: getAllCategories(est),
    }));
  }, [establishments, isFavorite, getAllCategories]);

  // Función para expandir búsquedas relacionadas (peluquería <-> barbería) - memoized
  const expandSearchQuery = useCallback((query: string): string[] => {
    const normalizedQuery = query.toLowerCase().trim();
    const queries = [normalizedQuery];
    
    // Si busca "peluquería" o "peluqueria", también buscar "barbería" y "barberia"
    if (normalizedQuery.includes("peluquería") || normalizedQuery.includes("peluqueria")) {
      queries.push("barbería", "barberia", "barber");
    }
    
    // Si busca "barbería" o "barberia", también buscar "peluquería" y "peluqueria"
    if (normalizedQuery.includes("barbería") || normalizedQuery.includes("barberia") || normalizedQuery.includes("barber")) {
      queries.push("peluquería", "peluqueria");
    }
    
    return queries;
  }, []);

  // Función para verificar si una categoría coincide con la búsqueda relacionada - memoized
  const categoryMatchesSearch = useCallback((category: string, searchQueries: string[]): boolean => {
    const normalizedCategory = category.toLowerCase();
    return searchQueries.some(query => {
      const normalizedQuery = query.toLowerCase();
      // Verificar si la categoría es "hair-salon" o "barber" y la búsqueda es relacionada
      if ((normalizedCategory === "hair-salon" || normalizedCategory === "barber") &&
          (normalizedQuery.includes("peluquería") || normalizedQuery.includes("peluqueria") || 
           normalizedQuery.includes("barbería") || normalizedQuery.includes("barberia") || normalizedQuery.includes("barber"))) {
        return true;
      }
      return normalizedCategory.includes(normalizedQuery) || normalizedQuery.includes(normalizedCategory);
    });
  }, []);

  // Función para expandir categorías relacionadas - memoized
  const expandCategory = useCallback((category: string | null): string[] => {
    if (!category) return [];
    
    const categories = [category];
    
    // Si se selecciona "hair-salon" (Peluquería), también incluir "barber"
    if (category === "hair-salon") {
      categories.push("barber");
    }
    
    // Si se selecciona "barber" (Barbería), también incluir "hair-salon"
    if (category === "barber") {
      categories.push("hair-salon");
    }
    
    return categories;
  }, []);

  // Función para verificar si una categoría coincide con el término de búsqueda
  const categoryMatchesSearchTerm = useCallback((categoryId: string, searchTerm: string): boolean => {
    if (!searchTerm) return true;
    
    const normalizedSearch = searchTerm.toLowerCase().trim();
    const searchQueries = expandSearchQuery(normalizedSearch);
    
    // Obtener nombre traducido de la categoría (español)
    const categoryNameEs = t(`categories.${categoryId}`).toLowerCase();
    
    // Obtener ID de la categoría (inglés)
    const categoryIdLower = categoryId.toLowerCase();
    
    // Verificar si el término de búsqueda coincide con:
    // 1. El nombre traducido (español)
    // 2. El ID de la categoría (inglés)
    // 3. Variaciones mapeadas (usando mapCategory)
    const mappedCategory = mapCategory(normalizedSearch);
    
    return searchQueries.some(query => {
      const queryLower = query.toLowerCase();
      return (
        categoryNameEs.includes(queryLower) ||
        queryLower.includes(categoryNameEs) ||
        categoryIdLower.includes(queryLower) ||
        queryLower.includes(categoryIdLower) ||
        mappedCategory === categoryId ||
        mapCategory(queryLower) === categoryId
      );
    });
  }, [expandSearchQuery, t]);

  // Calcular conteos dinámicos de categorías desde los businesses reales - memoized
  // IMPORTANTE: Considera TODAS las categorías (category, primary_category, secondary_categories)
  // Si hay un searchQuery, filtra las categorías que coincidan
  const categoriesWithCounts = useMemo(() => {
    // Contar businesses por categoría (considerando TODAS las categorías de cada negocio)
    const categoryCounts: Record<string, number> = {};
    
    businesses.forEach((business) => {
      // Obtener todas las categorías del negocio
      const allCats = business.allCategories || [business.category || "other"];
      
      // Contar cada categoría
      allCats.forEach(cat => {
        const normalizedCat = cat || "other";
        categoryCounts[normalizedCat] = (categoryCounts[normalizedCat] || 0) + 1;
      });
    });
    
    // Mapear categorías base a categorías con conteos reales
    let filteredCategories = baseCategories
      .filter(c => c.id !== "all")
      .map((cat) => ({
        ...cat,
        count: categoryCounts[cat.id] || 0,
      }));
    
    // Si hay un searchQuery, filtrar las categorías que coincidan
    if (searchQuery) {
      filteredCategories = filteredCategories.filter(cat => 
        categoryMatchesSearchTerm(cat.id, searchQuery)
      );
    }
    
    return filteredCategories.concat([
      {
        id: "all",
        label: "all",
        count: businesses.length,
      },
    ]);
  }, [businesses, searchQuery, categoryMatchesSearchTerm]);

  // Memoize filtered businesses to prevent recalculation on every render
  // IMPORTANTE: Busca en TODAS las categorías del establecimiento (category, primary_category, secondary_categories)
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
    if (!searchQuery && !selectedCategory && !filters.country && !filters.city) return true;
    
    // Obtener TODAS las categorías del negocio
    const allBusinessCategories = b.allCategories || [b.category || "other"];
    
    let matchesSearch = true;
    if (searchQuery) {
      const searchQueries = expandSearchQuery(searchQuery);
      const normalizedName = b.name.toLowerCase();
      const normalizedDesc = b.description.toLowerCase();
      
      // Verificar si el nombre o descripción contiene alguna de las búsquedas expandidas
      const nameOrDescMatches = searchQueries.some(query => 
        normalizedName.includes(query.toLowerCase()) || 
        normalizedDesc.includes(query.toLowerCase())
      );
      
      // Verificar si CUALQUIERA de las categorías del negocio coincide con la búsqueda
      const categoryMatches = allBusinessCategories.some(cat => 
        categoryMatchesSearch(cat, searchQueries)
      );
      
      matchesSearch = nameOrDescMatches || categoryMatches;
    }
    
    // Expandir categorías relacionadas cuando se selecciona una categoría
    // Verificar si CUALQUIERA de las categorías del negocio coincide con la categoría seleccionada
    const matchesCategory = selectedCategory
      ? expandCategory(selectedCategory).some(expandedCat => 
          allBusinessCategories.includes(expandedCat)
        )
      : true;
    
    // Filtrar por ubicación (país y ciudad)
    // MEJORADO: Búsqueda más flexible y solo por ciudad (el país no se busca en la dirección)
    let matchesLocation = true;
    if (filters.city) {
      // Solo filtrar por ciudad si está seleccionada
      const businessAddress = (b.address || "").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Eliminar acentos
      
      const cityLower = filters.city.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Eliminar acentos
      
      // Buscar la ciudad en la dirección
      matchesLocation = businessAddress.includes(cityLower);
    }
    // Si solo se seleccionó país sin ciudad, mostrar todos los resultados
    // (asumimos que todos los establecimientos están en el país seleccionado)
    
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [businesses, searchQuery, selectedCategory, expandSearchQuery, categoryMatchesSearch, expandCategory, filters.country, filters.city]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    if (!user && !isGuest) {
      toast({
        title: t("common.error"),
        description: "Debes iniciar sesión para guardar favoritos",
        variant: "destructive",
      });
      return;
    }
    
    if (isGuest) {
      toast({
        title: t("common.error"),
        description: "Los invitados no pueden guardar favoritos. Crea una cuenta.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await toggleFavorite(id);
    if (error) {
      toast({
        title: t("common.error"),
        description: "No se pudo actualizar favoritos",
        variant: "destructive",
      });
    }
  }, [user, isGuest, toggleFavorite, t]);

  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === "all") {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    }
  };

  const showResults = searchQuery || selectedCategory;
  const selectedCategoryData = categoriesWithCounts.find(c => c.id === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="px-4 py-4 max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground">{t("search.title")}</h1>
          </div>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("search.placeholder")}
            onMapClick={() => navigate("/map")}
            onFilterClick={() => setIsFilterOpen(true)}
          />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Category Grid - Show all or just selected */}
        <section className="animate-fade-in">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("search.categories")}
          </h2>
          
          {selectedCategory ? (
            // Show only selected category with X to deselect
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-3 p-4 rounded-xl border bg-primary text-primary-foreground border-primary shadow-card w-full"
            >
              {(() => {
                const Icon = categoryIcons[selectedCategory] || Sparkles;
                return (
                  <>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                      <Icon className="w-5 h-5 text-gray-700" strokeWidth={2} />
                    </div>
                    <div className="text-left flex-1">
                      <span className="font-medium text-sm text-primary-foreground">
                        {t(`categories.${selectedCategory}`)}
                      </span>
                      <p className="text-xs text-primary-foreground/70">
                        {filteredBusinesses.length} {t("common.results")}
                      </p>
                    </div>
                    <X className="w-5 h-5 text-primary-foreground" />
                  </>
                );
              })()}
            </button>
          ) : (
            // Show all categories in grid (mostrar TODAS las categorías, aunque tengan 0 resultados)
            <div className="grid grid-cols-2 gap-3">
              {categoriesWithCounts
                .filter(c => c.id !== "all")
                .map((cat) => {
                  const Icon = categoryIcons[cat.id] || Sparkles;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border transition-all duration-200",
                        cat.count > 0
                          ? "bg-card border-border hover:border-primary/30"
                          : "bg-card/50 border-border/50 opacity-60"
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                        <Icon className="w-5 h-5 text-gray-700" strokeWidth={2} />
                      </div>
                      <div className="text-left">
                        <span className="font-medium text-sm text-foreground">
                          {t(`categories.${cat.id}`)}
                        </span>
                        <p className={cn(
                          "text-xs",
                          cat.count > 0 ? "text-muted-foreground" : "text-muted-foreground/60"
                        )}>
                          {cat.count} {t("common.results")}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </section>

        {/* Search Results */}
        {showResults && (
          <section className="space-y-4 animate-fade-in px-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredBusinesses.length} {t("common.results")}
                {searchQuery && ` ${t("search.resultsFor")} "${searchQuery}"`}
              </p>
            </div>
            {filteredBusinesses.map((business, index) => (
              <div
                key={business.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <BusinessCard
                  business={business}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            ))}
            {filteredBusinesses.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {t("common.noResults")}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Show all establishments when no filter */}
        {!showResults && (
          <section className="space-y-4 animate-fade-in px-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {businesses.length} {t("common.results")}
              </p>
            </div>
            {businesses.map((business, index) => (
              <div
                key={business.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <BusinessCard
                  business={business}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            ))}
          </section>
        )}
      </main>

      <FilterModal 
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={(newFilters) => setFilters(newFilters)}
        initialFilters={filters}
      />

      {!isFilterOpen && <BottomNavigation />}
    </div>
  );
};

export default SearchPage;
