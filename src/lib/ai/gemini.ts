export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

type GeminiErrorPayload = {
  error?: { code?: number; status?: string; message?: string; details?: Array<{ reason?: string }> };
  steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
};
export class GeminiApiError extends Error {
  constructor(message: string, public readonly httpStatus: number, public readonly providerStatus?: string, public readonly providerCode?: number) {
    super(message);
    this.name = "GeminiApiError";
  }
}

function safeGeminiError(status: number, payload: GeminiErrorPayload): GeminiApiError {
  const providerStatus = payload.error?.status || "";
  const providerCode = payload.error?.code || status;
  const reason = payload.error?.details?.map(item => item.reason || "").filter(Boolean).join(",");
  const combined = (providerStatus + " " + reason + " " + (payload.error?.message || "")).toUpperCase();

  if (status === 400 && /API_KEY_INVALID|INVALID API KEY/.test(combined)) {
    return new GeminiApiError("مفتاح Gemini غير صحيح أو تم إلغاؤه. راجع المفتاح في Google AI Studio.", 400, providerStatus, providerCode);
  }
  if (status === 401) {
    return new GeminiApiError("Gemini رفض بيانات المصادقة. تأكد أن المفتاح كامل ومن نوع Gemini API وليس رمز OAuth.", 401, providerStatus, providerCode);
  }
  if (status === 403) {
    return new GeminiApiError("المفتاح معروف لكن المشروع لا يملك صلاحية استخدام Gemini API. راجع تفعيل Gemini API وقيود المفتاح وإعدادات المشروع.", 403, providerStatus, providerCode);
  }
  if (status === 404) {
    return new GeminiApiError("نموذج Gemini المحدد غير متاح لهذا المشروع أو لم يعد متاحًا. النموذج الحالي: " + GEMINI_MODEL + ".", 422, providerStatus, providerCode);
  }
  if (status === 429) {
    return new GeminiApiError("تم تجاوز حصة Gemini أو معدل الطلبات المسموح. راجع حدود الاستخدام والحصة في Google AI Studio.", 429, providerStatus, providerCode);
  }
  if (status >= 500) {
    return new GeminiApiError("خدمة Google Gemini غير متاحة مؤقتًا (HTTP " + status + (providerStatus ? "، " + providerStatus : "") + "). أُعيدت المحاولة تلقائيًا؛ انتظر قليلًا ثم حاول مجددًا.", status === 503 ? 503 : 502, providerStatus || "GEMINI_SERVER_ERROR", providerCode);
  }
  const providerMessage = payload.error?.message?.slice(0, 180);
  return new GeminiApiError("فشل طلب Gemini (HTTP " + status + "). " + (providerMessage || "راجع إعدادات المفتاح والمشروع."), status >= 400 && status < 500 ? status : 502, providerStatus || "GEMINI_REQUEST_FAILED", providerCode);
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function requestGeminiModel(apiKey: string, prompt: string, model: string, maxOutputTokens: number): Promise<{ response: Response; payload?: GeminiErrorPayload }> {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          model,
          input: prompt,
          store: false,
          generation_config: { max_output_tokens: maxOutputTokens, temperature: 0 }
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(20000)
      });
    } catch (error) {
      if (attempt < 2 && (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"))) {
        await wait(700 * (2 ** attempt));
        continue;
      }
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new GeminiApiError("انتهت مهلة الاتصال بخدمة Gemini بعد محاولات إعادة الاتصال. تحقق من الاتصال وحاول مرة أخرى.", 504, "NETWORK_TIMEOUT");
      }
      throw new GeminiApiError("تعذر الوصول إلى خوادم Gemini بسبب مشكلة في الشبكة أو الاتصال.", 502, "NETWORK_ERROR");
    }
    if (response.status === 503 && attempt < 2) {
      await wait(700 * (2 ** attempt));
      continue;
    }
    break;
  }

  if (!response) throw new GeminiApiError("تعذر إنشاء اتصال بخدمة Gemini.", 502, "NETWORK_ERROR");
  const raw = await response.text();
  let payload: GeminiErrorPayload | undefined;
  try { payload = JSON.parse(raw) as GeminiErrorPayload; }
  catch {
    if (!response.ok) throw new GeminiApiError("أعاد Gemini استجابة غير مفهومة (HTTP " + response.status + ").", response.status, "INVALID_PROVIDER_RESPONSE", response.status);
    throw new GeminiApiError("أعاد Gemini استجابة غير صالحة للقراءة.", 502, "INVALID_PROVIDER_RESPONSE");
  }
  return { response, payload };
}

export async function generateGeminiText(apiKey: string, prompt: string, maxOutputTokens = 32): Promise<string> {
  let result = await requestGeminiModel(apiKey, prompt, GEMINI_MODEL, maxOutputTokens);
  if (result.response.status === 503 && GEMINI_MODEL !== GEMINI_FALLBACK_MODEL) {
    result = await requestGeminiModel(apiKey, prompt, GEMINI_FALLBACK_MODEL, maxOutputTokens);
  }
  if (!result.response.ok) throw safeGeminiError(result.response.status, result.payload || {});
  const text = result.payload?.steps
    ?.filter(step => step.type === "model_output")
    .flatMap(step => step.content || [])
    .filter(part => part.type === "text")
    .map(part => part.text || "")
    .join("")
    .trim();
  if (!text) throw new GeminiApiError("اتصل التطبيق بـGemini بنجاح، لكن النموذج لم يُرجع نصًا. تحقق من إعدادات النموذج.", 502, "EMPTY_MODEL_OUTPUT");
  return text;
}

export async function verifyGeminiApiKey(apiKey: string): Promise<void> {
  const text = await generateGeminiText(apiKey, "Reply with exactly: ORBITA_GEMINI_OK", 16);
  if (!text.toUpperCase().includes("ORBITA_GEMINI_OK")) {
    throw new GeminiApiError("تم الوصول إلى Gemini لكن استجابة التحقق لم تطابق الاختبار المتوقع.", 502, "VERIFICATION_RESPONSE_MISMATCH");
  }
}
