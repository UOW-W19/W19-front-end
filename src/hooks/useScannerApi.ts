import { useMutation } from "@tanstack/react-query";

interface DetectionItem {
  canonical_label: string;   // English taxonomy key — used for vocabulary save
  translated_label: string;  // Localized word from static JSON store
}

// Commented out — old ambiguous shape replaced by DetectionItem[]
// interface DetectedObjectResponse {
//   label: string;
//   translatedLabel: string;
//   confidence: number;
//   translated: boolean;
// }

interface ScannerAnalyzeResponse {
  detections: DetectionItem[];
  description: string;
  language: string;
}

interface AnalyzeRequest {
  image: string;
  target_language: string;
}


import { getStoredToken } from "@/services/api/auth";
import { API_BASE_URL } from "@/services/api/config";

export function useScannerApi() {
  const analyzeMutation = useMutation({
    mutationFn: async (req: AnalyzeRequest): Promise<ScannerAnalyzeResponse> => {
      const token = getStoredToken() || "";

      const response = await fetch(`${API_BASE_URL}/scanner/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        //   body: JSON.stringify({
        //     image_base64: req.image_base64,
        //     target_language: req.target_language,
        //   }),
        // });
        body: JSON.stringify({
          image: req.image,
          target_language: req.target_language,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze image");
      }

      return response.json();
    },
  });

  const saveWordMutation = useMutation({
    mutationFn: async (data: { word: string; translation: string; languageCode: string }) => {
      const token = getStoredToken() || "";
      const response = await fetch(`${API_BASE_URL}/words`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          word: data.word,
          translation: data.translation,
          language_code: data.languageCode,
          source: "AR_SCAN",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save word");
      }

      return response.json();
    },
  });

  return { analyzeMutation, saveWordMutation };
}
