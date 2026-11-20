export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiErrorPayload = { error?: { code?: number; status?: string; message?: string; details?: Array<{ reason?: string }> } };
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
    return new GeminiApiError("نموذج Gemini المحدد غير متاح لهذا المشروع أو لم يعد متاحًا. استخدم نموذجًا مستقرًا مدعومًا مثل " + GEMINI_MODEL + ".", 422, providerStatus, providerCode);
  }
  if (status === 429) {
    return new GeminiApiError("تم تجاوز حصة Gemini أو معدل الطلبات المسموح. انتظر إعادة ضبط الحصة أو راجع حدود الاستخدام والفوترة في Google AI Studio.", 429, providerStatus, providerCode);
  }
  if (status >= 500) {
    return new GeminiApiError("خدمة Gemini تواجه عطلًا مؤقتًا. حاول مرة أخرى لاحقًا.", 502, providerStatus, providerCode);
  }
  return new GeminiApiError("فشل طلب Gemini (" + status + "). " + (payload.error?.message || "راجع إعدادات المفتاح والمشروع."), status >= 400 && status < 500 ? status : 502, providerStatus, providerCode);
}

export async function generateGeminiText(apiKey: string, prompt: string, maxOutputTokens = 32): Promise<string> {
  let response: Response;
  try {
    response = await fetch(GEMINI_ENDPOINT + "/" + GEMINI_MODEL + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens }
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new GeminiApiError("انتهت مهلة الاتصال بخدمة Gemini. تحقق من الاتصال وحاول مرة أخرى.", 504);
    }
    throw new GeminiApiError("تعذر الوصول إلى خوادم Gemini بسبب مشكلة في الشبكة أو الاتصال.", 502);
  }

  const raw = await response.text();
  let payload: GeminiErrorPayload & { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  try { payload = JSON.parse(raw); }
  catch {
    if (!response.ok) throw new GeminiApiError("أعاد Gemini استجابة غير مفهومة (HTTP " + response.status + ").", response.status >= 500 ? 502 : response.status);
    throw new GeminiApiError("أعاد Gemini استجابة غير صالحة للقراءة.", 502);
  }
  if (!response.ok) throw safeGeminiError(response.status, payload);

  const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim();
  if (!text) throw new GeminiApiError("اتصل التطبيق بـGemini بنجاح، لكن النموذج لم يُرجع نصًا. تحقق من إعدادات النموذج.", 502);
  return text;
}

export async function verifyGeminiApiKey(apiKey: string): Promise<void> {
  const text = await generateGeminiText(apiKey, "Reply with exactly: ORBITA_GEMINI_OK", 16);
  if (!text.toUpperCase().includes("ORBITA_GEMINI_OK")) {
    throw new GeminiApiError("تم الوصول إلى Gemini لكن استجابة التحقق لم تطابق الاختبار المتوقع.", 502);
  }
}
