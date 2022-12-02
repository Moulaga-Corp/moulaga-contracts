import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MoulagaProtocol } from "../typechain-types";

describe ("MoulagaProtocol", () => {
  async function deployContractFixture() {
    const [contractOwner, consumer, feeder, feeder2, holder1] = await ethers.getSigners();

    const MoulagaProtocol = await ethers.getContractFactory("MoulagaProtocol");
    const contract = await MoulagaProtocol.deploy();

    return { contract, contractOwner, consumer, feeder, feeder2, holder1 };
  }
  const holder1Name = "holder1";
  const holderKey = "holderKey";
  const feederKey = "feederKey";

  describe("register as feeder", () => {
    it("should index the new feeder", async () => {
      const { contract, feeder } = await loadFixture(deployContractFixture);
      const feederConnection = contract.connect(feeder);

      expect(await contract.isFeeder(feeder.address)).to.be.false;
      await expect(feederConnection.registerAsFeeder()).to.be.fulfilled;
      expect(await contract.isFeeder(feeder.address)).to.be.true;
    });

    it("should emit a 'NewFeeder' event", async () => {
      const { contract, feeder } = await loadFixture(deployContractFixture);

      await expect(contract.connect(feeder).registerAsFeeder())
        .to
        .emit(contract, "NewFeeder")
        .withArgs(feeder.address);
    });

    it("should fail when already registered as feeder", async () => {
      const { contract, feeder } = await loadFixture(deployContractFixture);
      const feederConnection = contract.connect(feeder);

      await feederConnection.registerAsFeeder();
      await expect(feederConnection.registerAsFeeder()).to.be.revertedWith("Already registered as feeder.");
    });
  });

  describe("register as holder", () => {
    async function getHolderOrNull(contract: MoulagaProtocol, address: string): Promise<[string, string] | null> {
      const [wallet, name] = await contract.addressToHolder(address);
      if (wallet == ethers.constants.AddressZero || name == "") {
        return null;
      }
      return [wallet, name];
    }

    it("should index the new holder", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);

      expect(await getHolderOrNull(contract, holder1.address)).to.be.null;
      await expect(holder1Connection.registerAsHolder(holder1Name)).to.be.fulfilled;
      expect(await getHolderOrNull(contract, holder1.address)).to.deep.equal([holder1.address, holder1Name]);
    });

    it("should instantiate a new holder", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name);
      const holderObject = await contract.addressToHolder(holder1.address);
      
      expect(holderObject).to.have.property("wallet", holder1.address);
      expect(holderObject).to.have.property("name", holder1Name);
    });

    it("should a emit a 'NewHolder' event", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);

      await expect(contract.connect(holder1).registerAsHolder(holder1Name))
        .to
        .emit(contract, "NewHolder")
        .withArgs(holder1.address);
    });

    it("should fail when already registered as holder", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name);

      await expect(holder1Connection.registerAsHolder(holder1Name)).to.be.revertedWith("Already registered as holder.");
    });
  });

  describe("onboard feeder", () => {
    it("should assign the holder to the feeder", async () => {
      const { contract, feeder, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1)
      await holder1Connection.registerAsHolder(holder1Name);
      await contract.connect(feeder).registerAsFeeder();

      await expect(holder1Connection.onboardFeeder(feeder.address, feederKey, holderKey)).to.be.fulfilled;

      const holders = await contract.getHoldersFromFeeder(feeder.address);
      expect(holders).to.have.length(1);

      const holderObject = holders[0];
      expect(holderObject).to.have.property("wallet", holder1.address);
      expect(holderObject).to.have.property("name", holder1Name);
    });

    it("should emit a 'FeederOnboarded' event", async () => {
      const { contract, feeder, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1)
      await holder1Connection.registerAsHolder(holder1Name);
      await contract.connect(feeder).registerAsFeeder();

      await expect(holder1Connection.onboardFeeder(feeder.address, feederKey, holderKey))
        .to
        .emit(contract, "FeederOnboarded")
        .withArgs(feeder.address, holder1.address);
    });

    it("should fail when the feeder is already onboarded", async () => {
      const { contract, feeder, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1)
      await holder1Connection.registerAsHolder(holder1Name);
      await contract.connect(feeder).registerAsFeeder();
      await holder1Connection.onboardFeeder(feeder.address, feederKey, holderKey);

      await expect(holder1Connection.onboardFeeder(feeder.address, feederKey, holderKey)).to.be.revertedWith("Feeder already onboarded.");
    });

    it("should fail when the target is not a feeder", async () => {
      const { contract, feeder, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name);

      await expect(holder1Connection.onboardFeeder(feeder.address, feederKey, holderKey)).to.be.revertedWith("Must be a feeder.");
    });

    it("should fail when the caller is not a holder", async () => {
      const { contract, feeder, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await contract.connect(feeder).registerAsFeeder();

      await expect(holder1Connection.onboardFeeder(feeder.address, feederKey, holderKey)).to.be.revertedWith("Must be a holder.");
    });
  });

  describe("add scheme", () => {
    const scheme = "scheme1";
    const signature = "signature1";

    it("should index the new scheme", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name);

      expect(await contract.getSchemesFromHolder(holder1.address)).to.have.length(0);
      await expect(holder1Connection.addScheme(scheme, signature)).to.be.fulfilled;

      const schemes = await contract.getSchemesFromHolder(holder1.address)
      expect(schemes).to.have.length(1);
      expect(schemes[0]).to.have.property("name", scheme);
      expect(schemes[0]).to.have.property("signature", signature);
    });

    it("should emit a 'New Scheme' event", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name);

      await expect(holder1Connection.addScheme(scheme, signature))
        .to
        .emit(contract, "NewScheme")
        .withArgs(holder1.address, scheme);
    });

    it("should fail when the caller is not a holder", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);

      await expect(holder1Connection.addScheme(scheme, signature)).to.be.revertedWith("Must be a holder.");
    });

    it("should fail when the scheme name is already indexed", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name);
      await holder1Connection.addScheme(scheme, signature);

      await expect(holder1Connection.addScheme(scheme, "new signature")).to.be.revertedWith("Scheme already registered.");
    });
  });

  describe("mint a token as a feeder to a consumer given a holder", () => {
    const schemeNames = ["name1", "name2", "name3"];
    it("should mint a token with the given information", async () => {
      const { contract, consumer, feeder, holder1 } = await loadFixture(deployContractFixture);
      const feederConnection = contract.connect(feeder);
      await feederConnection.registerAsFeeder();
      
      await expect(feederConnection.safeMint(consumer.address, holder1.address, schemeNames)).to.be.fulfilled;
    });

    it("should fail when minting a token for the same feeder, consumer and holder", async () => {
      const { contract, consumer, feeder, holder1 } = await loadFixture(deployContractFixture);
      const feederConnection = contract.connect(feeder);
      await feederConnection.registerAsFeeder();
      await feederConnection.safeMint(consumer.address, holder1.address, schemeNames);
      
      await expect(feederConnection.safeMint(consumer.address, holder1.address, schemeNames))
        .to.be.revertedWith("MoulagaSBT already exists for the designed feeder, consumer and holder.");
    });

    it("should burn the token of the given tokenId by the feeder", async () => {
      const { contract, consumer, feeder, holder1 } = await loadFixture(deployContractFixture);
      const feederConnection = contract.connect(feeder);
      await feederConnection.registerAsFeeder();
      await feederConnection.safeMint(consumer.address, holder1.address, schemeNames);
      const moulagaSBT = await feederConnection.getMoulagaSBT(feeder.address, holder1.address, consumer.address);
      
      await expect(feederConnection.burn(moulagaSBT.tokenId)).to.be.fulfilled;
    });

    it("should fail when trying to burn a token not belonging to the feeder", async () => {
      const { contract, consumer, feeder, feeder2, holder1 } = await loadFixture(deployContractFixture);
      const feederConnection = contract.connect(feeder);
      await feederConnection.registerAsFeeder();
      await feederConnection.safeMint(consumer.address, holder1.address, schemeNames);

      const feeder2Connection = contract.connect(feeder2);
      await feeder2Connection.registerAsFeeder();
      const moulagaSBT = await feederConnection.getMoulagaSBT(feeder.address, holder1.address, consumer.address);
      
      await expect(feeder2Connection.burn(moulagaSBT.tokenId))
        .to.be.revertedWith("Only the feeder of this token can burn it.");
    });

    it("should fail when trying to transfer a soul bound token", async () => {
      const { contract, consumer, feeder, holder1 } = await loadFixture(deployContractFixture);
      const feederConnection = contract.connect(feeder);
      await feederConnection.registerAsFeeder();
      await feederConnection.safeMint(consumer.address, holder1.address, schemeNames);
      const moulagaSBT = await feederConnection.getMoulagaSBT(feeder.address, holder1.address, consumer.address);
      
      await expect(contract.connect(consumer).transferFrom(consumer.address, feeder.address, moulagaSBT.tokenId))
        .to.be.revertedWith("This a Soulbound token. It cannot be transferred. It can only be burned by the token feeder.");
    });

    it("should return the moulaga token", async () => {
      const { contract, consumer, feeder, holder1 } = await loadFixture(deployContractFixture);
      const feederConnection = contract.connect(feeder);
      await feederConnection.registerAsFeeder();
      await feederConnection.safeMint(consumer.address, holder1.address, schemeNames);

      const moulagaSBT = await feederConnection.getMoulagaSBT(feeder.address, holder1.address, consumer.address);
      expect(moulagaSBT.feeder).to.equal(feeder.address);
    });

    it("should emit a 'Mint' event", async () => {
   
    });

    it("should emit a 'Burn' event", async () => {
   
    });
  });
});