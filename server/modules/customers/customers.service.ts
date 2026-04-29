import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { NotFoundError } from "../../lib/errors";
import { customers } from "../../../shared/schema";
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from "./customers.schema";

type Db = typeof db;

type CustomersServiceDeps = {
  db: Db;
};

export class CustomersService {
  private readonly db: Db;

  constructor(deps?: Partial<CustomersServiceDeps>) {
    this.db = deps?.db ?? db;
  }

  async listCustomers(userId: string, query: ListCustomersQuery) {
    const conditions = [eq(customers.userId, userId)];

    if (query.type) {
      conditions.push(eq(customers.type, query.type));
    }

    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        or(ilike(customers.displayName, pattern), ilike(customers.email, pattern))!,
      );
    }

    const whereClause = and(...conditions);
    const offset = (query.page - 1) * query.limit;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(customers)
        .where(whereClause)
        .orderBy(desc(customers.createdAt))
        .limit(query.limit)
        .offset(offset),
      this.db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(customers)
        .where(whereClause),
    ]);

    const total = Number(totalRows[0]?.count ?? 0);
    return { rows, total };
  }

  async getCustomerById(userId: string, customerId: string) {
    const rows = await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.userId, userId),
        ),
      )
      .limit(1);

    const customer = rows[0];
    if (!customer) {
      throw new NotFoundError("Customer");
    }

    return customer;
  }

  async createCustomer(userId: string, input: CreateCustomerInput) {
    const [customer] = await this.db
      .insert(customers)
      .values({
        userId,
        ...input,
      })
      .returning();

    return customer;
  }

  async updateCustomer(userId: string, customerId: string, input: UpdateCustomerInput) {
    const [customer] = await this.db
      .update(customers)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.userId, userId),
        ),
      )
      .returning();

    if (!customer) {
      throw new NotFoundError("Customer");
    }

    return customer;
  }

  async deleteCustomer(userId: string, customerId: string) {
    const [customer] = await this.db
      .delete(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.userId, userId),
        ),
      )
      .returning({
        id: customers.id,
      });

    if (!customer) {
      throw new NotFoundError("Customer");
    }

    return {
      message: "Customer deleted successfully.",
    };
  }
}
