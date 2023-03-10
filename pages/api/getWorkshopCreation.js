import { captureException, withSentry } from "@sentry/nextjs"
import authenticateAPIKey from "/utils/authenticateAPIKey"
import { XMLParser } from "fast-xml-parser"
import { SteamCMDInterface } from "/utils/steamCMDInterface.js"
import fs from "fs"
import path from "path"
import fetch, { FormData } from "node-fetch"
import { fileURLToPath } from "url"
import { waitForFile } from "/utils/steamCMDUtils"
import { workbenchSizes, illegalProperties } from "/utils/definitions"

const fileName = fileURLToPath(import.meta.url)
const __dirname = path.dirname(fileName)

async function handler(req, res) {
  if (req.method !== "GET")
    return res
      .status(405)
      .send({ message: "Only get can be used in this endpoint." })
  const valid = await authenticateAPIKey(req?.headers?.authorization)
  if (!valid) return res.status(401).send({ message: "API Key is invalid" })

  if (!req?.query?.workshopId)
    return res
      .status(400)
      .send({
        message:
          "The workshopId for the creation to download must be provided in the query.",
      })
  const workshopId = req.query.workshopId

  // make request to Steam API to check if the workshop id is valid
  const form = new FormData()
  form.set("publishedfileids[0]", workshopId)
  form.set("itemcount", 1)
  const checkRes = await fetch(
    `https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/`,
    {
      method: "POST",
      body: form,
    }
  )

  // check if the request was successful
  if (!checkRes.ok)
    return res
      .status(500)
      .send({
        message:
          "An error occurred while fetching the creation's details. Please try again later.",
      })
  // extract data to JSON
  const checkData = await checkRes.json()
  const steamVehicleData = checkData.response.publishedfiledetails[0]

  // double check if the request was successful from Steam's side
  if (steamVehicleData.result !== 1)
    return res.status(400).send({ message: "The workshopId is invalid." })
  // check if the creation is from Stormworks
  if (steamVehicleData.consumer_app_id !== 573090)
    return res
      .status(400)
      .send({ message: "The workshop creation is not from Stormworks." })

  try {
    // download the creation to check for glitches
    const steamCMD = await new SteamCMDInterface()
    await steamCMD.downloadWorkshopCreation("573090", workshopId)

    const vehicleFilePath = path.resolve(
      __dirname,
      `../../SteamCMD/output/steamapps/workshop/content/573090/${workshopId}/vehicle.xml`
    )
    const vehicleFolderPath = path.resolve(
      __dirname,
      `../../SteamCMD/output/steamapps/workshop/content/573090/${workshopId}/`
    )

    await waitForFile(vehicleFilePath, 60000)
    const fileData = await fs.readFileSync(vehicleFilePath)

    await fs.rmSync(vehicleFolderPath, { recursive: true, force: true })

    // parse XML to a JS Object
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    })

    const vehicleXML = await parser.parse(fileData)
    console.log("XML parsed")

    // validate the XML by getting the size of the creation and any performance mods
    const { dimensionX, dimensionY, dimensionZ, illegalBlocks } =
      await validateXML(vehicleXML)
    console.log("Validating XML...")

    // categorize the size by the creation dimension
    const sizeCategory = categorizeSize(dimensionX, dimensionY, dimensionZ)

    res
      .status(200)
      .send({
        message: "OK",
        dimensionX,
        dimensionY,
        dimensionZ,
        sizeCategory,
        illegalBlocks,
      })
  } catch (err) {
    if (err === "Timeout reached") {
      res.status(500).send({ message: "Waiting for vehicle file timed out" })
    } else {
      console.error(err)
      captureException(err)
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

export default withSentry(handler)

function categorizeSize(dimX, dimY, dimZ) {
  console.log(`Dimensions: X: ${dimX} Y: ${dimY} Z: ${dimZ}`)
  // use the workbenchSizes object to find the smallest workbench size that fits the dimensions
  if (
    dimX <= workbenchSizes.TRAIN_DEPOT.dimensionX &&
    dimY <= workbenchSizes.TRAIN_DEPOT.dimensionY &&
    dimZ <= workbenchSizes.TRAIN_DEPOT.dimensionZ
  )
    return "TRAIN_DEPOT"
  if (
    dimX <= workbenchSizes.SMALL_DOCK.dimensionX &&
    dimY <= workbenchSizes.SMALL_DOCK.dimensionY &&
    dimZ <= workbenchSizes.SMALL_DOCK.dimensionZ
  )
    return "SMALL_DOCK"
  if (
    dimX <= workbenchSizes.SMALL_HANGAR.dimensionX &&
    dimY <= workbenchSizes.SMALL_HANGAR.dimensionY &&
    dimZ <= workbenchSizes.SMALL_HANGAR.dimensionZ
  )
    return "SMALL_HANGAR"
  if (
    dimX <= workbenchSizes.MEDIUM_HANGAR.dimensionX &&
    dimY <= workbenchSizes.MEDIUM_HANGAR.dimensionY &&
    dimZ <= workbenchSizes.MEDIUM_HANGAR.dimensionZ
  )
    return "MEDIUM_HANGAR"
  if (
    dimX <= workbenchSizes.MEDIUM_DOCK.dimensionX &&
    dimY <= workbenchSizes.MEDIUM_DOCK.dimensionY &&
    dimZ <= workbenchSizes.MEDIUM_DOCK.dimensionZ
  )
    return "MEDIUM_DOCK"
  // if bigger than all
  return "HUGE"
}

async function validateXML(XMLObj) {
  const illegalBlocks = []

  let largestX = NaN
  let largestY = NaN
  let largestZ = NaN

  let smallestX = NaN
  let smallestY = NaN
  let smallestZ = NaN

  let numX = 0
  let numY = 0
  let numZ = 0

  function iterate(obj) {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === "object") {
        // recursively iterate through the children if it is an object
        // also ignore the object and nodes so the node positions do not get confused with the block positions
        if (key !== "object" && key !== "nodes") iterate(value)
      } else {
        // check if the key can have an illegal value
        if (illegalProperties.hasOwnProperty(key)) {
          // check if the value is not in the non-illegal limits
          const illegalPropertyRules = illegalProperties[key]
          if (
            !threshold(
              value,
              illegalPropertyRules.min,
              illegalPropertyRules.max
            )
          ) {
            illegalBlocks.push({
              property: key,
              value,
              expected: {
                min: illegalPropertyRules.min,
                max: illegalPropertyRules.max,
              },
            })
          }
        }

        // only run size checks for this key if the value is a number
        if (
          !isNaN(value) &&
          (key === "@_x" || key === "@_y" || key === "@_z")
        ) {
          // run size checks
          if (key === "@_x") {
            numX++
            if (!largestX || value > largestX) largestX = value
            if (!smallestX || value < smallestX) smallestX = value
          } else if (key === "@_y") {
            numY++
            if (!largestY || value > largestY) largestY = value
            if (!smallestY || value < smallestY) smallestY = value
          } else if (key === "@_z") {
            numZ++
            if (!largestZ || value > largestZ) largestZ = value
            if (!smallestZ || value < smallestZ) smallestZ = value
          }
        }
      }
    })
  }

  iterate(XMLObj)

  // calculate dimension from the collected values
  if (!largestX || ((numX < numY || numX < numZ) && largestX < 0)) largestX = 0
  if (!smallestX || ((numX < numY || numX < numZ) && smallestX > 0))
    smallestX = 0

  if (!largestY || ((numY < numX || numY < numZ) && largestY < 0)) largestY = 0
  if (!smallestY || ((numY < numX || numY < numZ) && smallestY > 0))
    smallestY = 0

  if (!largestZ || ((numZ < numX || numZ < numY) && largestZ < 0)) largestZ = 0
  if (!smallestZ || ((numZ < numX || numZ < numY) && smallestZ > 0))
    smallestZ = 0

  const dimensionX = Math.abs(largestX - smallestX) + 1
  const dimensionY = Math.abs(largestY - smallestY) + 1
  const dimensionZ = Math.abs(largestZ - smallestZ) + 1

  return {
    dimensionX,
    dimensionY,
    dimensionZ,
    illegalBlocks,
  }
}

function threshold(value, min, max) {
  return value >= min && value <= max
}
