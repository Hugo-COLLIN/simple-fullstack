import {render} from "pug";
import {Glob} from "bun";
import {load} from "js-yaml";
import {fetchData} from "./database.ts";
import type {YamlHeader} from "../types/YamlHeader.ts";

export const ENDPOINTS_PROJECT_PATH = "./src/views/endpoints/";
export const pages = new Glob(ENDPOINTS_PROJECT_PATH + "**/*.pug");
export const api = new Glob(ENDPOINTS_PROJECT_PATH + "**/*.yaml");

async function extractYamlHeader(filePath: string): Promise<{ yamlHeader: unknown; fileContent: string }> {
  const fileContent = await Bun.file(filePath).text();
  const yamlHeaderMatch = fileContent.match(/^\s*---\s*\n([\s\S]*?)\n\s*---\s*\n/);
  if (yamlHeaderMatch) {
    console.log(yamlHeaderMatch[1])
    return {yamlHeader: load(yamlHeaderMatch[1]), fileContent: fileContent.replace(yamlHeaderMatch[0], "")};
  }
  return {yamlHeader: null, fileContent};
}

/**
 * Render pug files with optional data
 * @param file The Pug file to render
 * @param data Optional data to pass to the Pug template
 */
export function handlePugRendering(file: string, data: Record<string, any> = {}) {
  return async () => {
    const {yamlHeader, fileContent} = await extractYamlHeader(file);
    let yData: {} = await fetchData((yamlHeader as YamlHeader)?.data ?? []);
    const html = render(fileContent, {...yData, ...data});
    return new Response(html, {headers: {"Content-Type": "text/html"}});
  };
}
