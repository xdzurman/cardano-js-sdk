/* eslint-disable unicorn/no-nested-ternary */
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  AddressDiscovery,
  BalanceTracker,
  ConnectionStatus,
  ConnectionStatusTracker,
  DelegationTracker,
  FailedTx,
  HDSequentialDiscovery,
  OutgoingTx,
  PersistentDocumentTrackerSubject,
  PollingConfig,
  SmartTxSubmitProvider,
  TipTracker,
  TrackedAssetProvider,
  TrackedChainHistoryProvider,
  TrackedRewardsProvider,
  TrackedStakePoolProvider,
  TrackedTxSubmitProvider,
  TrackedUtxoProvider,
  TrackedWalletNetworkInfoProvider,
  TransactionFailure,
  TransactionsTracker,
  UtxoTracker,
  WalletUtil,
  createAssetsTracker,
  createBalanceTracker,
  createDelegationTracker,
  createHandlesTracker,
  createProviderStatusTracker,
  createSimpleConnectionStatusTracker,
  createTransactionReemitter,
  createTransactionsTracker,
  createUtxoTracker,
  createWalletUtil,
  currentEpochTracker,
  distinctBlock,
  distinctEraSummaries,
  groupedAddressesEquals
} from '../services';
import {
  AssetProvider,
  Cardano,
  CardanoNodeErrors,
  ChainHistoryProvider,
  EpochInfo,
  EraSummary,
  HandleProvider,
  ProviderError,
  RewardsProvider,
  Serialization,
  StakePoolProvider,
  TxCBOR,
  TxSubmitProvider,
  UtxoProvider
} from '@cardano-sdk/core';
import {
  Assets,
  FinalizeTxProps,
  HandleInfo,
  ObservableWallet,
  SignDataProps,
  SyncStatus,
  WalletNetworkInfoProvider
} from '../types';
import { AsyncKeyAgent, GroupedAddress, cip8, util as keyManagementUtil } from '@cardano-sdk/key-management';
import { BehaviorObservable, TrackerSubject, coldObservableProvider } from '@cardano-sdk/util-rxjs';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  Subscription,
  catchError,
  concat,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  from,
  map,
  mergeMap,
  switchMap,
  tap,
  throwError
} from 'rxjs';
import {
  ChangeAddressResolver,
  InputSelector,
  StaticChangeAddressResolver,
  roundRobinRandomImprove
} from '@cardano-sdk/input-selection';
import { Cip30DataSignature } from '@cardano-sdk/dapp-connector';
import { Ed25519PublicKeyHex } from '@cardano-sdk/crypto';
import {
  GenericTxBuilder,
  InitializeTxProps,
  InitializeTxResult,
  InvalidConfigurationError,
  SignedTx,
  TxBuilderDependencies,
  finalizeTx,
  initializeTx
} from '@cardano-sdk/tx-construction';
import { Logger } from 'ts-log';
import { RetryBackoffConfig } from 'backoff-rxjs';
import { Shutdown, contextLogger, deepEquals, usingAutoFree } from '@cardano-sdk/util';
import { WalletStores, createInMemoryWalletStores } from '../persistence';
import { createActivePublicStakeKeysTracker } from '../services/ActiveStakePublicKeysTracker';
import isEqual from 'lodash/isEqual';
import uniq from 'lodash/uniq';
import type { KoraLabsHandleProvider } from '@cardano-sdk/cardano-services-client';

export interface PersonalWalletProps {
  readonly name: string;
  readonly polling?: PollingConfig;
  readonly retryBackoffConfig?: RetryBackoffConfig;
}

export interface PersonalWalletDependencies {
  readonly keyAgent: AsyncKeyAgent;
  readonly txSubmitProvider: TxSubmitProvider;
  readonly stakePoolProvider: StakePoolProvider;
  readonly assetProvider: AssetProvider;
  readonly handleProvider?: HandleProvider | KoraLabsHandleProvider;
  readonly networkInfoProvider: WalletNetworkInfoProvider;
  readonly utxoProvider: UtxoProvider;
  readonly chainHistoryProvider: ChainHistoryProvider;
  readonly rewardsProvider: RewardsProvider;
  readonly inputSelector?: InputSelector;
  readonly stores?: WalletStores;
  readonly logger: Logger;
  readonly connectionStatusTracker$?: ConnectionStatusTracker;
  readonly addressDiscovery?: AddressDiscovery;
}

export interface SubmitTxOptions {
  mightBeAlreadySubmitted?: boolean;
}

