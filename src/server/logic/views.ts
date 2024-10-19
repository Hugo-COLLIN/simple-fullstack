import {renderFile} from "pug";
import {Glob} from "bun";

export const ENDPOINTS_PROJECT_PATH = "./src/views/endpoints/";
export const pages = new Glob(ENDPOINTS_PROJECT_PATH + "**/*.pug");
export const api = new Glob(ENDPOINTS_PROJECT_PATH + "**/*.yaml");

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
