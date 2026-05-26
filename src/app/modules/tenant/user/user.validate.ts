import z from "zod";

export const userZodSchema = z.object({
  password: z
    .string()
    .max(20, { message: "Password cant not be more than 20" }),
});
export const registerValidator = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
    role: z.enum(["admin", "moderator", "user", "super_admin"]).default("user"),
  }),
});
