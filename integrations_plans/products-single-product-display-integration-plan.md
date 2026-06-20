# Single Product Display — Frontend Integration Plan

> **Backend:** NestJS v11 · TypeORM · PostgreSQL
> **Last Updated:** 2026-06-20
> **Audience:** Frontend / Full-Stack Developers
> **Scope:** Endpoints and patterns for displaying **one** product on the storefront (PDP) and in the admin dashboard.

This plan is a focused companion to `products-integration-plan.md`. It covers only the two endpoints that return a single product record and everything a frontend dev needs to render it correctly.

> **Breaking change (2026-06-20):** The public single-product endpoint has been migrated from `:slug` to `:id` (UUID v4). See [§12.14](#1214-migrated-from-slug-to-id-on-2026-06-20) for migration notes.

---

## Table of Contents

1. [Endpoint Map](#1-endpoint-map)
2. [Path Parameters](#2-path-parameters)
3. [Response Schema](#3-response-schema)
4. [Full Response Examples](#4-full-response-examples)
5. [Field-by-Field Reference](#5-field-by-field-reference)
6. [API Client Functions](#6-api-client-functions)
7. [React Query Hooks](#7-react-query-hooks)
8. [Next.js Detail Page Example](#8-nextjs-detail-page-example)
9. [Error Handling](#9-error-handling)
10. [Caching Strategy](#10-caching-strategy)
11. [SEO & Metadata (Next.js)](#11-seo--metadata-nextjs)
12. [Gotchas & Edge Cases](#12-gotchas--edge-cases)
13. [Quick Reference Card](#13-quick-reference-card)

---

## 1. Endpoint Map

| Use case | Method | Path | Auth | Path Param | Response |
|----------|--------|------|------|------------|----------|
| **Storefront PDP** (anonymous visitors) | `GET` | `/products/:id` | None | `id` (UUID v4) | [`Product`](#product) |
| **Admin dashboard** (editing / previewing drafts) | `GET` | `/admin/products/:id` | JWT + `ADMIN` role | `id` (UUID v4) | [`Product`](#product) |

> **Rule of thumb:**
> - Both endpoints now use the **product UUID** as the path parameter.
> - The public endpoint accepts the same UUID format as the admin endpoint (validated by `ParseUUIDPipe`).
> - The `slug` is **not** used in the URL anymore — it remains on the response body for legacy URL construction, OG-image alt text, and breadcrumb display.
> - The public endpoint returns **any** product matching the ID (published or draft). Drafts are not hidden because the UUID is not enumerable. If you want to hide drafts, fetch the product via the admin endpoint.
> - Both endpoints return `404` for soft-deleted products.

---

## 2. Path Parameters

### 2.1 Public — `GET /products/:id`

| Param | Type | Required | Format | Example |
|-------|------|----------|--------|---------|
| `id` | `string` | ✅ Yes | UUID v4 (validated by `ParseUUIDPipe`) | `9d4e8b3a-7c2f-4a1e-bb9d-3f5a6b7c8d9e` |

- UUID format enforced — invalid IDs return `400 Bad Request`.
- Returns `404` if the product has been soft-deleted.
- Returns `404` if the product does not exist.

### 2.2 Admin — `GET /admin/products/:id`

| Param | Type | Required | Format | Example |
|-------|------|----------|--------|---------|
| `id` | `string` | ✅ Yes | UUID v4 (validated by `ParseUUIDPipe`) | `9d4e8b3a-7c2f-4a1e-bb9d-3f5a6b7c8d9e` |

- UUID format enforced — invalid IDs return `400 Bad Request`.
- Admin endpoint returns drafts and unpublished products.
- Returns `404` if the product has been soft-deleted (it won't appear in queries at all).

### 2.3 No Query Parameters

Neither endpoint accepts any query string. The single-product response is fully self-contained — there is no `?include=`, `?fields=`, or `?expand=` option. If you need additional data, fetch it from the relevant endpoint (e.g. related products, reviews history, etc.).

---

## 3. Response Schema

### 3.1 `Product` (TypeScript)

```typescript
export interface ProductDimensions {
  width: number;   // cm
  height: number;  // cm
  depth: number;   // cm
}

export interface ProductReview {
  rating: number;        // 1–5
  comment: string;
  date: string;          // ISO 8601 (e.g. "2026-05-14T09:30:00.000Z")
  reviewerName: string;
  reviewerEmail: string; // ⚠️ PII — see Gotcha #12.6
}

export interface CategoryBrief {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  // ── Identity ─────────────────────────────────────────────────────
  id: string;                        // UUID
  title: string;                     // max 300 chars
  slug: string;                      // URL-safe, unique, max 350 chars (still returned, but not used in URL)
  description: string;               // full text (plain or HTML — backend stores as-is)
  shortDescription: string | null;   // optional summary, may be null

  // ── Pricing (DECIMAL — formatted as number in JSON) ───────────────
  price: number;                     // decimal(10,2), e.g. 199.99
  discountPercentage: number;        // decimal(5,2), 0–100
  discountedPrice: number;           // auto-computed = price - (price × discount / 100)

  // ── Inventory ─────────────────────────────────────────────────────
  stock: number;                     // integer, ≥ 0
  sku: string;                       // unique, max 50 chars
  minimumOrderQuantity: number;      // integer, ≥ 1, default 1
  availabilityStatus:                // derived by backend stock logic
    | 'In Stock'
    | 'Low Stock'
    | 'Out of Stock';

  // ── Classification ───────────────────────────────────────────────
  categoryId: string | null;         // UUID, may be null if uncategorised
  category: CategoryBrief | null;    // embedded relation (id, name, slug only)
  tags: string[];                    // normalised: lowercase, trimmed, unique-ish
  brand: string | null;              // max 100 chars, may be null

  // ── Physical ──────────────────────────────────────────────────────
  weight: number | null;             // decimal(8,2), kg or g (check product copy)
  dimensions: ProductDimensions | null;

  // ── Media ────────────────────────────────────────────────────────
  images: string[];                  // absolute URLs
  thumbnail: string | null;          // absolute URL or null

  // ── Policies ──────────────────────────────────────────────────────
  warrantyInformation: string | null;
  shippingInformation: string | null;
  returnPolicy: string | null;

  // ── Reviews & rating ──────────────────────────────────────────────
  reviews: ProductReview[];          // JSONB array embedded on the product
  rating: number;                    // decimal(3,2), auto-computed average from reviews

  // ── Meta ──────────────────────────────────────────────────────────
  barcode: string | null;
  qrCode: string | null;
  isPublished: boolean;

  // ── Timestamps ────────────────────────────────────────────────────
  createdAt: string;                 // ISO 8601
  updatedAt: string;                 // ISO 8601
  deletedAt: string | null;          // ISO 8601 or null (only set on soft-delete)
}
```

### 3.2 Why a flat shape?

The endpoint always returns the **full product record** — no projection, no field selection. This is intentional: a product page is small (~5 KB) and benefits from a single round-trip. If you want a lighter payload for cards/lists, use the **list** endpoint instead (see `products-integration-plan.md`).

---

## 4. Full Response Examples

### 4.1 Success — Published product (public endpoint)

**Request**

```http
GET /products/9d4e8b3a-7c2f-4a1e-bb9d-3f5a6b7c8d9e HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Response — `200 OK`**

```json
{
  "id": "9d4e8b3a-7c2f-4a1e-bb9d-3f5a6b7c8d9e",
  "title": "Wireless Bluetooth Headphones Pro",
  "slug": "wireless-bluetooth-headphones-pro",
  "description": "Premium over-ear wireless headphones with active noise cancellation, 40-hour battery life, and multipoint Bluetooth 5.3 connectivity. Includes carrying case and USB-C charging cable.",
  "shortDescription": "ANC over-ear headphones with 40h battery",
  "price": 299.99,
  "discountPercentage": 15.00,
  "discountedPrice": 254.99,
  "stock": 42,
  "sku": "WBH-PRO-001",
  "minimumOrderQuantity": 1,
  "availabilityStatus": "In Stock",
  "categoryId": "7b1f0c2e-5a4d-4d3c-9e1a-2b3c4d5e6f70",
  "category": {
    "id": "7b1f0c2e-5a4d-4d3c-9e1a-2b3c4d5e6f70",
    "name": "Audio & Headphones",
    "slug": "audio-headphones"
  },
  "tags": ["bluetooth", "wireless", "anc", "premium"],
  "brand": "SoundCore",
  "weight": 0.32,
  "dimensions": {
    "width": 18.5,
    "height": 21.0,
    "depth": 8.2
  },
  "images": [
    "https://cdn.example.com/products/wbh-pro-001-1.jpg",
    "https://cdn.example.com/products/wbh-pro-001-2.jpg",
    "https://cdn.example.com/products/wbh-pro-001-3.jpg"
  ],
  "thumbnail": "https://cdn.example.com/products/wbh-pro-001-thumb.jpg",
  "warrantyInformation": "2-year manufacturer warranty",
  "shippingInformation": "Free standard shipping (3–5 business days)",
  "returnPolicy": "30-day money-back guarantee",
  "reviews": [
    {
      "rating": 5,
      "comment": "Excellent noise cancellation. Worth every penny.",
      "date": "2026-05-14T09:30:00.000Z",
      "reviewerName": "John D.",
      "reviewerEmail": "j***@example.com"
    },
    {
      "rating": 4,
      "comment": "Great sound, slightly heavy for long sessions.",
      "date": "2026-04-22T14:15:00.000Z",
      "reviewerName": "Sarah M.",
      "reviewerEmail": "s***@example.com"
    }
  ],
  "rating": 4.50,
  "barcode": "0123456789012",
  "qrCode": "https://cdn.example.com/qr/wbh-pro-001.png",
  "isPublished": true,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-05-20T08:30:00.000Z",
  "deletedAt": null
}
```

### 4.2 Success — Draft product (admin endpoint)

The admin endpoint returns the **same shape** but is reachable only with a valid admin JWT:

```json
{
  "id": "9d4e8b3a-7c2f-4a1e-bb9d-3f5a6b7c8d9e",
  "title": "Wireless Bluetooth Headphones Pro",
  "slug": "wireless-bluetooth-headphones-pro",
  "isPublished": false,
  "stock": 0,
  "availabilityStatus": "Out of Stock",
  "reviews": [],
  "rating": 0,
  "...": "..."
}
```

### 4.3 Error — Product not found

**Request**

```http
GET /products/00000000-0000-0000-0000-000000000000 HTTP/1.1
```

**Response — `404 Not Found`**

```json
{
  "statusCode": 404,
  "message": "Product with ID \"00000000-0000-0000-0000-000000000000\" not found",
  "timestamp": "2026-06-20T10:15:30.000Z",
  "path": "/products/00000000-0000-0000-0000-000000000000"
}
```

### 4.4 Error — Invalid UUID format

**Request**

```http
GET /products/not-a-uuid HTTP/1.1
```

**Response — `400 Bad Request`**

```json
{
  "statusCode": 400,
  "message": "Validation failed (uuid is expected)",
  "timestamp": "2026-06-20T10:15:30.000Z",
  "path": "/products/not-a-uuid"
}
```

> Both the public and admin endpoints return `400` for malformed UUIDs.

### 4.5 Error — Missing/expired JWT on admin endpoint

**Response — `401 Unauthorized`**

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "timestamp": "2026-06-20T10:15:30.000Z",
  "path": "/admin/products/9d4e8b3a-7c2f-4a1e-bb9d-3f5a6b7c8d9e"
}
```

### 4.6 Error — Non-admin user calls admin endpoint

**Response — `403 Forbidden`**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "timestamp": "2026-06-20T10:15:30.000Z",
  "path": "/admin/products/9d4e8b3a-7c2f-4a1e-bb9d-3f5a6b7c8d9e"
}
```

---

## 5. Field-by-Field Reference

### 5.1 Pricing fields

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `price` | `number` | User input | `decimal(10,2)` — always 2 decimal places |
| `discountPercentage` | `number` | User input | `decimal(5,2)`, range `0–100` |
| `discountedPrice` | `number` | **Computed by backend** | `price − (price × discountPercentage / 100)`, rounded to 2 dp |

> Always display prices with `Number(value).toFixed(2)` to avoid floating-point artefacts like `199.98999999998`.

### 5.2 Stock & availability

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `stock` | `number` | User input + decremented on orders | Use for "X left in stock" copy |
| `availabilityStatus` | `string` | **Auto-derived** from `stock` | `> 10` → "In Stock" · `1–10` → "Low Stock" · `0` → "Out of Stock" |

Use `availabilityStatus` for badge colours, not custom logic — the backend is the source of truth.

### 5.3 Media fields

| Field | Type | Format | Notes |
|-------|------|--------|-------|
| `images` | `string[]` | Absolute URLs | Order is preserved (image #1 is the hero) |
| `thumbnail` | `string \| null` | Absolute URL | Use for cards/lists; `null` if not set |

If `images` is empty, fall back to a placeholder. **Never** assume `thumbnail` is present.

### 5.4 Relation fields

| Field | Type | Notes |
|-------|------|-------|
| `categoryId` | `string \| null` | Raw FK — may be `null` if category was deleted |
| `category` | `CategoryBrief \| null` | Embedded — only `id`, `name`, `slug` (no description, no product list) |
| `reviews` | `ProductReview[]` | Embedded JSONB — full review objects |
| `rating` | `number` | Average of `reviews[].rating`, or `0` if no reviews |

The `category` relation is **always included** on detail responses (the service uses `relations: ['category']`). `reviews` is **always embedded** as JSONB — there is no separate `GET /products/:id/reviews` endpoint.

### 5.5 Timestamps

All timestamps are **ISO 8601 strings** in the JSON response (TypeORM serialises `Date` to string):

```
2026-06-20T10:15:30.000Z
```

JavaScript `new Date(product.createdAt)` parses this directly. Display with `toLocaleString()` or `Intl.DateTimeFormat`.

### 5.6 The `slug` field is informational only

`slug` is still returned on every product (the entity column is unchanged) but **it is no longer the lookup key for the single-product endpoint**. Use it for:
- Human-readable URLs in your frontend router (e.g. `/shop/wireless-bluetooth-headphones-pro`)
- Breadcrumb text
- OG / share image alt text
- Legacy link construction

Always pass the **UUID `id`** to the API.

---

## 6. API Client Functions

### 6.1 Axios client (assumed already configured)

```typescript
// lib/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken(); // your helper (cookie, localStorage, etc.)
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

### 6.2 Single-product functions

```typescript
// lib/api/products.ts
import api from './client';
import type { Product } from '@/types/products';

/**
 * Public — fetch a single product by UUID.
 * Use this for storefront PDPs.
 * Returns 404 if the product doesn't exist.
 * Returns 400 if the id is not a valid UUID.
 */
export async function getProductById(id: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
}

/**
 * Admin — fetch a single product by UUID.
 * Requires JWT + ADMIN role.
 * Returns drafts and unpublished products.
 */
export async function getAdminProductById(id: string): Promise<Product> {
  const { data } = await api.get<Product>(`/admin/products/${id}`);
  return data;
}
```

> The public and admin clients share the same shape — choose based on the auth context. Most storefront code uses only `getProductById`; admin pages use `getAdminProductById`.

---

## 7. React Query Hooks

### 7.1 Query key factory

```typescript
// lib/api/products-keys.ts
export const productsKeys = {
  all: ['products'] as const,
  detail: (id: string) => [...productsKeys.all, 'detail', id] as const,
  adminDetail: (id: string) => [...productsKeys.all, 'admin', 'detail', id] as const,
};
```

### 7.2 Public hook

```typescript
// hooks/use-product.ts
import { useQuery } from '@tanstack/react-query';
import { productsKeys } from '@/lib/api/products-keys';
import { getProductById } from '@/lib/api/products';
import type { ApiError } from '@/types/api';

export function useProduct(id: string | undefined) {
  return useQuery<Product, ApiError>({
    queryKey: productsKeys.detail(id ?? ''),
    queryFn: () => getProductById(id as string),
    enabled: !!id,
    staleTime: 5 * 60_000,        // 5 minutes — product detail is very stable
    gcTime: 30 * 60_000,          // keep in cache for 30 min after last subscriber
    retry: (failureCount, error) => {
      // Don't retry 404 / 400 — the product genuinely doesn't exist or the id is malformed
      if (error?.statusCode === 404 || error?.statusCode === 400) return false;
      return failureCount < 2;
    },
  });
}
```

### 7.3 Admin hook

```typescript
// hooks/use-admin-product.ts
import { useQuery } from '@tanstack/react-query';
import { productsKeys } from '@/lib/api/products-keys';
import { getAdminProductById } from '@/lib/api/products';
import type { ApiError } from '@/types/api';

export function useAdminProduct(id: string | undefined) {
  return useQuery<Product, ApiError>({
    queryKey: productsKeys.adminDetail(id ?? ''),
    queryFn: () => getAdminProductById(id as string),
    enabled: !!id,
    staleTime: 30_000,             // 30 seconds — admins want fresher data
    retry: (failureCount, error) => {
      if (error?.statusCode === 404 || error?.statusCode === 400) return false;
      return failureCount < 2;
    },
  });
}
```

---

## 8. Next.js Detail Page Example

### 8.1 Public PDP — `app/products/[slug]/page.tsx`

> **Note on routing:** The frontend route may still use `[slug]` for SEO/UX (it's human-readable), but you must **resolve the product ID before calling the API**. The two strategies below show both options.

**Strategy A — Look up by slug from a list/cache, then call the API by ID:**

```typescript
'use client';

import { useParams } from 'next/navigation';
import { useProduct } from '@/hooks/use-product';
import { StockBadge } from '@/components/StockBadge';
import { PriceDisplay } from '@/components/PriceDisplay';
import { ImageGallery } from '@/components/ImageGallery';
import { AddToCartButton } from '@/components/AddToCartButton';
import { useProductIndex } from '@/hooks/use-product-index'; // resolves slug -> id

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  // Resolve the slug to a UUID via your product index / sitemap.
  // Many stores prefetch this into a router-level cache (SWR, React Query, etc.).
  const { data: indexEntry, isLoading: indexLoading } = useProductIndex(slug);
  const productId = indexEntry?.id;

  const { data: product, isLoading, error, isError } = useProduct(productId);

  if (indexLoading || isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (isError) {
    if (error?.statusCode === 404) {
      return (
        <main className="not-found">
          <h1>Product not found</h1>
          <p>This product may have been removed or unpublished.</p>
          <a href="/products">← Back to catalog</a>
        </main>
      );
    }
    if (error?.statusCode === 400) {
      // Should not happen if the index lookup is correct, but handle defensively.
      return (
        <main className="not-found">
          <h1>Product not found</h1>
          <a href="/products">← Back to catalog</a>
        </main>
      );
    }
    return (
      <main className="error">
        <h1>Something went wrong</h1>
        <p>Please try again later.</p>
      </main>
    );
  }

  if (!product) return null;

  // ── Success state ───────────────────────────────────────────────
  return (
    <main className="product-detail">
      <div className="gallery-column">
        <ImageGallery
          images={product.images}
          thumbnail={product.thumbnail}
          alt={product.title}
        />
      </div>

      <div className="info-column">
        <nav className="breadcrumb">
          <a href="/products">Products</a>
          {product.category && (
            <>
              {' / '}
              <a href={`/products/category/${product.category.slug}`}>
                {product.category.name}
              </a>
            </>
          )}
        </nav>

        <h1>{product.title}</h1>

        {product.shortDescription && (
          <p className="short-description">{product.shortDescription}</p>
        )}

        <PriceDisplay
          price={product.price}
          discountPercentage={product.discountPercentage}
          discountedPrice={product.discountedPrice}
        />

        <div className="meta">
          <StockBadge
            stock={product.stock}
            availabilityStatus={product.availabilityStatus}
          />
          {product.brand && <span className="brand">Brand: {product.brand}</span>}
          <span className="sku">SKU: {product.sku}</span>
        </div>

        {product.rating > 0 && (
          <div className="rating">
            {'★'.repeat(Math.round(product.rating))}
            {'☆'.repeat(5 - Math.round(product.rating))}
            <span>({product.reviews.length} reviews)</span>
          </div>
        )}

        <AddToCartButton
          productId={product.id}
          minQuantity={product.minimumOrderQuantity}
          maxQuantity={product.stock}
          disabled={product.availabilityStatus === 'Out of Stock'}
        />

        <section className="description">
          <h2>Description</h2>
          <p>{product.description}</p>
        </section>

        {product.dimensions && (
          <section className="dimensions">
            <h3>Dimensions</h3>
            <ul>
              <li>Width: {product.dimensions.width} cm</li>
              <li>Height: {product.dimensions.height} cm</li>
              <li>Depth: {product.dimensions.depth} cm</li>
            </ul>
          </section>
        )}

        {product.warrantyInformation && (
          <p className="policy">Warranty: {product.warrantyInformation}</p>
        )}
        {product.shippingInformation && (
          <p className="policy">Shipping: {product.shippingInformation}</p>
        )}
        {product.returnPolicy && (
          <p className="policy">Returns: {product.returnPolicy}</p>
        )}
      </div>
    </main>
  );
}

function ProductDetailSkeleton() {
  return <div className="skeleton">Loading product…</div>;
}
```

**Strategy B — Use ID-based routing (`/products/[id]`):**

If you don't need SEO-friendly URLs, route directly by UUID. Simpler, but less pretty:

```typescript
// app/products/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useProduct } from '@/hooks/use-product';
import { ProductDetailView } from '@/components/ProductDetailView';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: product, isLoading, error } = useProduct(id);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error loading product.</p>;
  if (!product) return null;

  return <ProductDetailView product={product} />;
}
```

### 8.2 Admin edit page — `app/admin/products/[id]/page.tsx`

```typescript
'use client';

import { useParams } from 'next/navigation';
import { useAdminProduct } from '@/hooks/use-admin-product';
import { ProductEditForm } from '@/components/admin/ProductEditForm';

export default function AdminProductEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: product, isLoading, error } = useAdminProduct(id);

  if (isLoading) return <p>Loading…</p>;
  if (error) {
    if (error.statusCode === 404) return <p>Product not found.</p>;
    if (error.statusCode === 403) return <p>You do not have access.</p>;
    return <p>Error loading product.</p>;
  }
  if (!product) return null;

  return <ProductEditForm product={product} />;
}
```

### 8.3 Server Component variant (preferred for SEO)

If your Next.js app uses the App Router with Server Components, fetch the product server-side. **You must know the UUID at request time** — typically resolved from the slug via `generateStaticParams()`:

```typescript
// app/products/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Product } from '@/types/products';
import { ProductDetailView } from '@/components/ProductDetailView';
import { getProductIdBySlug } from '@/lib/products-index'; // your slug->id resolver

async function fetchProduct(id: string): Promise<Product | null> {
  const res = await fetch(
    `${process.env.API_URL}/products/${id}`,
    {
      headers: { cookie: headers().get('cookie') ?? '' },
      next: { revalidate: 300, tags: [`product:${id}`] }, // ISR: 5 min
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load product');
  return res.json();
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const id = await getProductIdBySlug(params.slug);
  if (!id) notFound();

  const product = await fetchProduct(id);
  if (!product) notFound();
  return <ProductDetailView product={product} />;
}
```

This enables **ISR** (Incremental Static Regeneration) and removes client-side fetch waterfalls.

---

## 9. Error Handling

### 9.1 Status code summary

| Endpoint | `400` | `401` | `403` | `404` | `500` |
|----------|-------|-------|-------|-------|-------|
| `GET /products/:id` | ✅ Invalid UUID | — | — | ✅ ID not found | ✅ Server error |
| `GET /admin/products/:id` | ✅ Invalid UUID | ✅ Missing/expired JWT | ✅ Not an admin | ✅ ID not found | ✅ Server error |

### 9.2 `ApiError` shape (from `GlobalExceptionFilter`)

```typescript
export interface ApiError {
  statusCode: number;
  message: string | string[];
  errors?: Array<{ field: string; message: string }>;
  timestamp: string;   // ISO 8601
  path: string;        // request URL
}
```

### 9.3 Error-handling helper

```typescript
// lib/api/error-utils.ts
import type { ApiError } from '@/types/api';

export function isNotFound(err: unknown): boolean {
  return (err as ApiError)?.statusCode === 404;
}

export function isBadRequest(err: unknown): boolean {
  return (err as ApiError)?.statusCode === 400;
}

export function isUnauthorized(err: unknown): boolean {
  const code = (err as ApiError)?.statusCode;
  return code === 401 || code === 403;
}

export function getErrorMessage(err: unknown): string {
  const e = err as ApiError;
  if (Array.isArray(e?.message)) return e.message[0] ?? 'Unknown error';
  return e?.message ?? 'Unknown error';
}
```

### 9.4 UX recommendations

| Error | Recommended UX |
|-------|----------------|
| `404` on public PDP | Friendly "Product not found" page + link back to catalog. |
| `400` on public PDP | Usually indicates a malformed URL — treat the same as `404` from the user's perspective. |
| `401` on admin | Redirect to `/login?returnUrl=/admin/products/...`. |
| `403` on admin | Show "You don't have permission to view this product" page. |
| `500` | Show generic error toast. Log the error via Sentry/equivalent. |

---

## 10. Caching Strategy

### 10.1 Recommended `staleTime` (React Query)

| Hook | `staleTime` | Rationale |
|------|-------------|-----------|
| `useProduct` | `5 min` (`300_000`) | Single product is highly stable; admin updates invalidate explicitly |
| `useAdminProduct` | `30 sec` (`30_000`) | Admins expect fresh data while editing |

### 10.2 Next.js ISR (recommended for SEO)

Use the Server Component pattern in §8.3 with:

```typescript
next: { revalidate: 300, tags: [`product:${id}`] }
```

Then invalidate on demand when an admin updates a product:

```typescript
// In your admin update handler
import { revalidateTag } from 'next/cache';

await adminUpdateProduct(id, dto);
revalidateTag(`product:${id}`);
```

> Tag by `id` (not `slug`) — slugs can change after renames but IDs are stable.

### 10.3 Don't over-cache the admin endpoint

Avoid caching the admin response in the browser or CDN. Admin edits must appear immediately. Set `Cache-Control: private, no-store` at the edge for `/admin/*`.

### 10.4 Browser HTTP cache (public endpoint)

You can optionally set `Cache-Control: public, max-age=60, stale-while-revalidate=300` at the edge for `/products/:id` responses — products change rarely and this gives a great TTFB.

---

## 11. SEO & Metadata (Next.js)

> The canonical URL of a product detail page can be slug-based (for SEO) **or** id-based (for simplicity). The example below uses the slug returned in the response to build the canonical URL:

```typescript
// app/products/[slug]/page.tsx (Server Component)

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const id = await getProductIdBySlug(params.slug);
  const product = id ? await fetchProduct(id) : null;
  if (!product) return { title: 'Product not found' };

  const title = `${product.title} — Buy now`;
  const description =
    product.shortDescription ?? product.description.slice(0, 160);
  const ogImage = product.thumbnail ?? product.images[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage, alt: product.title }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    robots: product.availabilityStatus === 'Out of Stock'
      ? { index: true, follow: true } // still indexed
      : undefined,
  };
}
```

For structured data (JSON-LD / `Product` schema for Google Shopping), use the response fields directly:

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.title,
  description: product.description,
  sku: product.sku,
  brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
  image: [product.thumbnail, ...product.images].filter(Boolean),
  aggregateRating: product.rating > 0
    ? {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviews.length,
      }
    : undefined,
  offers: {
    '@type': 'Offer',
    price: product.discountedPrice,
    priceCurrency: 'USD',
    availability:
      product.availabilityStatus === 'In Stock'
        ? 'https://schema.org/InStock'
        : product.availabilityStatus === 'Low Stock'
          ? 'https://schema.org/LimitedAvailability'
          : 'https://schema.org/OutOfStock',
    url: `https://example.com/products/${product.slug}`,
  },
};
```

---

## 12. Gotchas & Edge Cases

### 12.1 Public and admin endpoints both use ID

Both endpoints (`/products/:id` and `/admin/products/:id`) accept the same UUID and return the same shape. The only differences are auth requirements and the JWT context. Use the public one from anonymous browser contexts and the admin one from authenticated admin contexts.

### 12.2 Public endpoint does not hide drafts

The public endpoint returns **any** product matching the supplied UUID — including drafts. This is acceptable because UUIDs are not enumerable. If your store has additional concerns (e.g., embargoed products with leaked UUIDs in marketing links), restrict the public endpoint at the application layer or behind a feature flag.

### 12.3 Slug regenerates on title change

The backend regenerates the slug whenever `title` changes (unless the update payload explicitly includes a `slug` field). Because the URL path now uses the **UUID**, slug changes do **not** break existing deep links. They will still break any external links that used the slug — update those references, or set up `/products/:slug` frontend routes that resolve to the ID via a slug→ID map.

### 12.4 Pricing is always a number, never a string

Despite being stored as `DECIMAL` in Postgres, TypeORM serialises `price` / `discountedPrice` as JSON **numbers**. Avoid floating-point bugs by always formatting with `.toFixed(2)` on display:

```typescript
const display = `$${Number(product.price).toFixed(2)}`; // "$199.99"
```

### 12.5 `discountedPrice` is server-computed

Never trust a client-computed discounted price — use `product.discountedPrice` from the response. It is recomputed on every insert/update via `@BeforeInsert()` / `@BeforeUpdate()` hooks.

### 12.6 `reviews[].reviewerEmail` is PII

The backend currently returns full email addresses in `reviews[].reviewerEmail`. **Recommendation for the frontend:**
- Don't render the email in the UI.
- Consider redacting to `j***@example.com` client-side (the master plan notes this is something the backend may strip in future).
- Don't include review emails in any analytics events or third-party pixels.

### 12.7 `category` can be `null` even when `categoryId` is set

If the category is deleted (the FK is `onDelete: SET NULL`), the `category` relation becomes `null` but `categoryId` is also nulled. Always guard:

```typescript
{product.category && (
  <a href={`/products/category/${product.category.slug}`}>
    {product.category.name}
  </a>
)}
```

### 12.8 `images` may be empty

If the admin never uploaded images, `images` is `[]` and `thumbnail` may be `null`. Always fall back to a placeholder:

```typescript
const heroImage = product.images[0] ?? product.thumbnail ?? '/placeholder.png';
```

### 12.9 Soft-deleted products return 404

Soft-deleted products are excluded from all queries by TypeORM. They return `404` on both endpoints and are removed from lists. No special handling needed in the frontend — they'll simply disappear.

### 12.10 `availabilityStatus` is auto-derived, not stored as a manual toggle

The backend updates `availabilityStatus` automatically based on `stock`:
- `stock > 10` → `"In Stock"`
- `stock 1–10` → `"Low Stock"`
- `stock === 0` → `"Out of Stock"`

Don't try to set it directly via the update endpoint — it's computed.

### 12.11 No `?include=` / `?fields=` — the response is always full

You cannot ask for a slimmer version of the product. If you need a compact summary for a related-products carousel, fetch the list endpoint and pick what you need.

### 12.12 Public endpoint has no rate-limit override beyond the global throttler

The `/products/:id` endpoint inherits the global Throttler config (`src/config/throttler.config.ts`). If you spam-refresh a PDP, you'll get `429 Too Many Requests`. Surface a friendly message in the UI.

### 12.13 CORS is configured for the storefront origin

The `WsCors`/HTTP CORS config in `src/main.ts` (or equivalent) must whitelist your storefront origin. If you hit `CORS policy` errors in the browser, ask backend to add the origin to `FRONTEND_URL` / CORS allow-list.

### 12.14 Migrated from slug to ID on 2026-06-20

The public single-product endpoint was changed from `/products/:slug` to `/products/:id` (UUID v4). Implications for existing frontend code:

| Area | Action |
|------|--------|
| Frontend routes | Routes can keep using `[slug]` — just resolve to the ID before calling the API. |
| External SEO links | `/products/<slug>` URLs on your storefront will need a slug→ID resolver (e.g. `generateStaticParams`, ISR, or a server-side lookup). |
| Email / push notifications | Switch any "view product" deep-links to use `/products/<id>` for stability. |
| Wishlist / cart | Store both `id` (for API calls) and `slug` (for share URLs) on the line item. |
| Caching | Re-tag your caches by `id` instead of `slug` (slugs can change after renames). |
| 3rd-party integrations | Update any tools that consume `/products/:slug` to use `/products/:id`. |

The product **schema** is unchanged — `slug` is still a column on every product and is still returned in the response body.

---

## 13. Quick Reference Card

```
┌──────────────────────────────────────────────────────────────────────┐
│  SINGLE PRODUCT DISPLAY — QUICK REFERENCE                            │
├──────────────────────────────────────────────────────────────────────┤
│  Storefront (public):  GET /products/:id                             │
│  Admin (drafts too):   GET /admin/products/:id                       │
│  Path params:          id (UUID v4)                                  │
│  Query params:         none                                         │
│  Auth:                 none (public) / JWT+ADMIN (admin)             │
│  Returns:              Full ProductResponseDto                       │
│  404 means:            id not found                                  │
│  400 means:            id is not a valid UUID                        │
│                                                                      │
│  Response shape (always full, no projection):                        │
│    identity:        id, title, slug (informational), description,    │
│                     shortDescription                                │
│    pricing:         price, discountPercentage, discountedPrice       │
│    inventory:       stock, sku, minimumOrderQuantity, availabilityStatus│
│    classification:  categoryId, category{id,name,slug}, tags, brand  │
│    physical:        weight, dimensions{width,height,depth}           │
│    media:           images[], thumbnail                              │
│    policies:        warrantyInformation, shippingInformation, returnPolicy│
│    reviews:         reviews[], rating                                │
│    meta:            barcode, qrCode, isPublished                      │
│    timestamps:      createdAt, updatedAt, deletedAt                  │
│                                                                      │
│  Frontend rules:                                                     │
│    • Pass the UUID to the API — not the slug                         │
│    • Display price as Number(x).toFixed(2)                           │
│    • discountedPrice is server-computed — never override             │
│    • availabilityStatus is auto-derived from stock                   │
│    • category, images, thumbnail can all be null/empty — guard       │
│    • Cache 5 min on PDP, 30 sec in admin                             │
│    • Tag Next.js caches by id, not slug                              │
│    • Don't render reviewerEmail (PII)                                │
│                                                                      │
│  Errors:  400 bad UUID · 401 missing JWT · 403 not admin             │
│           404 not found · 500 server                                 │
└──────────────────────────────────────────────────────────────────────┘
```