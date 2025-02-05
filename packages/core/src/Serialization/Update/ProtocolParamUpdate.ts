/* eslint-disable sonarjs/cognitive-complexity, complexity */
import * as Cardano from '../../Cardano';
import { CborReader, CborReaderState, CborWriter } from '../CBOR';
import { Costmdls } from './Costmdls';
import { ExUnitPrices } from './ExUnitPrices';
import { ExUnits, ProtocolVersion, UnitInterval } from '../Common';
import { HexBlob } from '@cardano-sdk/util';

/**
 * The ProtocolParamUpdate structure in Cardano is used to propose changes to
 * the protocol parameters of the blockchain. Protocol parameters govern various
 * aspects of the Cardano network.
 */
export class ProtocolParamUpdate {
  #minFeeA: Cardano.Lovelace | undefined;
  #minFeeB: Cardano.Lovelace | undefined;
  #maxBlockBodySize: number | undefined;
  #maxTxSize: number | undefined;
  #maxBlockHeaderSize: number | undefined;
  #keyDeposit: Cardano.Lovelace | undefined;
  #poolDeposit: Cardano.Lovelace | undefined;
  #maxEpoch: number | undefined;
  #nOpt: number | undefined;
  #poolPledgeInfluence: UnitInterval | undefined;
  #expansionRate: UnitInterval | undefined;
  #treasuryGrowthRate: UnitInterval | undefined;
  #d: UnitInterval | undefined;
  #extraEntropy: HexBlob | undefined;
  #protocolVersion: ProtocolVersion | undefined;
  #minPoolCost: Cardano.Lovelace | undefined;
  #adaPerUtxoByte: Cardano.Lovelace | undefined;
  #costModels: Costmdls | undefined;
  #executionCosts: ExUnitPrices | undefined;
  #maxTxExUnits: ExUnits | undefined;
  #maxBlockExUnits: ExUnits | undefined;
  #maxValueSize: number | undefined;
  #collateralPercentage: number | undefined;
  #maxCollateralInputs: number | undefined;
  #originalBytes: HexBlob | undefined = undefined;

