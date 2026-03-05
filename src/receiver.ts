import { payjoin } from "@xstoicunicornx/payjoin_test";
import { fetchOhttpKeys, sleep } from "./utils.ts";
import Client from "bitcoin-core";
import { ReceiverBuilderInterface } from "@xstoicunicornx/payjoin_test/dist/generated/payjoin";

const rpcuser = "admin1";
const rpcpassword = "123";
const rpchost = "http://localhost:18443";

const pjDirectory = "https://payjo.in";
const ohttpRelays = [
  "https://pj.benalleng.com",
  "https://pj.bobspacebkk.com",
  "https://ohttp.achow101.com",
];

class InMemoryReceiverPersisterAsync {
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

export class Receiver {
  wallet: Client;
  persister: InMemoryReceiverPersisterAsync;
  session:
    | payjoin.InitializedInterface
    | payjoin.UncheckedOriginalPayloadInterface
    | payjoin.MaybeInputsOwnedInterface
    | payjoin.ProvisionalProposalInterface
    | undefined;
  interrupt: boolean;

  constructor() {
    this.wallet = new Client({
      host: rpchost,
      username: rpcuser,
      password: rpcpassword,
      wallet: "receiver",
    });
    this.persister = new InMemoryReceiverPersisterAsync(1);
    this.interrupt = false;
  }

  async walletCommand(method: string, parameters: any[] = []) {
    const result = await this.wallet.command([{ method, parameters }]);
    return result[0];
  }

  async getbalance() {
    const balance = await this.walletCommand("getbalance");
    console.log("receiver balance", balance);
    return balance;
  }

  async getnewaddress() {
    const address = await this.walletCommand("getnewaddress");
    console.log("receiver address", address);
    return address;
  }

  getOhttpKeys() {
    let randomIndex = Math.floor(Math.random() * ohttpRelays.length);
    return fetchOhttpKeys(
      new URL(pjDirectory),
      new URL(ohttpRelays[randomIndex]),
    );
  }

  async initialize(amount?: bigint, expiration?: bigint) {
    const address = await this.getnewaddress();
    const ohttpKeys = await this.getOhttpKeys();
    let payjoinReceiver = new payjoin.ReceiverBuilder(
      address,
      pjDirectory,
      ohttpKeys,
    ) as ReceiverBuilderInterface;
    if (amount) payjoinReceiver = payjoinReceiver.withAmount(amount);
    if (expiration) payjoinReceiver.withExpiration(expiration);
    this.session = await payjoinReceiver.build().saveAsync(this.persister);
  }

  getPjUri() {
    if (!(this.session instanceof payjoin.Initialized))
      throw Error("receiver not in initialized state");
    return this.session.pjUri();
  }

  async poll() {
    if (!this.session) throw Error("receiver has not been initialized");
    while (!this.interrupt) {
      console.log("polling...");
      await sleep(5);
    }
  }
}
