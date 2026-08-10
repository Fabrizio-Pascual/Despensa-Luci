import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  numeric,
} from "drizzle-orm/pg-core"

// Todas las tablas de esta app comparten la misma base de datos que la
// tienda (Supabase), pero con el prefijo "fiados_" en el nombre para
// que nunca puedan chocar con las tablas de productos/pedidos/perfiles
// de la tienda, aunque vivan en el mismo schema "public".

// ---------- Better Auth tables ----------
export const user = pgTable("fiados_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  // App-specific fields for the enablement system
  enabled: boolean("enabled").notNull().default(false),
  role: text("role").notNull().default("employee"), // "admin" | "employee"
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("fiados_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("fiados_account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("fiados_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// ---------- App tables ----------
// Shared data: all enabled users see the same customers/suppliers.

export const customers = pgTable("fiados_customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  // Email de la cuenta del cliente en la tienda online. Se usa para
  // reconocerlo automáticamente en el checkout y habilitarle el pago
  // "Fiado" solo si está anotado acá.
  email: text("email"),
  note: text("note"),
  createdByUserId: text("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const customerPurchases = pgTable("fiados_customer_purchases", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paidAt"),
  createdByUserId: text("createdByUserId").notNull(),
  createdByName: text("createdByName"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  // Si esta compra vino de un pedido online de la tienda, acá queda el
  // id de ese pedido — así, si se cancela en la tienda, se puede borrar
  // esta anotación automáticamente.
  storeOrderId: text("storeOrderId"),
})

export const suppliers = pgTable("fiados_suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  note: text("note"),
  createdByUserId: text("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const supplierOrders = pgTable("fiados_supplier_orders", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId").notNull(),
  items: text("items").notNull(),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
  amountToPay: numeric("amountToPay", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  status: text("status").notNull().default("pendiente"), // "pendiente" | "encargado" | "recibido"
  urgent: boolean("urgent").notNull().default(false),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paidAt"),
  createdByUserId: text("createdByUserId").notNull(),
  createdByName: text("createdByName"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
