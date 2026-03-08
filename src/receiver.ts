import { payjoin } from "@xstoicunicornx/payjoin_test";
import { fetchOhttpKeys, postRequest, sleep } from "./utils.ts";
import Client from "bitcoin-core";
import { PlainOutPoint } from "@xstoicunicornx/payjoin_test/dist/generated/payjoin";

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

// TODO: waiting for async support to actually implement these state trannsition callbacks
class MempoolAcceptanceCallback implements payjoin.CanBroadcast {
  // private cb: (txHex: string) => Promise<string>;
  //
  // constructor(cb: (txHex: string) => Promise<string>) {
  //   this.cb = cb;
  // }
  constructor() {}

  callback(_tx: ArrayBuffer): boolean {
    // try {
    //   const hexTx = Buffer.from(tx).toString("hex");
    //   const resultJson = await this.cb(JSON.stringify(hexTx));
    //   const decoded = JSON.parse(resultJson);
    //   return decoded[0].allowed === true;
    //   return true;
    // } catch {
    //   return false;
    // }
    return true;
  }
}

class IsScriptOwnedCallback implements payjoin.IsScriptOwned {
  // private cb: (txHex: string) => Promise<string>;
  //
  // constructor(cb: (txHex: string) => Promise<string>) {
  //   this.cb = cb;
  // }
  constructor() {}

  callback(_script: ArrayBuffer): boolean {
    return false;
  }
}

class CheckInputsNotSeenCallback implements payjoin.IsOutputKnown {
  constructor() {}

  callback(_outpoint: PlainOutPoint): boolean {
    return false;
  }
}

export class Receiver {
  wallet: Client;
  persister: InMemoryReceiverPersisterAsync;
  session:
    | payjoin.InitializedInterface
    | payjoin.UncheckedOriginalPayloadInterface
    | payjoin.MaybeInputsOwnedInterface
    | payjoin.MaybeInputsSeenInterface
    | payjoin.OutputsUnknownInterface
    | payjoin.WantsOutputsInterface
    | payjoin.WantsInputsInterface
    | payjoin.WantsFeeRangeInterface
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

  testmempoolaccept(txHex: string) {
    return this.walletCommand("testmempoolaccept", [txHex]);
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
    let session = new payjoin.ReceiverBuilder(
      address,
      pjDirectory,
      ohttpKeys,
    ) as payjoin.ReceiverBuilderInterface;
    if (amount) session = session.withAmount(amount);
    if (expiration) session.withExpiration(expiration);
    this.session = await session.build().saveAsync(this.persister);
  }

  getPjUri() {
    if (!(this.session instanceof payjoin.Initialized))
      throw Error("receiver not in initialized state");
    return this.session.pjUri();
  }

  async poll() {
    if (!this.session) throw Error("receiver has not been initialized");
    this.interrupt = false;
    while (!this.interrupt) {
      console.log("polling...");
      if (this.session instanceof payjoin.Initialized) {
        console.log("session state initialized");
        const random_index = Math.floor(Math.random() * ohttpRelays.length);
        const { request, clientResponse } = this.session.createPollRequest(
          ohttpRelays[random_index],
        );
        const response = await postRequest(request);
        const stateTransition = await this.session
          .processResponse(await response.arrayBuffer(), clientResponse)
          .saveAsync(this.persister);
        if (
          stateTransition instanceof
          payjoin.InitializedTransitionOutcome.Progress
        ) {
          this.session = stateTransition.inner.inner;
          this.checkOriginalPsbt();
          return;
        }
      }
      await sleep(2);
    }
    console.log("polling interrupted");
  }

  stop() {
    this.interrupt = true;
  }

  // NOTE: nothing is actually being checked just walking through state transitions
  async checkOriginalPsbt() {
    try {
      if (!(this.session instanceof payjoin.UncheckedOriginalPayload))
        throw Error("receiver is not in correct state to check original psbt");

      const canBroadcast = new MempoolAcceptanceCallback();
      this.session = await this.session
        .checkBroadcastSuitability(undefined, canBroadcast)
        .saveAsync(this.persister);

      const inputsOwned = new IsScriptOwnedCallback();
      this.session = await this.session
        .checkInputsNotOwned(inputsOwned)
        .saveAsync(this.persister);

      const inputsSeen = new CheckInputsNotSeenCallback();
      this.session = await this.session
        .checkNoInputsSeenBefore(inputsSeen)
        .saveAsync(this.persister);

      const outputsOwned = new IsScriptOwnedCallback();
      this.session = await this.session
        .identifyReceiverOutputs(outputsOwned)
        .saveAsync(this.persister);

      this.session = await this.session
        .commitOutputs()
        .saveAsync(this.persister);

      // TODO: contributeInputs()
      this.session = await this.session
        .commitInputs()
        .saveAsync(this.persister);

      this.session = await this.session
        .applyFeeRange(BigInt(1), undefined)
        .saveAsync(this.persister);

      const unsignedPsbt = this.session.psbtToSign();
      console.log("checkOriginalPsbt");
    } catch (error) {
      console.error(error);
    }
  }
}
