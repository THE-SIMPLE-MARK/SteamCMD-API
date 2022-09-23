import { withSentry } from "@sentry/nextjs";
import authenticateAPIKey from "/utils/authenticateAPIKey";

async function handler(req, res) {
  const valid = await authenticateAPIKey(req?.headers?.authorization);
  res.status(200).send({ message: "OK", valid })
}

// suppress Sentry false positives
export const config = {
  api: {
    externalResolver: true,
  },
}

export default withSentry(handler);
