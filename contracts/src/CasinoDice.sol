// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CasinoDice is ReentrancyGuard {
    mapping(address => uint256) public balanceOf;

    event Deposited(address indexed player, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed player, uint256 amount, uint256 newBalance);

    error AmountZero();
    error InsufficientBalance();
    error TransferFailed();

    function deposit() external payable {
        if (msg.value == 0) revert AmountZero();
        balanceOf[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, balanceOf[msg.sender]);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountZero();
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount, balanceOf[msg.sender]);
    }

    receive() external payable {
        // accept ETH but do not credit; for house bankroll funding flows added later
    }
}
