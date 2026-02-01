# InvMan - Electronics Inventory Management System

## Overview

A web-based inventory management system for electronics distribution businesses featuring:
- **Barcode scanning** with on-the-fly product creation
- **Location-based inventory** (storage racks vs display areas)
- **Bulk receiving** workflow for incoming goods
- **Quote and invoice** creation
- **Cost price tracking** with profit margin calculations
- **Currency conversion** (USD stored, SRD displayed)

**Live URL**: https://kay2.powermental.fit

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Next.js 16 (App Router) | Full-stack React framework |
| Language | TypeScript | Type safety |
| UI | Tailwind CSS + shadcn/ui | Professional UI components |
| Database | SQLite + Prisma | Simple, file-based database |
| Barcode | html5-qrcode | Camera and hardware scanner support |
| Deployment | Docker + Caddy | Auto HTTPS, easy VPS deployment |

---

## Core Features

### 1. Receive Goods (Bulk Receiving)
The primary workflow for adding inventory:

1. **Scan barcode** → If product exists, add to list
2. **If barcode not found** → Create new product on-the-fly:
   - Select or create brand
   - Enter product name
   - Select or create specification
   - Set cost and sell prices
3. **Adjust quantities** per item
4. **Assign locations** (which rack/display area)
5. **Submit** to update inventory

### 2. Location-Based Inventory
Track where items are stored:

- **Storage locations** (e.g., Rack A, Rack B, Warehouse)
- **Display locations** (e.g., Main Display, Window Display)
- View totals: In Storage vs On Display
- **Transfer** items between locations

### 3. Product Management
- **Brands** (Apple, Samsung, Sony, etc.)
- **Products** with multiple variants
- **Specifications** (128GB, 256GB, Black, White, etc.)
- **Variants** = Product + Specification + Prices + Barcode

### 4. Inventory Tracking
- Real-time stock levels per location
- Low stock alerts
- Stock movement history
- Cost value and profit calculations

---

## Database Schema

```
┌─────────────────┐       ┌─────────────────────┐       ┌──────────────────┐
│     brands      │       │      products       │       │  specifications  │
├─────────────────┤       ├─────────────────────┤       ├──────────────────┤
│ id (PK)         │───┐   │ id (PK)             │   ┌───│ id (PK)          │
│ name            │   └──>│ brand_id (FK)       │   │   │ value            │
│ description     │       │ name                │   │   │ label            │
└─────────────────┘       └─────────────────────┘   │   │ sort_order       │
                                   │               │   └──────────────────┘
                         ┌─────────▼───────────────▼──┐
                         │    product_variants        │
                         ├────────────────────────────┤
                         │ id (PK)                    │
                         │ product_id (FK)            │
                         │ specification_id (FK)      │
                         │ cost_price_usd             │◄─── Cost tracking
                         │ price_usd                  │◄─── Sell price
                         │ barcode                    │◄─── Barcode scanning
                         │ sku                        │
                         │ stock_quantity             │◄─── Total stock
                         │ low_stock_threshold        │
                         └────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
┌──────────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   variant_locations  │  │ stock_movements │  │  quote_items /  │
├──────────────────────┤  ├─────────────────┤  │  invoice_items  │
│ variant_id (FK)      │  │ variant_id (FK) │  └─────────────────┘
│ location_id (FK)     │  │ from_location   │
│ quantity             │  │ to_location     │
└──────────────────────┘  │ quantity_change │
              │           │ type (purchase, │
              │           │   sale, transfer│
              ▼           │   adjustment)   │
┌──────────────────────┐  └─────────────────┘
│  storage_locations   │
├──────────────────────┤
│ id (PK)              │
│ name                 │◄─── "Rack A", "Main Display"
│ type                 │◄─── "storage" or "display"
│ sort_order           │
└──────────────────────┘
```

### Key Models

