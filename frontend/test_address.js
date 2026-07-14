import { nativeToScVal, Address } from '@stellar/stellar-sdk';
try {
  console.log("With Address object:", nativeToScVal(Address.fromString("GDLOA53YFKDN4VXILBA2OQ5UFGJ7EHCGBNQODUF4HV75KYCDT37GZKMC"), { type: "address" }));
} catch (e) {
  console.error("Failed with Address object:", e.message);
}
try {
  console.log("With string:", nativeToScVal("GDLOA53YFKDN4VXILBA2OQ5UFGJ7EHCGBNQODUF4HV75KYCDT37GZKMC", { type: "address" }));
} catch (e) {
  console.error("Failed with string:", e.message);
}
