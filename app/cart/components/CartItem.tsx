import Image from "next/image";
import { Plus, Minus, X } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-US");

interface CartItemProps {
  product: {
    _id: string;
    name: string;
    price: number;
    salePrice?: number;
    originalPrice?: number;
    images?: string[];
    image?: string;
  };
  qty: number;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const resolveImg = (src: string) => src.startsWith("http") ? src : `${API}${src}`;

export default function CartItem({ product, qty, onUpdateQty, onRemove }: CartItemProps) {
  const price = product.salePrice ?? product.originalPrice ?? product.price;
  const rawImg = product.images?.[0] || product.image;
  const img = rawImg ? resolveImg(rawImg) : undefined;
  const hasDiscount = product.salePrice && product.originalPrice && product.salePrice < product.originalPrice;
  const discountPercent = hasDiscount ? Math.round((1 - product.salePrice! / product.originalPrice!) * 100) : 0;

  return (
    <div className="group rounded-2xl border hover:border-[#8BA8D2] transition-all duration-300 p-3 sm:p-4 bg-white" style={{ borderColor: "var(--color-4)" }}>
      <div className="flex gap-3 sm:gap-4">
        {/* Image */}
        <div className="relative w-[72px] h-[72px] sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border" style={{ background: "var(--color-1)", borderColor: "var(--color-4)" }}>
          {img ? (
            <Image src={img} alt={product.name} fill className="object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📱</div>
          )}
          {hasDiscount && (
            <span className="absolute top-1 right-1 text-[8px] font-black text-white px-1.5 py-0.5 rounded" style={{ background: "var(--color-5)" }}>
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold leading-relaxed line-clamp-2" style={{ color: "var(--color-2)" }}>{product.name}</h3>
            <button
              onClick={() => onRemove(product._id)}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border hover:border-red-400/40 hover:bg-red-50 flex items-center justify-center transition shrink-0"
              style={{ background: "var(--color-1)", borderColor: "var(--color-4)" }}
            >
              <X size={12} style={{ color: "var(--color-3)" }} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 sm:mt-3">
            <div>
              <span className="text-sm sm:text-lg font-black" style={{ color: "var(--color-2)" }}>{fmt(price * qty)}</span>
              <span className="text-[9px] mr-0.5" style={{ color: "var(--color-3)" }}><img src="/money-icon.webp" alt="ر.س" className="inline w-6 h-6 object-contain align-middle" /></span>
              {hasDiscount && (
                <span className="text-[9px] line-through mr-1.5" style={{ color: "var(--color-3)" }}>{fmt(product.originalPrice! * qty)}</span>
              )}
            </div>

            {/* Qty */}
            <div className="flex items-center rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-4)" }}>
              <button
                onClick={() => onUpdateQty(product._id, qty - 1)}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition"
                style={{ background: "var(--color-1)", color: "var(--color-3)" }}
              >
                <Minus size={12} />
              </button>
              <span className="w-7 sm:w-8 text-center text-xs sm:text-sm font-black bg-white" style={{ color: "var(--color-2)" }}>{qty}</span>
              <button
                onClick={() => onUpdateQty(product._id, qty + 1)}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition text-white font-black"
                style={{ background: "var(--color-2)" }}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
