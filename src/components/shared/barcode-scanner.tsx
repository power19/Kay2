"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, X, ScanBarcode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function BarcodeScanner({
  onScan,
  placeholder = "Scan or enter barcode...",
  autoFocus = true,
}: BarcodeScannerProps) {
  const [manualInput, setManualInput] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<unknown>(null);

  // Handle hardware scanner input (they typically send Enter after barcode)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && manualInput.trim()) {
      e.preventDefault();
      onScan(manualInput.trim());
      setManualInput("");
    }
  };

  // Handle manual submit
  const handleSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput("");
    }
  };

  // Initialize camera scanner
  const startCameraScanner = useCallback(async () => {
    if (!scannerRef.current) return;

    setError(null);
    setScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const html5QrCode = new Html5Qrcode("barcode-scanner-container");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          onScan(decodedText);
          stopCameraScanner();
          setCameraOpen(false);
        },
        () => {
          // Ignore scan errors (no barcode found in frame)
        }
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start camera scanner"
      );
      setScanning(false);
    }
  }, [onScan]);

  // Stop camera scanner
  const stopCameraScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const scanner = html5QrCodeRef.current as { stop: () => Promise<void>; clear: () => void };
        await scanner.stop();
        scanner.clear();
      } catch {
        // Ignore stop errors
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, [stopCameraScanner]);

  // Start scanner when dialog opens
  useEffect(() => {
    if (cameraOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(startCameraScanner, 100);
      return () => clearTimeout(timer);
    } else {
      stopCameraScanner();
    }
  }, [cameraOpen, startCameraScanner, stopCameraScanner]);

  // Re-focus input after camera closes
  useEffect(() => {
    if (!cameraOpen && inputRef.current && autoFocus) {
      inputRef.current.focus();
    }
  }, [cameraOpen, autoFocus]);

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <ScanBarcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10"
          autoFocus={autoFocus}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleSubmit}
        disabled={!manualInput.trim()}
        title="Submit barcode"
      >
        <ScanBarcode className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setCameraOpen(true)}
        title="Open camera scanner"
      >
        <Camera className="h-4 w-4" />
      </Button>

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scan Barcode
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              id="barcode-scanner-container"
              ref={scannerRef}
              className="min-h-[300px] overflow-hidden rounded-lg bg-black"
            />
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {scanning && (
              <p className="text-center text-sm text-gray-500">
                Point camera at barcode...
              </p>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCameraOpen(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple input for barcode entry (hardware scanner compatible)
interface BarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function BarcodeInput({
  value,
  onChange,
  placeholder = "Enter or scan barcode",
  className,
}: BarcodeInputProps) {
  return (
    <div className={`relative ${className || ""}`}>
      <ScanBarcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
    </div>
  );
}
