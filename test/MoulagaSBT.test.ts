import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("mint a token as a feeder to a consumer given a holder", () => {
  async function deployProtocolAndSBT() {
		const [contractOwner, consumer, feeder, feeder2, holder1] = await ethers.getSigners();
    const MoulagaProtocol = await ethers.getContractFactory("MoulagaProtocol");
    const protocolContract = await MoulagaProtocol.deploy();

    const MoulagaSBT = await ethers.getContractFactory("MoulagaSBT");
    const sbtContract = await MoulagaSBT.deploy(protocolContract.address);

    return { protocolContract, sbtContract, contractOwner, consumer, feeder, feeder2, holder1 };
  }

	const schemeNames = ["name1", "name2", "name3"];

	it("should mint a token with the given information", async () => {
		const { protocolContract, sbtContract, consumer, feeder, holder1 } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		
		await expect(feederToSBT.safeMint(consumer.address, holder1.address, schemeNames)).to.be.fulfilled;
	});

	it("should fail when minting a token for the ame feeder, consumer and holder", async () => {
		const { protocolContract, sbtContract, consumer, feeder, holder1 } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		await feederToSBT.safeMint(consumer.address, holder1.address, schemeNames);
		
		await expect(feederToSBT.safeMint(consumer.address, holder1.address, schemeNames))
			.to.be.revertedWith("MoulagaSBT already exists for the designed feeder, consumer and holder.");
	});

	it("should burn the token of the given tokenId by the feeder", async () => {
		const { protocolContract, sbtContract, consumer, feeder, holder1 } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		await feederToSBT.safeMint(consumer.address, holder1.address, schemeNames);
		const moulagaSBT = await feederToSBT.getMoulagaSBT(feeder.address, holder1.address, consumer.address);
		
		await expect(feederToSBT.burn(moulagaSBT.tokenId)).to.be.fulfilled;
	});

	it("should fail when trying to burn a token not belonging to the feeder", async () => {
		const { protocolContract, sbtContract, consumer, feeder, feeder2, holder1 } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		await feederToSBT.safeMint(consumer.address, holder1.address, schemeNames);

		const feeder2Connection = protocolContract.connect(feeder2);
		const feeder2ToSBT = sbtContract.connect(feeder2);
		await feeder2Connection.registerAsFeeder();
		const moulagaSBT = await feederToSBT.getMoulagaSBT(feeder.address, holder1.address, consumer.address);
		
		await expect(feeder2ToSBT.burn(moulagaSBT.tokenId))
			.to.be.revertedWith("Only the feeder of this token can burn it.");
	});

	it("should fail when trying to transfer a soul bound token", async () => {
		const { protocolContract, sbtContract, consumer, feeder, holder1 } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		await feederToSBT.safeMint(consumer.address, holder1.address, schemeNames);
		const moulagaSBT = await feederToSBT.getMoulagaSBT(feeder.address, holder1.address, consumer.address);
		
		await expect(sbtContract.connect(consumer).transferFrom(consumer.address, feeder.address, moulagaSBT.tokenId))
			.to.be.revertedWith("This a Soulbound token. It cannot be transferred. It can only be burned by the token feeder.");
	});

	it("should return the moulaga token", async () => {
		const { protocolContract, sbtContract, consumer, feeder, holder1 } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		await feederToSBT.safeMint(consumer.address, holder1.address, schemeNames);

		const moulagaSBT = await feederToSBT.getMoulagaSBT(feeder.address, holder1.address, consumer.address);
		expect(moulagaSBT.feeder).to.equal(feeder.address);
	});

	it("should emit a 'Mint' event", async () => {
 
	});

	it("should emit a 'Burn' event", async () => {
 
	});
});