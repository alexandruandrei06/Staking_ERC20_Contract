// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./LabToken.sol";


struct Staker {
    uint256 stakeAmount;
    uint lastRewardPerTokenPaid;
    uint acumulatedReward;
}

contract StakingContractV2 is AccessControl{

    /* ========== STATE VARIABLES ========== */
    address public tokenContractAddress;
    LabToken public tokenContract;

    // Daily reward token amount
    uint256 public dailyReward;

    // Total amount of staked token
    uint256 public poolAmount;

    // Mapping staker address to Staker struct
    mapping(address => Staker) public stakers;

    // Array of stakers addresses
    address[] internal stakersAddresses;

    // Timestamp of the last operation (stake/unstake/restake/ClaimRewards)
    uint public lastUpdateTime;

    // Reward per token calculated until most recently action
    uint public rewardPerToken;

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
        poolAmount = 0;
        lastUpdateTime = block.timestamp;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setDailyReward(uint256 _newDailyReward) external onlyRole(DEFAULT_ADMIN_ROLE){
        require(_newDailyReward > 0, "Daily reward must be grater than 0");
        dailyReward = _newDailyReward;
        emit SetDailyReward(dailyReward);
    }

    /*  ========== Staking Functionalities ========== */

    function calculateRewardPerToken() internal{
        if(poolAmount == 0)
            return;
        else
            rewardPerToken +=   10**18 * dailyReward * (block.timestamp - lastUpdateTime) / (poolAmount * 1 days);
    }

    function addRewards(address _staker) internal{
        Staker storage staker = stakers[_staker];
        staker.acumulatedReward += staker.stakeAmount * (rewardPerToken - staker.lastRewardPerTokenPaid) /  10**18;
    }

    function stake(uint _amount) external{
        require(_amount > 0, "Staking amount must be positive.");
        require(_amount <= tokenContract.balanceOf(msg.sender), "You must own the amount you want to stake");
        
        calculateRewardPerToken();
        addRewards(msg.sender);

        Staker storage staker = stakers[msg.sender];
        staker.lastRewardPerTokenPaid = rewardPerToken;

        lastUpdateTime = block.timestamp;

        staker.stakeAmount += _amount;
        poolAmount += _amount;

        tokenContract.transferFrom(msg.sender, address(this), _amount);
        emit Stake(msg.sender, _amount);
    }

    function unstake(uint _amount) external{
        require(_amount > 0, "Unstaking amount must be positive.");

        Staker storage staker = stakers[msg.sender];
        require(staker.stakeAmount >= _amount, "User must have staked the amount of tokens");
        
        calculateRewardPerToken();
        addRewards(msg.sender);

        staker.lastRewardPerTokenPaid = rewardPerToken;

        lastUpdateTime = block.timestamp;

        staker.stakeAmount -= _amount;
        poolAmount -= _amount;

        tokenContract.transfer(msg.sender, _amount);
        emit Unstake(msg.sender, _amount);
    }

    function claimRewards() external{
        Staker storage staker = stakers[msg.sender];

        calculateRewardPerToken();
        addRewards(msg.sender);
        staker.lastRewardPerTokenPaid = rewardPerToken;

        lastUpdateTime = block.timestamp;

        require(staker.acumulatedReward > 0, "The rewards amount must be positive");
        uint acumulatedReward = staker.acumulatedReward;
        staker.acumulatedReward = 0;
        
        tokenContract.mint(msg.sender, acumulatedReward);

        emit ClaimRewards(msg.sender, acumulatedReward);
    }

    function restake() external{
        Staker storage staker = stakers[msg.sender];

        calculateRewardPerToken();
        addRewards(msg.sender);
        staker.lastRewardPerTokenPaid = rewardPerToken;

        lastUpdateTime = block.timestamp;
        
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