import { useState, useRef, memo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ImageViewer } from "./ImageViewer";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface ImageCarouselProps {
  images: string[];
  alt?: string;
  className?: string;
  clickable?: boolean; // Si es true, permite click para expandir
}

export const ImageCarousel = memo(function ImageCarousel({ images, alt = "Image", className, clickable = false }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const hasSwiped = useRef<boolean>(false);

  const minSwipeDistance = 50;
  const prevImagesKeyRef = useRef<string>('');

  // Resetear índice cuando cambian las imágenes
  useEffect(() => {
    const currentImagesKey = images.join('|');
    
    // Solo resetear si las imágenes realmente cambiaron (no solo la referencia del array)
    if (prevImagesKeyRef.current !== currentImagesKey) {
      prevImagesKeyRef.current = currentImagesKey;
      // Resetear a 0 cuando cambian las imágenes
      setCurrentIndex(0);
    } else if (images.length > 0 && currentIndex >= images.length) {
      // Si el índice está fuera de rango, ajustar
      setCurrentIndex(0);
    } else if (images.length === 0) {
      setCurrentIndex(0);
    }
  }, [images, currentIndex]);

  const handleClick = (clickedIndex?: number) => {
    // Solo abrir el viewer si no hubo un swipe reciente
    if (hasSwiped.current) {
      hasSwiped.current = false;
      return;
    }
    
    if (clickable && images.length > 0) {
      // Si se especifica un índice, usarlo; de lo contrario, usar el índice actual
      if (clickedIndex !== undefined) {
        setCurrentIndex(clickedIndex);
      }
      setIsViewerOpen(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    hasSwiped.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) {
      touchStartX.current = null;
      touchEndX.current = null;
      return;
    }
    
    const distance = touchStartX.current - touchEndX.current;
    const absDistance = Math.abs(distance);
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Si el movimiento es significativo, marcar como swipe
    if (absDistance > minSwipeDistance) {
      hasSwiped.current = true;
    }

    if (isLeftSwipe && currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }

    touchStartX.current = null;
    touchEndX.current = null;
    
    // Resetear el flag de swipe después de un breve delay
    setTimeout(() => {
      hasSwiped.current = false;
    }, 300);
  };

  if (!images || images.length === 0) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted", className)}>
        <div className="w-16 h-16 rounded-xl bg-muted-foreground/10 flex items-center justify-center">
          <span className="text-muted-foreground text-2xl">📷</span>
        </div>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <>
        <OptimizedImage
          src={images[0]}
          alt={alt}
          loading="lazy"
          onClick={clickable ? handleClick : undefined}
          className={cn(
            "w-full h-full object-cover",
            clickable && "cursor-pointer",
            className
          )}
        />
        {clickable && (
          <ImageViewer
            images={images}
            initialIndex={0}
            isOpen={isViewerOpen}
            onClose={() => setIsViewerOpen(false)}
            alt={alt}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div 
        className={cn(
          "relative w-full h-full overflow-hidden",
          clickable && "cursor-pointer",
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          // Solo manejar click si no es en los dots o en una imagen específica
          if ((e.target as HTMLElement).closest('button')) {
            return;
          }
          handleClick();
        }}
      >
        <div 
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((image, index) => (
            <OptimizedImage
              key={`${image}-${index}`}
              src={image}
              alt={`${alt} ${index + 1}`}
              loading={index === 0 ? "eager" : "lazy"}
              className="w-full h-full object-cover flex-shrink-0"
              onClick={() => {
                handleClick(index);
              }}
              onError={(e) => {
                // Manejar errores de carga de imagen
                console.warn(`Error loading image ${index}:`, image);
              }}
            />
          ))}
        </div>
        
        {/* Dots indicator - Solo mostrar si hay más de una imagen */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentIndex 
                    ? "bg-white w-4" 
                    : "bg-white/50 hover:bg-white/70"
                )}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      {clickable && (
        <ImageViewer
          images={images}
          initialIndex={currentIndex}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          alt={alt}
        />
      )}
    </>
  );
});
