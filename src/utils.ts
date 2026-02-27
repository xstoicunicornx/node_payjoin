import { payjoin } from "@xstoicunicornx/payjoin_test";
import https from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";

// TODO: add return type
export async function fetchOhttpKeys(
  pj_directory: URL,
  relay: URL,
  // ): Promise<payjoin.OhttpKeysInterface> {
) {
  let validatedkeys = [
    1, 0, 22, 4, 159, 236, 230, 253, 10, 55, 153, 149, 98, 3, 248, 121, 35, 108,
    33, 186, 175, 134, 251, 252, 179, 97, 216, 172, 30, 143, 179, 243, 178, 161,
    154, 204, 162, 160, 221, 132, 55, 205, 105, 220, 48, 77, 155, 114, 78, 134,
    74, 3, 127, 131, 5, 167, 166, 199, 21, 249, 108, 135, 90, 229, 31, 12, 241,
    122, 0, 4, 0, 1, 0, 3,
  ];
  let validatedkeysbuffer = Buffer.from(validatedkeys);
  console.log(
    "validatedkeysbuffer",
    validatedkeysbuffer,
    validatedkeysbuffer.byteLength,
    validatedkeys.length,
  );

  const ohttp_keys_url: URL = new URL(
    "/.well-known/ohttp-gateway",
    pj_directory,
  );

  let dummy_key = new Uint8Array([
    0x01, 0x00, 0x16, 0x04, 0xba, 0x48, 0xc4, 0x9c, 0x3d, 0x4a, 0x92, 0xa3,
    0xad, 0x00, 0xec, 0xc6, 0x3a, 0x02, 0x4d, 0xa1, 0x0c, 0xed, 0x02, 0x18,
    0x0c, 0x73, 0xec, 0x12, 0xd8, 0xa7, 0xad, 0x2c, 0xc9, 0x1b, 0xb4, 0x83,
    0x82, 0x4f, 0xe2, 0xbe, 0xe8, 0xd2, 0x8b, 0xfe, 0x2e, 0xb2, 0xfc, 0x64,
    0x53, 0xbc, 0x4d, 0x31, 0xcd, 0x85, 0x1e, 0x8a, 0x65, 0x40, 0xe8, 0x6c,
    0x53, 0x82, 0xaf, 0x58, 0x8d, 0x37, 0x09, 0x57, 0x00, 0x04, 0x00, 0x01,
    0x00, 0x03,
  ]);
  console.log(
    "dummy_key",
    dummy_key,
    dummy_key.length,
    dummy_key.buffer.byteLength,
  );

  const options = {
    // host: relay.href,
    // path: ohttp_keys_url.href,
    headers: {
      ACCEPT: "application/ohttp-keys",
    },
  };
  const agent = new HttpsProxyAgent(relay.href, options);
  https.get(ohttp_keys_url, { agent }, (res) => {
    console.log("statusCode:", res.statusCode);
    console.log("headers:", res.headers);
    console.log("body:", res.readable);
    var body = "";
    res.setEncoding("hex");
    res.on("data", function (chunk) {
      body += chunk;
    });
    res.on("end", function () {
      console.log("body", body);
      let pairs = body.match(/[\da-f]{2}/gi).map((b) => b);
      const buffer = new ArrayBuffer(pairs.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < buffer.byteLength; i++)
        view[i] = parseInt(pairs[i], 16);
      console.log("buffer", buffer, buffer.byteLength);
      const ohttp_keys = payjoin.OhttpKeys.decode(buffer);
      console.log("ohttp_keys", ohttp_keys);
    });
  });

  // return new Promise<payjoin.OhttpKeysInterface>((resolve, reject) => {
  //   request(ohttp_keys_url.href, async (error, response, body) => {
  //     if (error !== null) reject(error);
  //
  //     const { statusCode: status_code, headers } = response;
  //     const content_type = headers["content-type"];
  //     if (
  //       status_code === 200 &&
  //       content_type === "application/ohttp-keys" &&
  //       body
  //     ) {
  //       console.log("body:", body); // Print the HTML for the Google homepage.
  //
  //       try {
  //         const key_buffer = (await buffer(body)).buffer;
  //         console.log("key_buffer", key_buffer, key_buffer.byteLength);
  //         const ohttp_keys = payjoin.OhttpKeys.decode(key_buffer);
  //         console.log("ohttp_keys", ohttp_keys);
  //         resolve(ohttp_keys);
  //       } catch (ohttp_keys_error) {
  //         reject(ohttp_keys_error.getInner);
  //       }
  //     } else {
  //       if (status_code !== 200)
  //         reject(
  //           `fetching ohttp keys returned invalid status code of ${status_code}`,
  //         );
  //       else if (content_type !== "application/ohttp-keys")
  //         reject(
  //           `fetching ohttp keys returned invalid content-type of ${content_type}`,
  //         );
  //       else if (!body) reject("fetching ohttp keys returned empty body");
  //     }
  //     reject(`fetching ohttp keys failed`);
  //   });
  // });
}
