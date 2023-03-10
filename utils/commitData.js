// get the current commit hash
const response = await fetch(
  "https://api.github.com/repos/SW-World-Records/SteamCMD-API/commits",
  {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  }
)
const responseJson = await response.json()

export const commitHash = responseJson[0]?.sha
if (!commitHash) console.error("Failed to get Git commit hash!")
if (commitHash)
  console.info(
    `Git commit hash successfully obtained! Commit hash: ${responseJson[0].sha}`
  )
