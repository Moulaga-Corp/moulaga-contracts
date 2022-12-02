// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MoulagaProtocol is ERC721 {
  constructor() ERC721("MoulagaSBT", "MSBT") {
  }

  struct token {
    uint tokendId;
    address feeder;
    address holder;
    address consumer;
    mapping(uint => string[]) scope; // scheme name
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
  mapping(address => mapping(address => bool)) private _feederIsOnboardedAt;

  mapping(address => uint) SBTCount;
  mapping(uint => address) public consumerSBTToFeeder;

  function registerAsFeeder() external {
    require(!isFeeder[msg.sender], "Already registered as feeder.");

    isFeeder[msg.sender] = true;
    emit NewFeeder(msg.sender);
  }

  function registerAsHolder(string memory name_) external {
    Holder memory holder = addressToHolder[msg.sender];
    require(
      holder.wallet == address(0) 
        || bytes(holder.name).length == 0,
      "Already registered as holder."
    );

    addressToHolder[msg.sender] = Holder({
      wallet: msg.sender,
      name: name_
    });
    emit NewHolder(msg.sender);
  }

  function onboardFeeder(address feeder_) external mustBeFeeder(feeder_) mustBeHolder(msg.sender) {
    require(!_feederIsOnboardedAt[feeder_][msg.sender], "Feeder already onboarded.");
    
    _feederIsOnboardedAt[feeder_][msg.sender] = true;
    _feederToHolders[feeder_].push(
      addressToHolder[msg.sender]
    );
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

      function balanceOf(address _owner) override public view returns (uint256 _balance) {
        return SBTCount[_owner];
    }

    function ownerOf(uint256 _tokenId) override public view returns (address _owner) {
        return consumerSBTToFeeder[_tokenId];
    }
    
    function _transfer(address _from, address _to, uint256 _tokenId) private {
        SBTCount[_to]++;
        SBTCount[_from]--;
        consumerSBTToFeeder[_tokenId] = _to;
        Transfer(_from, _to, _tokenId);
    }

    function transfer(address _to, uint256 _tokenId) public mustBeFeeder(msg.sender) {
        
    }

    function approve(address _to, uint256 _tokenId) override public {

    }

    function takeOwnership(uint256 _tokenId) public {

    }

}