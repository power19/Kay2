import { prisma } from "@/lib/prisma";
import { CustomersClient } from "./customers-client";

export const dynamic = "force-dynamic";

async function getCustomers() {
  try {
    return await prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { quotes: true, invoices: true },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
}

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
      </div>
      <CustomersClient initialCustomers={customers} />
    </div>
  );
}
