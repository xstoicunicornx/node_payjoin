import { payjoin } from "@xstoicunicornx/payjoin_test";
import https from "node:https";
import { HttpsProxyAgent, HttpsProxyAgentOptions } from "https-proxy-agent";

// node function for fetching ohttp keys
export function fetchOhttpKeys(
  pj_directory: URL,
  relay: URL,
): Promise<payjoin.OhttpKeysInterface> {
  // construct url for ohttp keys endpoint
  const ohttp_keys_url: URL = new URL(
    "/.well-known/ohttp-gateway",
    pj_directory,
  );

  // TODO: tru to use fetch instead
  // proxy request through relay
  const agent = new HttpsProxyAgent(relay.href, {
    headers: {
      ACCEPT: "application/ohttp-keys",
    },
  });

  // return promise that resolves with ohttp keys
  return new Promise((resolve, reject) => {
    try {
      // send GET request
      https
        .get(ohttp_keys_url, { agent }, (res) => {
          // construct response body
          let body = "";
          res.setEncoding("hex");
          res.on("data", (chunk) => {
            body += chunk;
          });

          // process response body
          res.on("end", () => {
            // copy data into ArrayBuffer
            const pairs = body.match(/[\da-f]{2}/gi);
            if (!pairs)
              throw Error("fetching ohttp keys return invalid response");
            const buffer = new ArrayBuffer(pairs.length);
            const view = new Uint8Array(buffer);
            for (let i = 0; i < buffer.byteLength; i++)
              view[i] = parseInt(pairs[i], 16);

            // decode ohttp keys
            const ohttp_keys = payjoin.OhttpKeys.decode(buffer);
            resolve(ohttp_keys);
          });
        })
        .on("error", (e) => {
          reject(`Error sending GET request for ohttp keys: ${e}`);
        });
    } catch (err) {
      reject(`Error while processing GET response for ohttp keys: ${err}`);
    }
  });
}

export function sleep(seconds: number) {
  const milliseconds = seconds * 1000;
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
