import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
    StakingContractV1__factory,
    LabToken__factory,
} from "../typechain-types";

describe("StakingContractV1", async () => {
    let LabTokenFactory: any;
    let LabTokenContract: any;

    let StakingContractV1Factory: any;
    let StakingContractV1Contract: any;

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

        StakingContractV1Factory = (await ethers.getContractFactory(
            "StakingContractV1",
            owner
        )) as StakingContractV1__factory;
    });

    beforeEach(async () => {
        LabTokenContract = await LabTokenFactory.deploy("LabToken", "LABT");
        StakingContractV1Contract = await StakingContractV1Factory.deploy(
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
            StakingContractV1Contract.address
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
            StakingContractV1Contract.address,
            ethers.utils.parseEther("100")
        );

        await LabTokenContract.connect(user2).approve(
            StakingContractV1Contract.address,
            ethers.utils.parseEther("100")
        );

        await LabTokenContract.connect(user3).approve(
            StakingContractV1Contract.address,
            ethers.utils.parseEther("100")
        );
    });

    it("Testing constructor requirements", async () => {
        await expect(
            StakingContractV1Factory.deploy(
                ethers.constants.AddressZero,
                ethers.utils.parseEther("100")
            )
        ).to.be.revertedWith("Address zero is not a valid contract address");

        await expect(
            StakingContractV1Factory.deploy(
                LabTokenContract.address,
                ethers.utils.parseEther("0")
            )
        ).to.be.revertedWith("Daily reward must be grater than 0");
    });

    it("Token address must be set as LabToken address", async () => {
        expect(
            await StakingContractV1Contract.tokenContractAddress()
        ).to.be.equals(LabTokenContract.address);
    });

    it("Daily reward must be set correctly", async () => {
        expect(await StakingContractV1Contract.dailyReward()).to.be.equals(
            ethers.utils.parseEther("100")
        );
    });

    it("Testing set daily reward operation", async () => {
        const DEFAULT_ADMIN_ROLE =
            await StakingContractV1Contract.DEFAULT_ADMIN_ROLE();

        await expect(
            StakingContractV1Contract.connect(user1).setDailyReward(
                ethers.utils.parseEther("0")
            )
        ).to.be.revertedWith(
            "AccessControl: account " +
                user1.address.toLowerCase() +
                " is missing role " +
                DEFAULT_ADMIN_ROLE
        );

        await expect(
            StakingContractV1Contract.connect(owner).setDailyReward(
                ethers.utils.parseEther("0")
            )
        ).to.be.revertedWith("Daily reward must be grater than 0");

        await expect(
            StakingContractV1Contract.setDailyReward(
                ethers.utils.parseEther("10")
            )
        )
            .to.emit(StakingContractV1Contract, "SetDailyReward")
            .withArgs(ethers.utils.parseEther("10"));
    });

    /*  ========== Stake ========== */

    it("Testing stake operation requirements", async () => {
        await expect(
            StakingContractV1Contract.connect(user1).stake(
                ethers.utils.parseEther("0")
            )
        ).to.be.revertedWith("Staking amount must be positive.");

        await expect(
            StakingContractV1Contract.connect(user1).stake(
                ethers.utils.parseEther("110")
            )
        ).to.be.revertedWith("You must own the amount you want to stake");
    });

    it("Testing stake operation for a user when staking for the first time", async () => {
        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV1Contract.connect(user1).stake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV1Contract, "Stake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));
    });

    it("Testing stake operation for a user when staking for multiple time", async () => {
        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV1Contract.connect(user1).stake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV1Contract, "Stake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        await time.increase(3600);

        await StakingContractV1Contract.connect(user1).stake(
            ethers.utils.parseEther("50")
        );

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("0")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user1.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));
    });

    it("Testing stake operation for a multiple users when staking for first time", async () => {
        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV1Contract.connect(user1).stake(
                ethers.utils.parseEther("100")
            )
        )
            .to.emit(StakingContractV1Contract, "Stake")
            .withArgs(user1.address, ethers.utils.parseEther("100"));

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        await time.increase(60);

        expect(
            await StakingContractV1Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV1Contract.connect(user2).stake(
                ethers.utils.parseEther("100")
            )
        )
            .to.emit(StakingContractV1Contract, "Stake")
            .withArgs(user2.address, ethers.utils.parseEther("100"));

        expect(
            await StakingContractV1Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        await time.increase(60);

        expect(
            await StakingContractV1Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV1Contract.connect(user3).stake(
                ethers.utils.parseEther("100")
            )
        )
            .to.emit(StakingContractV1Contract, "Stake")
            .withArgs(user3.address, ethers.utils.parseEther("100"));

        expect(
            await StakingContractV1Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        expect(await StakingContractV1Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("300")
        );

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user1.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user2.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user3.address)
        ).to.be.equal(ethers.utils.parseEther("0"));
    });

    it("Testing stake operation for a multiple users when staking for multiple times", async () => {
        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV1Contract.connect(user1).stake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV1Contract, "Stake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        await StakingContractV1Contract.connect(user1).stake(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        await time.increase(60);

        expect(
            await StakingContractV1Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV1Contract.connect(user2).stake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV1Contract, "Stake")
            .withArgs(user2.address, ethers.utils.parseEther("50"));

        expect(
            await StakingContractV1Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        await time.increase(60);

        expect(
            await StakingContractV1Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV1Contract.connect(user3).stake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV1Contract, "Stake")
            .withArgs(user3.address, ethers.utils.parseEther("50"));

        expect(
            await StakingContractV1Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        await StakingContractV1Contract.connect(user3).stake(
            ethers.utils.parseEther("25")
        );

        await StakingContractV1Contract.connect(user3).stake(
            ethers.utils.parseEther("25")
        );

        expect(await LabTokenContract.balanceOf(user3.address)).to.be.equal(
            ethers.utils.parseEther("0")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        await StakingContractV1Contract.connect(user2).stake(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        expect(await StakingContractV1Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("300")
        );

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user1.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user2.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user3.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));
    });

    /*  ========== Unstake ========== */

    it("Testing unstake operation requirements", async () => {
        await expect(
            StakingContractV1Contract.connect(user1).unstake(
                ethers.utils.parseEther("0")
            )
        ).to.be.revertedWith("Unstaking amount must be positive.");

        await expect(
            StakingContractV1Contract.connect(user1).unstake(
                ethers.utils.parseEther("110")
            )
        ).to.be.revertedWith("User must have staked the amount of tokens");
    });

    it("Testing unstake operation for a user when unstaking for the first time", async () => {
        await StakingContractV1Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("100"));

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV1Contract.connect(user1).unstake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV1Contract, "Unstake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user1.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV1Contract.connect(user1).unstake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV1Contract, "Unstake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("100")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("0"));

        expect(
            await StakingContractV1Contract.getAcumulatedReward(user1.address)
        ).to.be.not.equal(ethers.utils.parseEther("0"));

        await expect(
            StakingContractV1Contract.connect(user1).unstake(
                ethers.utils.parseEther("50")
            )
        ).to.be.revertedWith("User must have staked the amount of tokens");
    });

    it("Testing unstake operation for multiple users when unstaking for the first time", async () => {
        await StakingContractV1Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV1Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV1Contract.connect(user3).stake(
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
            StakingContractV1Contract.connect(user1).unstake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV1Contract, "Unstake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(await StakingContractV1Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("250")
        );

        await expect(
            StakingContractV1Contract.connect(user2).unstake(
                ethers.utils.parseEther("20")
            )
        )
            .to.emit(StakingContractV1Contract, "Unstake")
            .withArgs(user2.address, ethers.utils.parseEther("20"));

        expect(await LabTokenContract.balanceOf(user2.address)).to.be.equal(
            ethers.utils.parseEther("20")
        );

        expect(await StakingContractV1Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("230")
        );

        await expect(
            StakingContractV1Contract.connect(user3).unstake(
                ethers.utils.parseEther("60")
            )
        )
            .to.emit(StakingContractV1Contract, "Unstake")
            .withArgs(user3.address, ethers.utils.parseEther("60"));

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        expect(
            await StakingContractV1Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("80"));

        expect(
            await StakingContractV1Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("40"));

        expect(await StakingContractV1Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("170")
        );
    });

    it("Testing unstake operation for multiple users when unstaking for multiple time", async () => {
        await StakingContractV1Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV1Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV1Contract.connect(user3).stake(
            ethers.utils.parseEther("100")
        );

        await expect(
            StakingContractV1Contract.connect(user1).unstake(
                ethers.utils.parseEther("50")
            )
        )
            .to.emit(StakingContractV1Contract, "Unstake")
            .withArgs(user1.address, ethers.utils.parseEther("50"));

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );

        expect(await StakingContractV1Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("250")
        );

        await expect(
            StakingContractV1Contract.connect(user2).unstake(
                ethers.utils.parseEther("20")
            )
        )
            .to.emit(StakingContractV1Contract, "Unstake")
            .withArgs(user2.address, ethers.utils.parseEther("20"));

        expect(await LabTokenContract.balanceOf(user2.address)).to.be.equal(
            ethers.utils.parseEther("20")
        );

        expect(await StakingContractV1Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("230")
        );

        await expect(
            StakingContractV1Contract.connect(user1).unstake(
                ethers.utils.parseEther("20")
            )
        )
            .to.emit(StakingContractV1Contract, "Unstake")
            .withArgs(user1.address, ethers.utils.parseEther("20"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("70")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("30"));

        await expect(
            StakingContractV1Contract.connect(user3).unstake(
                ethers.utils.parseEther("60")
            )
        )
            .to.emit(StakingContractV1Contract, "Unstake")
            .withArgs(user3.address, ethers.utils.parseEther("60"));

        expect(await LabTokenContract.balanceOf(user3.address)).to.be.equal(
            ethers.utils.parseEther("60")
        );

        await expect(
            StakingContractV1Contract.connect(user2).unstake(
                ethers.utils.parseEther("20")
            )
        )
            .to.emit(StakingContractV1Contract, "Unstake")
            .withArgs(user2.address, ethers.utils.parseEther("20"));

        expect(await StakingContractV1Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("130")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("30"));

        expect(
            await StakingContractV1Contract.getStakeAmount(user2.address)
        ).to.be.equal(ethers.utils.parseEther("60"));

        expect(
            await StakingContractV1Contract.getStakeAmount(user3.address)
        ).to.be.equal(ethers.utils.parseEther("40"));
    });

    /*  ========== Restake ========== */

    it("Testing restake operation requirements", async () => {
        await expect(
            StakingContractV1Contract.connect(user1).restake()
        ).to.be.revertedWith("The rewards amount for restake must be positive");
    });

    it("Testing restake operation for one user", async () => {
        time.setNextBlockTimestamp(10000000000);
        await StakingContractV1Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("0")
        );

        time.setNextBlockTimestamp(10000000000 + 86400);

        await expect(StakingContractV1Contract.connect(user1).restake())
            .to.emit(StakingContractV1Contract, "Restake")
            .withArgs(user1.address, ethers.utils.parseEther("100"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("0")
        );

        expect(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        ).to.be.equal(ethers.utils.parseEther("200"));

        expect(await StakingContractV1Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("200")
        );
    });

    it("Testing restake operation for multiple user", async () => {
        time.setNextBlockTimestamp(10000100000);
        await StakingContractV1Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV1Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10000100000 + 86400);

        await expect(
            StakingContractV1Contract.connect(user1).restake()
        ).to.emit(StakingContractV1Contract, "Restake");

        await expect(
            StakingContractV1Contract.connect(user2).restake()
        ).to.emit(StakingContractV1Contract, "Restake");

        let user1_stakedAmount = ethers.utils.formatEther(
            await StakingContractV1Contract.getStakeAmount(user1.address)
        );

        user1_stakedAmount = (+user1_stakedAmount).toFixed(2);

        expect(user1_stakedAmount).to.be.equal("150.00");

        let user2_stakedAmount = ethers.utils.formatEther(
            await StakingContractV1Contract.getStakeAmount(user2.address)
        );

        user2_stakedAmount = (+user2_stakedAmount).toFixed(2);

        expect(user2_stakedAmount).to.be.equal("150.00");

        let poolAmount = ethers.utils.formatEther(
            await StakingContractV1Contract.poolAmount()
        );

        poolAmount = (+poolAmount).toFixed(2);

        expect(poolAmount).to.be.equal("300.00");
    });

    /*  ========== Claim Rewards ========== */

    it("Testing claimRewards operation requirements", async () => {
        await expect(
            StakingContractV1Contract.connect(user1).claimRewards()
        ).to.be.revertedWith("The rewards amount must be positive");
    });

    it("Testing claimRewards operation for a user", async () => {
        time.setNextBlockTimestamp(10000200000);
        await StakingContractV1Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10000200000 + 86400);

        await expect(StakingContractV1Contract.connect(user1).claimRewards())
            .to.emit(StakingContractV1Contract, "ClaimRewards")
            .withArgs(user1.address, ethers.utils.parseEther("100"));

        expect(await LabTokenContract.balanceOf(user1.address)).to.be.equal(
            ethers.utils.parseEther("100")
        );

        let userBalance = ethers.utils.formatEther(
            await LabTokenContract.balanceOf(user1.address)
        );
        userBalance = (+userBalance).toFixed(3);
        expect(userBalance).to.be.equal("100.000");

        await StakingContractV1Contract.connect(user1).unstake(
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
        time.setNextBlockTimestamp(10000300000);
        await StakingContractV1Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV1Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10000300000 + 86400);

        await expect(
            StakingContractV1Contract.connect(user1).claimRewards()
        ).to.emit(StakingContractV1Contract, "ClaimRewards");

        await expect(
            StakingContractV1Contract.connect(user2).claimRewards()
        ).to.emit(StakingContractV1Contract, "ClaimRewards");

        let poolAmount = ethers.utils.formatEther(
            await StakingContractV1Contract.poolAmount()
        );

        poolAmount = (+poolAmount).toFixed(2);

        expect(await StakingContractV1Contract.poolAmount()).to.be.equal(
            ethers.utils.parseEther("200")
        );

        expect(
            await LabTokenContract.balanceOf(user1.address)
        ).to.be.greaterThan(ethers.utils.parseEther("50"));

        expect(await LabTokenContract.balanceOf(user2.address)).to.be.equal(
            ethers.utils.parseEther("50")
        );
    });

    it("Testing claimRewards operation for multiple users + unstake", async () => {
        time.setNextBlockTimestamp(10000400000);
        await StakingContractV1Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV1Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10000400000 + 86400);

        await StakingContractV1Contract.connect(user1).unstake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV1Contract.connect(user2).unstake(
            ethers.utils.parseEther("100")
        );

        await expect(
            StakingContractV1Contract.connect(user1).claimRewards()
        ).to.emit(StakingContractV1Contract, "ClaimRewards");

        await expect(
            StakingContractV1Contract.connect(user2).claimRewards()
        ).to.emit(StakingContractV1Contract, "ClaimRewards");

        let poolAmount = ethers.utils.formatEther(
            await StakingContractV1Contract.poolAmount()
        );

        poolAmount = (+poolAmount).toFixed(2);

        expect(await StakingContractV1Contract.poolAmount()).to.be.equal(
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
        StakingContractV1Contract.connect(owner).setDailyReward(
            ethers.utils.parseEther("1200")
        );

        time.setNextBlockTimestamp(10000500000);
        await StakingContractV1Contract.connect(user1).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV1Contract.connect(user2).stake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV1Contract.connect(user3).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10000500000 + 43200);

        await StakingContractV1Contract.connect(user3).unstake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10000500000 + 86400);

        await StakingContractV1Contract.connect(user2).unstake(
            ethers.utils.parseEther("100")
        );

        await StakingContractV1Contract.connect(user1).claimRewards();
        await StakingContractV1Contract.connect(user2).claimRewards();
        await StakingContractV1Contract.connect(user3).claimRewards();

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
            StakingContractV1Contract.address,
            ethers.utils.parseEther("100")
        );
        await StakingContractV1Contract.connect(user3).stake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10000500000 + 129600);

        await StakingContractV1Contract.connect(user3).unstake(
            ethers.utils.parseEther("100")
        );

        time.setNextBlockTimestamp(10000500000 + 86400 * 2);

        await StakingContractV1Contract.connect(user1).claimRewards();
        await expect(
            StakingContractV1Contract.connect(user2).claimRewards()
        ).to.be.revertedWith("The rewards amount must be positive");
        await StakingContractV1Contract.connect(user3).claimRewards();

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
