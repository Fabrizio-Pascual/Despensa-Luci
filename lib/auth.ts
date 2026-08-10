import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"

export const auth = betterAuth({
  database: pool,
  // Nombres de tabla con prefijo "fiados_" para no chocar con ninguna
  // tabla de la tienda que viva en la misma base de datos.
  user: {
    modelName: "fiados_user",
    additionalFields: {
      enabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "employee",
        input: false,
      },
    },
  },
  session: {
    modelName: "fiados_session",
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  account: {
    modelName: "fiados_account",
  },
  verification: {
    modelName: "fiados_verification",
  },
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // Todavía no tenemos un servicio de email conectado, así que el link
    // para poner una contraseña nueva queda anotado en los Runtime Logs
    // de Vercel (Vercel → tu proyecto → Logs) — buscá la línea que dice
    // "RESET PASSWORD LINK" apenas después de pedirlo.
    sendResetPassword: async ({ user, url }) => {
      console.log(`RESET PASSWORD LINK for ${user.email}: ${url}`)
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          // The very first registered user becomes the enabled admin (the owner).
          const { pool } = await import("@/lib/db")
          const result = await pool.query('SELECT COUNT(*)::int AS count FROM "fiados_user"')
          const isFirstUser = (result.rows[0]?.count ?? 0) === 0
          return {
            data: {
              ...userData,
              enabled: isFirstUser,
              role: isFirstUser ? "admin" : "employee",
            },
          }
        },
      },
    },
  },
  trustedOrigins: [
    "https://despensalucifiados.vercel.app",
    "https://despensalucifiados-git-main-fpascual624-8380s-projects.vercel.app",
    "https://despensalucifiados-fpascual624-8380s-projects.vercel.app",
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})
