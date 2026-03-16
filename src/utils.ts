import { payjoin } from "@xstoicunicornx/payjoin_test";
import https from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";
import Client from "bitcoin-core";

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

export function postRequest(request: payjoin.Request) {
  return fetch(request.url, {
    method: "POST",
    headers: { "Content-Type": request.contentType },
    body: request.body,
  });
}

export class Wallet {
  client: Client;

  constructor(wallet: string) {
    // nigiri defaults
    const username = "admin1";
    const password = "123";
    const host = "http://localhost:18443";

    this.client = new Client({
      host,
      username,
      password,
      wallet,
    });
  }

  private async command(method: string, parameters: any[] = []) {
    const result = await this.client.command([{ method, parameters }]);
    return result[0];
  }

  getbalance() {
    return this.command("getbalance");
  }

  getnewaddress() {
    return this.command("getnewaddress");
  }

  getaddressinfo(address: string) {
    return this.command("getaddressinfo", [address]);
  }

  testmempoolaccept(txHex: string) {
    return this.command("testmempoolaccept", [txHex]);
  }

  walletcreatefundedpsbt(
    address: string,
    amount: bigint,
    options: Record<string, any>,
  ) {
    const amountBtc = Number(amount) / 100000000;
    return this.command("walletcreatefundedpsbt", [
      [], // inputs
      [{ [address]: amountBtc }], // outputs
      0, // locktime
      options,
    ]);
  }

  walletprocesspsbt(unsignedPsbt: string) {
    return this.command("walletprocesspsbt", [
      unsignedPsbt,
      true,
      "ALL",
      false,
    ]);
  }

  listunspent() {
    return this.command("listunspent");
  }

  finalizepsbt(psbt: string) {
    return this.command("finalizepsbt", [psbt]);
  }

  analyzepsbt(psbt: string) {
    return this.command("analyzepsbt", [psbt]);
  }

  sendrawtransaction(hex: string) {
    return this.command("sendrawtransaction", [hex]);
  }

  decoderawtransaction(hex: string) {
    return this.command("decoderawtransaction", [hex]);
  }

  decodepsbt(psbt: string) {
    return this.command("decodepsbt", [psbt]);
  }

  gettxout(txid: string, vout: number) {
    return this.command("gettxout", [txid, vout]);
  }

  decodescript(script: string) {
    return this.command("decodescript", [script]);
  }
}
