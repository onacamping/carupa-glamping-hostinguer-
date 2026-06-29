import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface ReceiptData {
  bookingRef: string;
  fullName: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  planLabel: string;
  alojamientoLabel: string;
  checkInDate: string;
  checkOutDate: string;
  total: number;
  deposit: number;
  saldo: number;
  addonNames: string[];
  extraPersonsText?: string;
}

export function generateReceipt(data: ReceiptData): Promise<string> {
  return new Promise((resolve) => {
    const addonNames = data.addonNames;
    const extraPersonsText = data.extraPersonsText;
    const allAddonLines = extraPersonsText ? [...addonNames, extraPersonsText] : addonNames;
    const addonsBlockH = allAddonLines.length > 0 ? 60 + allAddonLines.length * 28 : 0;
    const W = 800;

    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";

    const drawVoucher = (logo: HTMLImageElement | null) => {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = 980 + addonsBlockH;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = "#F5F2EB";
      ctx.fillRect(0, 0, W, canvas.height);

      // Header
      const hdrH = 160;
      ctx.fillStyle = "#0f2419";
      ctx.fillRect(0, 0, W, hdrH);
      ctx.fillStyle = "#C9A84C";
      ctx.fillRect(0, hdrH - 4, W, 4);

      // Logo
      if (logo) {
        const lSize = 90;
        const lx = 40, ly = (hdrH - lSize) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(lx + lSize / 2, ly + lSize / 2, lSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, lx, ly, lSize, lSize);
        ctx.restore();
        ctx.strokeStyle = "#C9A84C";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(lx + lSize / 2, ly + lSize / 2, lSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Title
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.font = "bold 42px Georgia, serif";
      ctx.fillText("Carupa Glamping", W / 2 + (logo ? 25 : 0), 62);
      ctx.fillStyle = "#C9A84C";
      ctx.font = "bold 13px Arial, sans-serif";
      ctx.letterSpacing = "5px";
      ctx.fillText("CONFIRMACION DE RESERVA", W / 2 + (logo ? 25 : 0), 96);
      ctx.letterSpacing = "0px";
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "11px Arial, sans-serif";
      ctx.fillText("Carmen de Carupa · Cundinamarca, Colombia", W / 2 + (logo ? 25 : 0), 118);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "10px Arial, sans-serif";
      ctx.fillText("reservas@carupaglamping.com  ·  +57 310 327 2630", W / 2 + (logo ? 25 : 0), 138);

      // Reference badge
      ctx.textAlign = "center";
      const badgeW = 300, badgeH = 44;
      const bx = (W - badgeW) / 2, by = hdrH + 18;
      ctx.fillStyle = "#0f2419";
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeW, badgeH, 22);
      ctx.fill();
      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeW, badgeH, 22);
      ctx.stroke();
      ctx.fillStyle = "#C9A84C";
      ctx.font = "bold 15px Georgia, serif";
      ctx.fillText(`Referencia: ${data.bookingRef || "---"}`, W / 2, by + 28);

      // Details section
      let y = hdrH + 84;
      ctx.textAlign = "left";
      ctx.fillStyle = "#0f2419";
      ctx.font = "bold 18px Georgia, serif";
      ctx.fillText("Detalles de la Reserva", 50, y);
      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(50, y + 8);
      ctx.lineTo(W - 50, y + 8);
      ctx.stroke();
      y += 28;

      const details = [
        { label: "Huesped", value: data.fullName || "---" },
        { label: "Cedula / ID", value: data.idNumber || "---" },
        { label: "Telefono", value: data.phone || "---" },
        { label: "Email", value: data.email || "---" },
        { label: "Plan", value: data.planLabel || "---" },
        { label: "Alojamiento", value: data.alojamientoLabel || "---" },
        { label: "Check-in", value: data.checkInDate || "---" },
        { label: "Check-out", value: data.checkOutDate || "---" },
        { label: "Total reserva", value: `$${(data.total || 0).toLocaleString()} COP` },
        { label: "Anticipo (50%)", value: `$${(data.deposit || 0).toLocaleString()} COP` },
        { label: "Saldo al llegar", value: `$${(data.saldo || 0).toLocaleString()} COP` },
      ];

      details.forEach(({ label, value }, i) => {
        ctx.fillStyle = i % 2 === 0 ? "#FFFFFF" : "#EDE9DF";
        ctx.beginPath();
        ctx.roundRect(50, y - 16, W - 100, 36, 5);
        ctx.fill();
        ctx.fillStyle = "#5C6470";
        ctx.font = "12px Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(label + ":", 66, y + 5);
        ctx.fillStyle = "#0f2419";
        ctx.font = "bold 13px Arial, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(value, W - 66, y + 5);
        y += 40;
      });
      ctx.textAlign = "left";

      // Adicionales
      if (allAddonLines.length > 0) {
        y += 14;
        ctx.fillStyle = "#0f2419";
        ctx.font = "bold 16px Georgia, serif";
        ctx.fillText("Adicionales", 50, y);
        ctx.strokeStyle = "#C9A84C";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, y + 8);
        ctx.lineTo(W - 50, y + 8);
        ctx.stroke();
        y += 26;
        ctx.font = "13px Arial, sans-serif";
        allAddonLines.forEach(name => {
          ctx.fillStyle = "#C9A84C";
          ctx.fillText(">", 58, y);
          ctx.fillStyle = "#374151";
          ctx.fillText(name, 80, y);
          y += 28;
        });
      }

      // Info box
      y += 20;
      ctx.fillStyle = "#E3EDE5";
      ctx.strokeStyle = "#0f2419";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(50, y, W - 100, 96, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0f2419";
      ctx.font = "bold 13px Arial, sans-serif";
      ctx.fillText("Check-in: 3:00 PM - 9:30 PM   |   Check-out: antes de 12:30 PM", 70, y + 28);
      ctx.fillStyle = "#2C5134";
      ctx.font = "12px Arial, sans-serif";
      ctx.fillText("El saldo pendiente se abona al momento de llegar a Carupa Glamping.", 70, y + 52);
      ctx.fillText("Presenta este comprobante al momento de tu llegada.", 70, y + 72);
      y += 116;

      // Footer
      ctx.fillStyle = "#0f2419";
      ctx.fillRect(0, y, W, 64);
      ctx.fillStyle = "#C9A84C";
      ctx.font = "bold 14px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Carupa Glamping  ·  WhatsApp: +57 310 327 2630", W / 2, y + 26);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "11px Arial, sans-serif";
      ctx.fillText("@carupaglamping  ·  reservas@carupaglamping.com", W / 2, y + 46);

      resolve(canvas.toDataURL("image/png"));
    };

    logoImg.onload = () => drawVoucher(logoImg);
    logoImg.onerror = () => drawVoucher(null);
    logoImg.src = "/images/carupa-logo.png";
  });
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, "EEEE dd 'de' MMMM yyyy", { locale: es });
  } catch {
    return dateStr;
  }
}
