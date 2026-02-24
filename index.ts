import { payjoin, uniffiInitAsync } from "payjoin";
import { originalPsbt } from "payjoin-test-utils";
import assert from "assert";

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

async function main() {
  await uniffiInitAsync();
  // const uri =
  //   "bitcoin:12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX?amount=1&pj=https://example.com?ciao";
  // const result = payjoin.Url.parse(uri);
  // console.log("result", result);

  const persister = new InMemoryReceiverPersisterAsync(1);
  const address = "2MuyMrZHkbHbfjudmKUy45dU4P17pjG2szK";
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

  const receiver = await new payjoin.ReceiverBuilder(
    address,
    "https://example.com",
    ohttpKeys,
  )
    .build()
    .saveAsync(persister);
  const uri = receiver.pjUri();
  console.log(uri.asString());

  const senderPersister = new InMemorySenderPersisterAsync(1);
  const psbt = originalPsbt();
  const withReplyKey = await new payjoin.SenderBuilder(psbt, uri)
    .buildRecommended(BigInt(1000))
    .saveAsync(senderPersister);
  console.log("psbt", psbt);
  console.log(withReplyKey);
}

main();
