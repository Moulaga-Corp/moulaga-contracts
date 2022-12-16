// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./MoulagaUtils.sol";

interface Protocol {
  function isFeeder(address _feeder) external view returns(bool);
  function isHolder(address _holder) external view returns(bool);
  function hasScope(address _holder, string memory _scope) external view returns(bool);
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
	mapping(uint => string[]) private scopesFor;
	// A feeder can have 1 token per consumer for 1 designated holder
  mapping(address => mapping(address => mapping(address => SBT))) private feederToHolderToConsumerSBT;
  mapping(uint => SBT) private moulagaSBTs;

  constructor(address _protocolAddress) ERC721("MoulagaSBT", "MSBT") {
    // start at 1
    protocol = Protocol(_protocolAddress);
    tokenIdCounter.increment();
  }

	function safeMint(address _consumer, address _holder, string[] memory _schemes) public {
    require(protocol.isFeeder(msg.sender), "Must be feeder.");
    require(protocol.isHolder(_holder), "Must be holder.");
    require(
      feederToHolderToConsumerSBT[msg.sender][_holder][_consumer].tokenId == 0,
      "MoulagaSBT already exists for the designated feeder, consumer and holder."
    );
    require(verifySchemes(_holder, _schemes), "One or more schemes do not exist.");

    uint256 tokenId = tokenIdCounter.current();
    tokenIdCounter.increment();

    SBT memory moulagaSBT = SBT({
      tokenId: tokenId,
      feeder: msg.sender,
      holder: _holder,
      consumer: _consumer
    });
    scopesFor[tokenId] = _schemes;

    feederToHolderToConsumerSBT[msg.sender][_holder][_consumer] = moulagaSBT; 
    moulagaSBTs[tokenId] = moulagaSBT;

    _safeMint(_consumer, tokenId);
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

  /**
   * @notice method for holder to check wether a consumer has access to a feeder's data
   * @param _feeder address of the feeder
   * @param _consumer address of the consumer
   * @param _schemeName name of the scheme requested by a consumer
   * @return check true if consumer is authorized, false otherwise
   */
  function isAuthorized(address _feeder, address _consumer, string calldata _schemeName) external view returns(bool) {
    require(
      protocol.isFeeder(_feeder) && protocol.isHolder(msg.sender), 
      "There is no SBT for the given feeder, holder and consumer."
    );
    SBT storage moulagaSBT = feederToHolderToConsumerSBT[_feeder][msg.sender][_consumer];

    for(uint256 i = 0; i < scopesFor[moulagaSBT.tokenId].length; i++) {
      if(keccak256(bytes(scopesFor[moulagaSBT.tokenId][i])) == keccak256(bytes(_schemeName))) {
        return true;
      }
    }
    return false;
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

  function verifySchemes(address _holder, string[] memory _scopes) private view returns (bool) {
    for (uint i = 0; i < _scopes.length; i++) {
      if (!protocol.hasScope(_holder, _scopes[i])) {
        return false;
      }
    }
    return true;
  }
}