  /**
   * Serializes a ProtocolParamUpdate into CBOR format.
   *
   * @returns The ProtocolParamUpdate in CBOR format.
   */
  // eslint-disable-next-line max-statements
  toCbor(): HexBlob {
    const writer = new CborWriter();

    if (this.#originalBytes) return this.#originalBytes;

    // protocol_param_update =
    //   { ? 0:  uint               ; minfee A
    //   , ? 1:  uint               ; minfee B
    //   , ? 2:  uint               ; max block body size
    //   , ? 3:  uint               ; max transaction size
    //   , ? 4:  uint               ; max block header size
    //   , ? 5:  coin               ; key deposit
    //   , ? 6:  coin               ; pool deposit
    //   , ? 7: epoch               ; maximum epoch
    //   , ? 8: uint                ; n_opt: desired number of stake pools
    //   , ? 9: rational            ; pool pledge influence
    //   , ? 10: unit_interval      ; expansion rate
    //   , ? 11: unit_interval      ; treasury growth rate
    //   , ? 14: [protocol_version] ; protocol version
    //   , ? 16: coin               ; min pool cost
    //   , ? 17: coin               ; ada per utxo byte
    //   , ? 18: costmdls           ; cost models for script languages
    //   , ? 19: ex_unit_prices     ; execution costs
    //   , ? 20: ex_units           ; max tx ex units
    //   , ? 21: ex_units           ; max block ex units
    //   , ? 22: uint               ; max value size
    //   , ? 23: uint               ; collateral percentage
    //   , ? 24: uint               ; max collateral inputs
    //   }
    writer.writeStartMap(this.#getMapSize());

    if (this.#minFeeA) {
      writer.writeInt(0n);
      writer.writeInt(this.#minFeeA);
    }

    if (this.#minFeeB) {
      writer.writeInt(1n);
      writer.writeInt(this.#minFeeB);
    }

    if (this.#maxBlockBodySize) {
      writer.writeInt(2n);
      writer.writeInt(this.#maxBlockBodySize);
    }

    if (this.#maxTxSize) {
      writer.writeInt(3n);
      writer.writeInt(this.#maxTxSize);
    }

    if (this.#maxBlockHeaderSize) {
      writer.writeInt(4n);
      writer.writeInt(this.#maxBlockHeaderSize);
    }

    if (this.#keyDeposit) {
      writer.writeInt(5n);
      writer.writeInt(this.#keyDeposit);
    }

    if (this.#poolDeposit) {
      writer.writeInt(6n);
      writer.writeInt(this.#poolDeposit);
    }

    if (this.#maxEpoch) {
      writer.writeInt(7n);
      writer.writeInt(this.#maxEpoch);
    }

    if (this.#nOpt) {
      writer.writeInt(8n);
      writer.writeInt(this.#nOpt);
    }

    if (this.#poolPledgeInfluence) {
      writer.writeInt(9n);
      writer.writeEncodedValue(Buffer.from(this.#poolPledgeInfluence.toCbor(), 'hex'));
    }

    if (this.#expansionRate) {
      writer.writeInt(10n);
      writer.writeEncodedValue(Buffer.from(this.#expansionRate.toCbor(), 'hex'));
    }

    if (this.#treasuryGrowthRate) {
      writer.writeInt(11n);
      writer.writeEncodedValue(Buffer.from(this.#treasuryGrowthRate.toCbor(), 'hex'));
    }

    if (this.#d) {
      writer.writeInt(12n);
      writer.writeEncodedValue(Buffer.from(this.#d.toCbor(), 'hex'));
    }

    if (this.#extraEntropy) {
      writer.writeInt(13n);
      writer.writeStartArray(2);
      writer.writeInt(1);
      writer.writeByteString(Buffer.from(this.#extraEntropy, 'hex'));
    }

    if (this.#protocolVersion) {
      writer.writeInt(14n);
      writer.writeEncodedValue(Buffer.from(this.#protocolVersion.toCbor(), 'hex'));
    }

    if (this.#minPoolCost) {
      writer.writeInt(16n);
      writer.writeInt(this.#minPoolCost);
    }

    if (this.#adaPerUtxoByte) {
      writer.writeInt(17n);
      writer.writeInt(this.#adaPerUtxoByte);
    }

    if (this.#costModels) {
      writer.writeInt(18n);
      writer.writeEncodedValue(Buffer.from(this.#costModels.toCbor(), 'hex'));
    }

    if (this.#executionCosts) {
      writer.writeInt(19n);
      writer.writeEncodedValue(Buffer.from(this.#executionCosts.toCbor(), 'hex'));
    }

    if (this.#maxTxExUnits) {
      writer.writeInt(20n);
      writer.writeEncodedValue(Buffer.from(this.#maxTxExUnits.toCbor(), 'hex'));
    }

    if (this.#maxBlockExUnits) {
      writer.writeInt(21n);
      writer.writeEncodedValue(Buffer.from(this.#maxBlockExUnits.toCbor(), 'hex'));
    }

    if (this.#maxValueSize) {
      writer.writeInt(22n);
      writer.writeInt(this.#maxValueSize);
    }

    if (this.#collateralPercentage) {
      writer.writeInt(23n);
      writer.writeInt(this.#collateralPercentage);
    }

    if (this.#maxCollateralInputs) {
      writer.writeInt(24n);
      writer.writeInt(this.#maxCollateralInputs);
    }

    return writer.encodeAsHex();
  }

  /**
   * Deserializes the ProtocolParamUpdate from a CBOR byte array.
   *
   * @param cbor The CBOR encoded ProtocolParamUpdate object.
   * @returns The new ProtocolParamUpdate instance.
   */
  static fromCbor(cbor: HexBlob): ProtocolParamUpdate {
    const reader = new CborReader(cbor);
    const params = new ProtocolParamUpdate();

    reader.readStartMap();

    while (reader.peekState() !== CborReaderState.EndMap) {
      const key = reader.readInt();

      switch (key) {
        case 0n:
          params.#minFeeA = reader.readInt();
          break;
        case 1n:
          params.#minFeeB = reader.readInt();
          break;
        case 2n:
          params.#maxBlockBodySize = Number(reader.readInt());
          break;
        case 3n:
          params.#maxTxSize = Number(reader.readInt());
          break;
        case 4n:
          params.#maxBlockHeaderSize = Number(reader.readInt());
          break;
        case 5n:
          params.#keyDeposit = reader.readInt();
          break;
        case 6n:
          params.#poolDeposit = reader.readInt();
          break;
        case 7n:
          params.#maxEpoch = Number(reader.readInt());
          break;
        case 8n:
          params.#nOpt = Number(reader.readInt());
          break;
        case 9n:
          params.#poolPledgeInfluence = UnitInterval.fromCbor(HexBlob.fromBytes(reader.readEncodedValue()));
          break;
        case 10n:
          params.#expansionRate = UnitInterval.fromCbor(HexBlob.fromBytes(reader.readEncodedValue()));
          break;
        case 11n:
          params.#treasuryGrowthRate = UnitInterval.fromCbor(HexBlob.fromBytes(reader.readEncodedValue()));
          break;
        case 12n:
          params.#d = UnitInterval.fromCbor(HexBlob.fromBytes(reader.readEncodedValue()));
          break;
        case 13n:
          // entropy is encoded as an array of two elements, where the second elements is the entropy value
          reader.readStartArray();
          reader.readEncodedValue();
          params.#extraEntropy = HexBlob.fromBytes(reader.readByteString());
          reader.readEndArray();
          break;
        case 14n:
          params.#protocolVersion = ProtocolVersion.fromCbor(HexBlob.fromBytes(reader.readEncodedValue()));
          break;
        case 16n:
          params.#minPoolCost = reader.readInt();
          break;
        case 17n:
          params.#adaPerUtxoByte = reader.readInt();
          break;
        case 18n:
          params.#costModels = Costmdls.fromCbor(HexBlob.fromBytes(reader.readEncodedValue()));
          break;
        case 19n:
          params.#executionCosts = ExUnitPrices.fromCbor(HexBlob.fromBytes(reader.readEncodedValue()));
          break;
        case 20n:
          params.#maxTxExUnits = ExUnits.fromCbor(HexBlob.fromBytes(reader.readEncodedValue()));
          break;
        case 21n:
          params.#maxBlockExUnits = ExUnits.fromCbor(HexBlob.fromBytes(reader.readEncodedValue()));
          break;
        case 22n:
          params.#maxValueSize = Number(reader.readInt());
          break;
        case 23n:
          params.#collateralPercentage = Number(reader.readInt());
          break;
        case 24n:
          params.#maxCollateralInputs = Number(reader.readInt());
          break;
      }
    }

    reader.readEndMap();

    params.#originalBytes = cbor;

    return params;
  }

  /**
   * Creates a Core CostModels object from the current ProtocolParamUpdate object.
   *
   * @returns The Core CostModels object.
   */
  toCore(): Cardano.ProtocolParametersUpdate {
    return {
      coinsPerUtxoByte: this.#adaPerUtxoByte ? Number(this.#adaPerUtxoByte) : undefined,
      collateralPercentage: this.#collateralPercentage,
      costModels: this.#costModels?.toCore(),
      decentralizationParameter: this.#d ? this.#d.toFloat().toString() : undefined,
      desiredNumberOfPools: this.#nOpt,
      extraEntropy: this.#extraEntropy,
      maxBlockBodySize: this.#maxBlockBodySize,
      maxBlockHeaderSize: this.#maxBlockHeaderSize,
      maxCollateralInputs: this.#maxCollateralInputs,
      maxExecutionUnitsPerBlock: this.#maxBlockExUnits?.toCore(),
      maxExecutionUnitsPerTransaction: this.#maxTxExUnits?.toCore(),
      maxTxSize: this.#maxTxSize ? Number(this.#maxTxSize) : undefined,
      maxValueSize: this.#maxValueSize,
      minFeeCoefficient: this.#minFeeA ? Number(this.#minFeeA) : undefined,
      minFeeConstant: this.#minFeeB ? Number(this.#minFeeB) : undefined,
      minPoolCost: this.#minPoolCost ? Number(this.#minPoolCost) : undefined,
      monetaryExpansion: this.#expansionRate ? this.#expansionRate.toFloat().toString() : undefined,
      poolDeposit: this.#poolDeposit ? Number(this.#poolDeposit) : undefined,
      poolInfluence: this.#poolPledgeInfluence ? this.#poolPledgeInfluence.toFloat().toString() : undefined,
      poolRetirementEpochBound: this.#maxEpoch,
      prices: this.#executionCosts?.toCore(),
      protocolVersion: this.#protocolVersion?.toCore(),
      stakeKeyDeposit: this.#keyDeposit ? Number(this.#keyDeposit) : undefined,
      treasuryExpansion: this.#treasuryGrowthRate ? this.#treasuryGrowthRate.toFloat().toString() : undefined
    };
  }

  /**
   * Creates a ProtocolParamUpdate object from the given Core CostModels object.
   *
   * @param parametersUpdate core parametersUpdate object.
   */
  static fromCore(parametersUpdate: Cardano.ProtocolParametersUpdate) {
    const params = new ProtocolParamUpdate();

    params.#minFeeA = parametersUpdate.minFeeCoefficient ? BigInt(parametersUpdate.minFeeCoefficient) : undefined;
    params.#maxBlockBodySize = parametersUpdate.maxBlockBodySize;
    params.#minFeeB = parametersUpdate.minFeeConstant ? BigInt(parametersUpdate.minFeeConstant) : undefined;
    params.#maxBlockHeaderSize = parametersUpdate.maxBlockHeaderSize;
    params.#keyDeposit = parametersUpdate.stakeKeyDeposit ? BigInt(parametersUpdate.stakeKeyDeposit) : undefined;
    params.#poolDeposit = parametersUpdate.poolDeposit ? BigInt(parametersUpdate.poolDeposit) : undefined;
    params.#maxEpoch = parametersUpdate.poolRetirementEpochBound;
    params.#nOpt = parametersUpdate.desiredNumberOfPools;
    params.#poolPledgeInfluence = UnitInterval.fromFloat(Number(parametersUpdate.poolInfluence));
    params.#expansionRate = UnitInterval.fromFloat(Number(parametersUpdate.monetaryExpansion));
    params.#treasuryGrowthRate = UnitInterval.fromFloat(Number(parametersUpdate.treasuryExpansion));
    params.#d = UnitInterval.fromFloat(Number(parametersUpdate.decentralizationParameter));
    params.#minPoolCost = parametersUpdate.minPoolCost ? BigInt(parametersUpdate.minPoolCost) : undefined;
    params.#protocolVersion = parametersUpdate.protocolVersion
      ? ProtocolVersion.fromCore(parametersUpdate.protocolVersion)
      : undefined;
    params.#maxValueSize = parametersUpdate.maxValueSize;
    params.#maxTxSize = parametersUpdate.maxTxSize;
    params.#collateralPercentage = parametersUpdate.collateralPercentage;
    params.#maxCollateralInputs = parametersUpdate.maxCollateralInputs;
    params.#extraEntropy = parametersUpdate.extraEntropy ? HexBlob(parametersUpdate.extraEntropy) : undefined;
    params.#costModels = parametersUpdate.costModels ? Costmdls.fromCore(parametersUpdate.costModels) : undefined;
    params.#executionCosts = parametersUpdate.prices ? ExUnitPrices.fromCore(parametersUpdate.prices) : undefined;
    params.#maxTxExUnits = parametersUpdate.maxExecutionUnitsPerTransaction
      ? ExUnits.fromCore(parametersUpdate.maxExecutionUnitsPerTransaction)
      : undefined;
    params.#maxBlockExUnits = parametersUpdate.maxExecutionUnitsPerBlock
      ? ExUnits.fromCore(parametersUpdate.maxExecutionUnitsPerBlock)
      : undefined;
    params.#adaPerUtxoByte = parametersUpdate.coinsPerUtxoByte ? BigInt(parametersUpdate.coinsPerUtxoByte) : undefined;

    return params;
  }

  /**
   * minfeeA and minfeeB are two separate parameters in Cardano's fee calculation
   * to ensure flexibility and fine-grained control over how transaction fees are
   * determined. Both of these parameters come into play when deciding the cost of
   * a transaction, and they serve different purposes.
   *
   * The transaction fee in Cardano is computed as: fee = minfeeA * size + minfeeB.
   *
   * minfeeA it's multiplied by the size of the transaction. This means it's primarily responsible
   * for how the fee scales with the transaction's size. If minfeeA is high, then the cost per byte
   * of transaction data is high. This encourages users to minimize the size of their transactions.
   *
   * Conversely, if minfeeA is low, the cost per byte is low, but other factors (like minfeeB) can still
   * influence the overall fee.
   *
   * @param minFeeA fee to be multiplied by the transaction size.
   */
  setMinFeeA(minFeeA: Cardano.Lovelace): void {
    this.#minFeeA = minFeeA;
  }

  /**
   * Gets the minFeeA component of the transaction fee computation.
   *
   * @returns The transaction fee to be multiplied by the transaction size, or undefined
   * if not set.
   */
  minFeeA(): Cardano.Lovelace | undefined {
    return this.#minFeeA;
  }

  /**
   * minfeeB it's a constant added to the transaction fee irrespective of the transaction's size.
   * Think of it as a "base fee" for processing the transaction. A higher minfeeB means every
   * transaction will have a higher minimum cost, regardless of its size.
   *
   * This discourages spamming the network with a large number of tiny transactions.
   *
   * @param minFeeB fee to be added to every transaction regardless of its size, or undefined
   * if not set.
   */
  setMinFeeB(minFeeB: Cardano.Lovelace): void {
    this.#minFeeB = minFeeB;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the minFeeB component of the transaction fee computation.
   *
   * @returns The transaction fee to be added to every transaction regardless of its size, or undefined
   * if not set.
   */
  minFeeB(): Cardano.Lovelace | undefined {
    return this.#minFeeB;
  }

  /**
   * Sets the maximum block body size. It sets an upper limit on the size of the block's body.
   *
   * @param maxBlockBodySize The block body size in bytes.
   */
  setMaxBlockBodySize(maxBlockBodySize: number): void {
    this.#maxBlockBodySize = maxBlockBodySize;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the maximum block body size.
   *
   * @returns The maximum block body size in bytes, or undefined
   * if not set.
   */
  maxBlockBodySize(): number | undefined {
    return this.#maxBlockBodySize;
  }

  /**
   * Sets the maximum transaction size. This limits the size of individual transactions.
   *
   * @param maxTxSize The transaction size in bytes.
   */
  setMaxTxSize(maxTxSize: number): void {
    this.#maxTxSize = maxTxSize;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the maximum transaction size. This limits the size of individual transactions.
   *
   * @returns The transaction size in bytes, or undefined
   * if not set.
   */
  maxTxSize(): number | undefined {
    return this.#maxTxSize;
  }

  /**
   * Sets the maximum block header size.
   *
   * @param maxBlockHeaderSize The block header size in bytes.
   */
  setMaxBlockHeaderSize(maxBlockHeaderSize: number): void {
    this.#maxBlockHeaderSize = maxBlockHeaderSize;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the maximum block header size.
   *
   * @returns The block header size in bytes, or undefined
   * if not set.
   */
  maxBlockHeaderSize(): number | undefined {
    return this.#maxBlockHeaderSize;
  }

  /**
   * Sets the amount of ADA required as a deposit for staking key registration.
   *
   * @param keyDeposit The amount of ADA required in lovelace.
   */
  setKeyDeposit(keyDeposit: Cardano.Lovelace): void {
    this.#keyDeposit = keyDeposit;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the amount of ADA required as a deposit for staking key registration.
   *
   * @returns The amount of ADA required in lovelace, or undefined
   * if not set.
   */
  keyDeposit(): Cardano.Lovelace | undefined {
    return this.#keyDeposit;
  }

  /**
   * Sets the amount of ADA required as a deposit for stake pool registration.
   *
   * @param poolDeposit The amount of ADA required in lovelace, or undefined
   * if not set.
   */
  setPoolDeposit(poolDeposit: Cardano.Lovelace): void {
    this.#poolDeposit = poolDeposit;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the amount of ADA required as a deposit for stake pool registration.
   *
   * @returns The amount of ADA required in lovelace, or undefined
   * if not set.
   */
  poolDeposit(): Cardano.Lovelace | undefined {
    return this.#poolDeposit;
  }

  /**
   * Sets the maximum epoch (number of epochs) for which a pool can be ranked in
   * the non-myopic member rewards.
   *
   * @param maxEpoch The maximum number of epochs.
   */
  setMaxEpoch(maxEpoch: number): void {
    this.#maxEpoch = maxEpoch;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the maximum epoch (number of epochs) for which a pool can be ranked in
   * the non-myopic member rewards.
   *
   * @returns The maximum epoch number of epochs, or undefined
   * if not set.
   */
  maxEpoch(): number | undefined {
    return this.#maxEpoch;
  }

  /**
   * Sets the desired number of stake pools. It's used in the rewards calculation
   * to encourage a certain number of active stake pools.
   *
   * @param nOpt The desired number of stake pools.
   */
  setNOpt(nOpt: number): void {
    this.#nOpt = nOpt;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the desired number of stake pools. It's used in the rewards calculation
   * to encourage a certain number of active stake pools.
   *
   * @returns The desired number of stake pools, or undefined
   * if not set.
   */
  nOpt(): number | undefined {
    return this.#nOpt;
  }

  /**
   * Sets the pool pledge power of influencing rewards for stake pools, determining how
   * much stake pool owners versus delegators get.
   *
   * @param poolPledgeInfluence The pool pledge power of influence over rewards (a0).
   */
  setPoolPledgeInfluence(poolPledgeInfluence: UnitInterval): void {
    this.#poolPledgeInfluence = poolPledgeInfluence;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the pool pledge power of influencing rewards for stake pools, determining how
   * much stake pool owners versus delegators get.
   *
   * @returns The pool pledge power of influence over rewards (a0), or undefined
   * if not set.
   */
  poolPledgeInfluence(): UnitInterval | undefined {
    return this.#poolPledgeInfluence;
  }

  /**
   * Sets the rate at which ADA is taken from the reserves and used for epoch rewards and treasury.
   *
   * @param expansionRate  The rate at which ADA is taken from the reserves.
   */
  setExpansionRate(expansionRate: UnitInterval): void {
    this.#expansionRate = expansionRate;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the rate at which ADA is taken from the reserves and used for epoch rewards and treasury.
   *
   * @returns The rate at which ADA is taken from the reserves, or undefined
   * if not set.
   */
  expansionRate(): UnitInterval | undefined {
    return this.#expansionRate;
  }

  /**
   * Sets the percentage of rewards taken from the total to populate the treasury.
   *
   * @param treasuryGrowthRate The percentage of rewards.
   */
  setTreasuryGrowthRate(treasuryGrowthRate: UnitInterval): void {
    this.#treasuryGrowthRate = treasuryGrowthRate;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the percentage of rewards taken from the total to populate the treasury.
   *
   * @returns The percentage of rewards, or undefined
   * if not set.
   */
  treasuryGrowthRate(): UnitInterval | undefined {
    return this.#treasuryGrowthRate;
  }

  // Alonzo

  /**
   * Sets the degree of decentralization; ranges from 0 to 1. A value of 1 indicates
   * complete decentralization, i.e., all blocks are produced by community stake pools,
   * while 0 would indicate a fully centralized scenario.
   *
   * REMARK: This parameter is only used in the Alonzo era. Do not set it for other eras.
   *
   * @param d The degree of decentralization.
   */
  setD(d: UnitInterval): void {
    this.#d = d;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the degree of decentralization; ranges from 0 to 1. A value of 1 indicates
   * complete decentralization, i.e., all blocks are produced by community stake pools,
   * while 0 would indicate a fully centralized scenario.
   *
   * @returns The degree of decentralization, or undefined
   * if not set.
   */
  d(): UnitInterval | undefined {
    return this.#d;
  }

  /**
   * Sets additional randomness used to seed the pseudo-random number generator for leader election.
   *
   * REMARK: This parameter is only used in the Alonzo era. Do not set it for other eras.
   *
   * @param extraEntropy The additional randomness.
   */
  setExtraEntropy(extraEntropy: HexBlob): void {
    this.#extraEntropy = extraEntropy;
    this.#originalBytes = undefined;
  }

  /**
   * Gets additional randomness used to seed the pseudo-random number generator for leader election.
   *
   * @returns The additional randomness, or undefined
   * if not set.
   */
  extraEntropy(): HexBlob | undefined {
    return this.#extraEntropy;
  }

  /**
   * Sets the proposed protocol version. It's a tuple two numbers: major and minor.
   *
   * @param protocolVersion the protocol version.
   */
  setProtocolVersion(protocolVersion: ProtocolVersion): void {
    this.#protocolVersion = protocolVersion;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the proposed protocol version. It's a tuple two numbers: major and minor.
   *
   * @returns The protocol version, or undefined
   * if not set.
   */
  protocolVersion(): ProtocolVersion | undefined {
    return this.#protocolVersion;
  }

  /**
   * Sets the minimum operational cost for a stake pool per epoch, ensuring that
   * stake pools cannot advertise a cost that is too low.
   *
   * @param minPoolCost The minimum operational cost.
   */
  setMinPoolCost(minPoolCost: Cardano.Lovelace): void {
    this.#minPoolCost = minPoolCost;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the minimum operational cost for a stake pool per epoch, ensuring that
   * stake pools cannot advertise a cost that is too low.
   *
   * @returns The minimum operational cost, or undefined
   * if not set.
   */
  minPoolCost(): Cardano.Lovelace | undefined {
    return this.#minPoolCost;
  }

  /**
   * Sets the cost in Lovelaces for storing one byte of data.
   *
   * @param adaPerUtxoByte The cost in Lovelaces for storing one byte of data.
   */
  setAdaPerUtxoByte(adaPerUtxoByte: Cardano.Lovelace): void {
    this.#adaPerUtxoByte = adaPerUtxoByte;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the cost for storing one byte of data.
   *
   * @returns The cost  for storing one byte of data, or undefined
   * if not set.
   */
  adaPerUtxoByte(): Cardano.Lovelace | undefined {
    return this.#adaPerUtxoByte;
  }

  /**
   * Sets the cost models for Plutus scripts, defining the resources each
   * operation in a Plutus script consumes.
   *
   * @param costModels The cost models for Plutus scripts.
   */
  setCostModels(costModels: Costmdls): void {
    this.#costModels = costModels;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the cost models for Plutus scripts, defining the resources each
   * operation in a Plutus script consumes.
   *
   * @returns The cost models for Plutus scripts, or undefined
   * if not set.
   */
  costModels(): Costmdls | undefined {
    return this.#costModels;
  }

  /**
   * Sets the prices for the ExUnits consumed by Plutus scripts.
   *
   * @param executionCosts The prices for the ExUnits.
   */
  setExecutionCosts(executionCosts: ExUnitPrices): void {
    this.#executionCosts = executionCosts;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the prices for the ExUnits consumed by Plutus scripts.
   *
   * @returns The prices for the ExUnits, or undefined
   * if not set.
   */
  executionCosts(): ExUnitPrices | undefined {
    return this.#executionCosts;
  }

  /**
   * Sets the maximum ExUnits that a transaction can consume.
   *
   * @param maxTxExUnits The maximum ExUnits.
   */
  setMaxTxExUnits(maxTxExUnits: ExUnits): void {
    this.#maxTxExUnits = maxTxExUnits;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the maximum ExUnits that a transaction can consume.
   *
   * @returns The maximum ExUnits, or undefined
   * if not set.
   */
  maxTxExUnits(): ExUnits | undefined {
    return this.#maxTxExUnits;
  }

  /**
   * Sets the maximum ExUnits that a block can consume.
   *
   * @param maxBlockExUnits The maximum ExUnits.
   */
  setMaxBlockExUnits(maxBlockExUnits: ExUnits): void {
    this.#maxBlockExUnits = maxBlockExUnits;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the maximum ExUnits that a block can consume.
   *
   * @returns The maximum ExUnits, or undefined
   * if not set.
   */
  maxBlockExUnits(): ExUnits | undefined {
    return this.#maxBlockExUnits;
  }

  /**
   * Sets the maximum serialized length (in bytes) of a multi-asset value (token bundle)
   * in a transaction output.
   *
   * @param maxValueSize The maximum serialized length (in bytes).
   */
  setMaxValueSize(maxValueSize: number): void {
    this.#maxValueSize = maxValueSize;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the maximum serialized length (in bytes) of a multi-asset value (token bundle)
   * in a transaction output.
   *
   * @returns The maximum serialized length (in bytes), or undefined
   * if not set.
   */
  maxValueSize(): number | undefined {
    return this.#maxValueSize;
  }

  /**
   * Sets the percentage of the total transaction fee its collateral must (at minimum) cover.
   *
   * @param collateralPercentage The percentage of the total transaction fee.
   */
  setCollateralPercentage(collateralPercentage: number): void {
    this.#collateralPercentage = collateralPercentage;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the percentage of the total transaction fee its collateral must (at minimum) cover.
   *
   * @returns The percentage of the total transaction fee, or undefined
   * if not set.
   */
  collateralPercentage(): number | undefined {
    return this.#collateralPercentage;
  }

  /**
   * Sets the limit the total number of collateral inputs, and thus the total number of additional
   * signatures that must be checked during validation.
   *
   * @param maxCollateralInputs The max number of total collateral inputs allowed in a transaction.
   */
  setMaxCollateralInputs(maxCollateralInputs: number): void {
    this.#maxCollateralInputs = maxCollateralInputs;
    this.#originalBytes = undefined;
  }

  /**
   * Gets the limit the total number of collateral inputs, and thus the total number of additional
   * signatures that must be checked during validation.
   *
   * @returns The max number of total collateral inputs allowed in a transaction, or undefined
   * if not set.
   */
  maxCollateralInputs(): number | undefined {
    return this.#maxCollateralInputs;
  }

  /**
   * Gets the size of the serialized map.
   *
   * @private
   */
  #getMapSize(): number {
    let mapSize = 0;

    if (this.#minFeeA) ++mapSize;
    if (this.#minFeeB) ++mapSize;
    if (this.#maxBlockBodySize) ++mapSize;
    if (this.#maxTxSize) ++mapSize;
    if (this.#maxBlockHeaderSize) ++mapSize;
    if (this.#keyDeposit) ++mapSize;
    if (this.#poolDeposit) ++mapSize;
    if (this.#maxEpoch) ++mapSize;
    if (this.#nOpt) ++mapSize;
    if (this.#poolPledgeInfluence) ++mapSize;
    if (this.#expansionRate) ++mapSize;
    if (this.#treasuryGrowthRate) ++mapSize;
    if (this.#d) ++mapSize;
    if (this.#extraEntropy) ++mapSize;
    if (this.#protocolVersion) ++mapSize;
    if (this.#minPoolCost) ++mapSize;
    if (this.#adaPerUtxoByte) ++mapSize;
    if (this.#costModels) ++mapSize;
    if (this.#executionCosts) ++mapSize;
    if (this.#maxTxExUnits) ++mapSize;
    if (this.#maxBlockExUnits) ++mapSize;
    if (this.#maxValueSize) ++mapSize;
    if (this.#collateralPercentage) ++mapSize;
    if (this.#maxCollateralInputs) ++mapSize;

    return mapSize;
  }
}
