import React, { StrictMode } from 'react';
import { render } from '@testing-library/react';
import SnapPixel from '../app/components/SnapPixel';
import { initializeSnapPixel, SNAP_PIXEL_ID, trackSnapPurchase } from '../app/lib/snapPixel';
let mockPathname = '/';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
jest.mock('next/script', () => ({ __esModule: true, default: () => null }));
beforeEach(() => {
  delete window.snaptr;
  delete window.sharehaaSnapInitialized;
  mockPathname = '/';
});
test('initializes once and tracks navigation including back, without Strict Mode duplicates', () => {
  const view = render(<StrictMode><SnapPixel /></StrictMode>);
  expect(window.snaptr!.queue).toEqual([['init', SNAP_PIXEL_ID, {}], ['track', 'PAGE_VIEW']]);
  mockPathname = '/products';
  view.rerender(<StrictMode><SnapPixel /></StrictMode>);
  view.rerender(<StrictMode><SnapPixel /></StrictMode>);
  mockPathname = '/';
  view.rerender(<StrictMode><SnapPixel /></StrictMode>);
  expect(window.snaptr!.queue).toHaveLength(4);
});
test('forwards subsequent events when SDK attaches its request handler', () => {
  const tracker = initializeSnapPixel();
  tracker.handleRequest = jest.fn();
  tracker('track', 'PAGE_VIEW');
  expect(tracker.handleRequest).toHaveBeenCalledWith('track', 'PAGE_VIEW');
});
const purchase = { price: 99, currency: 'SAR', transaction_id: 'test-order', item_ids: ['sim-1'], number_items: 1 };
test('queues purchase with actual fields and without fake identity placeholders', () => {
  expect(trackSnapPurchase(purchase)).toBe(true);
  expect(window.snaptr!.queue).toEqual([['init', SNAP_PIXEL_ID, {}], ['track', 'PURCHASE', purchase]]);
});
test.each([{ price: NaN }, { price: -1 }, { currency: 'INSERT_CURRENCY' }, { transaction_id: '' }, { item_ids: [] }, { number_items: 0 }])('rejects invalid purchase %o', invalid => {
  expect(trackSnapPurchase({ ...purchase, ...invalid })).toBe(false);
  expect(window.snaptr).toBeUndefined();
});

// Product tracking tests run without contacting Snapchat.
import { renderHook } from '@testing-library/react';
import { trackSnapProduct } from '../app/lib/snapPixel';
import { useSnapProductView } from '../app/lib/useSnapProductView';
import type { Product } from '../app/components/products/types';
const product = { _id: 'sim-123', name: 'SIM', originalPrice: 100, price: 100, salePrice: 80, category: 'SIM cards' } as Product;
test('view uses real product ID, category and discounted display price', () => {
  expect(trackSnapProduct('VIEW_CONTENT', product)).toBe(true);
  expect(window.snaptr!.queue![1]).toEqual(['track', 'VIEW_CONTENT', {
    price: 80, currency: 'SAR', item_ids: ['sim-123'], item_category: 'SIM cards',
  }]);
});
test('cart tracks added quantity and its total value', () => {
  trackSnapProduct('ADD_CART', product, 3);
  expect(window.snaptr!.queue![1]).toEqual(['track', 'ADD_CART', {
    price: 240, currency: 'SAR', item_ids: ['sim-123'], item_category: 'SIM cards', number_items: 3,
  }]);
});
test.each([0, 120])('ignores invalid discount %s just like the product display', salePrice => {
  trackSnapProduct('VIEW_CONTENT', { ...product, salePrice });
  expect(window.snaptr!.queue![1][2]!.price).toBe(100);
});
test('falls back to regular price and omits absent category', () => {
  trackSnapProduct('VIEW_CONTENT', { ...product, originalPrice: 0, price: 50, salePrice: undefined, category: undefined });
  expect(window.snaptr!.queue![1][2]).toEqual({ price: 50, currency: 'SAR', item_ids: ['sim-123'] });
});
test.each([0, -1, 1.5, NaN])('rejects invalid cart quantity %s', quantity => {
  expect(trackSnapProduct('ADD_CART', product, quantity)).toBe(false);
  expect(window.snaptr).toBeUndefined();
});
test('a broken SDK does not throw into shopping handlers', () => {
  window.snaptr = () => { throw new Error('SDK failure'); };
  expect(trackSnapProduct('ADD_CART', product)).toBe(false);
});
test('view hook handles missing products, Strict Mode, rerenders and navigation', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <StrictMode>{children}</StrictMode>;
  const view = renderHook(({ current }: { current: Product | null }) => useSnapProductView(current), {
    initialProps: { current: null as Product | null }, wrapper,
  });
  expect(window.snaptr).toBeUndefined();
  view.rerender({ current: product });
  view.rerender({ current: { ...product } });
  expect(window.snaptr!.queue).toHaveLength(2);
  view.rerender({ current: { ...product, _id: 'sim-456' } });
  view.rerender({ current: product });
  expect(window.snaptr!.queue).toHaveLength(4);
});
