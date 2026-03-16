# Node Payjoin Demo

## A Node payjoin demo in Typescript

This implementation's goal was to replicate the functionality of `payjoin-cli`, the reference implementation for the payjoin protocol, written using the [payjoin](https://www.npmjs.com/package/payjoin) npm package. The current npm package was a bit out of date so this is currently using my forked [payjoin_test](https://www.npmjs.com/package/@xstoicunicornx/payjoin_test).

Most of this README was also stolen from the [payjoin-cli](https://github.com/payjoin/rust-payjoin/tree/master/payjoin-cli).

This implementation enables sending and receiving [BIP 78 Payjoin
(v1)](https://github.com/bitcoin/bips/blob/master/bip-0078.mediawiki) and [Draft
BIP 77 Async Payjoin (v2)](https://github.com/bitcoin/bips/blob/master/bip-0077.md)
transactions via `bitcoind`. By default it supports Payjoin v2, which is
backwards compatible with v1. Enable the `v1` feature to disable Payjoin v2 to
send and receive using only v1.

##### DO NOT USE THIS FOR REAL FUNDS

There is only very minimal validation done in this implementation (as many of the state transitions do not support async as of right now) and very little testing.

## Demo

Here's a minimal payjoin example using this package connected to `bitcoind` on [regtest](https://developer.bitcoin.org/examples/testing.html#regtest-mode). This example uses [`nigiri`](https://github.com/vulpemventures/nigiri) to setup a regtest environment.

Payjoin `v2` allows for transactions to be completed asynchronously. Thus the sender and receiver do not need to be online at the same time to payjoin. Learn more about how `v2` works [here](https://payjoin.org/docs/how-it-works/payjoin-v2-bip-77).

To get started, install `nigiri` and [`docker`](https://www.docker.com/get-started). Payjoin requires the sender and receiver each to have spendable [UTXOs](https://www.unchained.com/blog/what-is-a-utxo-bitcoin), so we'll create two wallets and fund each.

### Install nigiri

```sh
# Download nigiri and check that installation has succeeded.
curl https://getnigiri.vulpem.com | bash
nigiri --version
nigiri start

# Create two regtest wallets.
nigiri rpc createwallet sender
nigiri rpc createwallet receiver

# We need 101 blocks for the UTXOs to be spendable due to the coinbase maturity requirement.
nigiri rpc generatetoaddress 101 $(nigiri rpc -rpcwallet=sender getnewaddress)
nigiri rpc generatetoaddress 101 $(nigiri rpc -rpcwallet=receiver getnewaddress)

# Check the balances before doing a Payjoin transaction.
nigiri rpc -rpcwallet=sender getbalance
nigiri rpc -rpcwallet=receiver getbalance
```

Great! Our wallets are setup.

### Install NPM Dependencies and Initialize

```sh
npm install
just init
```

### Generate Receive Address

Now, the receiver must generate an address to receive the payment. The format is:

```sh
just receive <AMOUNT_SATS>
```

For example, to receive 10000 sats from our top-level directory:

```sh
just receive 10000
```

This will output a [bitcoin URI](https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki) containing the receiver's address, amount, payjoin directory, and other session information the client needs. For example:

```sh
bitcoin:tb1qfttmt4z68cfyn2z25t3dusp03rq6gxrucfxs5a?amount=0.0001&pj=HTTPS://PAYJO.IN/EUQKYLU92GC6U%23RK1QFWVXS2LQ2VD4T6DUMQ0F4RZQ5NL9GM0EFWVHJZ9L796L20Z7SL3J+OH1QYP87E2AVMDKXDTU6R25WCPQ5ZUF02XHNPA65JMD8ZA2W4YRQN6UUWG+EX10T57UE
```

Note that the session can be paused by pressing `Ctrl+C`. The receiver can come back online and resume the session by running `payjoin-cli resume` again, and the sender may do a `send` against it while the receiver is offline.

### Send a Payjoin

Now, let's send the payjoin. Payjoins will follow the [payjoin protocol defined in BIP 78](https://github.com/bitcoin/bips/blob/master/bip-0078.mediawiki#protocol) which is a multistep asynchronous coordination process. 

#### Send Fallback Transaction

First, the sender will give the receiver a signed transaction that is not a payjoin that pays to the receiver's address. The receiver can broadcast this signed transaction as a fallback option incase the payjoin coordination fails for some reason. Here is an example format:

```sh
just send <BIP21>
```

Where `<BIP21>` is the BIP21 URL containing the receiver's address, amount, payjoin directory, and OHTTP relay. Using the example from above:

```sh
just send "bitcoin:tb1qfttmt4z68cfyn2z25t3dusp03rq6gxrucfxs5a?amount=0.0001&pj=HTTPS://PAYJO.IN/EUQKYLU92GC6U%23RK1QFWVXS2LQ2VD4T6DUMQ0F4RZQ5NL9GM0EFWVHJZ9L796L20Z7SL3J+OH1QYP87E2AVMDKXDTU6R25WCPQ5ZUF02XHNPA65JMD8ZA2W4YRQN6UUWG+EX10T57UE"
```

#### Propose Payjoin Transaction

Next, the receiver will validate the fallback transaction and, if successful, generate a payjoin proposal transaction from the fallback transaction's inputs and outputs and subsequently add its own input(s). To check for the fallback transaction sent by the sender and construct the payjoin proposal signed by the receiver use command:

```sh
just receive resume
```

#### Finalize Payjoin Transaction

Finally, the sender checks for the payjoin proposal and then signs and broadcasts the finalized payjoin transaction using this command:

```sh
just send resume
```

Congratulations! You've completed a version 2 payjoin, which can be used for cheaper, more efficient, and more private on-chain payments. Additionally, because we're using `v2`, the sender and receiver don't need to be online at the same time to do the payjoin.
