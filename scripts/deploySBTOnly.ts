import { get } from "env-var";
import { ethers } from "hardhat";

async function main() {
  const PROTOCOL_ADDRESS = get("PROTOCOL_ADDRESS").required().asString();

  // const MoulagaProtocol = await ethers.getContractFactory("MoulagaProtocol");
  // const protocolContract = await MoulagaProtocol.deploy();
  // await protocolContract.deployed();

  const MoulagaSBT = await ethers.getContractFactory("MoulagaSBT");
  const sbtContract = await MoulagaSBT.deploy(PROTOCOL_ADDRESS);
  await sbtContract.deployed();

  console.log(`SBT: ${sbtContract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});