import path from "path";
import * as fs from "fs";
import Database from "better-sqlite3";
import cluster from "cluster";
import { ITask, IUser } from "./types";
import { v4 } from "uuid";
import { objectToSetStatement } from "./utils";
const DATABASE_DIR = path.join(process.cwd(), "db");

if (cluster.isPrimary) {
  if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR, { recursive: true });
  }
}

const db = Database(path.join(DATABASE_DIR, "data.db"));

if (cluster.isPrimary) {
  const TABLE_STATEMENTS = [
    `
    CREATE TABLE IF NOT EXISTS users(
        id TEXT PRIMARY KEY
    ) WITHOUT ROWID;
    `,
    `
    CREATE TABLE IF NOT EXISTS tasks(
        id TEXT PRIMARY KEY,
        user REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status INTEGER NOT NULL,
        due_date INTEGER NOT NULL
    ) WITHOUT ROWID;
    `,
  ];

  // fix concurrency issues
  db.pragma("journal_mode = WAL");

  db.pragma("wal_checkpoint(RESTART)");

  const checkDbSize = async () => {
    try {
      const stats = await fs.promises.stat(
        path.join(DATABASE_DIR, "data.db-wal")
      );
      if (stats.size / (1024 * 1024) > 50) {
        db.pragma("wal_checkpoint(RESTART)");
      }
    } catch (error: any) {
      if (error.code !== "ENOENT") throw error;
    }
  };
  setInterval(checkDbSize, 5000).unref();

  db.transaction((statements: string[]) => {
    statements.forEach((statement) => {
      db.prepare(statement).run();
    });
  }).immediate(TABLE_STATEMENTS);
}

export function getTime(offset?: number) {
  return Math.round(Date.now()) + (offset || 0);
}

const InsertNewUserStatement = db.prepare<IUser>(
  `INSERT INTO users (id) VALUES (@id)`
);

const InsertNewTaskStatement = db.prepare<ITask>(
  `INSERT INTO tasks (id,user,title,description,status,due_date) VALUES (@id,@user,@title,@description,@status,@due_date)`
);

const DeleteTaskStatement = db.prepare<Pick<ITask, "id" | "user">>(
  `DELETE FROM tasks WHERE id=@id AND user=@user`
);

export interface GetConfig {
  user: IUser["id"];
  query: string;
}

export const tInsertNewUser = db.transaction((userId: string) => {
  const id = userId.trim();

  InsertNewUserStatement.run({
    id: userId,
  });

  return {
    id: id,
  } as IUser;
});

export const tInsertNewTask = db.transaction(
  (
    task: Pick<ITask, "title" | "description" | "due_date" | "status" | "user">
  ) => {
    const taskId = v4();

    InsertNewTaskStatement.run({ ...task, id: taskId });

    return taskId;
  }
);

export const tUpdateTask = db.transaction(
  (task: Pick<ITask, "id" | "user"> & Partial<ITask>) => {
    return (
      db
        .prepare<Pick<ITask, "id" | "user">>(
          `UPDATE tasks ${objectToSetStatement(task, [
            "id",
            "user",
          ])} WHERE id=@id AND user=@user`
        )
        .run(task).changes > 0
    );
  }
);

export const tDeleteTask = db.transaction(
  (task: Pick<ITask, "id" | "user">) => {
    return (
      DeleteTaskStatement.run({
        id: task.id,
        user: task.user,
      }).changes > 0
    );
  }
);

export function getTasks(user: string, query: string = "") {
  return db
    .prepare<GetConfig>(
      `SELECT id,title,description,status,due_date FROM tasks WHERE user=@user${
        query.length > 0 ? " AND title LIKE '%@query%'" : ""
      }`
    )
    .all({
      user: user,
      query: query,
    }) as ITask[];
}
