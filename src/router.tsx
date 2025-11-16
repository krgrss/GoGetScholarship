import { createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}
/**
 * Router factory
 * - Creates a TanStack Router instance using the generated route tree.
 * - Exposed as a function to allow fresh instances in SSR contexts if needed.
 */
