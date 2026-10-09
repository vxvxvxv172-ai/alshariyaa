import type { Product } from '../components/products/types';
import { trackSnapProduct } from './snapPixel';
import { track } from './useTikTokEvents';

// Called once, after the cart store has accepted an addition.
export function trackCartAddition(product: Product, quantity: number) {
  const price = product.salePrice ?? product.originalPrice ?? product.price;
  const value = price * quantity;
  if (!product._id?.trim() || !Number.isFinite(value) || value < 0 ||
      !Number.isInteger(quantity) || quantity < 1) return;

  trackSnapProduct('ADD_CART', product, quantity);
  track('AddToCart', {
    contents: [{
      content_id: product._id,
      content_type: 'product',
      content_name: product.name,
      quantity,
      price,
    }],
    value,
    currency: 'SAR',
  });
}
