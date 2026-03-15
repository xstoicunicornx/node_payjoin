import { uniffiInitAsync } from "@xstoicunicornx/payjoin_test";
import { Receiver } from "./src/receiver.ts";
import { Sender } from "./src/sender.ts";

async function main() {
  await uniffiInitAsync();

  const receiver = new Receiver();
  receiver.wallet.getbalance();
  const amount = BigInt(10000);
  const expiration = BigInt(Math.floor(Date.now() / 1000) + 60 * 5); // 5 min from now
  await receiver.initialize(amount, expiration);
  const uri = receiver.getPjUri();
  receiver.poll();

  const sender = new Sender();
  await sender.wallet.getbalance();
  await sender.initialize(uri.asString());
  await sender.postOriginalPsbt();
  sender.poll();
}

main();
