'use client';

import { useEffect, useRef } from 'react';
import type { Product } from '../components/products/types';
import { trackSnapProduct } from './snapPixel';

export function useSnapProductView(product: Product | null) {
  const lastViewed = useRef<string | null>(null);
  useEffect(() => {
    if (!product) {
      lastViewed.current = null;
      return;
    }
    if (lastViewed.current !== product._id && trackSnapProduct('VIEW_CONTENT', product)) {
      lastViewed.current = product._id;
    }
  }, [product]);
}
