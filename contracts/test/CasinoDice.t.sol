// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CasinoDice} from "../src/CasinoDice.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract CasinoDiceTest is Test {
    CasinoDice internal casino;
    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);

    function setUp() public {
        VRFCoordinatorV2_5Mock coord = new VRFCoordinatorV2_5Mock(100 gwei, 1 gwei, 4_000_000_000_000_000);
        uint256 sid = coord.createSubscription();
        coord.fundSubscription(sid, 100 ether);
        casino = new CasinoDice(address(coord), bytes32(uint256(1)), sid);
        coord.addConsumer(sid, address(casino));
        vm.deal(ALICE, 10 ether);
        vm.deal(BOB, 10 ether);
    }

    function test_DepositIncreasesBalance() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        assertEq(casino.balanceOf(ALICE), 1 ether);
    }

    function test_Deposit_RevertsOnZero() public {
        vm.prank(ALICE);
        vm.expectRevert(CasinoDice.AmountZero.selector);
        casino.deposit{value: 0}();
    }

    function test_Withdraw_DecreasesBalanceAndSendsETH() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        uint256 before = ALICE.balance;
        vm.prank(ALICE);
        casino.withdraw(0.4 ether);
        assertEq(casino.balanceOf(ALICE), 0.6 ether);
        assertEq(ALICE.balance, before + 0.4 ether);
    }

    function test_Withdraw_RevertsOnInsufficient() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        vm.prank(ALICE);
        vm.expectRevert(CasinoDice.InsufficientBalance.selector);
        casino.withdraw(2 ether);
    }
}

contract CasinoDiceVRFTest is Test {
    CasinoDice internal casino;
    VRFCoordinatorV2_5Mock internal coordinator;
    address constant ALICE = address(0xA11CE);
    address constant OWNER = address(0xDEAD);
    uint256 internal subId;
    bytes32 constant KEY_HASH = bytes32(uint256(1));

    function setUp() public {
        // VRFCoordinatorV2_5Mock(baseFee, gasPrice, weiPerUnitLink)
        coordinator = new VRFCoordinatorV2_5Mock(100 gwei, 1 gwei, 4_000_000_000_000_000); // 0.004 ETH per LINK
        subId = coordinator.createSubscription();
        coordinator.fundSubscription(subId, 100 ether); // mock LINK funding

        vm.prank(OWNER);
        casino = new CasinoDice(address(coordinator), KEY_HASH, subId);

        coordinator.addConsumer(subId, address(casino));

        vm.deal(ALICE, 10 ether);
        vm.deal(OWNER, 10 ether);

        vm.prank(OWNER);
        casino.depositHouseBankroll{value: 5 ether}();
    }

    function test_PlaceBet_DeductsStakeAndEmitsBetPlaced() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();

        vm.prank(ALICE);
        vm.expectEmit(false, true, false, false);
        emit CasinoDice.BetPlaced(0, ALICE, 0.01 ether, 4950, 20000);
        uint256 reqId = casino.placeBet(0.01 ether, 4950);

        assertEq(casino.balanceOf(ALICE), 0.99 ether);
        (address player, uint128 stake, uint64 rollUnder, uint64 multBps, , , bool settled, ) = casino.rolls(reqId);
        assertEq(player, ALICE);
        assertEq(stake, 0.01 ether);
        assertEq(rollUnder, 4950);
        assertEq(multBps, 20000); // 99M/4950 = 20000 = 2.0000x
        assertFalse(settled);
    }

    function test_Fulfill_WinPaysOut() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();

        vm.prank(ALICE);
        uint256 reqId = casino.placeBet(0.01 ether, 4950);

        // random word will roll % 10000; force a winning roll (e.g., 100)
        uint256[] memory words = new uint256[](1);
        words[0] = 100;
        coordinator.fulfillRandomWordsWithOverride(reqId, address(casino), words);

        (, , , uint64 multBps, uint64 result, bool won, bool settled, ) = casino.rolls(reqId);
        assertEq(result, 100);
        assertTrue(won);
        assertTrue(settled);
        multBps; // silence unused
        // payout = 0.01 * 20000 / 10000 = 0.02 ETH credited
        assertEq(casino.balanceOf(ALICE), 0.99 ether + 0.02 ether);
    }

    function test_Fulfill_LossKeepsStake() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();

        vm.prank(ALICE);
        uint256 reqId = casino.placeBet(0.01 ether, 4950);

        uint256[] memory words = new uint256[](1);
        words[0] = 7000; // > 4950 → loss
        coordinator.fulfillRandomWordsWithOverride(reqId, address(casino), words);

        (, , , , uint64 result, bool won, bool settled, ) = casino.rolls(reqId);
        assertEq(result, 7000);
        assertFalse(won);
        assertTrue(settled);
        assertEq(casino.balanceOf(ALICE), 0.99 ether); // no payout; stake stays out of balance
    }
}
