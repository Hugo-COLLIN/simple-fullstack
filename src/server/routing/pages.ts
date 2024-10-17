import {renderFile} from "pug";
import {PAGES_PROJECT_PATH} from "../server.ts";

/**
 * Match the URL path with the defined routes, including dynamic segments.
 * @param path The URL path
 * @param routes The route handlers
 * @returns The matched route handler and extracted params
 */
export function matchRoute(path: string, routes: Record<string, (req: Request, params?: Record<string, string>) => Promise<Response> | Response>) {
  for (const route in routes) {
    const routePattern = route.replace(/:([^/]+)/g, "([^/]+)"); // Replace ":param" with a regex group
    const regex = new RegExp(`^${routePattern}$`);
    const match = path.match(regex);

    if (match) {
      const paramNames = (route.match(/:([^/]+)/g) || []).map(name => name.slice(1)); // Extract param names (e.g. "id")
      const params: Record<string, string> = {};
      paramNames.forEach((paramName, index) => {
        params[paramName] = match[index + 1]; // Map param values
      });

      return {handler: routes[route], params};
    }
  }

  return null; // No match found
}

/**
 * Render pug files
 * @param file The Pug file to render
 */
export function handlePugRendering(file: string) {
  return () => {
    const html = renderFile(file);
    return new Response(html, {headers: {"Content-Type": "text/html"}});
  };
}

/**
 * Determine the route based on the file path
 * @param file The Pug file path
 */
export function determineRoute(file: string): string {
  let route = file
    .replace(/\\/g, "/") // Replace folder separators for Windows paths
    .replace(PAGES_PROJECT_PATH, "")
    .replace(".pug", "");

  // If the file is "index.pug", associate to root or subfolder
  if (route.endsWith("index")) {
    route = route.replace("index", "") || "/"; // Manage where file is in a subfolder or at the root
  } else {
    route = `/${route}`;
  }

  return route;
}
