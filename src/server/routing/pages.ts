import {renderFile} from "pug";
import {PAGES_PROJECT_PATH} from "../server";

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

/**
 * Render pug files with optional data
 * @param file The Pug file to render
 * @param data Optional data to pass to the Pug template
 */
export function handlePugRendering(file: string, data: Record<string, any> = {}) {
  return () => {
    const html = renderFile(file, data);  // Pass data to renderFile
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
