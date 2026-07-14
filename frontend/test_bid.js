import { Contract, TransactionBuilder, Networks, BASE_FEE, nativeToScVal, rpc } from "@stellar/stellar-sdk";

const server = new rpc.Server("https://soroban-testnet.stellar.org", { allowHttp: false });
const CONTRACT_ID = "CDP542OQHSRO6E5TGSBQZ3GCNELMUL6CTP4GC3SMAIW4MNU3G2VU5DOU";
const publicKey = "GDLOA53YFKDN4VXILBA2OQ5UFGJ7EHCGBNQODUF4HV75KYCDT37GZKMC"; // Use admin as bidder

async function test() {
  const account = await server.getAccount(publicKey);
  const contract = new Contract(CONTRACT_ID);
  
  const bidderScVal = nativeToScVal(publicKey, { type: "address" });
  const amountScVal = nativeToScVal(1000n, { type: "i128" });
  
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(contract.call("bid", bidderScVal, amountScVal))
    .setTimeout(60)
    .build();

  console.log("Simulating...");
  const sim = await server.simulateTransaction(tx);
  console.log("Simulation error:", sim.error);
}

test().catch(console.error);
