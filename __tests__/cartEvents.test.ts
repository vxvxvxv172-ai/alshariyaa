import { useCartStore } from '../app/store/cartStore';
import type { Product } from '../app/components/products/types';

const product = { _id: 'sim-123', name: 'SIM', price: 100, originalPrice: 100, salePrice: 80 } as Product;

beforeEach(() => {
  useCartStore.setState({ items: [], customer: null });
  delete window.ttq;
  delete window.snaptr;
  delete window.sharehaaSnapInitialized;
});

test('every successful addition emits both events once, after the cart changes', () => {
  const tiktok = jest.fn(() => {
    expect(useCartStore.getState().items[0].qty).toBe(3);
  });
  window.ttq = { track: tiktok, identify: jest.fn() };
  useCartStore.getState().addItem(product, 3);
  expect(tiktok).toHaveBeenCalledTimes(1);
  expect(tiktok).toHaveBeenCalledWith('AddToCart', {
    contents: [{ content_id: 'sim-123', content_type: 'product', content_name: 'SIM', price: 80, quantity: 3 }],
    value: 240, currency: 'SAR',
  });
  expect(window.snaptr!.queue!.filter(command => command[1] === 'ADD_CART')).toEqual([
    ['track', 'ADD_CART', { price: 240, currency: 'SAR', item_ids: ['sim-123'], number_items: 3 }],
  ]);
});

test('queues early TikTok additions and reports added quantity, not accumulated quantity', () => {
  useCartStore.getState().addItem(product);
  useCartStore.getState().addItem(product, 2);
  expect(useCartStore.getState().items[0].qty).toBe(3);
  const queue = window.ttq as unknown as [string, string, { value: number; contents: { quantity: number }[] }][];
  expect(queue).toHaveLength(2);
  expect(queue.map(command => [command[1], command[2].value, command[2].contents[0].quantity]))
    .toEqual([['AddToCart', 80, 1], ['AddToCart', 160, 2]]);
});

test.each([undefined, 0, 120])('both event values match the cart with salePrice %s', salePrice => {
  window.ttq = { track: jest.fn(), identify: jest.fn() };
  useCartStore.getState().addItem({ ...product, salePrice }, 2);
  const value = useCartStore.getState().totalPrice();
  expect(window.ttq.track).toHaveBeenCalledWith('AddToCart', expect.objectContaining({ value }));
  expect(window.snaptr!.queue![2][2]!.price).toBe(value);
});

test('removal, quantity reduction and cart restoration do not emit additions', () => {
  window.ttq = { track: jest.fn(), identify: jest.fn() };
  useCartStore.setState({ items: [{ product, qty: 3 }] });
  useCartStore.getState().updateQty(product._id, 2);
  useCartStore.getState().removeItem(product._id);
  useCartStore.getState().clear();
  expect(window.ttq.track).not.toHaveBeenCalled();
  expect(window.snaptr).toBeUndefined();
});

test('broken SDKs do not break adding products', () => {
  window.ttq = { track: () => { throw new Error('TikTok failed'); }, identify: jest.fn() };
  window.snaptr = () => { throw new Error('Snap failed'); };
  expect(() => useCartStore.getState().addItem(product)).not.toThrow();
  expect(useCartStore.getState().items[0].qty).toBe(1);
});