export const DEFAULT_POLLING_CONFIG = {
  maxInterval: 5000 * 20,
  maxIntervalMultiplier: 20,
  pollInterval: 5000
};

export const DEFAULT_LOOK_AHEAD_SEARCH = 20;

// Adjust the number of slots to wait until a transaction is considered lost (send but not found on chain)
// Configured to 2.5 because on preprod/mainnet, blocks produced at more than 250 slots apart are very rare (1 per epoch or less).
// Ideally we should calculate this based on the activeSlotsCoeff and probability of a single block per epoch.
const BLOCK_SLOT_GAP_MULTIPLIER = 2.5;

const isOutgoingTx = (input: Cardano.Tx | TxCBOR | OutgoingTx | SignedTx): input is OutgoingTx =>
  typeof input === 'object' && 'cbor' in input;
const isTxCBOR = (input: Cardano.Tx | TxCBOR | OutgoingTx | SignedTx): input is TxCBOR => typeof input === 'string';
const isSignedTx = (input: Cardano.Tx | TxCBOR | OutgoingTx | SignedTx): input is SignedTx =>
  typeof input === 'object' && 'context' in input;
const processOutgoingTx = (input: Cardano.Tx | TxCBOR | OutgoingTx | SignedTx): OutgoingTx => {
  // TxCbor
  if (isTxCBOR(input)) {
    return usingAutoFree((scope) => {
      const tx = scope.manage(Serialization.Transaction.fromCbor(input));
      return {
        body: tx.toCore().body,
        cbor: input,
        // Do not re-serialize transaction body to compute transaction id
        id: tx.getId()
      };
    });
  }
  // SignedTx
  if (isSignedTx(input)) {
    return {
      body: input.tx.body,
      cbor: input.cbor,
      context: input.context,
      // Do not re-serialize transaction body to compute transaction id
      id: input.tx.id
    };
  }
  // OutgoingTx (resubmitted)
  if (isOutgoingTx(input)) {
    return input;
  }
  return {
    body: input.body,
    cbor: TxCBOR.serialize(input),
    id: input.id
  };
};

