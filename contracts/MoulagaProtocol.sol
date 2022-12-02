// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MoulagaProtocol is ERC721 {
  using Counters for Counters.Counter;

  constructor() ERC721("MoulagaSBT", "MSBT") {
  }

  struct Holder {
    address wallet;
    string name;
  }

  // recommended schemeName-<version number>
  struct Scheme { 
    string name;
    string signature;
  }

  // SBT Structure containing all the concerned parties and the type of data
  struct MoulagaSBT {
    uint tokenId;
    address feeder;
    address holder;
    address consumer;
    //mapping(uint => string[]) scope; // scheme name
    string[] schemeNames;
  }

  event NewFeeder(address feeder);
  event NewHolder(address holder);
  event FeederOnboarded(address feeder, address holder);
  event NewScheme(address holder, string name);
  event Mint(uint tokenId);
  event Burn(uint tokenId);

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

  Counters.Counter private _tokenIdCounter;
  // A feeder can have 1 token per consumer for 1 designed holder
  mapping(address => mapping(address => mapping(address => MoulagaSBT))) private _feederToHolderToConsumerSBT;
  mapping(uint => MoulagaSBT) private moulagaSBTs;

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

  function safeMint(address consumer_, address holder_, string[] memory schemeNames) public mustBeFeeder(msg.sender) {
    require(_feederToHolderToConsumerSBT[msg.sender][holder_][consumer_].tokenId != 0,
              "MoulagaSBT already exists for the designed feeder, consumer and holder.");

    uint256 tokenId = _tokenIdCounter.current();
    _tokenIdCounter.increment();

    MoulagaSBT memory moulagaSBT = MoulagaSBT({
      tokenId: tokenId,
      feeder: msg.sender,
      holder: holder_,
      consumer: consumer_,
      schemeNames: schemeNames
    });

    _feederToHolderToConsumerSBT[msg.sender][holder_][consumer_] = moulagaSBT; 
    moulagaSBTs[tokenId];

    _safeMint(msg.sender, tokenId);
    emit Mint(tokenId);
      
  }

  function burn(uint256 tokenId) public mustBeFeeder(msg.sender) {
      MoulagaSBT memory moulagaSBT = moulagaSBTs[tokenId];

      require(moulagaSBT.feeder == msg.sender, "Only the feeder of this token can burn it.");

      delete _feederToHolderToConsumerSBT[moulagaSBT.feeder][moulagaSBT.holder][moulagaSBT.consumer];
      delete moulagaSBTs[tokenId];

      _burn(tokenId);
      emit Burn(tokenId);
  }

   function getMoulagaSBT(address feeder_, address holder_,  address consumer_) external view returns (MoulagaSBT memory) {
        return _feederToHolderToConsumerSBT[feeder_][holder_][consumer_];
  }

  function _beforeTokenTransfer(address from, address to, uint256 tokenId) pure external {
        require(from != address(0) || to != address(0) || tokenId != 0, 
        "This a Soulbound token. It cannot be transferred. It can only be burned by the token feeder.");
    }
}