import { Glob, serve } from "bun";
import { renderFile } from "pug";
import { initDatabase, createToDo, readToDoList, deleteToDo } from "./service";

const PAGES_PROJECT_PATH = "./src/views/pages/";
const COMPONENTS_PROJECT_PATH = "./src/views/components/";

function main() {
  initDatabase(); // Initialize the SQLite database

  // Browse all files in the "views" folder
  const routes: Record<string, (req: Request) => Promise<Response> | Response> = {};
  const pages = new Glob(PAGES_PROJECT_PATH + "*.pug");

  for (const file of pages.scanSync(".")) {
    const routePath = determineRoute(file);
    routes[routePath] = handlePugRendering(file);
  }

  routes["/todos"] = async function(req: Request) {
    if (req.method === "POST") {
      const formData = await req.formData();
      const title = formData.get("title")?.toString() || "Untitled";
      const status = formData.get("status")?.toString() || "Pending";
      const id = await createToDo(title, status);

      const html = renderFile(COMPONENTS_PROJECT_PATH + "task.pug", { id, title, status });
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    return new Response("Method not allowed", { status: 405 });
  };

  routes["/todos/:id"] = async function(req: Request) {
    const url = new URL(req.url);
    const id = parseInt(url.pathname.split("/").pop() || "0", 10);

    if (req.method === "DELETE") {
      await deleteToDo(id);
      return new Response(null, { status: 200 });
    }

    return new Response("Method not allowed", { status: 405 });
  };

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
      const routeHandler = routes[url.pathname];
      return routeHandler ? routeHandler(req) : new Response("Not Found", { status: 404 });
    },
    port: 3000,
  });

  console.log("Server started on http://localhost:3000");
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

main();
