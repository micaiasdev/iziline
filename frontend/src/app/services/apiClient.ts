import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const API_USERNAME = import.meta.env.VITE_API_USERNAME;
const API_PASSWORD = import.meta.env.VITE_API_PASSWORD;

const headers: Record<string, string> = {
  "Content-Type": "application/json",
};

if (API_USERNAME && API_PASSWORD) {
  headers.Authorization = `Basic ${btoa(`${API_USERNAME}:${API_PASSWORD}`)}`;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers,
});
