/**
 * Certificates are used to register, update, or deregister stake pools, and delegate stake.
 *
 * These values are used for serialization.
 */
export enum CertificateKind {
  /**
   * This certificate is used when an individual wants to register as a stakeholder.
   * It allows the holder to participate in the staking process by delegating their
   * stake or creating a stake pool.
   */
  StakeRegistration = 0,

  /**
   * This certificate is used when a stakeholder no longer wants to participate in
   * staking. It revokes the stake registration and the associated stake is no
   * longer counted when calculating stake pool rewards.
   */
  StakeDeregistration = 1,

  /**
   * This certificate is used when a stakeholder wants to delegate their stake to a
   * specific stake pool. It includes the stake pool id to which the stake is delegated.
   */
  StakeDelegation = 2,

  /**
   * This certificate is used to register a new stake pool. It includes various details
   * about the pool such as the pledge, costs, margin, reward account, and the pool's owners and relays.
   */
  PoolRegistration = 3,

  /**
   * This certificate is used to retire a stake pool. It includes an epoch number
   * indicating when the pool will be retired.
   */
  PoolRetirement = 4,

  /**
   * This certificate is used to delegate from a Genesis key to a set of keys. This was primarily used in the early
   * phases of the Cardano network's existence during the transition from the Byron to the Shelley era.
   */
  GenesisKeyDelegation = 5,

  /**
   * Certificate used to facilitate an instantaneous transfer of rewards within the system.
   */
  MoveInstantaneousRewards = 6
}
