// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract MoulagaUtils {
	struct Holder {
    address wallet;
    string name;
  }

  mapping(address => Holder) internal addressToHolder;
  mapping(address => bool) public isHolder;
	mapping(address => bool) public isFeeder;

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
}