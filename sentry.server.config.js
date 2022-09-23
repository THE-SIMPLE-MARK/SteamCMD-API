// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from "@sentry/nextjs";
import * as Tracing from "@sentry/tracing"; // enable tracing
import { PrismaClient } from "@prisma/client";
import { commitHash } from "./utils/commitData";

const prismaClient = new PrismaClient()
init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.5, // 50%
  release: commitHash,
  enabled: process.env.NODE_ENV === "production",
  integrations: [
    new Tracing.Integrations.Prisma({ client: prismaClient })
  ],
});