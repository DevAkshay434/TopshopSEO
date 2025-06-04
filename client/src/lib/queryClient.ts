import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Define options interface for new method signature
interface ApiRequestOptions {
  url: string;
  method: string;
  data?: unknown;
}

export async function apiRequest<T = any>(
  methodOrOptions: string | ApiRequestOptions,
  urlOrData?: string | unknown,
  data?: unknown | undefined,
): Promise<T> {
  // Handle both calling conventions:
  // 1. apiRequest({ url: '/api/posts', method: 'POST', data: {...} })
  // 2. apiRequest('POST', '/api/posts', {...})
  
  let url: string;
  let method: string;
  let requestData: unknown | undefined;
  
  if (typeof methodOrOptions === 'object') {
    // New style: options object
    url = methodOrOptions.url;
    method = methodOrOptions.method;
    requestData = methodOrOptions.data;
  } else {
    // Old style: separate arguments
    method = methodOrOptions;
    url = urlOrData as string;
    requestData = data;
  }
  
  const res = await fetch(url, {
    method,
    headers: requestData ? { "Content-Type": "application/json" } : {},
    body: requestData ? JSON.stringify(requestData) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
