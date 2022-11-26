import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MoulagaProtocol } from "../typechain-types";

describe ("MoulagaProtocol", () => {
  async function deployContractFixture() {
    const [contractOwner, feeder, holder1] = await ethers.getSigners();

    const MoulagaProtocol = await ethers.getContractFactory("MoulagaProtocol");
    const contract = await MoulagaProtocol.deploy();

    return { contract, contractOwner, feeder, holder1 };
  }
  const holder1Name = "holder1";

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
      await expect(holder1Connection.registerAsHolder(holder1Name, "some key")).to.be.fulfilled;
      expect(await getHolderOrNull(contract, holder1.address)).to.deep.equal([holder1.address, holder1Name]);
    });

    it("should instantiate a new holder", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name, "some key");
      const holderObject = await contract.addressToHolder(holder1.address);
      
      expect(holderObject).to.have.property("wallet", holder1.address);
      expect(holderObject).to.have.property("name", holder1Name);
    });

    it("should a emit a 'NewHolder' event", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);

      await expect(contract.connect(holder1).registerAsHolder(holder1Name, "some key"))
        .to
        .emit(contract, "NewHolder")
        .withArgs(holder1.address);
    });

    it("should fail when already registered as holder", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name, "some key");

      await expect(holder1Connection.registerAsHolder(holder1Name, "some key")).to.be.revertedWith("Already registered as holder.");
    });
  });

  describe("onboard feeder", () => {
    it("should assign the holder to the feeder", async () => {
      const { contract, feeder, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1)
      await holder1Connection.registerAsHolder(holder1Name, "some key");
      await contract.connect(feeder).registerAsFeeder();

      await expect(holder1Connection.onboardFeeder(feeder.address)).to.be.fulfilled;

      const holders = await contract.getHoldersFromFeeder(feeder.address);
      expect(holders).to.have.length(1);

      const holderObject = holders[0];
      expect(holderObject).to.have.property("wallet", holder1.address);
      expect(holderObject).to.have.property("name", holder1Name);
    });

    it("should emit a 'FeederOnboarded' event", async () => {
      const { contract, feeder, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1)
      await holder1Connection.registerAsHolder(holder1Name, "some key");
      await contract.connect(feeder).registerAsFeeder();

      await expect(holder1Connection.onboardFeeder(feeder.address))
        .to
        .emit(contract, "FeederOnboarded")
        .withArgs(feeder.address, holder1.address);
    });

    it("should fail when the feeder is already onboarded", async () => {
      const { contract, feeder, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1)
      await holder1Connection.registerAsHolder(holder1Name, "some key");
      await contract.connect(feeder).registerAsFeeder();
      await holder1Connection.onboardFeeder(feeder.address);

      await expect(holder1Connection.onboardFeeder(feeder.address)).to.be.revertedWith("Feeder already onboarded.");
    });

    it("should fail when the target is not a feeder", async () => {
      const { contract, feeder, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name, "some key");

      await expect(holder1Connection.onboardFeeder(feeder.address)).to.be.revertedWith("Must be a feeder.");
    });

    it("should fail when the caller is not a holder", async () => {
      const { contract, feeder, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await contract.connect(feeder).registerAsFeeder();

      await expect(holder1Connection.onboardFeeder(feeder.address)).to.be.revertedWith("Must be a holder.");
    });
  });

  describe("add scheme", () => {
    const scheme = "scheme1";
    const signature = "signature1";

    it("should index the new scheme", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name, "some key");

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
      await holder1Connection.registerAsHolder(holder1Name, "some key");

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
      await holder1Connection.registerAsHolder(holder1Name, "some key");
      await holder1Connection.addScheme(scheme, signature);

      await expect(holder1Connection.addScheme(scheme, "new signature")).to.be.revertedWith("Scheme already registered.");
    });
  });
});