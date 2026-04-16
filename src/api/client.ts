import axios from "axios";
import { apiUrl } from "../config/env";

export { apiUrl };

export const api = axios.create({
  baseURL: `${apiUrl}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && token !== "undefined" && token !== "null") {
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

type StrapiPagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
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
  const { data } = await getCollectionPage<T>(path, params);
  return data;
};

export const getAllCollection = async <T>(
  path: string,
  params?: Record<string, unknown>
): Promise<Array<T & { id: number }>> => {
  const allData: Array<T & { id: number }> = [];
  let page = 1;
  let pageCount = 1;

  do {
    const { data, pagination } = await getCollectionPage<T>(path, {
      ...params,
      "pagination[page]": page,
      "pagination[pageSize]":
        (params?.["pagination[pageSize]"] as number | undefined) ?? 100,
    });

    allData.push(...data);

    if (!pagination) {
      break;
    }

    pageCount = pagination.pageCount ?? page;
    page += 1;
  } while (page <= pageCount);

  return allData;
};

export const getCollectionPage = async <T>(
  path: string,
  params?: Record<string, unknown>
): Promise<{
  data: Array<T & { id: number }>;
  pagination?: StrapiPagination;
}> => {
  const { data } = await api.get<{ data: Array<StrapiEntity<T>> }>(`/${path}`, {
    params,
  });
  return {
    data: data.data.map(normalize),
    pagination: (data as { meta?: { pagination?: StrapiPagination } }).meta
      ?.pagination,
  };
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

export const getOptionalSingle = async <T>(
  path: string,
  params?: Record<string, unknown>
): Promise<(T & { id: number }) | null> => {
  try {
    return await getSingle<T>(path, params);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
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
