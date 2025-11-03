// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ProvenanceRegistryV1} from "../contracts/ProvenanceRegistryV1.sol";

contract DeployProvenanceRegistryV1 is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();
        ProvenanceRegistryV1 registry = new ProvenanceRegistryV1();
        registry; // silence warnings
        vm.stopBroadcast();
    }
}