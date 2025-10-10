// src/db/schema.ts
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

// Tabla de Entradas
export const entradas = pgTable("entradas", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  precio: integer("precio").notNull(), // En centavos
  descripcion: text("descripcion"),
  stockInicial: integer("stock_inicial").notNull(),
  stockDisponible: integer("stock_disponible").notNull(),
  activo: boolean("activo").default(true).notNull(),
});

// Tabla de Pedidos
export const pedidos = pgTable("pedidos", {
  id: serial("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").unique().notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  emailComprador: text("email_comprador").notNull(),
  nombreComprador: text("nombre_comprador"),
  total: integer("total").notNull(),
  estado: text("estado").notNull(),
  entradaId: text("entrada_id").references(() => entradas.id),
  cantidad: integer("cantidad").notNull().default(1),
  fechaCreacion: timestamp("fecha_creacion").defaultNow().notNull(),
  fechaPago: timestamp("fecha_pago"),
  metadata: text("metadata"),
});

export type Entrada = typeof entradas.$inferSelect;
export type Pedido = typeof pedidos.$inferSelect;
