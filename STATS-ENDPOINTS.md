# Admin Dashboard Stats API Reference

This document describes all available statistics endpoints for the admin dashboard. These endpoints provide aggregated data for building dashboard widgets and analytics views.

---

## Overview

All stats endpoints are admin-only and require authentication with the `ADMIN` role. They return aggregated data that can be used to build dashboard widgets, charts, and analytics views.

### Authentication

All endpoints require:
- Bearer token in `Authorization` header
- User must have `ADMIN` role

```
Authorization: Bearer <token>
```

---

## Endpoints Summary

| Endpoint | Module | Description |
|----------|--------|-------------|
| `GET /user/stats` | Users | User statistics |
| `GET /admin/products/stats` | Products | Product & inventory statistics |
| `GET /admin/orders/stats` | Orders | Order & revenue statistics |
| `GET /admin/payments/stats` | Payments | Payment & revenue statistics |
| `GET /admin/categories/stats` | Categories | Category statistics |
| `GET /admin/blog/stats` | Blog | Blog statistics |
| `GET /admin/notifications/stats` | Notifications | Notification statistics |
| `GET /admin/contact/stats` | Contact | Contact message statistics |

---

## Users Statistics

### `GET /user/stats`

Returns user registration and status statistics.

### Response

```json
{
  "total": 1250,
  "adminsNumber": 5,
  "verifiedUsersNumber": 1100,
  "unverifiedUsersNumber": 150,
  "active": 1200,
  "inactive": 30,
  "banned": 20,
  "premium": 150,
  "oauthUsers": 300
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total registered users |
| `adminsNumber` | `number` | Users with admin role |
| `verifiedUsersNumber` | `number` | Users with verified email |
| `unverifiedUsersNumber` | `number` | Users with unverified email |
| `active` | `number` | Users with active status |
| `inactive` | `number` | Users with inactive status |
| `banned` | `number` | Users with banned status |
| `premium` | `number` | Users with premium subscription |
| `oauthUsers` | `number` | Users registered via OAuth (Google) |

---

## Products Statistics

### `GET /admin/products/stats`

Returns product inventory and catalog statistics.

### Response

```json
{
  "total": 450,
  "published": 380,
  "drafts": 70,
  "inStock": 350,
  "outOfStock": 80,
  "lowStock": 20,
  "totalInventory": 12500,
  "averagePrice": 49.99,
  "totalCategories": 15
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total products |
| `published` | `number` | Published products |
| `drafts` | `number` | Draft products |
| `inStock` | `number` | Products in stock |
| `outOfStock` | `number` | Products out of stock |
| `lowStock` | `number` | Products with low stock |
| `totalInventory` | `number` | Total units across all products |
| `averagePrice` | `number` | Average product price |
| `totalCategories` | `number` | Categories with products |

---

## Orders Statistics

### `GET /admin/orders/stats`

Returns order and revenue statistics.

### Response

```json
{
  "total": 850,
  "byStatus": {
    "awaiting_checkout_session": 10,
    "pending_payment": 5,
    "paid": 750,
    "failed": 30,
    "canceled": 20,
    "refunded": 25,
    "partially_refunded": 5,
    "expired": 5
  },
  "totalRevenue": 12500000,
  "averageOrderValue": 16667,
  "totalItemsSold": 2500
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total orders |
| `byStatus` | `object` | Order count by status |
| `byStatus.awaiting_checkout_session` | `number` | Orders awaiting checkout |
| `byStatus.pending_payment` | `number` | Orders pending payment |
| `byStatus.paid` | `number` | Paid orders |
| `byStatus.failed` | `number` | Failed orders |
| `byStatus.canceled` | `number` | Canceled orders |
| `byStatus.refunded` | `number` | Refunded orders |
| `byStatus.partially_refunded` | `number` | Partially refunded orders |
| `byStatus.expired` | `number` | Expired orders |
| `totalRevenue` | `number` | Total revenue (in cents) |
| `averageOrderValue` | `number` | Average order value (in cents) |
| `totalItemsSold` | `number` | Total items sold |

---

## Payments Statistics

### `GET /admin/payments/stats`

Returns payment and revenue statistics.

### Response

```json
{
  "total": 900,
  "byStatus": {
    "pending": 15,
    "succeeded": 800,
    "failed": 50,
    "refunded": 30,
    "expired": 5
  },
  "totalSucceeded": 13000000,
  "totalRefunded": 500000,
  "netRevenue": 12500000,
  "averageAmount": 16250
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total payment attempts |
| `byStatus` | `object` | Payment count by status |
| `byStatus.pending` | `number` | Pending payments |
| `byStatus.succeeded` | `number` | Successful payments |
| `byStatus.failed` | `number` | Failed payments |
| `byStatus.refunded` | `number` | Refunded payments |
| `byStatus.expired` | `number` | Expired payments |
| `totalSucceeded` | `number` | Total successful amount (in cents) |
| `totalRefunded` | `number` | Total refunded amount (in cents) |
| `netRevenue` | `number` | Net revenue (succeeded - refunded) |
| `averageAmount` | `number` | Average successful payment amount |

---

## Categories Statistics

### `GET /admin/categories/stats`

Returns category distribution statistics.

### Response

```json
{
  "total": 15,
  "totalProducts": 450,
  "totalArticles": 120,
  "emptyCategories": 2
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total categories |
| `totalProducts` | `number` | Products assigned to categories |
| `totalArticles` | `number` | Articles assigned to categories |
| `emptyCategories` | `number` | Categories with no products or articles |

---

## Blog Statistics

### `GET /admin/blog/stats`

Returns blog content statistics.

### Response

```json
{
  "total": 85,
  "published": 60,
  "drafts": 25,
  "totalViews": 125000,
  "averageViews": 2083,
  "averageReadTime": 5.5,
  "totalCategories": 8
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total articles |
| `published` | `number` | Published articles |
| `drafts` | `number` | Draft articles |
| `totalViews` | `number` | Total views across all articles |
| `averageViews` | `number` | Average views per article |
| `averageReadTime` | `number` | Average read time in minutes |
| `totalCategories` | `number` | Categories with articles |

---

## Notifications Statistics

### `GET /admin/notifications/stats`

Returns notification distribution statistics.

### Response

```json
{
  "total": 5000,
  "unread": 150,
  "read": 4850,
  "deleted": 200,
  "byType": {
    "ORDER_UPDATED": 2000,
    "PAYMENT_SUCCESS": 1500,
    "PAYMENT_FAILED": 500,
    "SYSTEM": 750,
    "BROADCAST": 250
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total active notifications (non-deleted) |
| `unread` | `number` | Unread notifications |
| `read` | `number` | Read notifications |
| `deleted` | `number` | Soft-deleted notifications |
| `byType` | `object` | Notification count by type |
| `byType.ORDER_UPDATED` | `number` | Order update notifications |
| `byType.PAYMENT_SUCCESS` | `number` | Payment success notifications |
| `byType.PAYMENT_FAILED` | `number` | Payment failed notifications |
| `byType.SYSTEM` | `number` | System notifications |
| `byType.BROADCAST` | `number` | Broadcast notifications |

---

## Contact Statistics

### `GET /admin/contact/stats`

Returns contact message statistics.

### Response

```json
{
  "total": 250,
  "unread": 15,
  "read": 235,
  "replied": 200,
  "unreplied": 50
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total contact messages |
| `unread` | `number` | Unread messages |
| `read` | `number` | Read messages |
| `replied` | `number` | Messages that have been replied to |
| `unreplied` | `number` | Messages awaiting reply |

---

## Frontend Integration

### Dashboard Widget Example

```tsx
// Example: Dashboard stats widget
const DashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, productsRes, ordersRes, paymentsRes] = await Promise.all([
          fetch('/user/stats'),
          fetch('/admin/products/stats'),
          fetch('/admin/orders/stats'),
          fetch('/admin/payments/stats'),
        ]);

        const [users, products, orders, payments] = await Promise.all([
          usersRes.json(),
          productsRes.json(),
          ordersRes.json(),
          paymentsRes.json(),
        ]);

        setStats({ users, products, orders, payments });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="dashboard-grid">
      <StatCard
        title="Total Users"
        value={stats.users.total}
        subtitle={`${stats.users.premium} premium`}
      />
      <StatCard
        title="Total Products"
        value={stats.products.total}
        subtitle={`${stats.products.published} published`}
      />
      <StatCard
        title="Total Orders"
        value={stats.orders.total}
        subtitle={`${stats.orders.totalRevenue / 100} revenue`}
      />
      <StatCard
        title="Net Revenue"
        value={`$${(payments.netRevenue / 100).toFixed(2)}`}
        subtitle={`${payments.total} payments`}
      />
    </div>
  );
};
```

### Real-time Updates with Polling

```tsx
// Example: Auto-refreshing stats
const useStatsPolling = (intervalMs = 30000) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch('/admin/orders/stats');
      const data = await response.json();
      setStats(data);
    };

    fetchStats();
    const interval = setInterval(fetchStats, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return stats;
};
```

### Status Distribution Chart

```tsx
// Example: Order status distribution chart
const OrderStatusChart = ({ byStatus }) => {
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

  const statusColors = {
    paid: '#10b981',
    pending_payment: '#f59e0b',
    failed: '#ef4444',
    refunded: '#6366f1',
    canceled: '#6b7280',
  };

  return (
    <div className="chart">
      {Object.entries(byStatus).map(([status, count]) => (
        <div key={status} className="bar" style={{
          backgroundColor: statusColors[status] || '#9ca3af',
          width: `${(count / total) * 100}%`
        }}>
          {status}: {count}
        </div>
      ))}
    </div>
  );
};
```

---

## Notes

1. **Amounts**: All monetary values are in cents (minor currency units). Divide by 100 to get the major unit (e.g., dollars).

2. **Status Values**: Status values are exact strings from the backend enums. Use them as-is for filtering and display.

3. **Performance**: These endpoints execute aggregate queries. They should be called sparingly on the frontend (e.g., on dashboard load, not on every render).

4. **Caching**: Consider caching these responses for 30-60 seconds to reduce database load.

5. **Authorization**: All endpoints require admin role. Non-admin users will receive a 403 Forbidden response.
