"use client";

import { useEffect, useState } from "react";

export function QrCode({ token, caption = "Unique QR code for your invite", onReady }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function generateQr() {
      if (typeof window === "undefined") return;

      const { default: QRCode } = await import("qrcode");
      const safeToken = typeof token === "string" && token.trim() ? token.trim() : "guest";
      const value = `${window.location.origin}/portal?invite=${encodeURIComponent(safeToken)}`;

      const url = await QRCode.toDataURL(value, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 420,
        color: {
          dark: "#0b0f12",
          light: "#ffffff",
        },
      });

      if (isMounted) {
        setQrDataUrl(url);
        if (typeof onReady === "function") {
          onReady();
        }
      }
    }

    generateQr();

    return () => {
      isMounted = false;
    };
  }, [onReady, token]);

  return (
    <div className="qr-block">
      <div className="qr-code" aria-label={caption || "Unique QR code for your invite"} role="img">
        {qrDataUrl ? (
          <img alt="" className="qr-image" src={qrDataUrl} />
        ) : (
          <div className="qr-loading" aria-hidden="true" />
        )}
      </div>
      {caption ? <p className="qr-caption">{caption}</p> : null}
    </div>
  );
}
