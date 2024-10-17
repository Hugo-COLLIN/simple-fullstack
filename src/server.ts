import { Glob, serve } from "bun";
import { renderFile } from "pug";
import { initDatabase, createToDo, readToDoList, deleteToDo } from "./service";

const PAGES_PROJECT_PATH = "./src/views/pages/";
const COMPONENTS_PROJECT_PATH = "./src/views/components/";

function main() {
  initDatabase(); // Initialize the SQLite database

  // Browse all files in the "views" folder
  const routes: Record<string, (req: Request, params?: Record<string, string>) => Promise<Response> | Response> = {};
  const pages = new Glob(PAGES_PROJECT_PATH + "*.pug");

  for (const file of pages.scanSync(".")) {
    const routePath = determineRoute(file);
    routes[routePath] = handlePugRendering(file);
  }

  // Generic API routes for managing entities
  routes["/api/:entity"] = async function(req: Request, params?: Record<string, string>) {
    if (!params || !params.entity) {
      return new Response("Entity type not specified", { status: 400 });
    }

    const entity = params.entity.toLowerCase();

    switch (req.method) {
      case "POST":
        return handleCreateEntity(req, entity);
      case "GET":
        return handleReadEntityList(entity);
      default:
        return new Response("Method not allowed", { status: 405 });
    }
  };

  routes["/api/:entity/:id"] = async function(req: Request, params?: Record<string, string>) {
    if (!params || !params.entity || !params.id) {
      return new Response("Invalid entity or ID", { status: 400 });
    }

    const entity = params.entity.toLowerCase();
    const id = parseInt(params.id, 10);

    switch (req.method) {
      case "DELETE":
        return handleDeleteEntity(entity, id);
      default:
        return new Response("Method not allowed", { status: 405 });
    }
  };

  // Main page route
  routes["/"] = async function() {
    const todos = await readToDoList();
    const html = renderFile(PAGES_PROJECT_PATH + "index.pug", { todos });
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  };

  console.info(routes);

  // Bun server with dynamic routing
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

  console.log("Server started on http://localhost:3000");
}

/**
 * Match the URL path with the defined routes, including dynamic segments.
 * @param path The URL path
 * @param routes The route handlers
 * @returns The matched route handler and extracted params
 */
function matchRoute(path: string, routes: Record<string, (req: Request, params?: Record<string, string>) => Promise<Response> | Response>) {
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

      return { handler: routes[route], params };
    }
  }

  return null; // No match found
}

/**
 * Render pug files
 * @param file The Pug file to render
 */
function handlePugRendering(file: string) {
  return () => {
    const html = renderFile(file);
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  };
}

/**
 * Determine the route based on the file path
 * @param file The Pug file path
 */
function determineRoute(file: string): string {
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

/**
 * Handle creating a new entity
 */
async function handleCreateEntity(req: Request, entity: string) {
  const formData = await req.formData();
  const title = formData.get("title")?.toString() || "Untitled";
  const status = formData.get("status")?.toString() || "Pending";

  // Handle different entity types (e.g. todos)
  if (entity === "todos") {
    const id = await createToDo(title, status);
    const html = renderFile(COMPONENTS_PROJECT_PATH + "task.pug", { id, title, status });
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  return new Response("Entity not supported", { status: 400 });
}

/**
 * Handle reading a list of entities
 */
async function handleReadEntityList(entity: string) {
  // Handle different entity types
  if (entity === "todos") {
    const todos = await readToDoList();
    const html = renderFile(PAGES_PROJECT_PATH + "index.pug", { todos });
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  return new Response("Entity not supported", { status: 400 });
}

/**
 * Handle deleting an entity
 */
async function handleDeleteEntity(entity: string, id: number) {
  if (entity === "todos") {
    await deleteToDo(id);
    return new Response(null, { status: 200 });
  }

  return new Response("Entity not supported", { status: 400 });
}

main();
