import { expect } from "chai";
import { ethers } from "hardhat";
import { LabToken__factory } from "../typechain-types";

describe("LabToken", async () => {
    let LabTokenFactory: any;
    let LabTokenContract: any;

    let owner: any;
    let minter: any;
    let burner: any;
    let bob: any;
    let alice: any;

    before(async () => {
        [owner, minter, burner, bob, alice] = await ethers.getSigners();

        LabTokenFactory = (await ethers.getContractFactory(
            "LabToken",
            owner
        )) as LabToken__factory;
    });

    beforeEach(async () => {
        LabTokenContract = await LabTokenFactory.deploy("LabToken", "LABT");
    });

    it("Name must be set as LabToken", async () => {
        expect(await LabTokenContract.name()).to.be.equals("LabToken");
    });

    it("Symbol must be set as LABT", async () => {
        expect(await LabTokenContract.symbol()).to.be.equals("LABT");
    });

    it("Only owner must have DEFAULT_ADMIN_ROLE", async () => {
        const DEFAULT_ADMIN_ROLE = await LabTokenContract.DEFAULT_ADMIN_ROLE();

        expect(
            await LabTokenContract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)
        ).to.be.true;

        expect(await LabTokenContract.hasRole(DEFAULT_ADMIN_ROLE, bob.address))
            .to.be.false;
    });

    it("Only DEFAULT_ADMIN_ROLE can grant role", async () => {
        const DEFAULT_ADMIN_ROLE = await LabTokenContract.DEFAULT_ADMIN_ROLE();
        const MINTER_ROLE = await LabTokenContract.MINTER_ROLE();
        const BURNER_ROLE = await LabTokenContract.BURNER_ROLE();

        await expect(
            LabTokenContract.connect(bob).grantRole(MINTER_ROLE, alice.address)
        ).to.be.revertedWith(
            "AccessControl: account " +
                bob.address.toLowerCase() +
                " is missing role " +
                DEFAULT_ADMIN_ROLE
        );

        await expect(
            LabTokenContract.connect(owner).grantRole(
                MINTER_ROLE,
                minter.address
            )
        )
            .to.emit(LabTokenContract, "RoleGranted")
            .withArgs(MINTER_ROLE, minter.address, owner.address);

        expect(await LabTokenContract.hasRole(MINTER_ROLE, minter.address)).to
            .be.true;

        await expect(
            LabTokenContract.connect(owner).grantRole(
                BURNER_ROLE,
                burner.address
            )
        )
            .to.emit(LabTokenContract, "RoleGranted")
            .withArgs(BURNER_ROLE, burner.address, owner.address);

        expect(await LabTokenContract.hasRole(BURNER_ROLE, burner.address)).to
            .be.true;
    });

    it("Only accounts that have MINTER_ROLE can mint", async () => {
        const MINTER_ROLE = await LabTokenContract.MINTER_ROLE();

        await LabTokenContract.connect(owner).grantRole(
            MINTER_ROLE,
            minter.address
        );

        await expect(
            LabTokenContract.connect(bob).mint(bob.address, 10)
        ).to.be.revertedWith(
            "AccessControl: account " +
                bob.address.toLowerCase() +
                " is missing role " +
                MINTER_ROLE
        );

        await expect(LabTokenContract.connect(minter).mint(bob.address, 10))
            .emit(LabTokenContract, "Transfer")
            .withArgs(ethers.constants.AddressZero, bob.address, 10);

        await expect(LabTokenContract.connect(owner).mint(alice.address, 10))
            .emit(LabTokenContract, "Transfer")
            .withArgs(ethers.constants.AddressZero, alice.address, 10);
    });

    it("Testing mint function", async () => {
        const MINTER_ROLE = await LabTokenContract.MINTER_ROLE();

        await LabTokenContract.connect(owner).grantRole(
            MINTER_ROLE,
            minter.address
        );

        await expect(
            LabTokenContract.connect(minter).mint(
                ethers.constants.AddressZero,
                10
            )
        ).to.be.revertedWith("ERC20: mint to the zero address");

        await expect(LabTokenContract.connect(minter).mint(bob.address, 10))
            .emit(LabTokenContract, "Transfer")
            .withArgs(ethers.constants.AddressZero, bob.address, 10);

        expect(await LabTokenContract.balanceOf(bob.address)).to.be.equal(10);
    });

    it("Only accounts that have BURNER_ROLE can burn", async () => {
        const BURNER_ROLE = await LabTokenContract.BURNER_ROLE();

        await LabTokenContract.connect(owner).grantRole(
            BURNER_ROLE,
            burner.address
        );

        await expect(
            LabTokenContract.connect(alice).burn(bob.address, 10)
        ).to.be.revertedWith(
            "AccessControl: account " +
                alice.address.toLowerCase() +
                " is missing role " +
                BURNER_ROLE
        );

        await expect(
            LabTokenContract.connect(burner).burn(bob.address, 10)
        ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("Testing burn function", async () => {
        const MINTER_ROLE = await LabTokenContract.MINTER_ROLE();
        const BURNER_ROLE = await LabTokenContract.BURNER_ROLE();

        await LabTokenContract.connect(owner).grantRole(
            BURNER_ROLE,
            burner.address
        );

        await LabTokenContract.connect(owner).grantRole(
            MINTER_ROLE,
            minter.address
        );

        await expect(
            LabTokenContract.connect(burner).burn(
                ethers.constants.AddressZero,
                10
            )
        ).to.be.revertedWith("ERC20: burn from the zero address");

        await expect(
            LabTokenContract.connect(burner).burn(bob.address, 10)
        ).to.be.revertedWith("ERC20: burn amount exceeds balance");

        await expect(LabTokenContract.connect(minter).mint(bob.address, 10))
            .emit(LabTokenContract, "Transfer")
            .withArgs(ethers.constants.AddressZero, bob.address, 10);

        expect(await LabTokenContract.balanceOf(bob.address)).to.be.equal(10);

        await expect(LabTokenContract.connect(burner).burn(bob.address, 5))
            .emit(LabTokenContract, "Transfer")
            .withArgs(bob.address, ethers.constants.AddressZero, 5);

        expect(await LabTokenContract.balanceOf(bob.address)).to.be.equal(5);

        await expect(LabTokenContract.connect(burner).burn(bob.address, 5))
            .emit(LabTokenContract, "Transfer")
            .withArgs(bob.address, ethers.constants.AddressZero, 5);

        expect(await LabTokenContract.balanceOf(bob.address)).to.be.equal(0);
    });
});
