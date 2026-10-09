import { FeedProduct } from '@/lib/types';

/**
 * Interleaves products across shops in a balanced round-robin order,
 * similar to Uzum Market and major e-commerce feeds.
 *
 * Instead of showing 15 products sequentially from Shop A followed by Shop B,
 * this picks [ShopA_1, ShopB_1, ShopC_1, ShopA_2, ShopB_2, ...].
 * This provides visual diversity and discovery for the user.
 */
export function interleaveProductsByShop(products: FeedProduct[]): FeedProduct[] {
  if (!products || products.length <= 1) {
    return products;
  }

  // Deduplicate products by id just in case
  const seenIds = new Set<string>();
  const uniqueProducts: FeedProduct[] = [];
  for (const p of products) {
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      uniqueProducts.push(p);
    }
  }

  const shopBuckets: FeedProduct[][] = [];
  const shopMap = new Map<string, FeedProduct[]>();

  for (const product of uniqueProducts) {
    const key = product.shop?.id || product.shopId || 'default';
    let bucket = shopMap.get(key);
    if (!bucket) {
      bucket = [];
      shopMap.set(key, bucket);
      shopBuckets.push(bucket);
    }
    bucket.push(product);
  }

  // If all products are from a single shop, return directly
  if (shopBuckets.length <= 1) {
    return uniqueProducts;
  }

  const mixed: FeedProduct[] = [];
  let hasMore = true;
  let index = 0;

  while (hasMore) {
    hasMore = false;
    for (const bucket of shopBuckets) {
      if (index < bucket.length) {
        mixed.push(bucket[index]);
        hasMore = true;
      }
    }
    index++;
  }

  return mixed;
}
