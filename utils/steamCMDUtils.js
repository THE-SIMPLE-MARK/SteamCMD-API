import axios from "axios";
import { createWriteStream } from "fs";
import decompress from "decompress";
import path from "path";

export const rootFolder = path.join("./SteamCMD");

export async function decompressFile(name) {
  return new Promise((resolve) => {
    decompress(path.join(rootFolder, name), rootFolder).then(files => {
      resolve(files);
    })
  })
}

export async function downloadFile(fileUrl, filename) {
  const writer = createWriteStream(path.join(rootFolder, filename));

  const { data } = await axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  });
  await data.pipe(writer);
  return new Promise((resolve) => {
    writer.on('finish', resolve);
  });
}