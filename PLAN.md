# InvMan Electronics Inventory Management Application - Implementation Plan

## Overview

A simple, web-based inventory management system for an electronics distribution business that handles:
- Inventory tracking with barcode scanning
- Quote creation
- Invoice creation
- Currency conversion (USD stored, SRD displayed)
- Cost price tracking with profit margin calculations

---

## 1. Recommended Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Framework** | Next.js 14 (App Router) | Single codebase for frontend and API, easy deployment |
| **Language** | TypeScript | Type safety, better maintainability |
| **UI Library** | Tailwind CSS + shadcn/ui | Rapid development, professional look |
| **Database** | SQLite | No separate server, easy backup (just copy a file) |
| **ORM** | Prisma | Type-safe queries, easy migrations |
| **Auth** | Simple session-based | Single user doesn't need complex auth |
| **Barcode** | html5-qrcode | Camera and hardware scanner support |
| **Deployment** | Docker + Docker Compose | Easy VPS deployment |

---

## 2. Database Schema

```
┌─────────────────┐       ┌─────────────────────┐       ┌──────────────────┐
│     brands      │       │      products       │       │  specifications  │
├─────────────────┤       ├─────────────────────┤       ├──────────────────┤
│ id (PK)         │───┐   │ id (PK)             │   ┌───│ id (PK)          │
│ name            │   └──>│ brand_id (FK)       │   │   │ value            │
│ description     │       │ name                │   │   │ label            │
│ created_at      │       │ description         │   │   │ sort_order       │
└─────────────────┘       └─────────────────────┘   │   └──────────────────┘
                                   │               │
                         ┌─────────▼───────────────▼──┐
                         │    product_variants        │
                         ├────────────────────────────┤
                         │ id (PK)                    │
                         │ product_id (FK)            │
                         │ specification_id (FK)      │
                         │ cost_price_usd             │◄─── Cost tracking
                         │ price_usd                  │
                         │ sku                        │
                         │ barcode                    │◄─── Barcode scanning
                         │ stock_quantity             │◄─── Inventory tracked here
                         │ low_stock_threshold        │
                         └────────────────────────────┘
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       │                           │                           │
       ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  quote_items  │         │ invoice_items   │         │ stock_movements │
└───────────────┘         └─────────────────┘         └─────────────────┘
       │                           │
       ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    quotes     │         │    invoices     │         │   customers     │
└───────────────┘         └─────────────────┘         └─────────────────┘

                                                     ┌─────────────────┐
                                                     │ exchange_rates  │
                                                     ├─────────────────┤
                                                     │ rate_usd_to_srd │
                                                     │ is_current      │
                                                     │ effective_date  │
                                                     └─────────────────┘

                                                     ┌─────────────────┐
                                                     │  company_info   │
                                                     ├─────────────────┤
                                                     │ name            │
                                                     │ logo            │
                                                     │ address         │
                                                     │ phone           │
                                                     │ email           │
                                                     │ website         │
                                                     └─────────────────┘
```

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Brand {
  id          String    @id @default(cuid())
  name        String    @unique
  description String?
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Specification {
  id              String           @id @default(cuid())
  value           String           // e.g., "storage", "color", "size"
  label           String           @unique  // e.g., "128GB", "256GB", "Black", "White"
  sortOrder       Int              @default(0)
  productVariants ProductVariant[]
  createdAt       DateTime         @default(now())
}

model Product {
  id          String           @id @default(cuid())
  name        String
  description String?
  brand       Brand            @relation(fields: [brandId], references: [id], onDelete: Cascade)
  brandId     String
  variants    ProductVariant[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@unique([brandId, name])
}

model ProductVariant {
  id                String          @id @default(cuid())
  product           Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId         String
  specification     Specification   @relation(fields: [specificationId], references: [id])
  specificationId   String
  costPriceUsd      Float           @default(0)
  priceUsd          Float
  sku               String?         @unique
  barcode           String?         @unique
  stockQuantity     Int             @default(0)
  lowStockThreshold Int             @default(10)
  quoteItems        QuoteItem[]
  invoiceItems      InvoiceItem[]
  stockMovements    StockMovement[]
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@unique([productId, specificationId])
}

model StockMovement {
  id             String         @id @default(cuid())
  variant        ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  variantId      String
  quantityChange Int            // positive for additions, negative for reductions
  type           String         // "purchase", "sale", "adjustment", "return"
  reference      String?
  notes          String?
  createdAt      DateTime       @default(now())
}

model Customer {
  id           String    @id @default(cuid())
  customerCode String?   @unique
  name         String
  companyName  String?
  email        String?
  phone        String?
  address      String?
  quotes       Quote[]
  invoices     Invoice[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model CompanyInfo {
  id          String  @id @default(cuid())
  name        String
  logo        String? // Base64 encoded image
  address     String?
  phone       String?
  email       String?
  website     String?
  bankName    String?
  bankAccUsd  String?
  bankAccSrd  String?
  bankAccEur  String?
}

model ExchangeRate {
  id            String   @id @default(cuid())
  rateUsdToSrd  Float
  isCurrent     Boolean  @default(false)
  effectiveDate DateTime @default(now())
  createdAt     DateTime @default(now())
}

model Quote {
  id           String      @id @default(cuid())
  quoteNumber  String      @unique
  customer     Customer    @relation(fields: [customerId], references: [id])
  customerId   String
  exchangeRate Float       // Snapshot at quote creation
  items        QuoteItem[]
  subtotalUsd  Float
  totalUsd     Float
  status       String      @default("draft") // draft, sent, accepted, rejected, expired
  validUntil   DateTime?
  notes        String?
  invoices     Invoice[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model QuoteItem {
  id           String         @id @default(cuid())
  quote        Quote          @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  quoteId      String
  variant      ProductVariant @relation(fields: [variantId], references: [id])
  variantId    String
  quantity     Int
  unitPriceUsd Float
  createdAt    DateTime       @default(now())
}

model Invoice {
  id              String        @id @default(cuid())
  invoiceNumber   String        @unique
  customer        Customer      @relation(fields: [customerId], references: [id])
  customerId      String
  quote           Quote?        @relation(fields: [quoteId], references: [id])
  quoteId         String?
  exchangeRate    Float
  items           InvoiceItem[]
  subtotalUsd     Float
  discountPercent Float         @default(0)
  discountUsd     Float         @default(0)
  taxRate         Float         @default(0)
  taxAmountUsd    Float         @default(0)
  totalUsd        Float
  status          String        @default("draft") // draft, sent, paid, overdue, cancelled
  paymentTerms    String        @default("CASH/BANK")
  dueDate         DateTime?
  paidDate        DateTime?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model InvoiceItem {
  id           String         @id @default(cuid())
  invoice      Invoice        @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  invoiceId    String
  variant      ProductVariant @relation(fields: [variantId], references: [id])
  variantId    String
  quantity     Int
  unitPriceUsd Float
  createdAt    DateTime       @default(now())
}

model Setting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

---

## 3. Feature Breakdown with Priority

### Phase 1: Foundation (MVP)

| Priority | Feature | Description |
|----------|---------|-------------|
| P0 | Project Setup | Next.js, Prisma, Tailwind, shadcn/ui |
| P0 | Database Schema | Prisma schema with migrations |
| P0 | Simple Auth | Session-based login with single admin user |
| P0 | Brand Management | CRUD for brands (Apple, Samsung, Sony, etc.) |
| P0 | Specifications | CRUD for specifications (128GB, 256GB, Black, White, etc.) |
| P0 | Product Management | CRUD for products with brand association |
| P0 | Product Variants | Create variants (product + specification + prices) |

### Phase 2: Core Business Features

| Priority | Feature | Description |
|----------|---------|-------------|
| P0 | Exchange Rate Management | Set/update USD to SRD rate |
| P0 | Currency Display | Show prices in both USD and SRD |
| P0 | Inventory Tracking | View stock levels, manual adjustments |
| P0 | Stock Movements | Track history of stock changes |
| P0 | Barcode Scanning | Camera and hardware scanner support |
| P0 | Cost Price Tracking | Track cost vs sell price with margins |
| P1 | Low Stock Alerts | Visual indicators for low inventory |

### Phase 3: Quotes & Invoices

| Priority | Feature | Description |
|----------|---------|-------------|
| P0 | Customer Management | CRUD for customers |
| P0 | Quote Creation | Create quotes with line items |
| P0 | Quote Status Management | Draft, Sent, Accepted, Rejected, Expired |
| P0 | Invoice Creation | Create invoices (standalone or from quote) |
| P0 | Invoice Status Management | Draft, Sent, Paid, Overdue, Cancelled |
| P0 | Barcode Scanning in Forms | Scan to add items to quotes/invoices |
| P1 | Convert Quote to Invoice | One-click conversion |

### Phase 4: Polish & Extras

| Priority | Feature | Description |
|----------|---------|-------------|
| P0 | Company Branding | Logo upload, company info display |
| P1 | Dashboard | Overview with key metrics |
| P1 | Print/PDF Export | Print-friendly views |
| P2 | Quick Scan Mode | Dedicated page for receiving/selling |
| P2 | Reporting Module | Sales and inventory reports |
| P2 | Docker Setup | Dockerfile and docker-compose.yml |

---

## 4. File/Folder Structure

```
invman/
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── next.config.js
├── package.json
├── tailwind.config.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── data/                         # SQLite database (Docker volume)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx        # Sidebar layout
│   │   │   ├── inventory/
│   │   │   ├── products/
│   │   │   ├── brands/
│   │   │   ├── customers/
│   │   │   ├── quotes/
│   │   │   ├── invoices/
│   │   │   ├── scan/             # Quick scan mode
│   │   │   └── settings/
│   │   │       ├── company/
│   │   │       ├── specifications/
│   │   │       └── exchange-rate/
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       ├── barcode/          # Barcode lookup
│   │       ├── brands/
│   │       ├── specifications/
│   │       ├── products/
│   │       ├── inventory/
│   │       ├── customers/
│   │       ├── quotes/
│   │       ├── invoices/
│   │       ├── exchange-rate/
│   │       ├── company/
│   │       └── settings/
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/               # Sidebar, Header, Logo
│   │   ├── forms/                # All form components
│   │   ├── tables/               # Data tables
│   │   └── shared/               # Currency display, badges, barcode scanner
│   │
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── currency.ts
│   │   ├── utils.ts
│   │   └── validations/
│   │
│   ├── services/                 # Business logic
│   │
│   ├── hooks/
│   │
│   └── types/
│
└── public/
```

---

## 5. Navigation Structure (Sidebar)

```
Dashboard
---
Quick Scan                        # Fast receive/sell mode
---
Inventory
  - Overview
  - Stock Movements
---
Products
  - All Products
  - Brands
---
Sales
  - Quotes
  - Invoices
  - Customers
---
Settings
  - Company Info
  - Exchange Rate
  - Specifications
```

---

## 6. Key Implementation Details

### Currency Handling

```typescript
// src/lib/currency.ts
export function convertUsdToSrd(usdAmount: number, exchangeRate: number): number {
  return usdAmount * exchangeRate;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatSrd(amount: number): string {
  return new Intl.NumberFormat('nl-SR', {
    style: 'currency',
    currency: 'SRD',
  }).format(amount);
}
```

### Barcode Scanner Component

```typescript
// Uses html5-qrcode for camera scanning
// Also supports hardware scanner input (keyboard mode)
// Works on mobile phones and desktop
```

### Profit Margin Calculation

```typescript
// Calculate profit margin from cost and sell price
const margin = costPrice > 0
  ? ((sellPrice - costPrice) / costPrice * 100)
  : 0;
```

### Quote/Invoice Number Generation

```typescript
// Format: Q-2026-00001 / INV-2026-00001
async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastQuote = await prisma.quote.findFirst({
    where: { quoteNumber: { startsWith: `Q-${year}-` } },
    orderBy: { createdAt: 'desc' },
  });

  const sequence = lastQuote
    ? parseInt(lastQuote.quoteNumber.split('-')[2]) + 1
    : 1;

  return `Q-${year}-${sequence.toString().padStart(5, '0')}`;
}
```

---

## 7. Environment Variables

```bash
# .env.example
DATABASE_URL="file:./data/inventory.db"
AUTH_SECRET="your-secret-key-min-32-chars-long"
ADMIN_PASSWORD="your-secure-admin-password"
DEFAULT_EXCHANGE_RATE="35.5"
```

---

## 8. Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/data/inventory.db
      - AUTH_SECRET=${AUTH_SECRET}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

---

## 9. Example Specifications for Electronics

| Label | Value | Use Case |
|-------|-------|----------|
| 128GB | storage | iPhone, Samsung storage options |
| 256GB | storage | iPhone, Samsung storage options |
| 512GB | storage | iPhone, Samsung storage options |
| 1TB | storage | iPhone Pro Max, laptops |
| Black | color | Any device color variant |
| White | color | Any device color variant |
| Silver | color | MacBook, iPhone colors |
| Space Gray | color | MacBook, iPhone colors |
| Small | size | Accessories, cases |
| Medium | size | Accessories, cases |
| Large | size | Accessories, cases |

---

## Summary

A simple, practical inventory management system for electronics using:
- **Next.js + SQLite + Prisma** - Full-stack simplicity
- **Single-user auth** - Appropriate for small business
- **USD storage, SRD display** - Clean currency handling
- **Barcode scanning** - Phone camera or hardware scanner
- **Cost/Sell price tracking** - Profit margin calculations
- **Docker-ready** - Easy VPS deployment
- **shadcn/ui** - Professional UI with minimal effort
