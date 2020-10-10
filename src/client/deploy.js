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
  let deployConfig;
  const store = new Store();

  try {
    deployConfig = await store.load("deploy.json");
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
  await store.save("deploy.json", { programId: programId.toBase58() });
};

/**
 * Report the state of the game
 */
export async function reportGameState() {
  const accountInfo = await connection.getAccountInfo(gameAccountPubKey);
  if (accountInfo === null) {
    throw "Error: cannot find the game account";
  }
  const info = gameArrDataLayout.decode(Buffer.from(accountInfo.data));
  let string = "";
  for (let i = 0; i < info.game_arr.length; i++) {
    if (i !== info.game_arr.length - 1) {
      if ((i + 1) % 8 === 0 && i !== 0) {
        string += info.game_arr[i] + ",\n";
      } else {
        string += info.game_arr[i] + ", ";
      }
    }
  }
  console.log(string);
}