export class PersonalWallet implements ObservableWallet {
  #inputSelector: InputSelector;
  #logger: Logger;
  #tip$: TipTracker;
  #newTransactions = {
    failedToSubmit$: new Subject<FailedTx>(),
    pending$: new Subject<OutgoingTx>(),
    submitting$: new Subject<OutgoingTx>()
  };
  #reemitSubscriptions: Subscription;
  #failedFromReemitter$: Subject<FailedTx>;
  #trackedTxSubmitProvider: TrackedTxSubmitProvider;
  #addressDiscovery: AddressDiscovery;
  #submittingPromises: Partial<Record<Cardano.TransactionId, Promise<Cardano.TransactionId>>> = {};

  readonly keyAgent: AsyncKeyAgent;
  readonly currentEpoch$: TrackerSubject<EpochInfo>;
  readonly txSubmitProvider: TxSubmitProvider;
  readonly utxoProvider: TrackedUtxoProvider;
  readonly networkInfoProvider: TrackedWalletNetworkInfoProvider;
  readonly stakePoolProvider: TrackedStakePoolProvider;
  readonly assetProvider: TrackedAssetProvider;
  readonly chainHistoryProvider: TrackedChainHistoryProvider;
  readonly utxo: UtxoTracker;
  readonly balance: BalanceTracker;
  readonly transactions: TransactionsTracker & Shutdown;
  readonly delegation: DelegationTracker & Shutdown;
  readonly tip$: BehaviorObservable<Cardano.Tip>;
  readonly eraSummaries$: TrackerSubject<EraSummary[]>;
  readonly addresses$: TrackerSubject<GroupedAddress[]>;
  readonly protocolParameters$: TrackerSubject<Cardano.ProtocolParameters>;
  readonly genesisParameters$: TrackerSubject<Cardano.CompactGenesis>;
  readonly assetInfo$: TrackerSubject<Assets>;
  readonly fatalError$: Subject<unknown>;
  readonly syncStatus: SyncStatus;
  readonly name: string;
  readonly util: WalletUtil;
  readonly rewardsProvider: TrackedRewardsProvider;
  readonly handleProvider: HandleProvider;
  readonly changeAddressResolver: ChangeAddressResolver;
  readonly activePublicStakeKeys$: TrackerSubject<Ed25519PublicKeyHex[]>;
  handles$: Observable<HandleInfo[]>;

  // eslint-disable-next-line max-statements
  constructor(
    {
      name,
      polling: {
        interval: pollInterval = DEFAULT_POLLING_CONFIG.pollInterval,
        maxInterval = pollInterval * DEFAULT_POLLING_CONFIG.maxIntervalMultiplier,
        consideredOutOfSyncAfter = 1000 * 60 * 3
      } = {},
      retryBackoffConfig = {
        initialInterval: Math.min(pollInterval, 1000),
        maxInterval
      }
    }: PersonalWalletProps,
    {
      txSubmitProvider,
      stakePoolProvider,
      keyAgent,
      assetProvider,
      handleProvider,
      networkInfoProvider,
      utxoProvider,
      chainHistoryProvider,
      rewardsProvider,
      logger,
      inputSelector,
      stores = createInMemoryWalletStores(),
      connectionStatusTracker$ = createSimpleConnectionStatusTracker(),
      addressDiscovery = new HDSequentialDiscovery(chainHistoryProvider, DEFAULT_LOOK_AHEAD_SEARCH)
    }: PersonalWalletDependencies
  ) {
    this.#logger = contextLogger(logger, name);

    this.#addressDiscovery = addressDiscovery;
    this.#trackedTxSubmitProvider = new TrackedTxSubmitProvider(txSubmitProvider);

    this.utxoProvider = new TrackedUtxoProvider(utxoProvider);
    this.networkInfoProvider = new TrackedWalletNetworkInfoProvider(networkInfoProvider);
    this.stakePoolProvider = new TrackedStakePoolProvider(stakePoolProvider);
    this.assetProvider = new TrackedAssetProvider(assetProvider);
    this.handleProvider = handleProvider as HandleProvider;
    this.chainHistoryProvider = new TrackedChainHistoryProvider(chainHistoryProvider);
    this.rewardsProvider = new TrackedRewardsProvider(rewardsProvider);

    this.syncStatus = createProviderStatusTracker(
      {
        assetProvider: this.assetProvider,
        chainHistoryProvider: this.chainHistoryProvider,
        logger: contextLogger(this.#logger, 'syncStatus'),
        networkInfoProvider: this.networkInfoProvider,
        rewardsProvider: this.rewardsProvider,
        stakePoolProvider: this.stakePoolProvider,
        utxoProvider: this.utxoProvider
      },
      { consideredOutOfSyncAfter }
    );

    this.keyAgent = keyAgent;

    this.fatalError$ = new Subject();

    const onFatalError = this.fatalError$.next.bind(this.fatalError$);

    this.name = name;
    const cancel$ = connectionStatusTracker$.pipe(
      tap((status) => (status === ConnectionStatus.up ? 'Connection UP' : 'Connection DOWN')),
      filter((status) => status === ConnectionStatus.down)
    );

    this.addresses$ = new TrackerSubject<GroupedAddress[]>(
      concat(
        stores.addresses.get(),
        keyAgent.knownAddresses$.pipe(
          distinctUntilChanged(groupedAddressesEquals),
          tap(
            // derive addresses if none available
            (addresses) => {
              if (addresses.length === 0) {
                this.#logger.debug('No addresses available; initiating address discovery process');

                firstValueFrom(
                  coldObservableProvider({
                    cancel$,
                    onFatalError,
                    provider: () => this.#addressDiscovery.discover(keyAgent),
                    retryBackoffConfig
                  })
                ).catch(() => this.#logger.error('Failed to complete the address discovery process'));
              }
            }
          ),
          filter((addresses) => addresses.length > 0),
          tap(stores.addresses.set.bind(stores.addresses))
        )
      )
    );

    this.#inputSelector = inputSelector
      ? inputSelector
      : roundRobinRandomImprove({
          changeAddressResolver: new StaticChangeAddressResolver(() =>
            firstValueFrom(
              this.syncStatus.isSettled$.pipe(
                filter((isSettled) => isSettled),
                switchMap(() => this.addresses$)
              )
            )
          )
        });

    this.#tip$ = this.tip$ = new TipTracker({
      connectionStatus$: connectionStatusTracker$,
      logger: contextLogger(this.#logger, 'tip$'),
      maxPollInterval: maxInterval,
      minPollInterval: pollInterval,
      provider$: coldObservableProvider({
        cancel$,
        onFatalError,
        provider: this.networkInfoProvider.ledgerTip,
        retryBackoffConfig
      }),
      store: stores.tip,
      syncStatus: this.syncStatus
    });
    const tipBlockHeight$ = distinctBlock(this.tip$);

    this.txSubmitProvider = new SmartTxSubmitProvider(
      { retryBackoffConfig },
      {
        connectionStatus$: connectionStatusTracker$,
        tip$: this.tip$,
        txSubmitProvider: this.#trackedTxSubmitProvider
      }
    );

    // Era summaries
    const eraSummariesTrigger = new BehaviorSubject<void>(void 0);
    this.eraSummaries$ = new PersistentDocumentTrackerSubject(
      coldObservableProvider({
        cancel$,
        equals: deepEquals,
        onFatalError,
        provider: this.networkInfoProvider.eraSummaries,
        retryBackoffConfig,
        trigger$: eraSummariesTrigger.pipe(tap(() => 'Trigger request era summaries'))
      }),
      stores.eraSummaries
    );

    // Epoch tracker triggers the first eraSummaries fetch from eraSummariesTrigger
    // Epoch changes also trigger refetch of eraSummaries
    this.currentEpoch$ = currentEpochTracker(
      this.tip$,
      this.eraSummaries$.pipe(tap((es) => this.#logger.debug('Era summaries are', es)))
    );
    this.currentEpoch$.pipe(map(() => void 0)).subscribe(eraSummariesTrigger);
    const epoch$ = this.currentEpoch$.pipe(
      map((epoch) => epoch.epochNo),
      tap((epoch) => this.#logger.debug(`Current epoch is ${epoch}`))
    );
    this.protocolParameters$ = new PersistentDocumentTrackerSubject(
      coldObservableProvider({
        cancel$,
        equals: isEqual,
        onFatalError,
        provider: this.networkInfoProvider.protocolParameters,
        retryBackoffConfig,
        trigger$: epoch$
      }),
      stores.protocolParameters
    );
    this.genesisParameters$ = new PersistentDocumentTrackerSubject(
      coldObservableProvider({
        cancel$,
        equals: isEqual,
        onFatalError,
        provider: this.networkInfoProvider.genesisParameters,
        retryBackoffConfig,
        trigger$: epoch$
      }),
      stores.genesisParameters
    );

    const addresses$ = this.addresses$.pipe(
      map((addresses) => addresses.map((groupedAddress) => groupedAddress.address))
    );
    this.#failedFromReemitter$ = new Subject<FailedTx>();
    this.transactions = createTransactionsTracker({
      addresses$,
      chainHistoryProvider: this.chainHistoryProvider,
      failedFromReemitter$: this.#failedFromReemitter$,
      inFlightTransactionsStore: stores.inFlightTransactions,
      logger: contextLogger(this.#logger, 'transactions'),
      newTransactions: this.#newTransactions,
      onFatalError,
      retryBackoffConfig,
      tip$: this.tip$,
      transactionsHistoryStore: stores.transactions
    });

    const transactionsReemitter = createTransactionReemitter({
      genesisParameters$: this.genesisParameters$,
      logger: contextLogger(this.#logger, 'transactionsReemitter'),
      maxInterval: maxInterval * BLOCK_SLOT_GAP_MULTIPLIER,
      stores,
      tipSlot$: this.tip$.pipe(map((tip) => tip.slot)),
      transactions: this.transactions
    });

    this.#reemitSubscriptions = new Subscription();
    this.#reemitSubscriptions.add(transactionsReemitter.failed$.subscribe(this.#failedFromReemitter$));
    this.#reemitSubscriptions.add(
      transactionsReemitter.reemit$
        .pipe(
          mergeMap((tx) => from(this.submitTx(tx, { mightBeAlreadySubmitted: true }))),
          catchError((err) => {
            this.#logger.error('Failed to resubmit transaction', err);
            return EMPTY;
          })
        )
        .subscribe()
    );

    this.utxo = createUtxoTracker({
      addresses$,
      logger: contextLogger(this.#logger, 'utxo'),
      onFatalError,
      retryBackoffConfig,
      stores,
      tipBlockHeight$,
      transactionsInFlight$: this.transactions.outgoing.inFlight$,
      utxoProvider: this.utxoProvider
    });

    const eraSummaries$ = distinctEraSummaries(this.eraSummaries$);
    this.delegation = createDelegationTracker({
      epoch$,
      eraSummaries$,
      knownAddresses$: this.keyAgent.knownAddresses$,
      logger: contextLogger(this.#logger, 'delegation'),
      onFatalError,
      retryBackoffConfig,
      rewardAccountAddresses$: this.addresses$.pipe(
        map((addresses) => uniq(addresses.map((groupedAddress) => groupedAddress.rewardAccount)))
      ),
      rewardsTracker: this.rewardsProvider,
      stakePoolProvider: this.stakePoolProvider,
      stores,
      transactionsTracker: this.transactions,
      utxoTracker: this.utxo
    });

    this.activePublicStakeKeys$ = createActivePublicStakeKeysTracker({
      addresses$: this.addresses$,
      keyAgent: this.keyAgent,
      rewardAccounts$: this.delegation.rewardAccounts$
    });

    this.balance = createBalanceTracker(this.protocolParameters$, this.utxo, this.delegation);
    this.assetInfo$ = new PersistentDocumentTrackerSubject(
      createAssetsTracker({
        assetProvider: this.assetProvider,
        logger: contextLogger(this.#logger, 'assets$'),
        onFatalError,
        retryBackoffConfig,
        transactionsTracker: this.transactions
      }),
      stores.assets
    );

    this.handles$ = this.handleProvider
      ? this.initializeHandles(
          new PersistentDocumentTrackerSubject(
            coldObservableProvider({
              cancel$,
              equals: isEqual,
              onFatalError,
              provider: () => this.handleProvider.getPolicyIds(),
              retryBackoffConfig
            }),
            stores.policyIds
          )
        )
      : throwError(() => new InvalidConfigurationError('PersonalWallet is missing a "handleProvider"'));

    this.util = createWalletUtil({
      protocolParameters$: this.protocolParameters$,
      utxo: this.utxo
    });

    this.#logger.debug('Created');
  }

  async getName(): Promise<string> {
    return this.name;
  }

  async initializeTx(props: InitializeTxProps): Promise<InitializeTxResult> {
    return initializeTx(props, this.getTxBuilderDependencies());
  }

  async finalizeTx({ tx, ...rest }: FinalizeTxProps, stubSign = false): Promise<Cardano.Tx> {
    const { tx: signedTx } = await finalizeTx(
      tx,
      { ...rest, ownAddresses: await firstValueFrom(this.addresses$) },
      { inputResolver: this.util, keyAgent: this.keyAgent },
      stubSign
    );
    return signedTx;
  }

  private initializeHandles(handlePolicyIds$: Observable<Cardano.PolicyId[]>): Observable<HandleInfo[]> {
    return createHandlesTracker({
      assetInfo$: this.assetInfo$,
      handlePolicyIds$,
      handleProvider: this.handleProvider,
      logger: contextLogger(this.#logger, 'handles$'),
      utxo$: this.utxo.total$
    });
  }

  createTxBuilder() {
    return new GenericTxBuilder(this.getTxBuilderDependencies());
  }

  async #submitTx(
    outgoingTx: OutgoingTx,
    { mightBeAlreadySubmitted }: SubmitTxOptions = {}
  ): Promise<Cardano.TransactionId> {
    this.#logger.debug(`Submitting transaction ${outgoingTx.id}`);
    this.#newTransactions.submitting$.next(outgoingTx);
    try {
      await this.txSubmitProvider.submitTx({
        context: outgoingTx.context,
        signedTransaction: outgoingTx.cbor
      });
      const { slot: submittedAt } = await firstValueFrom(this.tip$);
      this.#logger.debug(`Submitted transaction ${outgoingTx.id} at slot ${submittedAt}`);
      this.#newTransactions.pending$.next(outgoingTx);
      return outgoingTx.id;
    } catch (error) {
      if (
        mightBeAlreadySubmitted &&
        error instanceof ProviderError &&
        // This could be improved by further parsing the error and:
        // - checking if ValueNotConservedError produced === 0 (all utxos invalid)
        // - check if UnknownOrIncompleteWithdrawalsError available withdrawal amount === wallet's reward acc balance
        (error.innerError instanceof CardanoNodeErrors.TxSubmissionErrors.ValueNotConservedError ||
          error.innerError instanceof CardanoNodeErrors.TxSubmissionErrors.UnknownOrIncompleteWithdrawalsError ||
          error.innerError instanceof CardanoNodeErrors.TxSubmissionErrors.CollectErrorsError ||
          error.innerError instanceof CardanoNodeErrors.TxSubmissionErrors.BadInputsError)
      ) {
        this.#logger.debug(
          `Transaction ${outgoingTx.id} failed with ${error.innerError}, but it appears to be already submitted...`
        );
        this.#newTransactions.pending$.next(outgoingTx);
        return outgoingTx.id;
      }
      this.#newTransactions.failedToSubmit$.next({
        error: error as CardanoNodeErrors.TxSubmissionError,
        reason: TransactionFailure.FailedToSubmit,
        ...outgoingTx
      });
      throw error;
    }
  }

  async submitTx(
    input: Cardano.Tx | TxCBOR | OutgoingTx | SignedTx,
    options: SubmitTxOptions = {}
  ): Promise<Cardano.TransactionId> {
    const outgoingTx = processOutgoingTx(input);
    if (this.#submittingPromises[outgoingTx.id]) {
      return this.#submittingPromises[outgoingTx.id]!;
    }
    return (this.#submittingPromises[outgoingTx.id] = (async () => {
      try {
        // Submit to provider only if it's either:
        // - an internal re-submission. External re-submissions are ignored,
        //   because PersonalWallet takes care of it internally.
        // - is a new submission
        if (options.mightBeAlreadySubmitted || !(await this.#isTxInFlight(outgoingTx.id))) {
          await this.#submitTx(outgoingTx, options);
        }
      } finally {
        delete this.#submittingPromises[outgoingTx.id];
      }
      return outgoingTx.id;
    })());
  }

  signData(props: SignDataProps): Promise<Cip30DataSignature> {
    return cip8.cip30signData({ keyAgent: this.keyAgent, ...props });
  }
  sync() {
    this.#tip$.sync();
  }
  shutdown() {
    this.utxo.shutdown();
    this.transactions.shutdown();
    this.eraSummaries$.complete();
    this.protocolParameters$.complete();
    this.genesisParameters$.complete();
    this.#tip$.complete();
    this.addresses$.complete();
    this.assetProvider.stats.shutdown();
    this.#trackedTxSubmitProvider.stats.shutdown();
    this.networkInfoProvider.stats.shutdown();
    this.stakePoolProvider.stats.shutdown();
    this.utxoProvider.stats.shutdown();
    this.rewardsProvider.stats.shutdown();
    this.chainHistoryProvider.stats.shutdown();
    this.keyAgent.shutdown();
    this.currentEpoch$.complete();
    this.delegation.shutdown();
    this.assetInfo$.complete();
    this.fatalError$.complete();
    this.syncStatus.shutdown();
    this.#newTransactions.failedToSubmit$.complete();
    this.#newTransactions.pending$.complete();
    this.#newTransactions.submitting$.complete();
    this.#reemitSubscriptions.unsubscribe();
    this.#failedFromReemitter$.complete();
    this.activePublicStakeKeys$.complete();
    this.#logger.debug('Shutdown');
  }

  /**
   * Sets the wallet input selector.
   *
   * @param selector The input selector to be used.
   */
  setInputSelector(selector: InputSelector) {
    this.#inputSelector = selector;
  }

  /**
   * Gets the wallet input selector.
   */
  getInputSelector() {
    return this.#inputSelector;
  }

  /**
   * Utility function that creates the TxBuilderDependencies based on the PersonalWallet observables.
   * All dependencies will wait until the wallet is settled before emitting.
   */
  getTxBuilderDependencies(): TxBuilderDependencies {
    return {
      handleProvider: this.handleProvider,
      inputResolver: this.util,
      inputSelector: this.#inputSelector,
      keyAgent: this.keyAgent,
      logger: this.#logger,
      outputValidator: this.util,
      txBuilderProviders: {
        genesisParameters: () => this.#firstValueFromSettled(this.genesisParameters$),
        protocolParameters: () => this.#firstValueFromSettled(this.protocolParameters$),
        rewardAccounts: () => this.#firstValueFromSettled(this.delegation.rewardAccounts$),
        tip: () => this.#firstValueFromSettled(this.tip$),
        utxoAvailable: () => this.#firstValueFromSettled(this.utxo.available$)
      }
    };
  }

  async #isTxInFlight(txId: Cardano.TransactionId) {
    const inFlightTxs = await firstValueFrom(this.transactions.outgoing.inFlight$);
    return inFlightTxs.some((inFlight) => inFlight.id === txId);
  }

  #firstValueFromSettled<T>(o$: Observable<T>): Promise<T> {
    return firstValueFrom(
      this.syncStatus.isSettled$.pipe(
        filter((isSettled) => isSettled),
        switchMap(() => o$)
      )
    );
  }

  async getPubDRepKey(): Promise<Ed25519PublicKeyHex> {
    return this.keyAgent.derivePublicKey(keyManagementUtil.DREP_KEY_DERIVATION_PATH);
  }
}
