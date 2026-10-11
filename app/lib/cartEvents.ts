import type { Product } from '../components/products/types';
import { trackSnapProduct } from './snapPixel';
import { track } from './useTikTokEvents';

// Called once, after the cart store has accepted an addition.
export function trackCartAddition(product: Product, quantity: number) {
  const price = product.salePrice ?? product.originalPrice ?? product.price ?? 0;
  const value = price * quantity;

  // Guard: skip tracking if essential data is missing or invalid.
  if (!product._id?.trim() || !Number.isFinite(value) || value < 0 ||
      !Number.isInteger(quantity) || quantity < 1) return;

  // content_id must be the exact same string as in the TikTok catalog.
  // Trim to avoid leading/trailing whitespace mismatches.
  const contentId = product._id.trim();

  trackSnapProduct('ADD_CART', product, quantity);

  track('AddToCart', {
    contents: [{
      content_id: contentId,
      content_type: 'product',
      content_name: product.name,
      quantity,
      price,
    }],
    value,
    currency: 'SAR',
  });
}
