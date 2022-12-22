// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./MoulagaUtils.sol";

contract MoulagaProtocol is MoulagaUtils {

  event NewFeeder(address feeder);
  event NewHolder(address holder);
  event FeederOnboarded(address feeder, address holder);
  event NewScheme(address holder, string name);

  Holder[] private holders;
  mapping(address => string[]) private holderToScopes;
  mapping(address => mapping(string => bool)) private holderHasScope;
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

    Holder memory holder = Holder({
      wallet: msg.sender,
      name: name_
    });
    addressToHolder[msg.sender] = holder;
    holders.push(holder);
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

  function addScope(string memory _name) external mustBeHolder(msg.sender) {
    require(bytes(_name).length > 0, "Must provide a name.");
    require(!holderHasScope[msg.sender][_name], "Scope already registered.");

    holderHasScope[msg.sender][_name] = true;
    holderToScopes[msg.sender].push(_name);

    emit NewScheme(msg.sender, _name);
  }

  function listHolders() external view returns (Holder[] memory) {
    return holders;
  }

  function getHoldersFromFeeder(address feeder_) external view mustBeFeeder(feeder_) returns (Holder[] memory) {
    return feederToHolders[feeder_];
  }

  function getScopesFromHolder(address holder_) external view mustBeHolder(holder_) returns (string[] memory) {
    return holderToScopes[holder_];
  }

  function getFeederKeyForHolder(address _holder) external view mustBeFeeder(msg.sender) mustBeHolder(_holder) returns (string memory) {
    string memory key = feederToHolderKey[msg.sender][_holder];
    require(bytes(key).length > 0, "Not registered at holder.");
    return key;
  }

  function getHolderKeyForFeeder(address _feeder) external view mustBeFeeder(_feeder) mustBeHolder(msg.sender) returns (string memory) {
    string memory key = holderToFeederKey[msg.sender][_feeder];
    require(bytes(key).length > 0, "Feeder not onboarded.");
    return key;
  }

  function hasScope(address _holder, string memory _scope) external view returns (bool) {
    require(isHolder[_holder], "Not a holder.");
    return holderHasScope[_holder][_scope];
  }
}