// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {HonkVerifier} from "../Verifier.sol";

contract DeployScript is Script {
    function run() public {
        vm.startBroadcast();
        HonkVerifier verifier = new HonkVerifier();
        console.log("Verifier deployed at:", address(verifier));
        vm.stopBroadcast();
    }
}
