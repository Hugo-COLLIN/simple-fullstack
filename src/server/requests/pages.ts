import {renderFile} from "pug";

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

