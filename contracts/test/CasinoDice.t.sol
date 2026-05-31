// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CasinoDice} from "../src/CasinoDice.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

/// @dev Wallet that rejects all incoming ETH; used to force TransferFailed branches.
contract RejectETH {
    CasinoDice public immutable casino;

    constructor(CasinoDice _casino) payable {
        casino = _casino;
    }

    function depositToCasino() external payable {
        casino.deposit{value: msg.value}();
    }

    function withdrawFromCasino(uint256 amount) external {
        casino.withdraw(amount);
    }

    receive() external payable {
        revert("nope");
    }
}

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

    function test_PlaceBet_RevertsBetTooSmall() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        vm.prank(ALICE);
        vm.expectRevert(CasinoDice.BetTooSmall.selector);
        casino.placeBet(0.00001 ether, 4950);
    }

    function test_PlaceBet_RevertsInvalidRollUnder_Low() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        vm.prank(ALICE);
        vm.expectRevert(CasinoDice.InvalidRollUnder.selector);
        casino.placeBet(0.01 ether, 100); // < MIN_ROLL_UNDER
    }

    function test_PlaceBet_RevertsInvalidRollUnder_High() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        vm.prank(ALICE);
        vm.expectRevert(CasinoDice.InvalidRollUnder.selector);
        casino.placeBet(0.01 ether, 9900); // > MAX_ROLL_UNDER
    }

    function test_PlaceBet_RevertsBetExceedsBankrollCap() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        // bankroll = 5 ether; cap = 1% * bankroll = 0.05 ether of MAX RISK (payout-stake)
        // pick rollUnder = 200 → multiplier = 99M/200 = 495000 = 49.5x
        // stake = 0.002 ether → maxPayout = 0.099, risk = 0.097 → exceeds 0.05
        vm.prank(ALICE);
        vm.expectRevert(CasinoDice.BetExceedsBankrollCap.selector);
        casino.placeBet(0.002 ether, 200);
    }

    function test_PlaceBet_RevertsInsufficientBalance() public {
        vm.prank(ALICE);
        casino.deposit{value: 0.005 ether}();
        vm.prank(ALICE);
        vm.expectRevert(CasinoDice.InsufficientBalance.selector);
        casino.placeBet(0.01 ether, 4950);
    }

    function test_RescueStaleBet_AfterTimeout() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        vm.prank(ALICE);
        uint256 reqId = casino.placeBet(0.01 ether, 4950);

        vm.warp(block.timestamp + 25 hours);
        casino.rescueStaleBet(reqId);

        assertEq(casino.balanceOf(ALICE), 0.99 ether + 0.01 ether);
        (, , , , , , bool settled, ) = casino.rolls(reqId);
        assertTrue(settled);
    }

    function test_RescueStaleBet_RevertsBeforeTimeout() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        vm.prank(ALICE);
        uint256 reqId = casino.placeBet(0.01 ether, 4950);
        vm.expectRevert(CasinoDice.BetNotStale.selector);
        casino.rescueStaleBet(reqId);
    }

    function test_RescueStaleBet_RevertsForUnknownRequest() public {
        vm.expectRevert(CasinoDice.BetAlreadySettled.selector);
        casino.rescueStaleBet(99999);
    }

    function test_RescueStaleBet_RevertsForSettledBet() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        vm.prank(ALICE);
        uint256 reqId = casino.placeBet(0.01 ether, 4950);

        uint256[] memory words = new uint256[](1);
        words[0] = 100;
        coordinator.fulfillRandomWordsWithOverride(reqId, address(casino), words);

        vm.warp(block.timestamp + 25 hours);
        vm.expectRevert(CasinoDice.BetAlreadySettled.selector);
        casino.rescueStaleBet(reqId);
    }

    function test_OnlyOwnerCanModifyBankroll() public {
        vm.prank(ALICE);
        vm.expectRevert(); // OZ Ownable v5 reverts with OwnableUnauthorizedAccount
        casino.depositHouseBankroll{value: 1 ether}();
    }

    function test_DepositHouseBankroll_RevertsOnZero() public {
        vm.prank(OWNER);
        vm.expectRevert(CasinoDice.AmountZero.selector);
        casino.depositHouseBankroll{value: 0}();
    }

    function test_WithdrawHouseBankroll_OwnerSucceeds() public {
        vm.prank(OWNER);
        casino.withdrawHouseBankroll(1 ether);
        assertEq(casino.houseBankroll(), 4 ether);
    }

    function test_WithdrawHouseBankroll_RevertsWhenInsufficient() public {
        vm.prank(OWNER);
        vm.expectRevert(CasinoDice.BankrollInsufficientForWithdrawal.selector);
        casino.withdrawHouseBankroll(100 ether);
    }

    function test_Withdraw_RevertsOnZero() public {
        vm.prank(ALICE);
        vm.expectRevert(CasinoDice.AmountZero.selector);
        casino.withdraw(0);
    }

    function test_Receive_FundsBankroll() public {
        uint256 before = casino.houseBankroll();
        vm.deal(BOB_ADDR, 1 ether);
        vm.prank(BOB_ADDR);
        (bool ok, ) = address(casino).call{value: 0.5 ether}("");
        assertTrue(ok);
        assertEq(casino.houseBankroll(), before + 0.5 ether);
    }

    address constant BOB_ADDR = address(0xB0B);

    function test_GetRecentRolls_ReturnsList() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();

        // Place + settle 3 bets
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(ALICE);
            uint256 reqId = casino.placeBet(0.005 ether, 4950);
            uint256[] memory words = new uint256[](1);
            words[0] = i * 1000;
            coordinator.fulfillRandomWordsWithOverride(reqId, address(casino), words);
        }

        CasinoDice.Roll[] memory list = casino.getRecentRolls(10);
        assertEq(list.length, 3);
    }

    function test_GetRecentRolls_OverflowsFeedSize() public {
        vm.prank(ALICE);
        casino.deposit{value: 5 ether}();

        // Place + settle 52 bets to trigger feed shift-left
        for (uint256 i = 0; i < 52; i++) {
            vm.prank(ALICE);
            uint256 reqId = casino.placeBet(0.005 ether, 4950);
            uint256[] memory words = new uint256[](1);
            words[0] = i * 7;
            coordinator.fulfillRandomWordsWithOverride(reqId, address(casino), words);
        }

        CasinoDice.Roll[] memory list = casino.getRecentRolls(100);
        assertEq(list.length, 50);
    }

    function test_Withdraw_RevertsOnTransferFailure() public {
        RejectETH bad = new RejectETH(casino);
        vm.deal(address(bad), 1 ether);
        bad.depositToCasino{value: 1 ether}();

        vm.expectRevert(CasinoDice.TransferFailed.selector);
        bad.withdrawFromCasino(0.5 ether);
    }

    function test_WithdrawHouseBankroll_RevertsOnTransferFailure() public {
        // Owner transfers ownership to a RejectETH contract via direct deploy. Easier path:
        // deploy a new casino owned by RejectETH and let it try to withdraw.
        RejectETH bad = new RejectETH(casino);
        // Deploy a fresh CasinoDice from `bad` so `bad` is the owner.
        vm.prank(address(bad));
        CasinoDice c2 = new CasinoDice(address(coordinator), KEY_HASH, subId);
        coordinator.addConsumer(subId, address(c2));
        vm.deal(address(bad), 2 ether);
        vm.prank(address(bad));
        c2.depositHouseBankroll{value: 1 ether}();

        vm.prank(address(bad));
        vm.expectRevert(CasinoDice.TransferFailed.selector);
        c2.withdrawHouseBankroll(0.5 ether);
    }

    function test_Fulfill_IgnoresUnknownRequestId() public {
        // Call raw fulfill from coordinator on an unknown requestId — should silently return.
        uint256[] memory words = new uint256[](1);
        words[0] = 42;
        vm.prank(address(coordinator));
        (bool ok, ) = address(casino).call(
            abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", uint256(999999), words)
        );
        assertTrue(ok);
        // No state change — bankroll unchanged
        assertEq(casino.houseBankroll(), 5 ether);
    }

    function test_Fulfill_IgnoresAlreadySettled() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        vm.prank(ALICE);
        uint256 reqId = casino.placeBet(0.01 ether, 4950);

        uint256[] memory words = new uint256[](1);
        words[0] = 100;
        coordinator.fulfillRandomWordsWithOverride(reqId, address(casino), words);
        uint256 bankrollAfter = casino.houseBankroll();

        // call again as coordinator — should be a no-op
        vm.prank(address(coordinator));
        (bool ok, ) = address(casino).call(
            abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", reqId, words)
        );
        assertTrue(ok);
        assertEq(casino.houseBankroll(), bankrollAfter);
    }

    function testFuzz_HouseEdgeConverges(uint256 seed) public {
        seed = bound(seed, 1, type(uint256).max);
        uint256 N = 200;
        uint128 stake = 0.005 ether;
        uint64 rollUnder = 4950; // 49.5% → 2.0x

        vm.prank(ALICE);
        casino.deposit{value: 10 ether}();

        uint256 wagered = 0;
        uint256 bankrollBefore = casino.houseBankroll();

        for (uint256 i = 0; i < N; i++) {
            vm.prank(ALICE);
            uint256 reqId = casino.placeBet(stake, rollUnder);
            wagered += stake;
            uint256[] memory words = new uint256[](1);
            words[0] = uint256(keccak256(abi.encode(seed, i)));
            coordinator.fulfillRandomWordsWithOverride(reqId, address(casino), words);
        }

        uint256 bankrollAfter = casino.houseBankroll();
        int256 housePnL = int256(bankrollAfter) - int256(bankrollBefore);
        int256 expectedHouseEdge = int256(wagered * 100 / 10000); // 1% of wagered

        // For p=0.495 at 2.0x over N=200 bets at stake 0.005 ETH, standard deviation of
        // house PnL is ~stake*sqrt(N*p*(1-p))*payoutRange ≈ 0.005 * sqrt(200*0.25) * 2 ≈ 0.07 ETH.
        // Allow ±4σ ≈ 0.28 ETH absolute tolerance so the test is robust across fuzz seeds.
        int256 diff = housePnL > expectedHouseEdge ? housePnL - expectedHouseEdge : expectedHouseEdge - housePnL;
        int256 tolerance = int256(0.3 ether);
        assertLe(diff, tolerance);
    }
}
