import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("mint a token as a feeder to a consumer given a holder", () => {
	const schemeNames = ["name1", "name2", "name3"];

  async function deployProtocolAndSBT() {
		const [, consumer, feeder, feeder2, holder] = await ethers.getSigners();
    const MoulagaProtocol = await ethers.getContractFactory("MoulagaProtocol");
    const protocolContract = await MoulagaProtocol.deploy();

    const MoulagaSBT = await ethers.getContractFactory("MoulagaSBT");
    const sbtContract = await MoulagaSBT.deploy(protocolContract.address);

		await protocolContract.connect(holder).registerAsHolder("holder");
		await protocolContract.connect(holder).addScope(schemeNames[0]);
		await protocolContract.connect(holder).addScope(schemeNames[1]);
		await protocolContract.connect(holder).addScope(schemeNames[2]);

    return { protocolContract, sbtContract, consumer, feeder, feeder2, holder };
  }

	it("should mint a token with the given information", async () => {
		const { protocolContract, sbtContract, consumer, feeder, holder } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		
		await expect(feederToSBT.safeMint(consumer.address, holder.address, schemeNames)).to.be.fulfilled;
	});

	it("should fail when minting a token for the same feeder, consumer and holder", async () => {
		const { protocolContract, sbtContract, consumer, feeder, holder } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		await feederToSBT.safeMint(consumer.address, holder.address, schemeNames);
		
		await expect(feederToSBT.safeMint(consumer.address, holder.address, schemeNames))
			.to.be.revertedWith("MoulagaSBT already exists for the designated feeder, consumer and holder.");
	});

	it("should burn the token of the given tokenId by the feeder", async () => {
		const { protocolContract, sbtContract, consumer, feeder, holder } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		await feederToSBT.safeMint(consumer.address, holder.address, schemeNames);
		const moulagaSBT = await feederToSBT.getMoulagaSBT(feeder.address, holder.address, consumer.address);
		
		await expect(feederToSBT.burn(moulagaSBT.tokenId)).to.be.fulfilled;
	});

	describe("burn token", () => {
		it("should burn the token of the given tokenId by the feeder", async () => {
			const { protocolContract, sbtContract, consumer, feeder, holder } = await loadFixture(deployProtocolAndSBT);
			const feederToProtocol = protocolContract.connect(feeder);
			const feederToSBT = sbtContract.connect(feeder);
			await feederToProtocol.registerAsFeeder();
			await feederToSBT.safeMint(consumer.address, holder.address, schemeNames);
			const moulagaSBT = await feederToSBT.getMoulagaSBT(feeder.address, holder.address, consumer.address);
			
			await expect(feederToSBT.burn(moulagaSBT.tokenId)).to.be.fulfilled;
		});

	it("should fail when trying to burn a token not belonging to the feeder", async () => {
		const { protocolContract, sbtContract, consumer, feeder, feeder2, holder } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		await feederToSBT.safeMint(consumer.address, holder.address, schemeNames);

		const feeder2Connection = protocolContract.connect(feeder2);
		const feeder2ToSBT = sbtContract.connect(feeder2);
		await feeder2Connection.registerAsFeeder();
		const moulagaSBT = await feederToSBT.getMoulagaSBT(feeder.address, holder.address, consumer.address);
		
		await expect(feeder2ToSBT.burn(moulagaSBT.tokenId))
			.to.be.revertedWith("Only the feeder of this token can burn it.");
	});

	it("should fail when trying to transfer a soul bound token", async () => {
		const { protocolContract, sbtContract, consumer, feeder, holder } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		await feederToSBT.safeMint(consumer.address, holder.address, schemeNames);
		const moulagaSBT = await feederToSBT.getMoulagaSBT(feeder.address, holder.address, consumer.address);
		
		await expect(sbtContract.connect(consumer).transferFrom(consumer.address, feeder.address, moulagaSBT.tokenId))
			.to.be.revertedWith("This a Soulbound token. It cannot be transferred. It can only be burned by the token feeder.");
	});

	it("should return the moulaga token", async () => {
		const { protocolContract, sbtContract, consumer, feeder, holder } = await loadFixture(deployProtocolAndSBT);
		const feederToProtocol = protocolContract.connect(feeder);
		const feederToSBT = sbtContract.connect(feeder);
		await feederToProtocol.registerAsFeeder();
		await feederToSBT.safeMint(consumer.address, holder.address, schemeNames);

		const moulagaSBT = await feederToSBT.getMoulagaSBT(feeder.address, holder.address, consumer.address);
		expect(moulagaSBT.feeder).to.equal(feeder.address);
	});

	// it("should emit a 'Mint' event", async () => {
 
	// });

	// it("should emit a 'Burn' event", async () => {
 
	});
});