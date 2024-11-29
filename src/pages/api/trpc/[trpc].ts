import * as trpcNext from '@trpc/server/adapters/next';
import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';

// Configure the API handler
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
};

// Export API handler
export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError:
    process.env.NODE_ENV === "development"
      ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
          );
        }
      : undefined,
}); 