```prisma
model StorageLocation {
  id           String            @id @default(cuid())
  name         String            @unique
  type         String            @default("storage") // "storage" or "display"
  description  String?
  sortOrder    Int               @default(0)
  variantStock VariantLocation[]
  movementsFrom StockMovement[]  @relation("FromLocation")
  movementsTo   StockMovement[]  @relation("ToLocation")
}

model VariantLocation {
  id         String          @id @default(cuid())
  variant    ProductVariant  @relation(...)
  variantId  String
  location   StorageLocation @relation(...)
  locationId String
  quantity   Int             @default(0)

  @@unique([variantId, locationId])
}

model StockMovement {
  id             String           @id @default(cuid())
  variant        ProductVariant   @relation(...)
  variantId      String
  fromLocation   StorageLocation? @relation("FromLocation", ...)
  fromLocationId String?
  toLocation     StorageLocation? @relation("ToLocation", ...)
  toLocationId   String?
  quantityChange Int
  type           String           // "purchase", "sale", "adjustment", "transfer"
  reference      String?
  notes          String?
}
```

---

## Navigation Structure

```
Dashboard
─────────────────
Quick Scan              # Fast barcode lookup
Receive Goods           # Bulk receiving workflow ★
Inventory               # Stock levels with location breakdown
─────────────────
Products                # Product catalog
Brands                  # Brand management
─────────────────
Quotes                  # Quote creation
Invoices                # Invoice management
Customers               # Customer database
─────────────────
Settings
  ├── Company           # Company info, logo
  ├── Exchange Rate     # USD to SRD rate
  ├── Specifications    # 128GB, Black, etc.
  └── Locations         # Storage racks, display areas
```

---

## API Endpoints

### Receiving
- `POST /api/receiving` - Bulk receive items with location assignment
- `POST /api/receiving/create-product` - Create product on-the-fly during receiving

### Barcode
- `GET /api/barcode?code=XXX` - Lookup by barcode or SKU
  - Returns product if found
  - Returns `{ found: false, code }` if not found (triggers create dialog)

### Locations
- `GET /api/locations` - List all locations with item counts
- `POST /api/locations` - Create new location
- `PUT /api/locations/[id]` - Update location
- `DELETE /api/locations/[id]` - Delete (only if empty)

### Inventory
- `GET /api/inventory` - List all variants with stock
- `POST /api/inventory/[variantId]` - Adjust stock (add/remove/transfer)

---

## Deployment

### Docker Compose Setup

```yaml
services:
  invman:
    build: .
    container_name: invman
    environment:
      DATABASE_URL: file:/app/data/prod.db
      AUTH_SECRET: ${AUTH_SECRET}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    volumes:
      - invman-data:/app/data
    expose:
      - "3000"

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
```

### Caddyfile
```
kay2.powermental.fit {
    reverse_proxy invman:3000
}
```

### Deploy Commands
```bash
# On VPS
cd /opt/invman
git pull origin claude/clone-external-repo-jn02y
docker compose up -d --build

# View logs
docker compose logs -f invman
```

---

## Environment Variables

```bash
DATABASE_URL="file:/app/data/prod.db"
AUTH_SECRET="your-secret-key-min-32-chars"
ADMIN_PASSWORD="your-admin-password"
DEFAULT_EXCHANGE_RATE="1.0"
```

---

## Typical Workflows

### Receiving New Inventory
1. Go to **Receive Goods**
2. Set default location (e.g., "Storage Rack A")
3. Scan each item's barcode
   - Known items: added to list automatically
   - Unknown items: create product dialog appears
4. Adjust quantities if needed
5. Change locations per item if needed
6. Click **Receive Items**

### Moving Items to Display
1. Go to **Inventory**
2. Click on an item row to expand
3. Click **Transfer**
4. Select from location → to location
5. Enter quantity
6. Confirm

### Quick Price Check
1. Go to **Quick Scan**
2. Scan barcode
3. See product details, stock levels, prices

---

## Default Seed Data

### Specifications
- 64GB, 128GB, 256GB, 512GB, 1TB (storage)
- Black, White, Silver, Gold (colors)

### Storage Locations
- Storage Rack A (storage)
- Storage Rack B (storage)
- Main Display (display)

---

## Summary

InvMan is a practical inventory system built for electronics retailers who need:
- Fast barcode-based receiving
- Location tracking (know where everything is)
- On-the-fly product creation (no pre-setup needed)
- Simple Docker deployment with automatic HTTPS
