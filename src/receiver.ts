import { payjoin, uniffiInitAsync } from "@xstoicunicornx/payjoin_test";
import payjoin_test from "@xstoicunicornx/payjoin_test";
import { fetchOhttpKeys } from "./utils.ts";
import { originalPsbt, TestServices, RpcClient } from "payjoin-test-utils";
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

  async wallet_command(method: string, parameters: any[] = []) {
    const result = await this.wallet.command([{ method, parameters }]);
    return result[0];
  }

  async getbalance() {
    const balance = await this.wallet_command("getbalance");
    console.log("receiver balance", balance);
    return balance;
  }

  async getnewaddress() {
    const address = await this.wallet.command("getnewaddress");
    console.log("receiver address", address);
    return address;
  }

  async getNewPayjoinReceive() {
    const address = await this.getnewaddress();
    const ohttpKeys = payjoin.OhttpKeys.decode(
      new Uint8Array([
        0x01, 0x00, 0x16, 0x04, 0xba, 0x48, 0xc4, 0x9c, 0x3d, 0x4a, 0x92, 0xa3,
        0xad, 0x00, 0xec, 0xc6, 0x3a, 0x02, 0x4d, 0xa1, 0x0c, 0xed, 0x02, 0x18,
        0x0c, 0x73, 0xec, 0x12, 0xd8, 0xa7, 0xad, 0x2c, 0xc9, 0x1b, 0xb4, 0x83,
        0x82, 0x4f, 0xe2, 0xbe, 0xe8, 0xd2, 0x8b, 0xfe, 0x2e, 0xb2, 0xfc, 0x64,
        0x53, 0xbc, 0x4d, 0x31, 0xcd, 0x85, 0x1e, 0x8a, 0x65, 0x40, 0xe8, 0x6c,
        0x53, 0x82, 0xaf, 0x58, 0x8d, 0x37, 0x09, 0x57, 0x00, 0x04, 0x00, 0x01,
        0x00, 0x03,
      ]).buffer,
    );

    return new payjoin.ReceiverBuilder(address, pj_directory, ohttpKeys)
      .build()
      .saveAsync(this.persister);
  }

  async tester() {
    fetchOhttpKeys(new URL(pj_directory), new URL(ohttp_relays[0]));
  }
}
