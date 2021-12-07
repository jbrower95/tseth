
import {ETH, ADDRESS, PRIMITIVE, UNSIGNED_INT, Event, Contract, ReadonlyView} from './eth';

class BankContract extends Contract {

  #balances: Map<ADDRESS, UNSIGNED_INT>; // Stores the numerical mapping of account balances.
  owner: ADDRESS;    // The owner of the bank contract.

  constructor() {
    super();
    this.owner = this.sender;
  }

   @ReadonlyView
   balance(): number {
     return this.#balances[this.sender];
   }

  deposit(): number {
    const balance: number = this.#balances[this.sender];
    const newBalance: number = balance + this.transactionAmountWei; // should guard all additions like this.
    ETH.assert(newBalance >= balance);
    this.#balances[this.sender] = newBalance;
    // ETH.log({sender: this.sender, txn: this.transactionAmountWei});
    return newBalance;
  }

  withdraw(amount: number): number {
    const balance = this.#balances[this.sender];
    ETH.assert(amount <= balance);
    this.#balances[this.sender] -= amount;
    ETH.transferToSenderWei(amount);
    return this.#balances[this.sender];
  }
}
