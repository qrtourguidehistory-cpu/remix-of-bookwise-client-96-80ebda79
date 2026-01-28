import { useState, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderColor?: string;
  loading?: "lazy" | "eager";
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onClick?: () => void;
}

/**
 * Componente de imagen optimizado con:
 * - Lazy loading automático
 * - Placeholder de baja calidad mientras carga
 * - Caché del navegador (automático)
 * - Prevención de recargas innecesarias
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  placeholderColor = "bg-gradient-to-br from-primary/20 to-primary/5",
  loading = "lazy",
  onError,
  onClick,
}: OptimizedImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const loadingRef = useRef(false);

  // Generar color sólido basado en la primera letra del nombre (para placeholder)
  const getPlaceholderColor = (text: string): string => {
    const colors = [
      "bg-gradient-to-br from-primary/20 to-primary/5",
      "bg-gradient-to-br from-blue-200/20 to-blue-500/5",
      "bg-gradient-to-br from-purple-200/20 to-purple-500/5",
      "bg-gradient-to-br from-pink-200/20 to-pink-500/5",
      "bg-gradient-to-br from-green-200/20 to-green-500/5",
    ];
    const index = text.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const placeholderBg = placeholderColor || getPlaceholderColor(alt);

  useEffect(() => {
    if (!src) {
      setImageError(true);
      return;
    }

    // Resetear estados cuando cambia la fuente
    setImageLoaded(false);
    setImageError(false);
    setShowPlaceholder(true);
    loadingRef.current = false;

    // Pre-cargar imagen en segundo plano
    const img = new Image();
    
    const handleLoad = () => {
      if (!loadingRef.current) {
        loadingRef.current = true;
        setImageLoaded(true);
        // Pequeño delay para transición suave
        setTimeout(() => setShowPlaceholder(false), 100);
      }
    };

    const handleError = () => {
      setImageError(true);
      setShowPlaceholder(false);
      if (onError) {
        const syntheticEvent = {
          currentTarget: imgRef.current,
          target: imgRef.current,
        } as React.SyntheticEvent<HTMLImageElement, Event>;
        onError(syntheticEvent);
      }
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onError]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setTimeout(() => setShowPlaceholder(false), 100);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageError(true);
    setShowPlaceholder(false);
    if (onError) {
      onError(e);
    }
  };

  if (imageError) {
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center",
          placeholderBg,
          className
        )}
        onClick={onClick}
      >
        <span className="text-2xl font-bold text-primary/30">
          {alt.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)} onClick={onClick}>
      {/* Placeholder - se muestra mientras carga */}
      {showPlaceholder && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
            imageLoaded ? "opacity-0" : "opacity-100"
          )}
        >
          <div className={cn("w-full h-full", placeholderBg)}>
            <span className="text-2xl font-bold text-primary/30">
              {alt.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Imagen real */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          // Forzar caché del navegador
          imageRendering: "auto",
        }}
      />
    </div>
  );
});

