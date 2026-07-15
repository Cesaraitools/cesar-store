import path from "path";
import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

export function registerPdfFonts() {
  if (fontsRegistered) return;

  Font.register({
    family: "Cairo",
    fonts: [400, 700, 900].map((fontWeight) => ({
      src: path.join(
        process.cwd(),
        "public",
        "fonts",
        "NotoSansArabic-Regular.ttf"
      ),
      fontWeight,
    })),
  });
  Font.registerHyphenationCallback((word) => [word]);

  fontsRegistered = true;
}

export function pdfText(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return text ? text.normalize("NFC") : "";
}
