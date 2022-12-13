// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./MoulagaUtils.sol";

interface Protocol {
  function isFeeder(address _feeder) external view returns(bool);
  function isHolder(address _holder) external view returns(bool);
}

contract MoulagaSBT is ERC721 {
	using Counters for Counters.Counter;

	// SBT Structure containing all the concerned parties and the type of data
  struct SBT {
    uint tokenId;
    address feeder;
    address holder;
    address consumer;
  }

	event Mint(uint tokenId);
  event Burn(uint tokenId);

  Protocol private protocol;
	Counters.Counter private tokenIdCounter;
	mapping(uint => string[]) private schemeNamesFor;
	// A feeder can have 1 token per consumer for 1 designed holder
  mapping(address => mapping(address => mapping(address => SBT))) private feederToHolderToConsumerSBT;
  mapping(uint => SBT) private moulagaSBTs;

  constructor(address _protocolAddress) ERC721("MoulagaSBT", "MSBT") {
    // start at 1
    protocol = Protocol(_protocolAddress);
    tokenIdCounter.increment();
  }

	function safeMint(address consumer_, address holder_, string[] memory schemes) public {
    require(protocol.isFeeder(msg.sender), "Must be feeder.");
    require(
      feederToHolderToConsumerSBT[msg.sender][holder_][consumer_].tokenId == 0,
      "MoulagaSBT already exists for the designed feeder, consumer and holder."
    );

    uint256 tokenId = tokenIdCounter.current();
    tokenIdCounter.increment();

    SBT memory moulagaSBT = SBT({
      tokenId: tokenId,
      feeder: msg.sender,
      holder: holder_,
      consumer: consumer_
    });
    schemeNamesFor[tokenId] = schemes;

    feederToHolderToConsumerSBT[msg.sender][holder_][consumer_] = moulagaSBT; 
    moulagaSBTs[tokenId] = moulagaSBT;

    _safeMint(consumer_, tokenId);
    emit Mint(tokenId);
  }

  function burn(uint256 tokenId) public {
    require(protocol.isFeeder(msg.sender), "Must be feeder.");
    SBT memory moulagaSBT = moulagaSBTs[tokenId];
    require(moulagaSBT.feeder == msg.sender, "Only the feeder of this token can burn it.");

    delete feederToHolderToConsumerSBT[moulagaSBT.feeder][moulagaSBT.holder][moulagaSBT.consumer];
    delete moulagaSBTs[tokenId];

    _burn(tokenId);
    emit Burn(tokenId);
  }

   function getMoulagaSBT(address feeder_, address holder_,  address consumer_) external view returns (SBT memory) {
    return feederToHolderToConsumerSBT[feeder_][holder_][consumer_];
  }

  function _beforeTokenTransfer(
      address from,
      address to,
      uint256 firstTokenId,
      uint256 batchSize
  ) internal virtual override {
    require(
      from == address(0) || to == address(0),
      "This a Soulbound token. It cannot be transferred. It can only be burned by the token feeder."
    );
    super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
  }
}