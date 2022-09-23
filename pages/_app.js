import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>SWWR SteamCMD API</title>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
