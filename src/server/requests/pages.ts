import {renderFile} from "pug";
import {PAGES_PROJECT_PATH} from "../server.ts";

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
