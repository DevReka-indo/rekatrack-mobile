// utils/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL =
  process.env.REKATRACK_API ?? "https://rekatrack.ptrekaindo.co.id/api";

// Timeout fetch
const fetchWithTimeout = (url: string, options: any, timeout = 15000) =>
  Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeout),
    ),
  ]);

// Deteksi FormData di React Native (jangan pakai instanceof)
const isReactNativeFormData = (body: any) => {
  if (!body) return false;
  if (typeof body !== "object") return false;
  return typeof body.append === "function"; // cukup aman untuk RN
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem("token");

  const isFormData = isReactNativeFormData(options.body);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // SET JSON content-type hanya jika bukan FormData
    ...(options.body && !isFormData
      ? { "Content-Type": "application/json" }
      : {}),
    ...(options.headers as any),
  };

  try {
    const response: any = await fetchWithTimeout(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (response.status === 401) {
      await AsyncStorage.removeItem("token");
      throw { status: 401, message: "Session expired. Please login again." };
    }

    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.message || "Request failed",
        data,
      };
    }

    return data;
  } catch (error: any) {
    console.error("API ERROR:", error);
    throw {
      status: error?.status ?? 0,
      message: error?.message ?? "Network error",
      raw: error,
    };
  }
};
