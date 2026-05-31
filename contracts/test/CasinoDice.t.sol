// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CasinoDice} from "../src/CasinoDice.sol";

contract CasinoDiceTest is Test {
    CasinoDice internal casino;
    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);

    function setUp() public {
        casino = new CasinoDice();
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
