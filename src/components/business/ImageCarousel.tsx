import { useState, useRef, memo } from "react";
import { cn } from "@/lib/utils";
import { ImageViewer } from "./ImageViewer";

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

  const minSwipeDistance = 50;

  const handleClick = () => {
    if (clickable && images.length > 0) {
      setIsViewerOpen(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }

    touchStartX.current = null;
    touchEndX.current = null;
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
        <img
          src={images[0]}
          alt={alt}
          loading="lazy"
          onClick={handleClick}
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
        onClick={handleClick}
      >
        <div 
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`${alt} ${index + 1}`}
              loading={index === 0 ? "eager" : "lazy"}
              className="w-full h-full object-cover flex-shrink-0"
            />
          ))}
        </div>
        
        {/* Dots indicator */}
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
            />
          ))}
        </div>
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
