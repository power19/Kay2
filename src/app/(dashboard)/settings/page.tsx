import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, DollarSign, Ruler } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your application settings
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/settings/company">
          <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center space-y-0 gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Company Info</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Business details and bank info
                </p>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/exchange-rate">
          <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center space-y-0 gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Exchange Rate</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage USD to SRD conversion rate
                </p>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/liter-variations">
          <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center space-y-0 gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Ruler className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Liter Variations</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure product container sizes
                </p>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
