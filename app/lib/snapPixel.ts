import type { Product } from '../components/products/types';

export const SNAP_PIXEL_ID = 'dad784dc-ac9c-45d9-88f5-0981429fcd59';
export const ADDITIONAL_SNAP_PIXEL_ID = 'eae6c077-579c-45a5-a052-be7679d051ac';
type SnapCommand = [command: string, eventOrId: string, data?: Record<string, unknown>];
type SnapTracker = ((...args: SnapCommand) => void) & {
  queue?: SnapCommand[];
  handleRequest?: (...args: SnapCommand) => void;
};
declare global {
  interface Window {
    snaptr?: SnapTracker;
    sharehaaSnapInitialized?: boolean;
  }
}
export function initializeSnapPixel(): SnapTracker {
  if (!window.snaptr) {
    const tracker: SnapTracker = (...args) => {
      if (tracker.handleRequest) tracker.handleRequest.apply(tracker, args);
      else tracker.queue!.push(args);
    };
    tracker.queue = [];
    window.snaptr = tracker;
  }
  if (!window.sharehaaSnapInitialized) {
    window.snaptr('init', SNAP_PIXEL_ID, {});
    window.snaptr('init', ADDITIONAL_SNAP_PIXEL_ID, {});
    window.sharehaaSnapInitialized = true;
  }
  // Match Snap's bootstrap ordering: create the queue before loading the SDK.
  // Product events can initialize first, before the root layout effect runs.
  if (!document.querySelector('script[src="https://sc-static.net/scevent.min.js"]')) {
    const script = document.createElement('script');
    script.id = 'snap-pixel-sdk';
    script.async = true;
    script.src = 'https://sc-static.net/scevent.min.js';
    document.head.appendChild(script);
  }
  return window.snaptr;
}
export type SnapPurchase = {
  price: number;
  currency: string;
  transaction_id: string;
  item_ids: string[];
  number_items: number;
  item_category?: string;
};

export function trackSnapProduct(event: 'VIEW_CONTENT' | 'ADD_CART', product: Product, quantity = 1): boolean {
  if (typeof window === 'undefined') return false;
  const originalPrice = product.originalPrice || product.price || 0;
  const unitPrice = event === 'ADD_CART'
    ? (product.salePrice ?? product.originalPrice ?? product.price)
    : (product.salePrice != null && product.salePrice > 0 && product.salePrice < originalPrice
      ? product.salePrice : originalPrice);
  const price = unitPrice * quantity;
  if (!product._id?.trim() || !Number.isFinite(price) || price < 0 ||
      !Number.isInteger(quantity) || quantity < 1) return false;
  // Analytics failure must not interrupt the cart buttons or navigation.
  try {
    initializeSnapPixel()('track', event, {
      price,
      currency: 'SAR',
      item_ids: [product._id],
      ...(product.category ? { item_category: product.category } : {}),
      ...(event === 'ADD_CART' ? { number_items: quantity } : {}),
    });
    return true;
  } catch {
    return false;
  }
}
// Call only after a trusted order confirmation, never on a checkout visit.
// A true result means queued, not confirmed receipt by Snapchat.
export function trackSnapPurchase(purchase: SnapPurchase): boolean {
  if (typeof window === 'undefined') return false;
  if (!Number.isFinite(purchase.price) || purchase.price < 0 ||
      !/^[A-Z]{3}$/.test(purchase.currency) ||
      !purchase.transaction_id.trim() ||
      !purchase.item_ids.length || purchase.item_ids.some(id => !id.trim()) ||
      !Number.isInteger(purchase.number_items) || purchase.number_items < 1) return false;
  initializeSnapPixel()('track', 'PURCHASE', {
    price: purchase.price,
    currency: purchase.currency,
    transaction_id: purchase.transaction_id,
    item_ids: purchase.item_ids,
    number_items: purchase.number_items,
    ...(purchase.item_category ? { item_category: purchase.item_category } : {}),
  });
  return true;
}
