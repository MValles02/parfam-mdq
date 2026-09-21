"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from "@/components/ui/carousel";
import { ProductImage } from "@/components/store/product-image";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";

type ProductImageData = { id: string; url: string; alt: string };

/**
 * Product gallery with a Carousel and up to four thumbnails. The active
 * thumbnail is derived from `useCarousel` to avoid state updates in effects.
 */
export function Gallery({ images }: { images: ProductImageData[] }) {
  if (images.length === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded border bg-card">
        <ProductImage
          image={null}
          sizes="(min-width: 1024px) 620px, 100vw"
          priority
        />
      </div>
    );
  }

  return (
    <Carousel
      opts={{ loop: images.length > 1 }}
      className="flex flex-col gap-3.5"
    >
      <div className="relative">
        <CarouselContent className="ml-0">
          {images.map((image, index) => (
            <CarouselItem key={image.id} className="pl-0">
              <div className="relative aspect-square w-full overflow-hidden rounded border bg-card">
                <ProductImage
                  image={image}
                  sizes="(min-width: 1024px) 620px, 100vw"
                  priority={index === 0}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 ? (
          <>
            <CarouselPrevious className="hidden lg:flex" />
            <CarouselNext className="hidden lg:flex" />
          </>
        ) : null}
      </div>

      {images.length > 1 ? <Thumbnails images={images} /> : null}
    </Carousel>
  );
}

function Thumbnails({ images }: { images: ProductImageData[] }) {
  const { api, currentIndex: selectedIndex } = useCarousel();

  return (
    <div className="grid grid-cols-4 gap-3.5">
      {images.slice(0, 4).map((image, index) => {
        const isActive = index === selectedIndex;
        return (
          <button
            key={image.id}
            type="button"
            aria-label={`Ver foto ${index + 1}`}
            aria-current={isActive}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "relative aspect-square overflow-hidden rounded border bg-card transition-colors",
              isActive
                ? "border-foreground ring-1 ring-foreground"
                : "border-input",
              FOCUS_VISIBLE,
            )}
          >
            <ProductImage image={image} sizes="146px" />
          </button>
        );
      })}
    </div>
  );
}
