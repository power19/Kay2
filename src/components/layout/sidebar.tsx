"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Tags,
  FileText,
  Receipt,
  Users,
  Settings,
  DollarSign,
  Boxes,
  ScanBarcode,
  PackagePlus,
  Warehouse,
  Settings2,
  ShoppingCart,
  Ship,
  BarChart3,
  UserCircle,
  UsersRound,
} from "lucide-react";
import { SidebarLogo } from "./sidebar-logo";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "POS", href: "/pos", icon: ShoppingCart },
  { name: "Quick Scan", href: "/scan", icon: ScanBarcode },
  { name: "Receive Goods", href: "/receiving", icon: PackagePlus },
  { name: "Inventory", href: "/inventory", icon: Boxes },
  { name: "Products", href: "/products", icon: Package },
  { name: "Brands", href: "/brands", icon: Tags },
  { name: "Shipments", href: "/shipments", icon: Ship },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Invoices", href: "/invoices", icon: Receipt },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

const settingsNavigation = [
  { name: "Company", href: "/settings/company", icon: Settings },
  { name: "Exchange Rate", href: "/settings/exchange-rate", icon: DollarSign },
  { name: "Specifications", href: "/settings/specifications", icon: Settings2 },
  { name: "Locations", href: "/settings/locations", icon: Warehouse },
  { name: "Users", href: "/settings/users", icon: UsersRound },
  { name: "Profile", href: "/settings/profile", icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <SidebarLogo />
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-2 py-2 text-sm font-medium",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive
                    ? "text-white"
                    : "text-gray-400 group-hover:text-gray-300"
                )}
              />
              {item.name}
            </Link>
          );
        })}

        <div className="pt-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Settings
          </p>
          <div className="mt-2 space-y-1">
            {settingsNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-md px-2 py-2 text-sm font-medium",
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-gray-300"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
