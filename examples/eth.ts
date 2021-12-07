
/**
 * A collection of utilities for creating EVM-compatible Smart Contracts.
 *
 * NOTE: This source is not designed to execute directly, but instead to compile
 * to EVM-bytecode or Solidity.
 */

export type UNSIGNED_INT = number;
export type ADDRESS = number;
export type PRIMITIVE = number | ADDRESS | STRUCT;
export type STRUCT = {
  [key: string]: PRIMITIVE
};
export type VIEW = STRUCT;
export const ReadonlyView: MethodDecorator = <T>(_target: Object, _propertyKey: string | symbol, _descriptor: TypedPropertyDescriptor<T>) => {};

/**
 * An event that can be emitted as part of the processing of the
 * smart contract. Subclass this, add fields and a constructor,
 * and then simply call `.emit()` in your code to emit it.
 */
export interface Event {
  [key: string]: PRIMITIVE;
}

export class Contract {
  // block number
  readonly blockNumber: number;

  // block.timestamp
  readonly timestamp30secondGranularity: number;

  // msg.sender
  readonly sender: ADDRESS;

  // msg.value
  readonly transactionAmountWei: number;
}


export class ETH {

  /**
   * One "wei". Equal to 1/10^18 of one ETH.
   */
  readonly wei: number = 1;

  /**
   * The nunber of wei in one ETH.
   */
  readonly eth: number = Math.pow(10, 18);

  public static assert(cond: boolean) {
    throw new Error("Stubbed.");
  }

  public static log(event: Event) {
    throw new Error("Stubbed.");
  }

  public static transferToSenderWei(address: ADDRESS, amount: number): boolean {
    throw new Error("Stubbed.");
  }
}
