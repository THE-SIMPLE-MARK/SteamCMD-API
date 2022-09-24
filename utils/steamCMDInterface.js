import { existsSync, mkdirSync } from "fs";
import path from "path";
import { decompressFile, downloadFile, rootFolder } from "./steamCMDUtils.js";
import { spawn } from "child_process";

export class SteamCMDInterface {
  downloadLinks = {
    "win32": { url: "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip", ext: ".exe" },
    "darwin": { url: "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz", ext: ".sh" },
    "linux": { url: "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz", ext: ".sh" }
  }

  platform = "";
  fileName = "";
  downloadLink = "";
  cmd = null;
  constructor() {
    this.platform = process.platform;

    this.downloadLink = this.downloadLinks[this.platform];
    this.fileName = this.downloadLink.url.split("/")[this.downloadLink.url.split("/").length - 1];
  }

  async downloadCMD() {
    const rootExists = existsSync(rootFolder);
    if (!rootExists) await mkdirSync(rootFolder);

    if (!this.downloadLink) throw new Error("You are running an unsupported platform.");
    this.cmd = path.join(rootFolder, "steamcmd" + this.downloadLink.ext);

    // check if steamCMD is downloaded
    const steamCmdExists = existsSync(path.join(rootFolder, `steamcmd${this.downloadLink.ext}`))
    if (!steamCmdExists) {
      await downloadFile(this.downloadLink.url, this.fileName);
      await decompressFile(this.fileName);
    }
    return true;
  }

  async downloadWorkshopCreation(gameId, workshopId) {
    try {
      if (!this.cmd) {
        await this.downloadCMD();
      }

      return await spawn(`${this.cmd}`, ["+login", "anonymous", "+workshop_download_item", gameId, workshopId, "+quit"]);
    } catch(e) {
      throw e;
    }
  }
}