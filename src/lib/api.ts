import type { Analysis, AuthState, BusinessLineOption, Municipality, Risk, WizardData } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000";

type RequestOptions = {
  auth?: AuthState | null;
  guestId?: string;
  body?: unknown;
  method?: "GET" | "POST" | "PATCH";
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (options.auth?.session.token) {
    headers.Authorization = `Bearer ${options.auth.session.token}`;
  }
  if (options.guestId) {
    headers["X-Guest-Id"] = options.guestId;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.message ?? "No se pudo completar la solicitud.");
  }
  return payload as T;
}

export const api = {
  signup(email: string, password: string, profile: WizardData["profile"]) {
    return request<AuthState>("/auth/signup", { method: "POST", body: { email, password, profile } });
  },
  login(email: string, password: string) {
    return request<AuthState>("/auth/login", { method: "POST", body: { email, password } });
  },
  autofillIdea(idea: string) {
    return request<{ data: WizardData; missingFields: string[] }>("/processes/idea", { method: "POST", body: { idea } });
  },
  createProcess(data: WizardData, currentStep: number, auth: AuthState | null, guestId?: string) {
    return request<{ process: { processId: string; data: WizardData; missingFields: string[]; completion: number; updatedAt?: string }; guestId?: string }>(
      "/processes",
      { method: "POST", body: { data, currentStep }, auth, guestId }
    );
  },
  updateProcess(processId: string, data: WizardData, currentStep: number, auth: AuthState | null, guestId?: string) {
    return request<{ process: { processId: string; data: WizardData; missingFields: string[]; completion: number; updatedAt?: string } }>(
      `/processes/${processId}`,
      { method: "PATCH", body: { data, currentStep }, auth, guestId }
    );
  },
  states() {
    return request<{ states: Array<{ code: string; name: string }> }>("/catalogs/states");
  },
  municipalities(stateCode: string) {
    return request<{ municipalities: Municipality[] }>(`/catalogs/municipalities?stateCode=${encodeURIComponent(stateCode)}`);
  },
  businessLines(stateCode: string, investment?: number) {
    const params = new URLSearchParams({ stateCode });
    if (investment) params.set("investment", String(investment));
    return request<{ businessLines: BusinessLineOption[] }>(`/catalogs/business-lines?${params.toString()}`);
  },
  locationAnalysis(data: WizardData, processId?: string) {
    return request<{ analysis: Analysis }>("/analysis/location", { method: "POST", body: { data, processId } });
  },
  risk(data: WizardData, analysis: Analysis, processId?: string) {
    return request<{ risk: Risk }>("/analysis/risk", { method: "POST", body: { data, analysis, processId } });
  }
};

