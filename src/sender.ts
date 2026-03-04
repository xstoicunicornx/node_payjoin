import { payjoin, uniffiInitAsync } from "@xstoicunicornx/payjoin_test";
import { originalPsbt } from "payjoin-test-utils";
import Client from "bitcoin-core";
import { postPjRequest } from "./utils";

const rpcuser = "admin1";
const rpcpassword = "123";
const rpchost = "http://localhost:18443";

const pjDirectory = "https://payjo.in";
const ohttpRelays = [
  "https://pj.benalleng.com",
  "https://pj.bobspacebkk.com",
  "https://ohttp.achow101.com",
];

class InMemorySenderPersisterAsync {
  id: number;
  events: any[];
  closed: boolean;

  constructor(id: number) {
    this.id = id;
    this.events = [];
    this.closed = false;
  }

  async save(event: any): Promise<void> {
    this.events.push(event);
  }

  async load(): Promise<any[]> {
    return this.events;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

export class Sender {
  wallet: Client;
  persister: any;

  constructor() {
    this.wallet = new Client({
      host: rpchost,
      username: rpcuser,
      password: rpcpassword,
      wallet: "sender",
    });
    this.persister = new InMemorySenderPersisterAsync(1);
  }

  async walletCommand(method: string, parameters: any[] = []) {
    const result = await this.wallet.command([{ method, parameters }]);
    return result[0];
  }

  async getbalance() {
    const balance = await this.walletCommand("getbalance");
    console.log("sender balance", balance);
    return balance;
  }

  async walletcreatefundedpsbt(address: string, amount: bigint) {
    const amountBtc = Number(amount) / 100000000;
    const { psbt } = await this.walletCommand("walletcreatefundedpsbt", [
      [], // inputs
      [{ [address]: amountBtc }], // outputs
      0, // locktime
      { fee_rate: 1 }, // options
    ]);
    console.log("walletcreatefundedpsbt", psbt);
    return psbt;
  }

  async walletprocesspsbt(unsignedPsbt: string) {
    const { psbt } = await this.walletCommand("walletprocesspsbt", [
      unsignedPsbt,
      true,
      "ALL",
      false,
    ]);
    console.log("walletprocesspsbt", psbt);
    return psbt;
  }

  postRequest(request: payjoin.Request) {
    return fetch(request.url, {
      method: "POST",
      headers: { "Content-Type": request.contentType },
      body: request.body,
    });
  }

  async getNewPayjoinSender(uri: string) {
    try {
      const pjUri = payjoin.Uri.parse(uri).checkPjSupported();
      console.log("pjuri", pjUri.pjEndpoint());
      const address = pjUri.address();
      const amount = pjUri.amountSats();
      const unsignedPsbt = await this.walletcreatefundedpsbt(address, amount);
      const psbt = await this.walletprocesspsbt(unsignedPsbt);
      const payjoinSender = await new payjoin.SenderBuilder(psbt, pjUri)
        .buildRecommended(BigInt(1))
        .saveAsync(this.persister);
      const relayIndex = Math.floor(Math.random() * ohttpRelays.length);
      const { request, ohttpCtx } = payjoinSender.createV2PostRequest(
        ohttpRelays[relayIndex],
      );
      // postPjRequest(request);
      const response = await this.postRequest(request);
      console.log("response", response);

      const payjoinSender2 = await payjoinSender
        .processResponse(await response.arrayBuffer(), ohttpCtx)
        .saveAsync(this.persister);
      const { request: getRequest, ohttpCtx: ohttpCtx2 } =
        payjoinSender2.createPollRequest(ohttpRelays[relayIndex]);
      const response2 = await this.postRequest(getRequest);
      const result = await payjoinSender2
        .processResponse(await response2.arrayBuffer(), ohttpCtx2)
        .saveAsync(this.persister);
      console.log("result", result);
    } catch (err) {
      console.log("error", err);
    }
  }
}
