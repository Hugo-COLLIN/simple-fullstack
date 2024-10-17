import { Database } from "bun:sqlite";

const db = new Database("todolist.db");

export function initDatabase() {
  db.run(`
      CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      status TEXT
    );
  `);
}

export async function createToDo(title: string, status: string): Promise<number> {
  const stmt = db.prepare("INSERT INTO todos (title, status) VALUES (?, ?)");
  const result = stmt.run(title, status);
  return result.lastInsertRowid as number;
}

export async function deleteToDo(id: number) {
  const stmt = db.prepare("DELETE FROM todos WHERE id = ?");
  stmt.run(id);
}

export async function readToDoList(): Promise<Array<{ id: number; title: string; status: string }>> {
  const rows = db.query("SELECT id, title, status FROM todos").all();
  return rows;
}
