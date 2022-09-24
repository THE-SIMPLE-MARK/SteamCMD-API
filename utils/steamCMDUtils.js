import axios from "axios";
import { createWriteStream, watch, access } from "fs";
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
    method: "get",
    url: fileUrl,
    responseType: "stream",
  });
  await data.pipe(writer);
  return new Promise((resolve) => {
    writer.on("finish", resolve);
  });
}

export async function checkExistsWithTimeout(filePath, timeout) {
  return new Promise(function (resolve, reject) {

    const timer = setTimeout(function () {
      watcher.close();
      reject(new Error("File did not exists and was not created during the timeout."));
    }, timeout);

    access(filePath, fs.constants.R_OK, function (err) {
      if (!err) {
        clearTimeout(timer);
        watcher.close();
        resolve();
      }
    });

    const dir = path.dirname(filePath);
    const basename = path.basename(filePath);
    const watcher = watch(dir, function (eventType, filename) {
      if (eventType === "rename" && filename === basename) {
        clearTimeout(timer);
        watcher.close();
        resolve();
      }
    });
  });
}