import Head from "next/head";
import ProofComponent from "./components/proof";

export default function Home() {
  return (
    <>
      <Head>
        <title>WiFiProof - Zero-Knowledge Venue Attendance</title>
        <meta name="description" content="Generate zero-knowledge proofs of venue attendance using WiFi connection data" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <ProofComponent />
      </main>
    </>
  );
}
