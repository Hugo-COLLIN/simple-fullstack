/**
 * Match the URL path with the defined routes, including dynamic segments and HTTP methods.
 * @param method The HTTP method (GET, POST, etc.)
 * @param path The URL path
 * @param routes The route handlers
 * @returns The matched route handler and extracted params
 */
export function matchRoute(
  method: string,
  path: string,
  routes: Record<string, Record<string, (req: Request, params?: Record<string, string>) => Promise<Response> | Response>>
) {
  for (const route in routes) {
    const routePattern = route.replace(/:([^/]+)/g, "([^/]+)"); // Replace ":param" with a regex group
    const regex = new RegExp(`^${routePattern}(/)?$`);
    const match = path.match(regex);

    if (match && routes[route][method]) {
      const paramNames = (route.match(/:([^/]+)/g) || []).map(name => name.slice(1)); // Extract param names (e.g. "id")
      const params: Record<string, string> = {};
      paramNames.forEach((paramName, index) => {
        params[paramName] = match[index + 1]; // Map param values
      });

      return {handler: routes[route][method], params};
    }
  }

  return null; // No match found
}
