# tesc
## [WIP] Typescript Ethereum Smart Contracts
======

This is a WIP Typescript front-end for writing Ethereum smart contracts.

This project has two main purposes;

1. Develop a substantial TypeScript frontend for ETH contracts which we can use
to target [eWasm](https://github.com/ewasm/design) when this project comes to fruition.
At that point, we may opt to compile the Typescript frontend [directly to LLVM bytecode](https://github.com/nervosnetwork/minits)
to then convert to a wasm representation.

2. Allow the TypeScript frontend to become useful today by compiling directly
to a provably equivalent Solidity contract.

READ:

- This is not fully implemented or tested. See (LICENSE) for more information, but I'm
not responsible for any smart contracts that are constructed or deployed as a result of the usage
of this compilation step.

- This project needs help. See CONTRIB if you're interested.

VISION:

1. Target either EVM/eWasm bytecode or Solidity for backwards compatibility.
2. Deploy directly from command line.
3. Offer a unit testing framework that executes the actual javascript with jest, mocking out
any chain-bound operations.
4. Build an entire web-based development environment on top of ETH+TS.

TECHNICAL NOTES:

1. Solidity has a ton of keywords. Some of them I've moved into annotations, others I've
omitted entirely. I don't think the standard developer needs full access to all of solidity's language
features, and I'm willing to bet folks will accept this trade-off for a more familiar environment.

2. This is fully a WIP. Only the basic smart contract I've included "works" (see bank.ts/bank.sol).
There are many more syntax forms to support and validate here.

CONTRIBUTING:

- Feel free to fork + submit a PR. Let's get this up and running ASAP.
- You'll need to install ts-node to run the script. `npm i ts-node`. Then, `make run`.
- In my code, I currently output directly to a text buffer. This project should ideally
construct an equivalent solidity AST/IR, which then is output to file.
