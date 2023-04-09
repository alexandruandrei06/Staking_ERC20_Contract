# Staking Contract for ERC20 token

### Author: [Alexandru Andrei-Bogdan](https://github.com/alexandruandrei06)

# Description

This project is for Softbinator Labs.

The purpose of the project is to implement a smart contract for staking ERC20 token.

Minimum functionalities:

-   STAKE
-   UNSTAKE
-   CLAIM REWARD
-   RESTAKE

We have a fixed reward per day. The reward of a user per day is calculated as a percentage of the amount he has staked at the stake pool compared to the total amount of the stake pool.

# ERC20 Token

-   For ERC20 implementation i used the ERC20 contract from [OpenZeppelin](https://docs.openzeppelin.com/contracts/4.x/erc20) using AccessControl with 3 roles: MINTER, BURNER AND DEFAULT_ADMIN_ROLE.

# Staking Contract

## Staking Contract v1:

-   For this implementation, at deploy time you must set the address for the token contract, and a daily reward. The daily reward can be updated by the contract owner.

-   After deploy, in token contract, you must grant MINTER_ROLE for the staking contract.

-   For staking rewards, the contract mint new token to staker address

-   Before staking tokens, user must approve the contract to transfer that tokens to contract address

-   User can stake/unstake/restake/claimRewards whenever he wants .

-   For the reward to be correctly calculated relative to the stake amount, pool size and the total stake time, every time a user changes the state of the contract (stake/unstake/restake), the reward for every users is calculated and added to pendingAmount.

-   To calculate the reward for every staker, i made a kind of iterable mapping by storing the addresses of the stakers in a mapping

:bangbang: This implementation works only if the number of users is not very big, because is the number of users is too big, the transaction will remain without gas or will be to expensive. For this reason, this implementation is not recommended to be used. :bangbang:

## Staking Contract v2:

-   For this implementation i used a very smart formula for calculating the reward. I found this formula in this [tutorial](https://www.youtube.com/watch?v=iNZWMj4USUM).
    I recommend watching this tutorial because it explains very clearly how the reward is calculated.

-   Basically, in this version the reward is no longer calculated for each user, it is calculated only for the user who interacts with the contract.

-   In this version, the transaction cannot run out of gas, regardless of the number of users who stake tokens.

-   For the interaction with the ERC20 token, the same model as version v1 remained.

## ERC20 Interaction:

-   Another option to implement this staking contract is to mint all tokens for rewards and transfer them to staking contract address. The staking contract only has to send the rewards to the staker, without having to mint them.
