"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";

interface CompanyInfo {
  name: string;
  logo: string | null;
}

export function SidebarLogo() {
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    fetch("/api/company")
      .then((res) => res.json())
      .then((data) => setCompany(data))
      .catch(() => setCompany({ name: "InvMan", logo: null }));
  }, []);

  if (!company) {
    return (
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <div className="h-8 w-24 animate-pulse rounded bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="flex h-16 items-center justify-center gap-2 border-b border-gray-800 px-4">
      {company.logo ? (
        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-white">
          <Image
            src={company.logo}
            alt={company.name}
            fill
            className="object-contain p-1"
          />
        </div>
      ) : (
        <Building2 className="h-8 w-8 text-gray-400" />
      )}
      <h1 className="text-lg font-bold text-white truncate">{company.name}</h1>
    </div>
  );
}
