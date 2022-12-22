import { ethers } from "hardhat";

async function main() {
  const MoulagaProtocol = await ethers.getContractFactory("MoulagaProtocol");
  const protocolContract = await MoulagaProtocol.deploy();
  await protocolContract.deployed();

  const MoulagaSBT = await ethers.getContractFactory("MoulagaSBT");
  const sbtContract = await MoulagaSBT.deploy(protocolContract.address);
  await sbtContract.deployed();

  console.log(`Protocol: ${protocolContract.address}\nSBT: ${sbtContract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
