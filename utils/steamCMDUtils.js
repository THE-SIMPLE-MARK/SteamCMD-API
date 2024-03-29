import axios from "axios"
import { createWriteStream, existsSync } from "fs"
import decompress from "decompress"
import path from "path"

export const rootFolder = path.join("./SteamCMD")

export async function decompressFile(name) {
  return new Promise(resolve => {
    decompress(path.join(rootFolder, name), rootFolder).then(files => {
      resolve(files)
    })
  })
}

export async function downloadFile(fileUrl, filename) {
  const writer = createWriteStream(path.join(rootFolder, filename))

  const { data } = await axios({
    method: "get",
    url: fileUrl,
    responseType: "stream",
  })
  await data.pipe(writer)
  return new Promise(resolve => {
    writer.on("finish", resolve)
  })
}

/**
 * Waits for a file to be created
 * @param path the path to check for
 * @param timeout the failsafe timeout
 * @returns {Promise<unknown>} when the directory was created
 */
export async function waitForFile(path, timeout) {
  return new Promise((resolve, reject) => {
    let cycles = 0
    const timer = setInterval(async function () {
      if (timeout / 500 === cycles) {
        clearInterval(timer)
        return reject("Timeout reached")
      }

      if (existsSync(path)) {
        console.log("File detected")
        clearInterval(timer)
        return resolve()
      }
      cycles++
    }, 500)
  })
}
