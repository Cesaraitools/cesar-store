import path from "path";
import arabicReshaper from "arabic-reshaper";
import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

export function registerPdfFonts() {
  if (fontsRegistered) return;

  Font.register({
    family: "Cairo",
    src: path.join(
      process.cwd(),
      "public",
      "fonts",
      "Cairo-VariableFont_slnt,wght.ttf"
    ),
  });

  fontsRegistered = true;
}

export function pdfText(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (!text) return "";

  if (!/[\u0600-\u06FF]/.test(text)) return text;

  try {
    const reshaper = (arabicReshaper as any).default || arabicReshaper;
    const shaped =
      typeof reshaper.convertArabic === "function"
        ? reshaper.convertArabic(text)
        : typeof reshaper.reshape === "function"
        ? reshaper.reshape(text)
        : text;

    return shaped.split(" ").reverse().join(" ");
  } catch {
    return text;
  }
}
