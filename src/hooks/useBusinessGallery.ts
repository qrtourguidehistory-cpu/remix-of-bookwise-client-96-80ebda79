import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para obtener imágenes de la galería de un establecimiento desde Supabase Storage
 * Busca imágenes en el bucket "business-images" en la ruta: {businessId}/gallery/
 * y en todas sus subcarpetas (front, interior, team, etc.)
 * 
 * Estructura esperada en Supabase Storage:
 * - Bucket: business-images
 * - Ruta: {businessId}/gallery/
 * - Subcarpetas: {businessId}/gallery/front, {businessId}/gallery/interior, {businessId}/gallery/team, etc.
 * - Ejemplo: business-images/c52a1375-5a61-4d29-ac01-0773d2f463fe/gallery/front/
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
        // Ruta correcta: {businessId}/gallery/
        const galleryPath = `${businessId}/gallery`;
        
        console.log(`🔍 Buscando imágenes en: business-images/${galleryPath} y subcarpetas`);
        
        // Función recursiva para buscar imágenes en una carpeta y sus subcarpetas
        const searchImagesInFolder = async (folderPath: string): Promise<string[]> => {
          const imageUrls: string[] = [];
          
          const { data: folderFiles, error: folderError } = await supabase.storage
            .from("business-images")
            .list(folderPath, {
              limit: 100,
              offset: 0,
            });

          if (folderError) {
            // Si la carpeta no existe, es normal (puede que no haya imágenes)
            if (folderError.message && !folderError.message.includes("not found") && !folderError.message.includes("No such file")) {
              console.warn(`⚠️ Error al listar archivos en ${folderPath}:`, folderError.message);
            }
            return imageUrls;
          }

          if (!folderFiles || folderFiles.length === 0) {
            return imageUrls;
          }

          // Separar archivos y carpetas
          const files = folderFiles.filter(file => file.name.includes('.'));
          const subfolders = folderFiles.filter(file => !file.name.includes('.'));

          // Procesar archivos de imagen en esta carpeta
          for (const file of files) {
            const ext = file.name.split(".").pop()?.toLowerCase();
            if (ext && ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) {
              const filePath = `${folderPath}/${file.name}`;
              const { data: { publicUrl } } = supabase.storage
                .from("business-images")
                .getPublicUrl(filePath);
              imageUrls.push(publicUrl);
            }
          }

          // Buscar recursivamente en subcarpetas (front, interior, team, etc.)
          for (const subfolder of subfolders) {
            const subfolderPath = `${folderPath}/${subfolder.name}`;
            console.log(`📂 Buscando en subcarpeta: business-images/${subfolderPath}`);
            const subfolderImages = await searchImagesInFolder(subfolderPath);
            imageUrls.push(...subfolderImages);
          }

          return imageUrls;
        };

        // Buscar imágenes en la carpeta gallery y todas sus subcarpetas
        const allImageUrls = await searchImagesInFolder(galleryPath);

        // Eliminar duplicados (por si acaso)
        const uniqueImageUrls = Array.from(new Set(allImageUrls));

        setGalleryImages(uniqueImageUrls);
        
        // Debug: Log para verificar que las imágenes se están obteniendo correctamente
        if (uniqueImageUrls.length > 0) {
          console.log(`✅ useBusinessGallery: ${uniqueImageUrls.length} imágenes encontradas para business_id: ${businessId}`, {
            businessId,
            galleryPath,
            imageCount: uniqueImageUrls.length,
            images: uniqueImageUrls
          });
        } else {
          console.log(`⚠️ useBusinessGallery: No se encontraron imágenes en galería para business_id: ${businessId}`, {
            businessId,
            galleryPath
          });
        }
      } catch (err: any) {
        console.error("❌ Error fetching gallery images:", err);
        setError(err.message || "Error desconocido al obtener imágenes");
        setGalleryImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryImages();
  }, [businessId]);

  return { galleryImages, loading, error };
}
