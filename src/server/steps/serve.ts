import {matchRoute} from "../router.ts";

export function serve(routes: Record<string, Record<string, (req: Request, params?: Record<string, string>) => (Promise<Response> | Response)>>) {
  const server = Bun.serve({
    fetch(req: Request) {
      const url = new URL(req.url);
      const routeResult = matchRoute(req.method, url.pathname, routes);

      if (routeResult) {
        const {handler, params} = routeResult;
        return handler(req, params);
      }

      return new Response("Not Found", {status: 404});
    },
    port: 3001,
  });

  console.log(`Server started on ${server.url}`);
}
