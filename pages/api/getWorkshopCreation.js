import { captureException, withSentry } from "@sentry/nextjs";
import authenticateAPIKey from "/utils/authenticateAPIKey";
import { XMLParser } from "fast-xml-parser";
import { SteamCMDInterface } from "/utils/steamCMDInterface.js";
import fs from "fs";
import path from "path";
import fetch, { FormData } from "node-fetch";
import { fileURLToPath } from "url";
import { waitForFile } from "/utils/steamCMDUtils";

const fileName = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileName);

async function handler(req, res) {
  const valid = await authenticateAPIKey(req?.headers?.authorization);
  if (!valid) return res.status(401).send({ message: "API Key is invalid" })

  if (!req?.query?.workshopId) return res.status(400).send({ message: "The workshopId for the creation to download must be provided in the query." })
  const workshopId = req.query.workshopId

  // make request to Steam API to check if the workshop id is valid
  const form = new FormData()
  form.set("publishedfileids[0]", workshopId)
  form.set("itemcount", 1)
  const checkRes = await fetch(`https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/`,
    {
      method: "POST",
      body: form,
    }
  );

  // check if the request was successful
  if (!checkRes.ok) return res.status(500).send(
    { message: "An error occurred while fetching the creation's details. Please try again later." }
  )
  // extract data to JSON
  const checkData = await checkRes.json();
  const steamVehicleData = checkData.response.publishedfiledetails[0];

  // double check if the request was successful from Steam's side
  if (steamVehicleData.result !== 1) return res.status(400).send({ message: "The workshopId is invalid." })
  // check if the creation is from Stormworks
  if (steamVehicleData.consumer_app_id !== 573090) return res.status(400).send({ message: "The workshop creation is not from Stormworks." })

  try {
    // download the creation to check for glitches
    const steamCMD = await new SteamCMDInterface();
    await steamCMD.downloadWorkshopCreation("573090", workshopId)

    const vehicleFilePath = path.resolve(__dirname, `../../SteamCMD/output/steamapps/workshop/content/573090/${workshopId}/vehicle.xml`);
    const vehicleFolderPath = path.resolve(__dirname, `../../SteamCMD/output/steamapps/workshop/content/573090/${workshopId}/`);

    await waitForFile(vehicleFilePath, 60000);
    const fileData = await fs.readFileSync(vehicleFilePath);

    await fs.rmSync(vehicleFolderPath, { recursive: true, force: true });

    // parse XML to a JS Object
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix : "",
    });

    const vehicleXML = await parser.parse(fileData);

    res.status(200).send({ message: "OK", vehicleXML })
  } catch (err) {
    if (err === "Timeout reached") {
      res.status(500).send({ message: "Waiting for vehicle file timed out" })
    } else {
      console.error(err);
      captureException(err);
      res.status(500).send({ message: "Internal server error", error: err })
    }
  }
}

// suppress Sentry false positives
export const config = {
  api: {
    externalResolver: true,
    responseLimit: false,
  },
}

export default withSentry(handler);
