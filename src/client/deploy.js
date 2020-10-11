import {
  Account,
  Connection,
  BpfLoader,
  BPF_LOADER_DEPRECATED_PROGRAM_ID,
} from "@solana/web3.js";
import fs from "mz/fs";

import { url } from "../../url";
import { Store } from "./util/store";
import { newAccountWithLamports } from "./util/new-account-with-lamports";

const pathToProgram = "dist/program/solchess.so";

export const deploy = async () => {
  const store = new Store();

  try {
    let deployConfig = await store.load("deploy.json");
    if (!deployConfig.programId) {
      throw new Error(
        "Deployment config file contains JSON data but not the programId"
      );
    } else {
      console.log(
        "Program is already deployed at address: " + deployConfig.programId
      );
      return;
    }
  } catch (e) {}

  const connection = new Connection(url, "recent");
  const version = await connection.getVersion();
  console.log("Connection to cluster established:", url, version);

  let fees = 0;
  const { feeCalculator } = await connection.getRecentBlockhash();

  // Calculate the cost to load the program
  const program = await fs.readFile(pathToProgram);
  const NUM_RETRIES = 500; // allow some number of retries
  fees +=
    feeCalculator.lamportsPerSignature *
      (BpfLoader.getMinNumSignatures(program.length) + NUM_RETRIES) +
    (await connection.getMinimumBalanceForRentExemption(program.length));

  // Calculate the cost of sending the transactions
  fees += feeCalculator.lamportsPerSignature * 100;

  // Fund deployment payer
  let payerAccount = await newAccountWithLamports(connection, fees);
  console.log(`Using account ${payerAccount.publicKey} to pay for deployment`);

  // Load the program
  console.log("Loading program, this may take a minute...");
  const data = await fs.readFile(pathToProgram);
  const programAccount = new Account();
  await BpfLoader.load(
    connection,
    payerAccount,
    programAccount,
    data,
    BPF_LOADER_DEPRECATED_PROGRAM_ID
  );
  let programId = programAccount.publicKey;
  console.log("Program loaded to account", programId.toBase58());
  console.log("Saving programId to store...");
  await store.save("deploy.json", { programId: programId.toBase58() });
};

deploy();
