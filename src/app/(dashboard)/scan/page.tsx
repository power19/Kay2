import { ScanClient } from "./scan-client";

export const dynamic = "force-dynamic";

export default function ScanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quick Scan</h1>
        <p className="text-muted-foreground">
          Scan barcodes to quickly update inventory
        </p>
      </div>
      <ScanClient />
    </div>
  );
}
