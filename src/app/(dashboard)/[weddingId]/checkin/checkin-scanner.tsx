"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { validateQrCode } from "@/app/actions/checkin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function CheckinScanner({ weddingId }: { weddingId: string }) {
  const [scanResult, setScanResult] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message: string;
    guest?: any;
  }>({ status: "idle", message: "" });
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Only initialize if it hasn't been initialized yet
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
        scannerRef.current = null;
      }
    };
  }, []);

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    if (scanResult.status === "loading" || scanResult.status === "success") return;
    
    // Pause scanner if possible or just ignore new scans
    if (scannerRef.current) {
      try {
        await scannerRef.current.pause(true);
      } catch (e) {
        console.error("Could not pause scanner", e);
      }
    }

    setScanResult({ status: "loading", message: "Validando..." });
    
    const result = await validateQrCode(weddingId, decodedText);
    
    if (result.success) {
      setScanResult({ 
        status: "success", 
        message: "Check-in realizado com sucesso!",
        guest: result.guest 
      });
    } else {
      setScanResult({ 
        status: "error", 
        message: result.error || "Erro ao validar QR Code." 
      });
    }
  };

  const onScanFailure = (error: any) => {
    // handle scan failure, usually better to ignore and keep scanning
  };

  const resetScanner = () => {
    setScanResult({ status: "idle", message: "" });
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch (e) {
        console.error("Could not resume scanner", e);
      }
    }
  };

  return (
    <Card className="w-full shadow-lg border-2">
      <CardHeader className="text-center bg-muted/50 border-b">
        <CardTitle className="text-2xl font-medium tracking-tight">Leitor de QR Code</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex flex-col items-center space-y-6">
        
        <div 
          id="qr-reader" 
          className="w-full max-w-sm rounded-xl overflow-hidden shadow-sm border-2 border-dashed border-primary/30"
          style={{ display: scanResult.status === "idle" ? "block" : "none" }}
        ></div>

        {scanResult.status === "loading" && (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg font-medium animate-pulse">Validando check-in...</p>
          </div>
        )}

        {scanResult.status === "success" && (
          <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center bg-green-50/50 rounded-xl border border-green-100 w-full">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-green-700">Check-in Confirmado!</h3>
              <p className="text-green-600 font-medium text-lg">{scanResult.guest?.name}</p>
              <p className="text-sm text-green-600/80">
                {scanResult.guest?.familyCount > 1 
                  ? `+ ${scanResult.guest?.familyCount - 1} acompanhantes liberados`
                  : 'Acesso individual liberado'}
              </p>
            </div>
            <Button onClick={resetScanner} className="mt-4 w-full bg-green-600 hover:bg-green-700">
              Ler próximo QR Code
            </Button>
          </div>
        )}

        {scanResult.status === "error" && (
          <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center bg-red-50/50 rounded-xl border border-red-100 w-full">
            <XCircle className="w-16 h-16 text-red-500" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-red-700">Acesso Negado</h3>
              <p className="text-red-600 font-medium">{scanResult.message}</p>
            </div>
            <Button onClick={resetScanner} variant="outline" className="mt-4 w-full border-red-200 hover:bg-red-50 hover:text-red-700">
              Tentar novamente
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
