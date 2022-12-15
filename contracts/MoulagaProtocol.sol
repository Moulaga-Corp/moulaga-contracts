// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./MoulagaUtils.sol";

contract MoulagaProtocol is MoulagaUtils {
  event NewFeeder(address feeder);
  event NewHolder(address holder);
  event FeederOnboarded(address feeder, address holder);
  event NewScheme(address holder, string name);

  mapping(address => Scheme[]) private holderToSchemes;
  mapping(address => mapping(string => bool)) public holderHasScheme;
  mapping(address => Holder[]) private feederToHolders;

  // onboarding
  mapping(address => mapping(address => string)) private feederToHolderKey;
  mapping(address => mapping(address => string)) private holderToFeederKey;

  function registerAsFeeder() external {
    require(!isFeeder[msg.sender], "Already registered as feeder.");

    isFeeder[msg.sender] = true;
    emit NewFeeder(msg.sender);
  }

  function registerAsHolder(string memory name_) external {
    require(!isHolder[msg.sender], "Already registered as holder.");

    addressToHolder[msg.sender] = Holder({
      wallet: msg.sender,
      name: name_
    });
    isHolder[msg.sender] = true;

    emit NewHolder(msg.sender);
  }

  function onboardFeeder(address feeder_, string memory keyForFeeder_, string memory keyForHolder_) external mustBeFeeder(feeder_) mustBeHolder(msg.sender) {
    require(bytes(feederToHolderKey[feeder_][msg.sender]).length == 0, "Feeder already onboarded.");
    require(bytes(holderToFeederKey[msg.sender][feeder_]).length == 0, "Feeder already onboarded.");
    
    feederToHolderKey[feeder_][msg.sender] = keyForFeeder_;
    holderToFeederKey[msg.sender][feeder_] = keyForHolder_;
    feederToHolders[feeder_].push(addressToHolder[msg.sender]);

    emit FeederOnboarded(feeder_, msg.sender);
  }

  function addScheme(string memory name_, string memory signature_) external mustBeHolder(msg.sender) {
    require(bytes(name_).length > 0, "Must provide a name.");
    require(!holderHasScheme[msg.sender][name_], "Scheme already registered.");

    holderHasScheme[msg.sender][name_] = true;
    holderToSchemes[msg.sender].push(Scheme({
      name: name_,
      signature: signature_
    }));

    emit NewScheme(msg.sender, name_);
  }

  function getHoldersFromFeeder(address feeder_) external view mustBeFeeder(feeder_) returns (Holder[] memory) {
    return feederToHolders[feeder_];
  }

  function getSchemesFromHolder(address holder_) external view mustBeHolder(holder_) returns (Scheme[] memory) {
    return holderToSchemes[holder_];
  }
}