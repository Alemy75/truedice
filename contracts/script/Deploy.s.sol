// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CasinoDice} from "../src/CasinoDice.sol";

contract Deploy is Script {
    function run() external returns (CasinoDice casino) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address coordinator = vm.envAddress("VRF_COORDINATOR");
        bytes32 keyHash = vm.envBytes32("VRF_KEY_HASH");
        uint256 subId = vm.envUint("VRF_SUBSCRIPTION_ID");
        uint256 initialBankroll = vm.envOr("INITIAL_BANKROLL_WEI", uint256(0.3 ether));

        vm.startBroadcast(pk);
        casino = new CasinoDice(coordinator, keyHash, subId);
        if (initialBankroll > 0) {
            casino.depositHouseBankroll{value: initialBankroll}();
        }
        vm.stopBroadcast();

        console.log("CasinoDice deployed at:", address(casino));
        console.log("Initial bankroll (wei):", initialBankroll);
        console.log("VRF subscription:", subId);
        console.log("ACTION REQUIRED: add", address(casino), "as consumer on the VRF subscription");
    }
}
