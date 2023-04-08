// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./LabToken.sol";


struct Staker {
    uint stakerId;
    uint256 stakeAmount;
    uint lastClaimReward;
    uint acumulatedReward;
}

contract StakingContractV1 is AccessControl{

    /* ========== STATE VARIABLES ========== */
    address public tokenContractAddress;
    LabToken public tokenContract;

    // Daily reward token amount
    uint256 public dailyReward;

    // Reward per second
    uint256 public reward_per_seconds;

    // Total amount of staked token
    uint256 public poolAmount;

    // Mapping staker address to Staker struct
    mapping(address => Staker) public stakers;

    // Array of stakers addresses
    address[] internal stakersAddresses;

    /* ========== EVENTS ========== */
    event SetDailyReward(uint256 dailyReward);
    event Stake(address stakerAddress, uint amount);
    event Unstake(address stakerAddress, uint amount);
    event Restake(address stakerAddress, uint amount);
    event ClaimRewards(address stakerAddress, uint amount);

    /* ========== CONSTRUCTOR ========== */

    constructor(address _tokenContractAddress, uint256 _dailyReward) {
        require(_tokenContractAddress != address(0), "Address zero is not a valid contract address");
        require(_dailyReward > 0, "Daily reward must be grater than 0");

        tokenContractAddress = _tokenContractAddress;
        tokenContract = LabToken(tokenContractAddress);
        dailyReward = _dailyReward;
        reward_per_seconds = dailyReward / 1 days;
        poolAmount = 0;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setDailyReward(uint256 _newDailyReward) external onlyRole(DEFAULT_ADMIN_ROLE){
        require(_newDailyReward > 0, "Daily reward must be grater than 0");
        dailyReward = _newDailyReward;
        reward_per_seconds = dailyReward / 1 days;
        emit SetDailyReward(dailyReward);
    }

    /*  ========== ITERABLE MAPPING ========== */
    
    function add(address _stakerAddress) internal{
        Staker storage staker =  stakers[_stakerAddress];
        if(staker.stakerId > 0){
            //Element already exist
            return;
        }else{
            stakersAddresses.push(_stakerAddress);
            staker.stakerId = stakersAddresses.length;
        }
    }
    
    function remove(address _stakerAddress) internal{
        Staker storage staker =  stakers[_stakerAddress];

        if(staker.stakerId > 0 && staker.stakerId < stakersAddresses.length){
            stakersAddresses[staker.stakerId] = stakersAddresses[stakersAddresses.length - 1];
            stakersAddresses.pop();
        }

        delete stakers[_stakerAddress];
    }

    /*  ========== Staking Functionalities ========== */

    function addRewards() internal{
        for(uint i = 0; i < stakersAddresses.length; ++i){
            Staker storage staker =  stakers[stakersAddresses[i]];
            uint stakingTime = block.timestamp - staker.lastClaimReward;
            staker.lastClaimReward = block.timestamp;
            staker.acumulatedReward += (dailyReward * stakingTime * staker.stakeAmount) / (poolAmount * 1 days);
        }
    }

    function stake(uint _amount) external{
        require(_amount > 0, "Staking amount must be positive.");
        require(_amount <= tokenContract.balanceOf(msg.sender), "You must own the amount you want to stake");
        addRewards();

        Staker storage staker = stakers[msg.sender];
        staker.stakeAmount += _amount;
        staker.lastClaimReward = block.timestamp;
        add(msg.sender);

        poolAmount += _amount;

        tokenContract.transferFrom(msg.sender, address(this), _amount);
        emit Stake(msg.sender, _amount);
    }

    function unstake(uint _amount) external{
        require(_amount > 0, "Unstaking amount must be positive.");

        Staker storage staker = stakers[msg.sender];
        require(staker.stakeAmount >= _amount, "User must have staked the amount of tokens");
        
        addRewards();

        staker.stakeAmount -= _amount;
        staker.lastClaimReward = block.timestamp;

        poolAmount -= _amount;

        tokenContract.transfer(msg.sender, _amount);
        emit Unstake(msg.sender, _amount);
    }

    function claimRewards() external{
        Staker storage staker = stakers[msg.sender];

        uint stakingTime = block.timestamp - staker.lastClaimReward;
        staker.lastClaimReward = block.timestamp;
        if(poolAmount > 0){
            staker.acumulatedReward += (dailyReward * stakingTime * staker.stakeAmount) / (poolAmount * 1 days);
        }
        

        require(staker.acumulatedReward > 0, "The rewards amount must be positive");
        uint acumulatedReward = staker.acumulatedReward;
        staker.acumulatedReward = 0;
        if(staker.stakeAmount == 0){
            remove(msg.sender);
        }

        tokenContract.mint(msg.sender, acumulatedReward);

        emit ClaimRewards(msg.sender, acumulatedReward);
    }

    function restake() external{
        Staker storage staker = stakers[msg.sender];

        addRewards();

        require(staker.acumulatedReward > 0, "The rewards amount for restake must be positive");
        uint acumulatedReward = staker.acumulatedReward;
        staker.acumulatedReward = 0;
        staker.stakeAmount += acumulatedReward;
        poolAmount += acumulatedReward;


        tokenContract.mint(address(this), acumulatedReward);

        emit Restake(msg.sender, acumulatedReward);
    }

    /*  ========== GETTERS ========== */

    function getStakeAmount(address _staker) public view returns (uint){
        return stakers[_staker].stakeAmount;
    }

    function getAcumulatedReward(address _staker) public view returns (uint){
        return stakers[_staker].acumulatedReward;
    }
}