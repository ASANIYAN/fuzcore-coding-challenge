import { eq } from "drizzle-orm";
import { counter } from "../../../shared/schema";

type Db = typeof import("../../db").db;

export class CounterService {
  constructor(private readonly db: Db) {}

  async getCounter() {
    const rows = await this.db.select().from(counter).where(eq(counter.id, 1));
    if (rows.length === 0) {
      const inserted = await this.db
        .insert(counter)
        .values({ id: 1, count: 0 })
        .returning();
      return inserted[0];
    }

    return rows[0];
  }

  async incrementCounter() {
    const rows = await this.db.select().from(counter).where(eq(counter.id, 1));
    if (rows.length === 0) {
      const inserted = await this.db
        .insert(counter)
        .values({ id: 1, count: 1 })
        .returning();
      return inserted[0];
    }

    const updated = await this.db
      .update(counter)
      .set({ count: rows[0].count + 1 })
      .where(eq(counter.id, 1))
      .returning();

    return updated[0];
  }
}
