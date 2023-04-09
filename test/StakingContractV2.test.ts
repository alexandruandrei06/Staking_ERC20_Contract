import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
    StakingContractV2__factory,
    LabToken__factory,
} from "../typechain-types";

describe("StakingContractV2", async () => {
    let LabTokenFactory: any;
    let LabTokenContract: any;

    let StakingContractV2Factory: any;
    let StakingContractV2Contract: any;

    let owner: any;
    let minter: any;
    let burner: any;
    let user1: any;
    let user2: any;
    let user3: any;

    before(async () => {
        [owner, minter, burner, user1, user2, user3] =
            await ethers.getSigners();

        LabTokenFactory = (await ethers.getContractFactory(
            "LabToken",
            owner
        )) as LabToken__factory;

        StakingContractV2Factory = (await ethers.getContractFactory(
            "StakingContractV2",
            owner
        )) as StakingContractV2__factory;
    });

    beforeEach(async () => {
        LabTokenContract = await LabTokenFactory.deploy("LabToken", "LABT");
        StakingContractV2Contract = await StakingContractV2Factory.deploy(
            LabTokenContract.address,
            ethers.utils.parseEther("100")
        );

        const MINTER_ROLE = await LabTokenContract.MINTER_ROLE();
        const BURNER_ROLE = await LabTokenContract.BURNER_ROLE();

        await LabTokenContract.connect(owner).grantRole(
            MINTER_ROLE,
            minter.address
        );

        await LabTokenContract.connect(owner).grantRole(
            MINTER_ROLE,
            StakingContractV2Contract.address
        );

        await LabTokenContract.connect(owner).grantRole(
            BURNER_ROLE,
            burner.address
        );

        await LabTokenContract.connect(minter).mint(
            user1.address,
            ethers.utils.parseEther("100")
        );
        await LabTokenContract.connect(minter).mint(
            user2.address,
            ethers.utils.parseEther("100")
        );
        await LabTokenContract.connect(minter).mint(
            user3.address,
            ethers.utils.parseEther("100")
        );

        await LabTokenContract.connect(user1).approve(
            StakingContractV2Contract.address,
            ethers.utils.parseEther("100")
        );

        await LabTokenContract.connect(user2).approve(
            StakingContractV2Contract.address,
            ethers.utils.parseEther("100")
        );

        await LabTokenContract.connect(user3).approve(
            StakingContractV2Contract.address,
            ethers.utils.parseEther("100")
        );
    });

    it("Testing constructor requirements", async () => {
        await expect(
            StakingContractV2Factory.deploy(
                ethers.constants.AddressZero,
                ethers.utils.parseEther("100")
            )
        ).to.be.revertedWith("Address zero is not a valid contract address");

        await expect(
            StakingContractV2Factory.deploy(
                LabTokenContract.address,
                ethers.utils.parseEther("0")
            )
        ).to.be.revertedWith("Daily reward must be grater than 0");
    });

    it("Token address must be set as LabToken address", async () => {
        expect(
            await StakingContractV2Contract.tokenContractAddress()
        ).to.be.equals(LabTokenContract.address);
    });

    it("Daily reward must be set correctly", async () => {
        expect(await StakingContractV2Contract.dailyReward()).to.be.equals(
            ethers.utils.parseEther("100")
        );
    });

    it("Testing set daily reward operation", async () => {
        const DEFAULT_ADMIN_ROLE =
            await StakingContractV2Contract.DEFAULT_ADMIN_ROLE();

        await expect(
            StakingContractV2Contract.connect(user1).setDailyReward(
                ethers.utils.parseEther("0")
            )
        ).to.be.revertedWith(
            "AccessControl: account " +
                user1.address.toLowerCase() +
                " is missing role " +
                DEFAULT_ADMIN_ROLE
        );

        await expect(
            StakingContractV2Contract.connect(owner).setDailyReward(
                ethers.utils.parseEther("0")
            )
        ).to.be.revertedWith("Daily reward must be grater than 0");

        await expect(
            StakingContractV2Contract.setDailyReward(
                ethers.utils.parseEther("10")
            )
        )
            .to.emit(StakingContractV2Contract, "SetDailyReward")
            .withArgs(ethers.utils.parseEther("10"));
    });

    /*  ========== Stake ========== */

    it("Testing stake operation requirements", async () => {
        await expect(
            StakingContractV2Contract.connect(user1).stake(
                ethers.utils.parseEther("0")
            )
        ).to.be.revertedWith("Staking amount must be positive.");

        await expect(
            StakingContractV2Contract.connect(user1).stake(
                ethers.utils.parseEther("110")
            )
        ).to.be.revertedWith("You must own the amount you want to stake");
    });

    it("Testing stake operation for a user when staking for the first time", async () => {
        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV2Contract.connect(user1).stake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV2Contract, "Stake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));
    });

    it("Testing stake operation for a user when staking for multiple time", async () => {
        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV2Contract.connect(user1).stake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV2Contract, "Stake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        await time.increase(3600);

        await StakingContractV2Contract.connect(user1).stake(
            ethers.utils.parseEther("50")
        );

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("0")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user1.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));
    });

    it("Testing stake operation for a multiple users when staking for first time", async () => {
        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV2Contract.connect(user1).stake(
                ethers.utils.parseEther("100")
            )
        )
            .to.emit(StakingContractV2Contract, "Stake")
            .withArgs(user1.address, ethers.utils.parseEther("100"));

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        await time.increase(60);

        expect(
            await StakingContractV2Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV2Contract.connect(user2).stake(
                ethers.utils.parseEther("100")
            )
        )
            .to.emit(StakingContractV2Contract, "Stake")
            .withArgs(user2.address, ethers.utils.parseEther("100"));

        expect(
            await StakingContractV2Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        await time.increase(60);

        expect(
            await StakingContractV2Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV2Contract.connect(user3).stake(
                ethers.utils.parseEther("100")
            )
        )
            .to.emit(StakingContractV2Contract, "Stake")
            .withArgs(user3.address, ethers.utils.parseEther("100"));

        expect(
            await StakingContractV2Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        expect(await StakingContractV2Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("300")
        );

        await StakingContractV2Contract.connect(user1).unstake(
            ethers.utils.parseEther("1")
        );

        await StakingContractV2Contract.connect(user2).unstake(
            ethers.utils.parseEther("1")
        );

        await StakingContractV2Contract.connect(user3).unstake(
            ethers.utils.parseEther("1")
        );

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user1.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user2.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user3.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));
    });

    it("Testing stake operation for a multiple users when staking for multiple times", async () => {
        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV2Contract.connect(user1).stake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV2Contract, "Stake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        await StakingContractV2Contract.connect(user1).stake(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        await time.increase(60);

        expect(
            await StakingContractV2Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV2Contract.connect(user2).stake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV2Contract, "Stake")
            .withArgs(user2.address, ethers.utils.parseEther("50"));

        expect(
            await StakingContractV2Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        await time.increase(60);

        expect(
            await StakingContractV2Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV2Contract.connect(user3).stake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV2Contract, "Stake")
            .withArgs(user3.address, ethers.utils.parseEther("50"));

        expect(
            await StakingContractV2Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        await StakingContractV2Contract.connect(user3).stake(
            ethers.utils.parseEther("25")
        );

        await StakingContractV2Contract.connect(user3).stake(
            ethers.utils.parseEther("25")
        );

        expect(await LabTokenContract.balanceOf(user3.address)).to.be.equal(
            ethers.utils.parseEther("0")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        await StakingContractV2Contract.connect(user2).stake(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        expect(await StakingContractV2Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("300")
        );

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user1.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user2.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user3.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));
    });

    /*  ========== Unstake ========== */

    it("Testing unstake operation requirements", async () => {
        await expect(
            StakingContractV2Contract.connect(user1).unstake(
                ethers.utils.parseEther("0")
            )
        ).to.be.revertedWith("Unstaking amount must be positive.");

        await expect(
            StakingContractV2Contract.connect(user1).unstake(
                ethers.utils.parseEther("110")
            )
        ).to.be.revertedWith("User must have staked the amount of tokens");
    });

    it("Testing unstake operation for a user when unstaking for the first time", async () => {
        await StakingContractV2Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV2Contract.connect(user1).unstake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV2Contract, "Unstake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user1.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV2Contract.connect(user1).unstake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV2Contract, "Unstake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("100")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV2Contract.getAcumulatedReward(user1.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV2Contract.connect(user1).unstake(
                ethers.utils.parseEther("50")
            )
        ).to.be.revertedWith("User must have staked the amount of tokens");
    });

    it("Testing unstake operation for multiple users when unstaking for the first time", async () => {
        await StakingContractV2Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV2Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV2Contract.connect(user3).stake(
            ethers.utils.parseEther("100")
        );

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("0")
        );

        expect(await LabTokenContract.balanceOf(user2.address)).to.be.equal(
            ethers.utils.parseEther("0")
        );

        expect(await LabTokenContract.balanceOf(user3.address)).to.be.equal(
            ethers.utils.parseEther("0")
        );
        await expect(
            StakingContractV2Contract.connect(user1).unstake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV2Contract, "Unstake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(await StakingContractV2Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("250")
        );

        await expect(
            StakingContractV2Contract.connect(user2).unstake(
                ethers.utils.parseEther("20")
            )
        )
            .to.emit(StakingContractV2Contract, "Unstake")
            .withArgs(user2.address, ethers.utils.parseEther("20"));

        expect(await LabTokenContract.balanceOf(user2.address)).to.be.equal(
            ethers.utils.parseEther("20")
        );

        expect(await StakingContractV2Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("230")
        );

        await expect(
            StakingContractV2Contract.connect(user3).unstake(
                ethers.utils.parseEther("60")
            )
        )
            .to.emit(StakingContractV2Contract, "Unstake")
            .withArgs(user3.address, ethers.utils.parseEther("60"));

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        expect(
            await StakingContractV2Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("80"));

        expect(
            await StakingContractV2Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("40"));

        expect(await StakingContractV2Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("170")
        );
    });

    it("Testing unstake operation for multiple users when unstaking for multiple time", async () => {
        await StakingContractV2Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV2Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV2Contract.connect(user3).stake(
            ethers.utils.parseEther("100")
        );

        await expect(
            StakingContractV2Contract.connect(user1).unstake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV2Contract, "Unstake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(await StakingContractV2Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("250")
        );

        await expect(
            StakingContractV2Contract.connect(user2).unstake(
                ethers.utils.parseEther("20")
            )
        )
            .to.emit(StakingContractV2Contract, "Unstake")
            .withArgs(user2.address, ethers.utils.parseEther("20"));

        expect(await LabTokenContract.balanceOf(user2.address)).to.be.equal(
            ethers.utils.parseEther("20")
        );

        expect(await StakingContractV2Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("230")
        );

        await expect(
            StakingContractV2Contract.connect(user1).unstake(
                ethers.utils.parseEther("20")
            )
        )
            .to.emit(StakingContractV2Contract, "Unstake")
            .withArgs(user1.address, ethers.utils.parseEther("20"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("70")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("30"));

        await expect(
            StakingContractV2Contract.connect(user3).unstake(
                ethers.utils.parseEther("60")
            )
        )
            .to.emit(StakingContractV2Contract, "Unstake")
            .withArgs(user3.address, ethers.utils.parseEther("60"));

        expect(await LabTokenContract.balanceOf(user3.address)).to.be.equal(
            ethers.utils.parseEther("60")
        );

        await expect(
            StakingContractV2Contract.connect(user2).unstake(
                ethers.utils.parseEther("20")
            )
        )
            .to.emit(StakingContractV2Contract, "Unstake")
            .withArgs(user2.address, ethers.utils.parseEther("20"));

        expect(await StakingContractV2Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("130")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("30"));

        expect(
            await StakingContractV2Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("60"));

        expect(
            await StakingContractV2Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("40"));
    });

    /*  ========== Restake ========== */

    it("Testing restake operation requirements", async () => {
        await expect(
            StakingContractV2Contract.connect(user1).restake()
        ).to.be.revertedWith("The rewards amount for restake must be positive");
    });

    it("Testing restake operation for one user", async () => {
        time.setNextBlockTimestamp(10000800000);
        await StakingContractV2Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("0")
        );

        time.setNextBlockTimestamp(10000800000 + 86400);

        await expect(StakingContractV2Contract.connect(user1).restake())
            .to.emit(StakingContractV2Contract, "Restake")
            .withArgs(user1.address, ethers.utils.parseEther("100"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("0")
        );

        expect(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("200"));

        expect(await StakingContractV2Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("200")
        );
    });

    it("Testing restake operation for multiple user", async () => {
        time.setNextBlockTimestamp(10000900000);
        await StakingContractV2Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV2Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10000900000 + 86400);

        await expect(
            StakingContractV2Contract.connect(user1).restake()
        ).to.emit(StakingContractV2Contract, "Restake");

        await expect(
            StakingContractV2Contract.connect(user2).restake()
        ).to.emit(StakingContractV2Contract, "Restake");

        let user1_stakedAmount = ethers.utils.formatEther(
            await StakingContractV2Contract.getStakeAmount(user1.address)
        );

        user1_stakedAmount = (+user1_stakedAmount).toFixed(2);

        expect(user1_stakedAmount).to.be.equal("150.00");

        let user2_stakedAmount = ethers.utils.formatEther(
            await StakingContractV2Contract.getStakeAmount(user2.address)
        );

        user2_stakedAmount = (+user2_stakedAmount).toFixed(2);

        expect(user2_stakedAmount).to.be.equal("150.00");

        let poolAmount = ethers.utils.formatEther(
            await StakingContractV2Contract.poolAmount()
        );

        poolAmount = (+poolAmount).toFixed(2);

        expect(poolAmount).to.be.equal("300.00");
    });

    /*  ========== Claim Rewards ========== */

    it("Testing claimRewards operation requirements", async () => {
        await expect(
            StakingContractV2Contract.connect(user1).claimRewards()
        ).to.be.revertedWith("The rewards amount must be positive");
    });

    it("Testing claimRewards operation for a user", async () => {
        time.setNextBlockTimestamp(10001000000);
        await StakingContractV2Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10001000000 + 86400);

        await expect(StakingContractV2Contract.connect(user1).claimRewards())
            .to.emit(StakingContractV2Contract, "ClaimRewards")
            .withArgs(user1.address, ethers.utils.parseEther("100"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("100")
        );

        let userBalance = ethers.utils.formatEther(
            await LabTokenContract.balanceOf(user1.address)
        );
        userBalance = (+userBalance).toFixed(3);
        expect(userBalance).to.be.equal("100.000");

        await StakingContractV2Contract.connect(user1).unstake(
            ethers.utils.parseEther("100")
        );

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("200")
        );

        userBalance = ethers.utils.formatEther(
            await LabTokenContract.balanceOf(user1.address)
        );
        userBalance = (+userBalance).toFixed(3);
        expect(userBalance).to.be.equal("200.000");
    });

    it("Testing claimRewards operation for multiple users", async () => {
        time.setNextBlockTimestamp(10001100000);
        await StakingContractV2Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV2Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10001100000 + 86400);

        await expect(
            StakingContractV2Contract.connect(user1).claimRewards()
        ).to.emit(StakingContractV2Contract, "ClaimRewards");

        time.setNextBlockTimestamp(10001100000 + 86401);

        await expect(
            StakingContractV2Contract.connect(user2).claimRewards()
        ).to.emit(StakingContractV2Contract, "ClaimRewards");

        let poolAmount = ethers.utils.formatEther(
            await StakingContractV2Contract.poolAmount()
        );

        poolAmount = (+poolAmount).toFixed(2);

        expect(await StakingContractV2Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("200")
        );

        expect(
            await LabTokenContract.balanceOf(user1.address)
        ).to.be.greaterThan(ethers.utils.parseEther("50"));

        let userBalance = ethers.utils.formatEther(
            await LabTokenContract.balanceOf(user2.address)
        );
        userBalance = (+userBalance).toFixed(4);
        expect(userBalance).to.be.equal("50.0000");
    });

    it("Testing claimRewards operation for multiple users + unstake", async () => {
        time.setNextBlockTimestamp(10001200000);
        await StakingContractV2Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV2Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10001200000 + 86400);

        await StakingContractV2Contract.connect(user1).unstake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV2Contract.connect(user2).unstake(
            ethers.utils.parseEther("100")
        );

        await expect(
            StakingContractV2Contract.connect(user1).claimRewards()
        ).to.emit(StakingContractV2Contract, "ClaimRewards");

        await expect(
            StakingContractV2Contract.connect(user2).claimRewards()
        ).to.emit(StakingContractV2Contract, "ClaimRewards");

        let poolAmount = ethers.utils.formatEther(
            await StakingContractV2Contract.poolAmount()
        );

        poolAmount = (+poolAmount).toFixed(2);

        expect(await StakingContractV2Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("0")
        );

        expect(
            await LabTokenContract.balanceOf(user1.address)
        ).to.be.greaterThan(ethers.utils.parseEther("150"));

        expect(
            await LabTokenContract.balanceOf(user2.address)
        ).to.be.greaterThan(ethers.utils.parseEther("150"));
    });

    /* 
        User1 -> stake 100 tokens 48h
        User2 -> stake 100 tokens in first 24h
        User3 -> stakes 100 tokens 12h every day
        ClaimReward every 24h
     */
    it("Complex Test", async () => {
        StakingContractV2Contract.connect(owner).setDailyReward(
            ethers.utils.parseEther("1200")
        );

        time.setNextBlockTimestamp(10001300000);
        await StakingContractV2Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV2Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV2Contract.connect(user3).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10001300000 + 43200);

        await StakingContractV2Contract.connect(user3).unstake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10001300000 + 86400);

        await StakingContractV2Contract.connect(user2).unstake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV2Contract.connect(user1).claimRewards();
        await StakingContractV2Contract.connect(user2).claimRewards();
        await StakingContractV2Contract.connect(user3).claimRewards();

        let userBalance = ethers.utils.formatEther(
            await LabTokenContract.balanceOf(user1.address)
        );
        userBalance = (+userBalance).toFixed(1);
        expect(userBalance).to.be.equal("500.0");

        userBalance = ethers.utils.formatEther(
            await LabTokenContract.balanceOf(user2.address)
        );
        userBalance = (+userBalance).toFixed(1);
        expect(userBalance).to.be.equal("600.0");

        userBalance = ethers.utils.formatEther(
            await LabTokenContract.balanceOf(user3.address)
        );
        userBalance = (+userBalance).toFixed(1);
        expect(userBalance).to.be.equal("300.0");

        await LabTokenContract.connect(user3).approve(
            StakingContractV2Contract.address,
            ethers.utils.parseEther("100")
        );
        await StakingContractV2Contract.connect(user3).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10001300000 + 129600);

        await StakingContractV2Contract.connect(user3).unstake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10001300000 + 86400 * 2);

        await StakingContractV2Contract.connect(user1).claimRewards();
        await expect(
            StakingContractV2Contract.connect(user2).claimRewards()
        ).to.be.revertedWith("The rewards amount must be positive");
        await StakingContractV2Contract.connect(user3).claimRewards();

        userBalance = ethers.utils.formatEther(
            await LabTokenContract.balanceOf(user1.address)
        );
        userBalance = (+userBalance).toFixed(1);
        expect(userBalance).to.be.equal("1400.0");

        userBalance = ethers.utils.formatEther(
            await LabTokenContract.balanceOf(user2.address)
        );
        userBalance = (+userBalance).toFixed(1);
        expect(userBalance).to.be.equal("600.0");

        userBalance = ethers.utils.formatEther(
            await LabTokenContract.balanceOf(user3.address)
        );
        userBalance = (+userBalance).toFixed(1);
        expect(userBalance).to.be.equal("600.0");
    });
});
