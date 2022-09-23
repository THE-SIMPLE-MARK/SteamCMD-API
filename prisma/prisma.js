import { PrismaClient } from "@prisma/client";

const prismaInstance = global.prisma || new PrismaClient()

export const prisma = prismaInstance;