import { payjoin, uniffiInitAsync } from "@xstoicunicornx/payjoin_test";
import { originalPsbt } from "payjoin-test-utils";
import Client from "bitcoin-core";

const rpcuser = "admin1";
const rpcpassword = "123";
const rpchost = "http://localhost:18443";

const pj_directory = "https://payjo.in";
const ohttp_relays = [
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
  persister: any;

  constructor() {
    this.wallet = new Client({
      host: rpchost,
      username: rpcuser,
      password: rpcpassword,
      wallet: "receiver",
    });
    this.persister = new InMemoryReceiverPersisterAsync(1);
  }

  async get_balance() {
    const balance = await this.wallet.command([
      { method: "getbalance", parameters: [] },
    ]);
    console.log("receiver balance", balance);
    return balance;
  }
}
