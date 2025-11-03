// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProvenanceRegistryV1
 * @notice A contract for storing and retrieving product traceability data with versioning and permission control.
 * @dev Each entity record stores JSON string data directly (not hashed) for easy on-chain viewing.
 */
contract ProvenanceRegistryV1 {
    struct EntityRecord {
        bytes32 id;            // Unique ID (e.g. keccak256 of product UUID)
        string entityType;     // Type of entity (e.g., Product, Batch, Shipment)
        string dataJson;       // Full JSON data stored on-chain (not hashed)
        uint256 version;       // Version number (1, 2, 3, ...)
        bytes32 previousId;    // ID of previous version (0x0 for first version)
        uint256 timestamp;     // Block timestamp when the record was created
        address submitter;     // Address that pushed this record
    }

    /// Mapping from entity ID to record
    mapping(bytes32 => EntityRecord) private records;

    /// Mapping from entity base key (original id) to all its version IDs
    mapping(bytes32 => bytes32[]) private entityVersions;

    /// Authorized addresses allowed to push data
    mapping(address => bool) public authorizedAccounts;

    /// Contract owner
    address public owner;

    /// Events
    event EntityPushed(bytes32 indexed id, string entityType, address indexed submitter, uint256 version);
    event AuthorizedAccountAdded(address indexed account);
    event AuthorizedAccountRemoved(address indexed account);

    /// Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedAccounts[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedAccounts[msg.sender] = true;
    }

    /**
     * @notice Add a new authorized account.
     * @param account The address to authorize.
     */
    function addAuthorizedAccount(address account) external onlyOwner {
        authorizedAccounts[account] = true;
        emit AuthorizedAccountAdded(account);
    }

    /**
     * @notice Remove an authorized account.
     * @param account The address to remove.
     */
    function removeAuthorizedAccount(address account) external onlyOwner {
        authorizedAccounts[account] = false;
        emit AuthorizedAccountRemoved(account);
    }

    /**
     * @notice Push a new entity record or a new version of an existing entity.
     * @dev If it's an update (new version), set previousId to the old version ID.
     * @param id Unique identifier for the entity (new version ID if updating)
     * @param entityType The entity type (e.g., "Product", "Batch")
     * @param dataJson The JSON string containing full entity data
     * @param previousId The ID of the previous version (use 0x0 if this is the first version)
     */
    function pushEntity(
        bytes32 id,
        string calldata entityType,
        string calldata dataJson,
        bytes32 previousId
    ) public onlyAuthorized {
        require(records[id].timestamp == 0, "Entity already exists");

        uint256 newVersion = 1;

        if (previousId != bytes32(0)) {
            require(records[previousId].timestamp != 0, "Previous version not found");
            newVersion = records[previousId].version + 1;
            // Store the relationship in the version chain
            bytes32 baseId = entityVersions[previousId].length == 0 ? previousId : entityVersions[previousId][0];
            entityVersions[baseId].push(id);
        } else {
            entityVersions[id].push(id); // First version
        }

        records[id] = EntityRecord({
            id: id,
            entityType: entityType,
            dataJson: dataJson,
            version: newVersion,
            previousId: previousId,
            timestamp: block.timestamp,
            submitter: msg.sender
        });

        emit EntityPushed(id, entityType, msg.sender, newVersion);
    }

    /**
     * @notice Push multiple entities in one transaction.
     * @param ids Array of entity IDs.
     * @param types_ Array of entity types.
     * @param dataJsons Array of JSON data strings.
     * @param previousIds Array of previous version IDs (0x0 if first version).
     */
    function pushBatchEntities(
        bytes32[] calldata ids,
        string[] calldata types_,
        string[] calldata dataJsons,
        bytes32[] calldata previousIds
    ) external onlyAuthorized {
        require(ids.length == types_.length && ids.length == dataJsons.length && ids.length == previousIds.length, "Array length mismatch");

        for (uint256 i = 0; i < ids.length; i++) {
            pushEntity(ids[i], types_[i], dataJsons[i], previousIds[i]);
        }
    }

    /**
     * @notice Get a single entity record by ID.
     * @param id The ID of the entity to retrieve.
     * @return The EntityRecord struct.
     */
    function getEntity(bytes32 id) external view returns (EntityRecord memory) {
        require(records[id].timestamp != 0, "Entity not found");
        return records[id];
    }

    /**
     * @notice Get all version IDs for a given base entity ID.
     * @param baseId The ID of the first version (base entity).
     * @return Array of version IDs.
     */
    function getEntityVersions(bytes32 baseId) external view returns (bytes32[] memory) {
        return entityVersions[baseId];
    }
}
