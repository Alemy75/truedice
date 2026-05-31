// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract CasinoDice is VRFConsumerBaseV2Plus, ReentrancyGuard {
    // ============ Constants ============
    uint256 public constant HOUSE_EDGE_BPS = 100;            // 1.00%
    uint256 public constant MIN_BET = 0.0001 ether;
    uint256 public constant MAX_BET_BPS_OF_BANKROLL = 100;   // 1% of bankroll
    uint64 public constant MIN_ROLL_UNDER = 200;             // 2.00%
    uint64 public constant MAX_ROLL_UNDER = 9800;            // 98.00%
    uint32 public constant CALLBACK_GAS_LIMIT = 150_000;
    // 1 confirmation on Sepolia (~12s) instead of 3 (~36s). Acceptable on
    // testnet — reorg risk is low and stakes are play-money. For mainnet
    // bump back to 3 for proper reorg safety.
    uint16 public constant REQUEST_CONFIRMATIONS = 1;
    uint32 public constant NUM_WORDS = 1;
    uint256 public constant STALE_BET_TIMEOUT = 24 hours;
    uint256 public constant FEED_SIZE = 50;

    // ============ State ============
    bytes32 public immutable keyHash;
    uint256 public immutable subscriptionId;

    mapping(address => uint256) public balanceOf;
    uint256 public houseBankroll;
    mapping(uint256 => Roll) public rolls;
    // Circular ring buffer of recent settled bet ids.
    // - While length < FEED_SIZE: behaves as a linear array; head stays at 0.
    // - Once full: writes wrap, head points to the next slot to overwrite
    //   (which is also the OLDEST entry). Newest entry is at
    //   (head - 1 + FEED_SIZE) % FEED_SIZE.
    uint256[] public recentRollIds;
    uint256 public recentRollIdsHead;

    struct Roll {
        address player;
        uint128 stake;
        uint64 rollUnder;
        uint64 multiplierBps;
        uint64 result;
        bool won;
        bool settled;
        uint40 requestedAt;
    }

    // ============ Events ============
    event Deposited(address indexed player, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed player, uint256 amount, uint256 newBalance);
    event BetPlaced(uint256 indexed requestId, address indexed player, uint128 stake, uint64 rollUnder, uint64 multiplierBps);
    event BetSettled(uint256 indexed requestId, address indexed player, uint64 result, bool won, uint256 payout);
    event HouseBankrollChanged(int256 delta, uint256 newBankroll);
    event BetRescued(uint256 indexed requestId, address indexed player, uint256 stakeReturned);

    // ============ Errors ============
    error AmountZero();
    error InsufficientBalance();
    error TransferFailed();
    error BetTooSmall();
    error BetExceedsBankrollCap();
    error InvalidRollUnder();
    error InsufficientBankroll();
    error BetNotStale();
    error BetAlreadySettled();
    error BankrollInsufficientForWithdrawal();

    constructor(address _coordinator, bytes32 _keyHash, uint256 _subId)
        VRFConsumerBaseV2Plus(_coordinator)
    {
        keyHash = _keyHash;
        subscriptionId = _subId;
    }

    // ============ Deposit / Withdraw ============
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

    // ============ Bet flow ============
    function placeBet(uint128 stake, uint64 rollUnder) external nonReentrant returns (uint256 requestId) {
        if (stake < MIN_BET) revert BetTooSmall();
        if (rollUnder < MIN_ROLL_UNDER || rollUnder > MAX_ROLL_UNDER) revert InvalidRollUnder();
        if (balanceOf[msg.sender] < stake) revert InsufficientBalance();

        uint64 multiplierBps = uint64((10000 * (10000 - HOUSE_EDGE_BPS)) / rollUnder);
        // maximum possible payout this bet
        uint256 maxPayout = (uint256(stake) * multiplierBps) / 10000;
        uint256 maxBankrollRisk = maxPayout - stake; // house loss if win
        // cap bet exposure to 1% of bankroll
        if (maxBankrollRisk * 10000 > houseBankroll * MAX_BET_BPS_OF_BANKROLL) {
            revert BetExceedsBankrollCap();
        }

        balanceOf[msg.sender] -= stake;

        // request randomness
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        rolls[requestId] = Roll({
            player: msg.sender,
            stake: stake,
            rollUnder: rollUnder,
            multiplierBps: multiplierBps,
            result: 0,
            won: false,
            settled: false,
            requestedAt: uint40(block.timestamp)
        });

        emit BetPlaced(requestId, msg.sender, stake, rollUnder, multiplierBps);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        Roll storage r = rolls[requestId];
        if (r.settled) return; // defensive: no double-settlement
        if (r.player == address(0)) return; // unknown requestId; ignore

        uint64 result = uint64(randomWords[0] % 10000);
        r.result = result;
        r.settled = true;

        uint256 payout = 0;
        if (result < r.rollUnder) {
            r.won = true;
            payout = (uint256(r.stake) * r.multiplierBps) / 10000;
            balanceOf[r.player] += payout;
            // house loses (payout - stake); stake was already removed from player balance
            uint256 houseDelta = payout - r.stake;
            houseBankroll -= houseDelta;
            emit HouseBankrollChanged(-int256(houseDelta), houseBankroll);
        } else {
            // house wins the stake
            houseBankroll += r.stake;
            emit HouseBankrollChanged(int256(uint256(r.stake)), houseBankroll);
        }

        _pushRecent(requestId);
        emit BetSettled(requestId, r.player, result, r.won, payout);
    }

    function _pushRecent(uint256 requestId) internal {
        // O(1) ring buffer: until full, append linearly; once full, overwrite
        // at `recentRollIdsHead` and advance head. Saves ~140k gas per VRF
        // callback compared to the prior O(N) shift-array implementation.
        if (recentRollIds.length < FEED_SIZE) {
            recentRollIds.push(requestId);
        } else {
            recentRollIds[recentRollIdsHead] = requestId;
            recentRollIdsHead = (recentRollIdsHead + 1) % FEED_SIZE;
        }
    }

    function getRecentRolls(uint256 n) external view returns (Roll[] memory list) {
        uint256 len = recentRollIds.length;
        uint256 take = n > len ? len : n;
        list = new Roll[](take);
        if (len < FEED_SIZE) {
            // Linear: oldest at [0], newest at [len-1]. Return last `take`.
            for (uint256 i = 0; i < take; i++) {
                list[i] = rolls[recentRollIds[len - take + i]];
            }
        } else {
            // Circular: head points to the oldest entry. Newest entry is at
            // head-1 (with wraparound). For chronological order (oldest →
            // newest), start at (head + FEED_SIZE - take) % FEED_SIZE.
            uint256 start = (recentRollIdsHead + FEED_SIZE - take) % FEED_SIZE;
            for (uint256 i = 0; i < take; i++) {
                list[i] = rolls[recentRollIds[(start + i) % FEED_SIZE]];
            }
        }
    }

    /// @notice Returns the last `n` settled bet request ids in chronological
    ///         order (oldest first, newest last). Mirrors getRecentRolls's
    ///         indexing for the frontend's BetEvent[] pairing.
    function getRecentRollIds(uint256 n) external view returns (uint256[] memory ids) {
        uint256 len = recentRollIds.length;
        uint256 take = n > len ? len : n;
        ids = new uint256[](take);
        if (len < FEED_SIZE) {
            for (uint256 i = 0; i < take; i++) {
                ids[i] = recentRollIds[len - take + i];
            }
        } else {
            uint256 start = (recentRollIdsHead + FEED_SIZE - take) % FEED_SIZE;
            for (uint256 i = 0; i < take; i++) {
                ids[i] = recentRollIds[(start + i) % FEED_SIZE];
            }
        }
    }

    // ============ House bankroll (owner) ============
    function depositHouseBankroll() external payable onlyOwner {
        if (msg.value == 0) revert AmountZero();
        houseBankroll += msg.value;
        emit HouseBankrollChanged(int256(msg.value), houseBankroll);
    }

    function withdrawHouseBankroll(uint256 amount) external onlyOwner nonReentrant {
        if (amount > houseBankroll) revert BankrollInsufficientForWithdrawal();
        houseBankroll -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit HouseBankrollChanged(-int256(amount), houseBankroll);
    }

    // ============ Stale bet rescue ============
    function rescueStaleBet(uint256 requestId) external nonReentrant {
        Roll storage r = rolls[requestId];
        if (r.player == address(0)) revert BetAlreadySettled();
        if (r.settled) revert BetAlreadySettled();
        if (block.timestamp < r.requestedAt + STALE_BET_TIMEOUT) revert BetNotStale();

        r.settled = true;
        uint256 amount = r.stake;
        balanceOf[r.player] += amount;
        emit BetRescued(requestId, r.player, amount);
    }

    receive() external payable {
        // ETH sent directly with no method call goes to house bankroll
        houseBankroll += msg.value;
        emit HouseBankrollChanged(int256(msg.value), houseBankroll);
    }
}
