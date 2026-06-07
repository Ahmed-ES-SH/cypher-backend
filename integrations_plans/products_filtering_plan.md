# Products Module — Filtering Sidebar Integration Plan

> **Backend:** NestJS v11 · TypeORM · PostgreSQL
> **Last Updated:** 2026-06-06
> **Audience:** Frontend / Full-Stack Developers

---

## Table of Contents

1. [Overview](#1-overview)
2. [Filter Options Endpoint](#2-filter-options-endpoint)
3. [Filter Query Parameters](#3-filter-query-parameters)
4. [Full Filter Usage Examples](#4-full-filter-usage-examples)
5. [Filtering Sidebar Architecture](#5-filtering-sidebar-architecture)
6. [Pagination & Filtering Integration](#6-pagination--filtering-integration)
7. [TypeScript Types](#7-typescript-types)
8. [API Client Functions](#8-api-client-functions)
9. [React Query Hooks](#9-react-query-hooks)
10. [Example: Catalog Page with Filtering Sidebar](#10-example-catalog-page-with-filtering-sidebar)
11. [Gotchas & Edge Cases](#11-gotchas--edge-cases)

---

## 1. Overview

The public products endpoint now supports **7 additional filter dimensions** beyond the existing price, rating, search, and category filters. All filters are **composable** — you can combine any number of them in a single request.

A dedicated **`GET /products/filter-options`** endpoint provides aggregated metadata so the frontend can dynamically populate the filtering sidebar's controls (checkboxes, sliders, dropdowns).

Every filtered request returns updated pagination numbers (`total`, `totalPages`, `page`, `limit`) reflecting the current filter set.

---

## 2. Filter Options Endpoint

Fetch available filter values for dynamic sidebar rendering:

### `GET /products/filter-options`

No auth required. No query parameters.

### Response Shape

```typescript
interface FilterOptions {
  brands: string[];                                    // Sorted A-Z
  categories: {
    id: string;                                        // UUID
    name: string;                                      // Category name
    slug: string;                                      // URL-friendly slug
    productCount: number;                              // Number of published products
  }[];
  priceRange: { min: number; max: number };
  discountRange: { min: number; max: number };
  weightRange: { min: number | null; max: number | null };
  ratingRange: { min: number; max: number };
  tags: string[];                                      // Sorted A-Z
  availabilityStatuses: string[];                      // e.g. ["In Stock", "Low Stock", "Out of Stock"]
}
```

### Example Response

```json
{
  "brands": ["Apple", "Samsung", "Sony", "Xiaomi"],
  "categories": [
    { "id": "uuid-1", "name": "Electronics", "slug": "electronics", "productCount": 42 },
    { "id": "uuid-2", "name": "Clothing", "slug": "clothing", "productCount": 18 }
  ],
  "priceRange": { "min": 0, "max": 2499.99 },
  "discountRange": { "min": 0, "max": 50 },
  "weightRange": { "min": 0.05, "max": 25 },
  "ratingRange": { "min": 0, "max": 5 },
  "tags": ["electronics", "fashion", "new-arrival", "sale"],
  "availabilityStatuses": ["In Stock", "Low Stock", "Out of Stock"]
}
```

> **Note:** Categories are sorted by `productCount` descending (most popular first).
> Brands and tags are sorted alphabetically.
> This endpoint only considers **published** products.

### Typical Usage

Call this once when the catalog page loads. Cache it with a long `staleTime` (5+ minutes) since these aggregated values change infrequently.

---

## 3. Filter Query Parameters

All parameters are optional. They can be combined in any order.

### 3.1 Core Filter Parameters (existing)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | Page number (≥ 1) |
| `limit` | `number` | `10` | Items per page (max 100) |
| `search` | `string` | — | Search by title or description (ILIKE, case-insensitive) |
| `categoryId` | `UUID` | — | Filter by single category ID |
| `categorySlug` | `string` | — | Filter by single category slug |
| `minPrice` | `number` | — | Minimum price (≥ 0) |
| `maxPrice` | `number` | — | Maximum price (≥ 0) |
| `minRating` | `number` | — | Minimum rating (0–5) |
| `tags` | `string` | — | Comma-separated tag filter (array overlap) |
| `inStockOnly` | `boolean` | `false` | Only show products with `stock > 0` |
| `sortBy` | `enum` | `createdAt` | One of: `price`, `rating`, `createdAt`, `title`, `stock` |
| `sortOrder` | `enum` | `DESC` | `ASC` or `DESC` |

### 3.2 New Filter Parameters (for sidebar)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `brand` | `string` | — | Filter by brand (ILIKE, partial match) |
| `onSale` | `boolean` | — | Only show products with an active discount (`discountPercentage > 0`) |
| `minDiscount` | `number` | — | Minimum discount percentage (0–100) |
| `maxDiscount` | `number` | — | Maximum discount percentage (0–100) |
| `minWeight` | `number` | — | Minimum weight in kg/lb |
| `maxWeight` | `number` | — | Maximum weight in kg/lb |
| `categoryIds` | `string` | — | Comma-separated UUIDs for multi-category selection |

---

## 4. Full Filter Usage Examples

### 4.1 Basic Product Listing

```
GET /products?page=1&limit=20&sortBy=createdAt&sortOrder=DESC
```

### 4.2 Price Range + Brand

```
GET /products?minPrice=50&maxPrice=500&brand=Samsung&sortBy=price&sortOrder=ASC
```

### 4.3 Multi-Category + On Sale

```
GET /products?categoryIds=uuid-1,uuid-2,uuid-3&onSale=true&sortBy=discount&sortOrder=DESC
```

### 4.4 Sale Items + Discount Range

```
GET /products?onSale=true&minDiscount=20&maxDiscount=50&sortBy=discount&sortOrder=DESC
```

### 4.5 Search + Availability + Rating

```
GET /products?search=wireless+headphones&inStockOnly=true&minRating=4&sortBy=rating
```

### 4.6 Weight Range Filter

```
GET /products?minWeight=1&maxWeight=5&sortBy=price
```

### 4.7 Full Combo (All Filters)

```
GET /products?page=1&limit=12&search=phone&brand=Apple&categoryIds=uuid-1,uuid-2
  &minPrice=500&maxPrice=2000&minDiscount=10&onSale=true&inStockOnly=true
  &minRating=3.5&tags=electronics,sale&sortBy=price&sortOrder=ASC
```

### 4.8 Category Page with Filters

```
GET /products/category/electronics?minPrice=100&maxPrice=1000&brand=Samsung&onSale=true
```

---

## 5. Filtering Sidebar Architecture

Recommended component structure:

```
┌─────────────────────────────────────────────────────────┐
│  ProductCatalogPage                                      │
│  ├── useFilterOptions()       ← fetches filter metadata  │
│  ├── FilterSidebar                                       │
│  │   ├── SearchBox            ← updates search param     │
│  │   ├── CategoryTree         ← checkboxes, from options │
│  │   ├── PriceRangeSlider     ← min/max from options     │
│  │   ├── BrandCheckboxes      ← checkboxes, from options │
│  │   ├── RatingStars          ← clickable star rating    │
│  │   ├── OnSaleToggle         ← boolean toggle           │
│  │   ├── DiscountRangeSlider  ← min/max from options     │
│  │   ├── AvailabilitySelect   ← dropdown or checkboxes   │
│  │   ├── TagCloud             ← clickable tags           │
│  │   └── WeightRange          ← min/max sliders/inputs   │
│  ├── ActiveFiltersBar          ← removable filter chips  │
│  ├── SortDropdown              ← sortBy + sortOrder      │
│  ├── ProductGrid                                        │
│  └── Pagination                                         │
└─────────────────────────────────────────────────────────┘
```

### Filter State Management

Keep all active filters in **URL search params** (single source of truth):

```
/products?page=1&brand=Apple&onSale=true&minPrice=500&sortBy=price&sortOrder=ASC
```

Benefits of URL-based state:
- Shareable/bookmarkable URLs
- Browser back/forward works naturally
- No additional state management library needed
- SSR-friendly (Next.js can read params on the server)

### Clearing Filters

When the user clears an individual filter, remove that param from the URL and reset `page` to 1.

When the user clears all filters, redirect to:

```
GET /products?page=1&limit=12
```

---

## 6. Pagination & Filtering Integration

The response shape for all filtered requests is:

```typescript
interface PaginatedProducts {
  data: Product[];
  total: number;           // Total matching products (after filters)
  totalPages: number;      // total / limit, rounded up
  page: number;            // Current page
  limit: number;           // Items per page
}
```

**Important:** Filters affect `total` and `totalPages`. When a filter is applied or removed, always reset `page` to 1:

```
// Before: /products?page=3&brand=Apple (15 results, 2 pages)
// User adds onSale=true filter → 6 results, 1 page

// Correct:
/products?page=1&brand=Apple&onSale=true
```

### Pagination Component Logic

```typescript
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

- Hide pagination if `totalPages <= 1`
- Disable "Previous" on page 1
- Disable "Next" on last page
- On page change, update URL param `page` and keep all existing filter params

---

## 7. TypeScript Types

```typescript
// ─── Filter Options (from GET /products/filter-options) ──────────────
export interface FilterOptions {
  brands: string[];
  categories: FilterCategoryOption[];
  priceRange: Range;
  discountRange: Range;
  weightRange: NullableRange;
  ratingRange: Range;
  tags: string[];
  availabilityStatuses: string[];
}

export interface FilterCategoryOption {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface Range {
  min: number;
  max: number;
}

export interface NullableRange {
  min: number | null;
  max: number | null;
}

// ─── Filter Query (all params optional) ──────────────────────────────
export interface FilterProductsQuery {
  page?: number;
  limit?: number;
  search?: string;

  // Category
  categoryId?: string;       // single UUID
  categorySlug?: string;     // single slug
  categoryIds?: string;      // comma-separated UUIDs for multi-select

  // Price
  minPrice?: number;
  maxPrice?: number;

  // Discount
  onSale?: boolean;
  minDiscount?: number;      // 0–100
  maxDiscount?: number;      // 0–100

  // Rating
  minRating?: number;        // 0–5

  // Brand
  brand?: string;

  // Weight
  minWeight?: number;
  maxWeight?: number;

  // Tags & Availability
  tags?: string;             // comma-separated
  inStockOnly?: boolean;

  // Sorting
  sortBy?: ProductSortField;
  sortOrder?: SortOrder;
}

export type ProductSortField = 'price' | 'rating' | 'createdAt' | 'title' | 'stock';
export type SortOrder = 'ASC' | 'DESC';

// ─── Paginated Response ──────────────────────────────────────────────
export interface PaginatedProducts {
  data: Product[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}
```

---

## 8. API Client Functions

```typescript
// lib/api/products.ts

import api from './client';
import type {
  Product,
  PaginatedProducts,
  FilterProductsQuery,
  FilterOptions,
} from '@/types/products';

// ─── Public ──────────────────────────────────────────────────────────

/** Fetch available filter options (brands, categories, ranges, etc.) */
export async function publicGetFilterOptions(): Promise<FilterOptions> {
  const { data } = await api.get<FilterOptions>('/products/filter-options');
  return data;
}

/** Fetch published products with filters */
export async function publicListProducts(
  query: FilterProductsQuery = {},
): Promise<PaginatedProducts> {
  const { data } = await api.get<PaginatedProducts>('/products', {
    params: query,
  });
  return data;
}

/** Fetch a single product by slug */
export async function publicGetProductBySlug(slug: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${slug}`);
  return data;
}

/** Fetch products by category slug with filters */
export async function publicGetProductsByCategory(
  categorySlug: string,
  query: FilterProductsQuery = {},
): Promise<PaginatedProducts> {
  const { data } = await api.get<PaginatedProducts>(
    `/products/category/${categorySlug}`,
    { params: query },
  );
  return data;
}
```

---

## 9. React Query Hooks

### 9.1 Query Keys

```typescript
// lib/api/products-keys.ts
export const productsKeys = {
  all: ['products'] as const,
  lists: () => [...productsKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...productsKeys.lists(), { filters }] as const,
  filterOptions: () => [...productsKeys.all, 'filterOptions'] as const,
  details: () => [...productsKeys.all, 'detail'] as const,
  detailBySlug: (slug: string) =>
    [...productsKeys.details(), 'slug', slug] as const,
};
```

### 9.2 Hooks

```typescript
// hooks/use-products.ts
import { useQuery } from '@tanstack/react-query';
import { productsKeys } from '@/lib/api/products-keys';
import {
  publicListProducts,
  publicGetProductBySlug,
  publicGetFilterOptions,
} from '@/lib/api/products';
import type { FilterProductsQuery } from '@/types/products';

/** Fetch filter options once (highly cacheable) */
export function useFilterOptions() {
  return useQuery({
    queryKey: productsKeys.filterOptions(),
    queryFn: publicGetFilterOptions,
    staleTime: 5 * 60_000,    // 5 min — rarely changes
    gcTime: 10 * 60_000,      // keep in cache for 10 min
  });
}

/** Fetch published products with current filters */
export function usePublishedProducts(query: FilterProductsQuery = {}) {
  return useQuery({
    queryKey: productsKeys.list(query),
    queryFn: () => publicListProducts(query),
    staleTime: 60_000,        // 1 min
  });
}

/** Fetch a single product by slug */
export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: productsKeys.detailBySlug(slug),
    queryFn: () => publicGetProductBySlug(slug),
    staleTime: 5 * 60_000,    // 5 min
    enabled: !!slug,
  });
}
```

---

## 10. Example: Catalog Page with Filtering Sidebar

```typescript
// app/products/page.tsx
'use client';

import { useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { usePublishedProducts, useFilterOptions } from '@/hooks/use-products';
import { FilterSidebar } from '@/components/FilterSidebar';
import { ProductGrid } from '@/components/ProductGrid';
import { Pagination } from '@/components/Pagination';
import { ActiveFilters } from '@/components/ActiveFilters';
import type { FilterProductsQuery } from '@/types/products';

function parseFilters(searchParams: URLSearchParams): FilterProductsQuery {
  const getNum = (key: string) => {
    const val = searchParams.get(key);
    return val ? Number(val) : undefined;
  };

  return {
    page: getNum('page') || 1,
    limit: getNum('limit') || 12,
    search: searchParams.get('search') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    categorySlug: searchParams.get('category') || undefined,
    categoryIds: searchParams.get('categoryIds') || undefined,
    brand: searchParams.get('brand') || undefined,
    minPrice: getNum('minPrice'),
    maxPrice: getNum('maxPrice'),
    minDiscount: getNum('minDiscount'),
    maxDiscount: getNum('maxDiscount'),
    onSale: searchParams.get('onSale') === 'true' || undefined,
    minRating: getNum('minRating'),
    minWeight: getNum('minWeight'),
    maxWeight: getNum('maxWeight'),
    tags: searchParams.get('tags') || undefined,
    inStockOnly: searchParams.get('inStockOnly') === 'true' || undefined,
    sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as any) || 'DESC',
  };
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = parseFilters(searchParams);
  const { data, isLoading } = usePublishedProducts(filters);
  const { data: filterOptions } = useFilterOptions();

  const updateFilters = useCallback(
    (updates: Partial<FilterProductsQuery>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset page to 1 when filters change (unless page is explicitly updated)
      if (!('page' in updates)) {
        params.set('page', '1');
      }
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const clearFilters = useCallback(() => {
    router.replace(`${pathname}?page=1&limit=12`);
  }, [router, pathname]);

  if (isLoading) return <CatalogSkeleton />;

  return (
    <main className="flex gap-6">
      {/* Filtering Sidebar */}
      <aside className="w-64 shrink-0">
        <FilterSidebar
          filterOptions={filterOptions}
          activeFilters={filters}
          onFilterChange={updateFilters}
          onClearAll={clearFilters}
        />
      </aside>

      {/* Main Content */}
      <section className="flex-1">
        {/* Active filter chips */}
        <ActiveFilters
          filters={filters}
          onRemove={(key) => updateFilters({ [key]: undefined })}
          onClearAll={clearFilters}
        />

        {/* Sort controls */}
        <SortControls
          sortBy={filters.sortBy!}
          sortOrder={filters.sortOrder!}
          onChange={(sortBy, sortOrder) =>
            updateFilters({ sortBy, sortOrder })
          }
        />

        {/* Results */}
        {data?.data.length ? (
          <>
            <ProductGrid products={data.data} />
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={(p) => updateFilters({ page: p })}
            />
          </>
        ) : (
          <EmptyState
            message="No products match your filters"
            action="Clear all filters"
            onAction={clearFilters}
          />
        )}
      </section>
    </main>
  );
}
```

### Filter Sidebar Component (Skeleton)

```typescript
// components/FilterSidebar.tsx
'use client';

import type { FilterOptions, FilterProductsQuery } from '@/types/products';

interface FilterSidebarProps {
  filterOptions?: FilterOptions;
  activeFilters: FilterProductsQuery;
  onFilterChange: (updates: Partial<FilterProductsQuery>) => void;
  onClearAll: () => void;
}

export function FilterSidebar({
  filterOptions,
  activeFilters,
  onFilterChange,
  onClearAll,
}: FilterSidebarProps) {
  if (!filterOptions) return <SidebarSkeleton />;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="font-medium">Search</label>
        <input
          type="text"
          placeholder="Search products..."
          defaultValue={activeFilters.search}
          onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
        />
      </div>

      {/* Category (multi-select) */}
      <div>
        <label className="font-medium">Category</label>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {filterOptions.categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  activeFilters.categoryIds?.includes(cat.id) ||
                  activeFilters.categorySlug === cat.slug
                }
                onChange={() => {
                  const current = activeFilters.categoryIds
                    ? activeFilters.categoryIds.split(',')
                    : [];
                  const updated = current.includes(cat.id)
                    ? current.filter((id) => id !== cat.id)
                    : [...current, cat.id];
                  onFilterChange({
                    categoryIds: updated.length ? updated.join(',') : undefined,
                    categorySlug: undefined,
                    categoryId: undefined,
                  });
                }}
              />
              <span>{cat.name}</span>
              <span className="text-xs text-gray-400">({cat.productCount})</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="font-medium">Price Range</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder={`$${filterOptions.priceRange.min}`}
            defaultValue={activeFilters.minPrice}
            onChange={(e) =>
              onFilterChange({ minPrice: e.target.value ? Number(e.target.value) : undefined })
            }
          />
          <span>—</span>
          <input
            type="number"
            placeholder={`$${filterOptions.priceRange.max}`}
            defaultValue={activeFilters.maxPrice}
            onChange={(e) =>
              onFilterChange({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
      </div>

      {/* Brand */}
      {filterOptions.brands.length > 0 && (
        <div>
          <label className="font-medium">Brand</label>
          <select
            value={activeFilters.brand ?? ''}
            onChange={(e) =>
              onFilterChange({ brand: e.target.value || undefined })
            }
          >
            <option value="">All Brands</option>
            {filterOptions.brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* On Sale Toggle */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!activeFilters.onSale}
          onChange={(e) => onFilterChange({ onSale: e.target.checked || undefined })}
        />
        <span className="font-medium">On Sale</span>
      </label>

      {/* Rating */}
      <div>
        <label className="font-medium">Minimum Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() =>
                onFilterChange({
                  minRating: activeFilters.minRating === star ? undefined : star,
                })
              }
            >
              {star <= (activeFilters.minRating ?? 0) ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="font-medium">Availability</label>
        <div className="space-y-1">
          {filterOptions.availabilityStatuses.map((status) => (
            <label key={status} className="flex items-center gap-2">
              <input
                type="radio"
                name="availability"
                checked={activeFilters.availabilityStatus === status}
                onChange={() =>
                  onFilterChange({
                    availabilityStatus:
                      activeFilters.availabilityStatus === status ? undefined : (status as any),
                  })
                }
              />
              {status}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!activeFilters.inStockOnly}
              onChange={(e) =>
                onFilterChange({ inStockOnly: e.target.checked || undefined })
              }
            />
            <span>In Stock Only</span>
          </label>
        </div>
      </div>

      {/* Tags */}
      {filterOptions.tags.length > 0 && (
        <div>
          <label className="font-medium">Tags</label>
          <div className="flex flex-wrap gap-2">
            {filterOptions.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  const current = activeFilters.tags
                    ? activeFilters.tags.split(',')
                    : [];
                  const updated = current.includes(tag)
                    ? current.filter((t) => t !== tag)
                    : [...current, tag];
                  onFilterChange({
                    tags: updated.length ? updated.join(',') : undefined,
                  });
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear All */}
      <button onClick={onClearAll} className="w-full">
        Clear All Filters
      </button>
    </div>
  );
}
```

---

## 11. Gotchas & Edge Cases

### 11.1 Page Reset on Filter Change

When any filter parameter changes (except `page` itself), always reset `page` to 1. Otherwise the user could be on page 3 and apply a brand filter that returns only 1 page of results, leading to an empty response.

### 11.2 `categoryIds` vs `categoryId`/`categorySlug`

- `categoryId` / `categorySlug` — single category filter (overrides `categoryIds` if set)
- `categoryIds` — multi-category filter (comma-separated UUIDs)
- If both `categorySlug` AND `categoryIds` are provided, `categorySlug` takes precedence on the backend

### 11.3 Boolean Query Params

The backend uses `@Type(() => Boolean)` from `class-transformer`:
- `'true'`, `true`, `1`, `'1'` → `true`
- `'false'`, `false`, `0`, `'0'` → `false`
- **Frontend:** Always send `?onSale=true` as a string in query params

### 11.4 Empty Filter Results

When no products match the applied filters, the response is:
```json
{
  "data": [],
  "total": 0,
  "totalPages": 0,
  "page": 1,
  "limit": 12
}
```

Display an empty state with a "Clear all filters" action.

### 11.5 Filter Options with No Data

If the catalog has no published products, `GET /products/filter-options` returns:
```json
{
  "brands": [],
  "categories": [],
  "priceRange": { "min": 0, "max": 0 },
  "discountRange": { "min": 0, "max": 0 },
  "weightRange": { "min": null, "max": null },
  "ratingRange": { "min": 0, "max": 0 },
  "tags": [],
  "availabilityStatuses": []
}
```

### 11.6 Brand Filter is ILIKE (Partial Match)

The `brand` parameter uses `ILIKE '%value%'` — it's a partial, case-insensitive match. Filtering by `?brand=apple` will match `"Apple"`, `"APPLE"`, `"Apple Inc."`.

### 11.7 Tags Filter is Array Overlap

The `tags` parameter uses PostgreSQL's `&&` (array overlap) operator. Any product whose `tags` array contains at least one of the specified tags will match. Tags are comma-separated: `?tags=electronics,sale`.

### 11.8 Sort Field `discount` is NOT Available

Sorting by discount percentage is not in the whitelisted sort fields. If the frontend wants to sort by discount, use `sortBy=price` or implement client-side sorting after fetching.

### 11.9 Filter Options Cache Invalidation

When a product is created/updated/deleted in the admin panel, the filter options should be invalidated:
```typescript
// After product mutations:
queryClient.invalidateQueries({ queryKey: productsKeys.filterOptions() });
queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
```

### 11.10 `weightRange` Can Have Null Values

If no products have a `weight` value, the range returns `{ "min": null, "max": null }`. Handle this in the frontend by hiding the weight filter when both values are null.

---

## Appendix A: Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PRODUCTS FILTERING — QUICK REFERENCE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Filter Options:  GET /products/filter-options  (no auth, no params)        │
│  Product List:    GET /products?param1=val1&param2=val2                     │
│  Category Page:   GET /products/category/:slug?filters                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  NEW FILTER PARAMS:                                                         │
│  brand:          string (ILIKE partial match)                               │
│  onSale:         boolean (discountPercentage > 0)                           │
│  minDiscount:    number (0–100)                                             │
│  maxDiscount:    number (0–100)                                             │
│  minWeight:      number (≥ 0)                                               │
│  maxWeight:      number (≥ 0)                                               │
│  categoryIds:    string (comma-separated UUIDs)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  EXISTING FILTER PARAMS:                                                    │
│  page, limit, search, categoryId, categorySlug                              │
│  minPrice, maxPrice, minRating, tags, inStockOnly                           │
│  sortBy (price|rating|createdAt|title|stock), sortOrder (ASC|DESC)          │
├─────────────────────────────────────────────────────────────────────────────┤
│  RESPONSE SHAPE:  { data: Product[], total, totalPages, page, limit }       │
│  PAGE RESET:      Always reset page → 1 when filters change                 │
│  CACHE FILTERS:   staleTime ≥ 5 min for filter-options                      │
│  EMPTY STATE:     data: [], total: 0, totalPages: 0                         │
└─────────────────────────────────────────────────────────────────────────────┘
```
