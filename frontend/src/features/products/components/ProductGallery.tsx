import type { ProductImage } from '../model/types';

interface ProductGalleryProps {
  images: ProductImage[];
  active: number;
  onSelect: (index: number) => void;
  productName: string;
}

/** Main image viewer + thumbnail strip */
export function ProductGallery({ images, active, onSelect, productName }: ProductGalleryProps) {
  return (
    <div className="space-y-3">
      {/* Main image */}
      <div
        className="aspect-square overflow-hidden rounded-2xl bg-white"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        {images[active] ? (
          <img
            src={images[active].image_url}
            alt={productName}
            width={600}
            height={600}
            className="h-full w-full object-cover transition-opacity duration-200"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            No image
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={img.id ?? idx}
              onClick={() => onSelect(idx)}
              aria-label={`View image ${idx + 1}`}
              aria-pressed={active === idx}
              className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150"
              style={{
                borderColor: active === idx ? 'var(--color-primary)' : 'transparent',
                opacity: active === idx ? 1 : 0.7,
              }}
            >
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
