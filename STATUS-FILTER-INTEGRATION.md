# Status Filter API Integration Guide

This document describes the status filtering capabilities available across the backend API endpoints.

## Overview

Several modules now support filtering by status fields. This allows frontend applications to:
- Filter lists by specific statuses (e.g., only published products, only paid orders)
- Build dashboard views with status-based counts
- Create filtered views for different user workflows

---

## Products

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /admin/products` | GET | List all products (admin) |
| `GET /products` | GET | List published products (public) |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `isPublished` | `boolean` | Filter by publish status (`true` = published, `false` = drafts) |
| `availabilityStatus` | `string` | Filter by availability status |

### Availability Status Values

| Value | Description |
|-------|-------------|
| `In Stock` | Product is in stock (default) |
| `Out of Stock` | Product is out of stock (stock = 0) |
| `Low Stock` | Product has low stock (stock ≤ 10) |

### Example Requests

```bash
# Get only published products
GET /admin/products?isPublished=true

# Get only draft products
GET /admin/products?isPublished=false

# Get only out-of-stock products
GET /admin/products?availabilityStatus=Out%20Stock

# Combine filters
GET /admin/products?isPublished=true&availabilityStatus=In%20Stock
```

### Example Response

```json
{
  "data": [...],
  "total": 50,
  "totalPages": 5,
  "page": 1,
  "limit": 10
}
```

---

## Orders

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /orders` | GET | Get user order history |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `string` | Filter by order status |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Items per page (default: 20, max: 100) |

### Order Status Values

| Value | Description |
|-------|-------------|
| `awaiting_checkout_session` | Order created, waiting for checkout session |
| `pending_payment` | Checkout session created, awaiting payment |
| `paid` | Payment successful |
| `failed` | Payment failed |
| `canceled` | Order canceled |
| `refunded` | Order fully refunded |
| `partially_refunded` | Order partially refunded |
| `expired` | Checkout session expired |

### Example Requests

```bash
# Get only paid orders
GET /orders?status=paid

# Get only pending orders
GET /orders?status=pending_payment

# Get only refunded orders
GET /orders?status=refunded

# Paginated request
GET /orders?status=paid&page=1&limit=10
```

### Example Response

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "123",
      "status": "paid",
      "subtotal": 1000,
      "taxAmount": 0,
      "discountAmount": 0,
      "totalAmount": 1000,
      "paymentId": "pay_xxx",
      "currency": "usd",
      "stripeCheckoutSessionId": "cs_xxx",
      "reservationExpiresAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "items": [...]
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

## Payments

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /payments/history` | GET | Get user payment history |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `string` | Filter by payment status |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Items per page (default: 20, max: 100) |

### Payment Status Values

| Value | Description |
|-------|-------------|
| `pending` | Payment initiated, awaiting completion |
| `succeeded` | Payment successful |
| `failed` | Payment failed |
| `refunded` | Payment refunded |
| `expired` | Payment expired |

### Example Requests

```bash
# Get only successful payments
GET /payments/history?status=succeeded

# Get only failed payments
GET /payments/history?status=failed

# Get only pending payments
GET /payments/history?status=pending

# Paginated request
GET /payments/history?status=succeeded&page=1&limit=10
```

### Example Response

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "123",
      "stripePaymentIntent": "pi_xxx",
      "amount": 1000,
      "currency": "usd",
      "status": "succeeded",
      "description": "Premium access",
      "stripeChargeId": "ch_xxx",
      "stripeCheckoutSessionId": "cs_xxx",
      "orderId": "uuid",
      "paymentType": "premium",
      "idempotencyKey": "xxx",
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

---

## Notifications

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /notifications` | GET | Get notifications for current user (cursor-based) |
| `GET /notifications/paginated` | GET | Get notifications (offset-based, deprecated) |
| `GET /admin/notifications` | GET | Get all notifications (admin) |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `isRead` | `boolean` | Filter by read status (`true` = read, `false` = unread) |
| `type` | `string` | Filter by notification type |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Items per page (default: 20, max: 100) |

### Notification Type Values

| Value | Description |
|-------|-------------|
| `ORDER_UPDATED` | Order status update notification |
| `PAYMENT_SUCCESS` | Payment successful notification |
| `PAYMENT_FAILED` | Payment failed notification |
| `SYSTEM` | System notification |
| `BROADCAST` | Broadcast notification to all users |

