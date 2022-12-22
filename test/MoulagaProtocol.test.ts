import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

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
    it("should index the new holder", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);

      expect(await contract.isHolder(holder1.address)).to.be.false;
      await expect(holder1Connection.registerAsHolder(holder1Name)).to.be.fulfilled;
      expect(await contract.isHolder(holder1.address)).to.be.true;
    });

    it("should instantiate a new holder", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name);

      expect(await contract.isHolder(holder1.address)).to.be.true;
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

  describe("add scope", () => {
    const scope = "scope1";

    it("should index the new scheme", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name);

      expect(await contract.getScopesFromHolder(holder1.address)).to.have.length(0);
      await expect(holder1Connection.addScope(scope)).to.be.fulfilled;

      const scopes = await contract.getScopesFromHolder(holder1.address)
      expect(scopes).to.have.length(1);
      expect(scopes[0]).to.be.equal(scope);
    });

    it("should emit a 'New Scheme' event", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name);

      await expect(holder1Connection.addScope(scope))
        .to
        .emit(contract, "NewScheme")
        .withArgs(holder1.address, scope);
    });

    it("should fail when the caller is not a holder", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);

      await expect(holder1Connection.addScope(scope)).to.be.revertedWith("Must be a holder.");
    });

    it("should fail when the scheme name is already indexed", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      const holder1Connection = contract.connect(holder1);
      await holder1Connection.registerAsHolder(holder1Name);
      await holder1Connection.addScope(scope);

      await expect(holder1Connection.addScope(scope)).to.be.revertedWith("Scope already registered.");
    });
  });

  describe("list holders", () => {
    it("should succeed when empty", async () => {
      const { contract } = await loadFixture(deployContractFixture);

      const holders = await contract.listHolders();
      expect(holders).to.have.lengthOf(0);
    });

    it("should succeed when not empty", async () => {
      const { contract, holder1 } = await loadFixture(deployContractFixture);
      await contract.connect(holder1).registerAsHolder(holder1Name);

      const holders = await contract.listHolders();
      expect(holders).to.have.lengthOf(1);
    });
  });
});