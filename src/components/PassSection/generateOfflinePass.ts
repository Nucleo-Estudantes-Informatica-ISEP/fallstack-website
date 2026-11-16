import { branding } from "@/edition/branding";

export interface OfflinePassPayload {
  studentName: string;
  studentEmail?: string;
  permanentCode: string; // student.code permanente (issue #405)
  qrSvgElement: SVGSVGElement; // SVG oculto renderizado com value={student.code}
}

export async function downloadOfflinePass({
  studentName,
  studentEmail,
  permanentCode,
  qrSvgElement,
}: OfflinePassPayload): Promise<void> {
  const width = 1000;
  const height = 1500;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Não foi possível inicializar o canvas.");
  }

  // 1. Fundo base #141414 (Figma)
  ctx.fillStyle = "#141414";
  ctx.fillRect(0, 0, width, height);

  // 2. Desenhar composite 2026 (logo já embutido — não sobrepor outro logo do evento)
  const bgImg = await loadImage("/assets/images/landing-2026.png");
  const targetHeight = 420;
  const scale = Math.max(width / bgImg.width, targetHeight / bgImg.height);
  const drawW = bgImg.width * scale;
  const drawH = bgImg.height * scale;
  const drawX = (width - drawW) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(40, 40, width - 80, targetHeight);
  ctx.clip();
  ctx.drawImage(bgImg, drawX, 40, drawW, drawH);

  // Gradiente de transição suave para o painel escuro #141414
  const grad = ctx.createLinearGradient(0, 260, 0, 460);
  grad.addColorStop(0, "rgba(20, 20, 20, 0)");
  grad.addColorStop(1, "#141414");
  ctx.fillStyle = grad;
  ctx.fillRect(40, 260, width - 80, 200);
  ctx.restore();

  // 3. Borda do painel #484848 (Figma)
  ctx.strokeStyle = "#484848";
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  // 4. Informação do Evento (17–18 novembro 2026 • ISEP)
  ctx.textAlign = "center";
  ctx.fillStyle = "#F97316";
  ctx.font = 'bold 30px "Inter", sans-serif';
  const daysText = `${branding.event.days.join("–")} DE ${branding.event.month.toUpperCase()} ${branding.year} • ${branding.event.venue}`;
  ctx.fillText(daysText, width / 2, 470);

  // 5. Identidade do Estudante
  ctx.fillStyle = "#FFFFFF";
  ctx.font = 'bold 46px "Inter", sans-serif';
  ctx.fillText(truncateText(ctx, studentName, width - 160), width / 2, 545);

  if (studentEmail) {
    ctx.fillStyle = "#D1D3D4";
    ctx.font = '26px "Inter", sans-serif';
    ctx.fillText(truncateText(ctx, studentEmail, width - 160), width / 2, 590);
  }

  // 6. Caixa Branca do QR Code (Alto contraste + Quiet Zone de 40px)
  const qrBoxSize = 480;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = 635;

  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
  ctx.fill();

  // Converter o SVG do QRCode (com student.code permanente) para imagem no Canvas
  const qrImg = await svgToImage(qrSvgElement, 400, 400);
  ctx.drawImage(qrImg, qrBoxX + 40, qrBoxY + 40, 400, 400);

  // 7. Código de Fallback Legível em Separado (#405)
  ctx.fillStyle = "#D1D3D4";
  ctx.font = '600 22px "Inter", sans-serif';
  ctx.fillText("CÓDIGO DE VALIDAÇÃO (FALLBACK)", width / 2, 1175);

  ctx.fillStyle = "#1E1E1E";
  roundRect(ctx, 200, 1195, width - 400, 84, 12);
  ctx.fill();
  ctx.strokeStyle = "#484848";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = 'bold 42px "Inter", monospace';
  ctx.fillText(permanentCode.toUpperCase(), width / 2, 1252);

  // 8. Rodapé com Logo NEI e Nota de Validade / Revogação (#394 / #405)
  const neiLogo = await loadImage("/assets/images/logo-simplified-white.png");
  const logoH = 36;
  const logoW = (neiLogo.width / neiLogo.height) * logoH;
  ctx.drawImage(neiLogo, (width - logoW) / 2, 1315, logoW, logoH);

  ctx.fillStyle = "#A1A1AA";
  ctx.font = '20px "Inter", sans-serif';
  // Nota sobre o comportamento real do código (sem implicar expiração por data
  // nem verificação de conta ativa): a imagem fica no dispositivo; a eliminação
  // da conta remove a consulta do código e revoga o objeto da Google Wallet.
  ctx.fillText(
    "Esta imagem fica guardada no teu dispositivo.",
    width / 2,
    1385
  );
  ctx.fillText(
    "Ao eliminares a conta, o código deixa de ser reconhecido",
    width / 2,
    1412
  );
  ctx.fillText("e o passe da Google Wallet é revogado.", width / 2, 1439);

  // 9. Descarregar PNG
  const pngUrl = canvas.toDataURL("image/png", 1.0);
  const link = document.createElement("a");
  link.download = getPassFilename(studentName, permanentCode);
  link.href = pngUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getPassFilename(
  studentName: string,
  permanentCode: string
): string {
  const slug = studentName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `passe-${branding.name.toLowerCase()}-${branding.year}-${slug || permanentCode}.png`;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
    img.src = src;
  });
}

export function svgToImage(
  svgEl: SVGSVGElement,
  width: number,
  height: number
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao converter SVG do QR Code para imagem."));
    };
    img.width = width;
    img.height = height;
    img.src = url;
  });
}

export function truncateText(
  ctx: Pick<CanvasRenderingContext2D, "measureText">,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (
    ctx.measureText(`${result}...`).width > maxWidth &&
    result.length > 0
  ) {
    result = result.slice(0, -1);
  }
  return `${result}...`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y + w, y, r);
  ctx.closePath();
}
