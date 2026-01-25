import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para obtener imágenes de la galería de un establecimiento desde Supabase Storage
 * Busca imágenes en el bucket "Galeria" organizadas por business_id
 */
export function useBusinessGallery(businessId: string | undefined) {
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setGalleryImages([]);
      return;
    }

    const fetchGalleryImages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Intentar múltiples estrategias para encontrar imágenes de la galería
        let imageUrls: string[] = [];
        
        // Estrategia 1: Buscar en carpeta específica del business_id
        try {
          const { data: folderFiles, error: folderError } = await supabase.storage
            .from("Galeria")
            .list(businessId, {
              limit: 100,
              offset: 0,
            });

          if (!folderError && folderFiles) {
            imageUrls = folderFiles
              .filter((file) => {
                const ext = file.name.split(".").pop()?.toLowerCase();
                return ext && ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
              })
              .map((file) => {
                const { data: { publicUrl } } = supabase.storage
                  .from("Galeria")
                  .getPublicUrl(`${businessId}/${file.name}`);
                return publicUrl;
              });
          }
        } catch (folderErr) {
          console.warn("No se encontraron imágenes en carpeta específica:", folderErr);
        }

        // Estrategia 2: Si no hay imágenes en carpeta, buscar en la raíz por prefijo
        if (imageUrls.length === 0) {
          try {
            const { data: allFiles, error: allFilesError } = await supabase.storage
              .from("Galeria")
              .list("", {
                limit: 1000,
                offset: 0,
              });

            if (!allFilesError && allFiles) {
              // Filtrar archivos que contengan el business_id en el nombre
              const businessFiles = allFiles.filter(
                (file) => file.name.includes(businessId) || file.id?.includes(businessId)
              );

              imageUrls = businessFiles
                .filter((file) => {
                  const ext = file.name.split(".").pop()?.toLowerCase();
                  return ext && ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
                })
                .map((file) => {
                  const { data: { publicUrl } } = supabase.storage
                    .from("Galeria")
                    .getPublicUrl(file.name);
                  return publicUrl;
                });
            }
          } catch (rootErr) {
            console.warn("No se encontraron imágenes en la raíz:", rootErr);
          }
        }

        setGalleryImages(imageUrls);
      } catch (err: any) {
        console.error("Error fetching gallery images:", err);
        // No setear error si simplemente no hay imágenes (es normal)
        if (err.message && !err.message.includes("not found")) {
          setError(err.message);
        }
        setGalleryImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryImages();
  }, [businessId]);

  return { galleryImages, loading, error };
}

