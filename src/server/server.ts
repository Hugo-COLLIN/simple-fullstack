import { Glob, serve } from "bun";
import { readFileSync } from "fs";
import { load } from "js-yaml"; // Assume a YAML parser is installed
import { initDatabaseFromConfig, handleEntityRequest } from "./service.ts";
import {determineRoute, handlePugRendering, matchRoute} from "./routing/pages.ts";
import type {ApiConfig} from "./types";
import {renderFile} from "pug";

const API_CONFIG_PATH = "./src/views/api/";
export const PAGES_PROJECT_PATH = "./src/views/pages/";

function main() {
  // Initialize the database from YAML configuration
  const apiFiles = new Glob(API_CONFIG_PATH + "*.yaml").scanSync(".");
  for (const file of apiFiles) {
    const fileContent = readFileSync(file, "utf-8");
    const config = load(fileContent);
    initDatabaseFromConfig(config); // Initialize tables from the config
  }

  // Browse all files in the "views" folder
  const routes: Record<string, (req: Request, params?: Record<string, string>) => Promise<Response> | Response> = {};
  const pages = new Glob(PAGES_PROJECT_PATH + "*.pug");

  for (const file of pages.scanSync(".")) {
    const routePath = determineRoute(file);
    routes[routePath] = handlePugRendering(file);
  }

  // Define API routes dynamically based on the YAML configuration
  for (const file of apiFiles) {
    const fileContent = readFileSync(file, "utf-8");
    const config = load(fileContent) as ApiConfig;

    const entity = config.model.table;

    // Dynamic API route handling based on the configuration
    if (config.routes.create) {
      routes[`/api/${entity}`] = (req: Request, params?: Record<string, string>) =>
        handleEntityRequest(req, "create", entity);
    }
    if (config.routes.readAll) {
      routes[`/api/${entity}`] = (req: Request, params?: Record<string, string>) =>
        handleEntityRequest(req, "readAll", entity);
    }
    if (config.routes.read) {
      routes[`/api/${entity}/:id`] = (req: Request, params?: Record<string, string>) =>
        handleEntityRequest(req, "read", entity, params?.id);
    }
    if (config.routes.update) {
      routes[`/api/${entity}/:id`] = (req: Request, params?: Record<string, string>) =>
        handleEntityRequest(req, "update", entity, params?.id);
    }
    if (config.routes.delete) {
      routes[`/api/${entity}/:id`] = (req: Request, params?: Record<string, string>) =>
        handleEntityRequest(req, "delete", entity, params?.id);
    }
  }

  console.info(routes);

  // Serve the routes
  serve({
    fetch(req: Request) {
      const url = new URL(req.url);
      const routeResult = matchRoute(url.pathname, routes);

      if (routeResult) {
        const { handler, params } = routeResult;
        return handler(req, params);
      }

      return new Response("Not Found", { status: 404 });
    },
    port: 3001,
  });

  console.log("Server started on http://localhost:3001");
}

main();
