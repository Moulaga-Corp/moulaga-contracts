// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract MoulagaProtocol {
  struct Holder {
    address wallet;
    string name;
  }

  // recommended schemeName-<version number>
  struct Scheme { 
    string name;
    string signature;
  }

  event NewFeeder(address feeder);
  event NewHolder(address holder);
  event FeederOnboarded(address feeder, address holder);
  event NewScheme(address holder, string name);

  modifier mustBeFeeder(address feeder_) {
    require(isFeeder[feeder_], "Must be a feeder.");
    _;
  }

  modifier mustBeHolder(address holder_) {
    Holder memory holder = addressToHolder[holder_];
    require(
      holder.wallet != address(0) 
        && bytes(holder.name).length != 0, 
      "Must be a holder."
    );
    _;
  }

  mapping(address => Scheme[]) private _holderToSchemes;
  mapping(address => Holder) public addressToHolder;
  mapping(address => mapping(string => bool)) private _holderHasScheme;

  mapping(address => bool) public isFeeder;
  mapping(address => Holder[]) private _feederToHolders;

  // onboarding
  mapping(address => mapping(address => string)) private _feederToHolderKey;
  mapping(address => mapping(address => string)) private _holderToFeederKey;

  function registerAsFeeder() external {
    require(!isFeeder[msg.sender], "Already registered as feeder.");

    isFeeder[msg.sender] = true;
    
    emit NewFeeder(msg.sender);
  }

  function registerAsHolder(string memory name_) external {
    Holder memory holder = addressToHolder[msg.sender];
    require(
      holder.wallet == address(0) || bytes(holder.name).length == 0,
      "Already registered as holder."
    );

    addressToHolder[msg.sender] = Holder({
      wallet: msg.sender,
      name: name_
    });

    emit NewHolder(msg.sender);
  }

  function onboardFeeder(address feeder_, string memory keyForFeeder_, string memory keyForHolder_) external mustBeFeeder(feeder_) mustBeHolder(msg.sender) {
    require(bytes(_feederToHolderKey[feeder_][msg.sender]).length == 0, "Feeder already onboarded.");
    require(bytes(_holderToFeederKey[msg.sender][feeder_]).length == 0, "Feeder already onboarded.");
    
    _feederToHolderKey[feeder_][msg.sender] = keyForFeeder_;
    _holderToFeederKey[msg.sender][feeder_] = keyForHolder_;
    _feederToHolders[feeder_].push(addressToHolder[msg.sender]);

    emit FeederOnboarded(feeder_, msg.sender);
  }

  function addScheme(string memory name_, string memory signature_) external mustBeHolder(msg.sender) {
    require(bytes(name_).length > 0, "Must provide a name.");
    require(!_holderHasScheme[msg.sender][name_], "Scheme already registered.");

    _holderHasScheme[msg.sender][name_] = true;
    _holderToSchemes[msg.sender].push(Scheme({
      name: name_,
      signature: signature_
    }));

    emit NewScheme(msg.sender, name_);
  }

  function getHoldersFromFeeder(address feeder_) external view mustBeFeeder(feeder_) returns (Holder[] memory) {
    return _feederToHolders[feeder_];
  }

  function getSchemesFromHolder(address holder_) external view mustBeHolder(holder_) returns (Scheme[] memory) {
    return _holderToSchemes[holder_];
  }
}