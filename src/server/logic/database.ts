import {Database} from "bun:sqlite";

const db = new Database("dynamic_api.db");

/**
 * Initialize the database based on YAML configuration
 */
export function initDatabaseFromConfig(config: any) {
  // console.log(config)
  const table = config.model.table;
  const fields = config.model.fields.map((field: any) => {
    let sql = `${field.name} ${field.type}`;
    if (field.primaryKey) sql += " PRIMARY KEY";
    if (field.autoincrement) sql += " AUTOINCREMENT";
    return sql;
  }).join(", ");

  db.run(`CREATE TABLE IF NOT EXISTS ${table} (${fields});`);
}

export async function fetchData(dataKeys: string[]): Promise<Record<string, any>> {
  const data: Record<string, any> = {};
  for (const key of dataKeys) {
    const response = await handleEntityRequest(null, "readAll", key);
    if (response.ok) {
      data[key] = await response.json();
    }
  }
  return data;
}

/**
 * Handle a dynamic entity request (create, read, update, delete)
 */
export async function handleEntityRequest(req: Request | null, action: string, entity: string, id?: string) {
  const table = entity;

  switch (action) {
    case "create":
      if (req) {
        const formData = await req.formData();
        const values = Object.fromEntries(formData.entries());

        const columns = Object.keys(values).join(", ");
        const placeholders = Object.keys(values).map(() => "?").join(", ");
        const stmt = db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);
        stmt.run(...Object.values(values));

        return new Response("Entity created", { status: 201 });
      }
      break;

    case "readAll":
      const rows = db.query(`SELECT * FROM ${table}`).all();
      return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json" } });

    case "read":
      const row = db.query(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      if (row) {
        return new Response(JSON.stringify(row), { headers: { "Content-Type": "application/json" } });
      }
      return new Response("Entity not found", { status: 404 });

    case "update":
      if (req) {
        const updateData = await req.formData();
        const updateFields = Object.keys(updateData).map((key) => `${key} = ?`).join(", ");
        const updateStmt = db.prepare(`UPDATE ${table} SET ${updateFields} WHERE id = ?`);
        updateStmt.run(...Object.values(updateData), id);
        return new Response("Entity updated", { status: 200 });
      }
      break;

    case "delete":
      const deleteStmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
      deleteStmt.run(id);
      return new Response("Entity deleted", { status: 200 });

    default:
      return new Response("Action not supported", { status: 400 });
  }

  return new Response("Bad Request", { status: 400 });
}
