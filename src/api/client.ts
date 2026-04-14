import axios from "axios";
import { apiUrl } from "../config/env";

export { apiUrl };

export const api = axios.create({
  baseURL: `${apiUrl}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type StrapiEntity<T> = {
  id: number;
  documentId?: string;
  attributes?: T;
};

const normalize = <T>(
  entity: StrapiEntity<T> | (T & { id: number })
): T & { id: number; documentId?: string } => {
  if (!entity) {
    return entity as T & { id: number; documentId?: string };
  }

  if ("attributes" in entity && entity.attributes) {
    return {
      id: entity.id,
      documentId: entity.documentId,
      ...entity.attributes,
    } as T & { id: number; documentId?: string };
  }

  const { id, ...rest } = entity as T & { id: number; documentId?: string };
  return { id, ...rest } as T & { id: number; documentId?: string };
};

export const getCollection = async <T>(
  path: string,
  params?: Record<string, unknown>
): Promise<Array<T & { id: number }>> => {
  const { data } = await api.get<{ data: Array<StrapiEntity<T>> }>(`/${path}`, {
    params,
  });
  return data.data.map(normalize);
};

export const getSingle = async <T>(
  path: string,
  params?: Record<string, unknown>
): Promise<(T & { id: number }) | null> => {
  const { data } = await api.get<{ data: StrapiEntity<T> | null }>(`/${path}`, {
    params,
  });
  return data.data ? normalize(data.data) : null;
};

export const createEntry = async <T>(
  path: string,
  payload: Record<string, unknown>
): Promise<T & { id: number }> => {
  const { data } = await api.post<{ data: StrapiEntity<T> }>(`/${path}`, {
    data: payload,
  });
  return normalize(data.data);
};

export const updateEntry = async <T>(
  path: string,
  id: number | string,
  payload: Record<string, unknown>
): Promise<T & { id: number }> => {
  const { data } = await api.put<{ data: StrapiEntity<T> }>(
    `/${path}/${id}`,
    {
      data: payload,
    }
  );
  return normalize(data.data);
};

export const deleteEntry = async (path: string, id: number | string): Promise<void> => {
  await api.delete(`/${path}/${id}`);
};

export const updateSingle = async <T>(
  path: string,
  payload: Record<string, unknown>
): Promise<T & { id: number }> => {
  const { data } = await api.put<{ data: StrapiEntity<T> }>(`/${path}`, {
    data: payload,
  });
  return normalize(data.data);
};
