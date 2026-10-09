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

/** The main photo is at most 560 px wide from `lg` up and full width below. */
const MAIN_PHOTO_SIZES = "(min-width: 1024px) 560px, 100vw";

/** Thumbnails are a 72 px vertical strip from `lg` up and hidden below. */
const THUMBNAIL_SIZES = "72px";

const MAX_THUMBNAILS = 4;

/**
 * Product gallery with a Carousel, dots below lg and up to four vertical
 * thumbnails from lg. The active index is derived from `useCarousel` to avoid state updates in effects.
 */
export function Gallery({ images }: { images: ProductImageData[] }) {
  if (images.length === 0) {
    return (
      <div className="relative isolate aspect-square w-full overflow-hidden rounded bg-background">
        <ProductImage image={null} sizes={MAIN_PHOTO_SIZES} priority />
      </div>
    );
  }

  return (
    <Carousel
      opts={{ loop: images.length > 1 }}
      className="flex flex-col gap-3 lg:flex-row"
    >
      {images.length > 1 ? <Thumbnails images={images} /> : null}
      <div className="relative min-w-0 flex-1">
        <CarouselContent className="ml-0">
          {images.map((image, index) => (
            <CarouselItem key={image.id} className="pl-0">
              <div className="relative isolate aspect-square w-full overflow-hidden rounded bg-background">
                <ProductImage
                  image={image}
                  sizes={MAIN_PHOTO_SIZES}
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

      {images.length > 1 ? <Dots count={images.length} /> : null}
    </Carousel>
  );
}

/** Mobile pagination: 44px hit areas around small dots. */
function Dots({ count }: { count: number }) {
  const { api, currentIndex } = useCarousel();

  return (
    <div className="flex justify-center lg:hidden">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Ver foto ${index + 1}`}
          aria-current={index === currentIndex}
          onClick={() => api?.scrollTo(index)}
          className={cn(
            "flex size-11 items-center justify-center",
            FOCUS_VISIBLE,
          )}
        >
          <span
            className={cn(
              "size-2 rounded-full",
              index === currentIndex ? "bg-foreground" : "bg-input",
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** Desktop: vertical strip of up to four thumbnails left of the image. */
function Thumbnails({ images }: { images: ProductImageData[] }) {
  const { api, currentIndex: selectedIndex } = useCarousel();

  return (
    <div className="hidden w-[72px] shrink-0 flex-col gap-2.5 lg:flex">
      {images.slice(0, MAX_THUMBNAILS).map((image, index) => {
        const isActive = index === selectedIndex;
        return (
          <button
            key={image.id}
            type="button"
            aria-label={`Ver foto ${index + 1}`}
            aria-current={isActive}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "relative isolate aspect-square overflow-hidden rounded border bg-muted transition-colors",
              isActive
                ? "border-foreground ring-1 ring-foreground"
                : "border-transparent",
              FOCUS_VISIBLE,
            )}
          >
            <ProductImage image={image} sizes={THUMBNAIL_SIZES} />
          </button>
        );
      })}
    </div>
  );
}
