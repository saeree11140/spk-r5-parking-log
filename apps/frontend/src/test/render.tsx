import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { AppProviders } from "@/providers";

export function createTestQueryClient(
  config: QueryClientConfig = {},
): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
    ...config,
  });
}

export function renderWithQueryClient(
  ui: ReactElement,
  options: RenderOptions & { queryClient?: QueryClient } = {},
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

interface RenderWithRouterOptions extends RenderOptions {
  /** Route path the element is mounted at, e.g. "/houses/$houseCode". */
  path?: string;
  /** URL the memory history starts at; defaults to `path`. */
  initialEntry?: string;
  queryClient?: QueryClient;
}

/**
 * Renders `ui` as the component of one real route. Any other URL matches an
 * empty catch-all route, so tests can assert where navigation went through
 * `router.state.location.pathname`.
 */
export async function renderWithRouter(
  ui: ReactElement,
  options: RenderWithRouterOptions = {},
) {
  const {
    path = "/",
    initialEntry = path,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  const rootRoute = createRootRoute({ component: Outlet });
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: () => ui,
  });
  const elsewhereRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "$",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren(
      path === "$" ? [pageRoute] : [pageRoute, elsewhereRoute],
    ),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
  await router.load();

  return {
    router,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
      renderOptions,
    ),
  };
}

/**
 * Renders the real application route tree, so route guards (beforeLoad,
 * redirects, not-found) run exactly as in the browser.
 */
export async function renderApp(initialEntry: string) {
  const { routeTree } = await import("@/routeTree.gen");
  const queryClient = createTestQueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  return {
    router,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AppProviders>
          <RouterProvider router={router} />
        </AppProviders>
      </QueryClientProvider>,
    ),
  };
}