### Example Requests

```bash
# Get only unread notifications
GET /notifications/paginated?isRead=false

# Get only read notifications
GET /notifications/paginated?isRead=true

# Get only payment notifications
GET /notifications/paginated?type=PAYMENT_SUCCESS

# Get unread payment notifications
GET /notifications/paginated?isRead=false&type=PAYMENT_SUCCESS

# Admin: Get all unread notifications
GET /admin/notifications?isRead=false
```

### Example Response (Offset-based)

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "123",
      "type": "PAYMENT_SUCCESS",
      "title": "Payment Successful",
      "message": "Your payment of $10.00 was successful.",
      "data": { "paymentId": "xxx", "amount": 1000 },
      "isRead": false,
      "readAt": null,
      "isDeleted": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### Example Response (Cursor-based)

```json
{
  "data": [...],
  "meta": {
    "nextCursor": "2024-01-01T00:00:00.000Z",
    "hasMore": true,
    "limit": 20
  }
}
```

---

## Categories (Public)

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /categories` | GET | Get all categories with pagination |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Items per page (default: 20, max: 100) |
| `sortBy` | `string` | Sort by field (`name`, `order`, `createdAt`) |
| `sortOrder` | `string` | Sort order (`ASC`, `DESC`) |

### Example Request

```bash
# Get categories sorted by name
GET /categories?sortBy=name&sortOrder=ASC

# Paginated request
GET /categories?page=1&limit=10
```

### Example Response

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices",
      "color": "#FF5733",
      "icon": "laptop",
      "order": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 15,
  "totalPages": 2,
  "page": 1,
  "limit": 10
}
```

---

## Frontend Integration Tips

### Building Filter UIs

```tsx
// Example: Product filter component
const ProductFilters = () => {
  const [isPublished, setIsPublished] = useState<boolean | undefined>();
  const [availabilityStatus, setAvailabilityStatus] = useState<string>();

  const fetchProducts = async () => {
    const params = new URLSearchParams();
    if (isPublished !== undefined) params.append('isPublished', String(isPublished));
    if (availabilityStatus) params.append('availabilityStatus', availabilityStatus);
    
    const response = await fetch(`/admin/products?${params}`);
    return response.json();
  };

  return (
    <div>
      <select onChange={(e) => setIsPublished(e.target.value === 'true' ? true : undefined)}>
        <option value="">All</option>
        <option value="true">Published</option>
        <option value="false">Drafts</option>
      </select>
      
      <select onChange={(e) => setAvailabilityStatus(e.target.value || undefined)}>
        <option value="">All</option>
        <option value="In Stock">In Stock</option>
        <option value="Out of Stock">Out of Stock</option>
        <option value="Low Stock">Low Stock</option>
      </select>
    </div>
  );
};
```

### Building Status Tabs

```tsx
// Example: Order status tabs
const OrderTabs = () => {
  const [activeStatus, setActiveStatus] = useState<string>('paid');
  
  const statuses = [
    { value: 'paid', label: 'Paid' },
    { value: 'pending_payment', label: 'Pending' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div className="tabs">
      {statuses.map(({ value, label }) => (
        <button
          key={value}
          className={activeStatus === value ? 'active' : ''}
          onClick={() => setActiveStatus(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
```

### URL-based Filters

```tsx
// Example: Using URL params for filters
const useFilters = () => {
  const searchParams = new URLSearchParams(window.location.search);
  
  return {
    isPublished: searchParams.get('isPublished') === 'true' ? true : 
                 searchParams.get('isPublished') === 'false' ? false : undefined,
    status: searchParams.get('status') || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
  };
};
```

---

## Notes

1. **Backward Compatibility**: All new filter parameters are optional. Existing API calls without these parameters will continue to work as before.

2. **Default Behavior**: When no status filter is provided, endpoints return all items (regardless of status).

3. **Pagination**: All filtered endpoints support pagination. The response includes `total` count for building pagination UIs.

4. **Type Safety**: Status values are enums - use the exact string values specified above.

5. **Admin vs Public**: Some endpoints are admin-only (require authentication). Public endpoints have limited filtering options.
