import pdf from "pdf-parse";
import { logger } from "@/lib/logger";

export type ExtractedPage = {
  pageNumber: number;
  text: string;
};

export type ExtractedDocument = {
  pages: ExtractedPage[];
  totalPages: number;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: string;
  };
};

export async function extractPdfText(buffer: Buffer): Promise<ExtractedDocument> {
  try {
    const data = await pdf(buffer, {
      // Preserve page breaks
      pagerender: (pageData) => {
        return pageData.getTextContent().then((textContent: { items: Array<{ str: string; hasEOL?: boolean }> }) => {
          return textContent.items
            .map((item) => item.str + (item.hasEOL ? "\n" : " "))
            .join("");
        });
      },
    });

    const pages: ExtractedPage[] = [];
    const rawText = data.text;

    // Split by form-feed character (\f) which pdf-parse uses for page breaks
    const pageTexts = rawText.split(/\f/);

    for (let i = 0; i < pageTexts.length; i++) {
      const text = pageTexts[i]?.trim() ?? "";
      if (text.length > 0) {
        pages.push({ pageNumber: i + 1, text });
      }
    }

    // If no page breaks found, treat all as one page
    if (pages.length === 0 && rawText.trim().length > 0) {
      pages.push({ pageNumber: 1, text: rawText.trim() });
    }

    logger.info(
      { totalPages: pages.length, textLength: rawText.length },
      "PDF extracted"
    );

    return {
      pages,
      totalPages: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        creationDate: data.info?.CreationDate,
      },
    };
  } catch (err) {
    logger.error({ err }, "PDF extraction failed");
    throw new Error("Failed to extract PDF text");
  }
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")           // normalize whitespace
    .replace(/[\x00-\x1F]/g, " ")    // remove control characters
    .replace(/\u00A0/g, " ")          // replace non-breaking spaces
    .trim();
}
