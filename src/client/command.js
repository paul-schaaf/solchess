import {
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  PublicKey,
  Account,
  SystemProgram,
} from "@solana/web3.js";
import { url } from "../../url";
import { sendAndConfirmTransaction } from "./util/send-and-confirm-transaction";
import { Store } from "./util/store";
import { newAccountWithLamports } from "./util/new-account-with-lamports";
import { Connection } from "@solana/web3.js";
import * as BufferLayout from "buffer-layout";

const gameAccountDataLayout = BufferLayout.struct([
  BufferLayout.seq(BufferLayout.u8(), 138, "game_arr"),
]);

const sendCommand = async () => {
  const store = new Store();

  let deployConfig = await store.load("deploy.json");
  if (!deployConfig.programId) {
    throw new Error(
      "Deployment config file contains JSON data but not the programId"
    );
  }

  const programId = new PublicKey(deployConfig.programId);

  const connection = new Connection(url, "recent");
  let payerAccount = await newAccountWithLamports(
    connection,
    LAMPORTS_PER_SOL * 5
  );

  const gameAccount = await createGameAccount(
    payerAccount,
    connection,
    programId
  );

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: payerAccount.publicKey, isSigner: true, isWritable: false },
      { pubkey: gameAccount.publicKey, isSigner: true, isWritable: true },
    ],
    programId,
    data: Uint8Array.of(0),
  });

  try {
    await sendAndConfirmTransaction(
      "sendCommand",
      connection,
      new Transaction().add(instruction),
      payerAccount,
      gameAccount
    );
  } catch (err) {
    console.log(err.message);
  }

  const gameArr = await reportGameState(connection, gameAccount);
  const creatorAccountPubKeyFromGameArr = new PublicKey(gameArr.slice(1, 33));
  console.log(
    `Creator account has been successfully saved: ${payerAccount.publicKey.equals(
      creatorAccountPubKeyFromGameArr
    )}`
  );
};

const createGameAccount = async (payerAccount, connection, programId) => {
  const gameAccount = new Account();
  let gameAccountPubkey = gameAccount.publicKey;
  const space = gameAccountDataLayout.span;
  const lamports = await connection.getMinimumBalanceForRentExemption(
    gameAccountDataLayout.span
  );
  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payerAccount.publicKey,
      newAccountPubkey: gameAccountPubkey,
      lamports,
      space,
      programId,
    })
  );
  await sendAndConfirmTransaction(
    "createAccount",
    connection,
    transaction,
    payerAccount,
    gameAccount
  );

  return gameAccount;
};

async function reportGameState(connection, gameAccount) {
  const accountInfo = await connection.getAccountInfo(gameAccount.publicKey);
  if (accountInfo === null) {
    throw "Error: cannot find the game account";
  }
  const info = gameAccountDataLayout.decode(Buffer.from(accountInfo.data));

  let gameState = info.game_arr[0];
  console.log(`Game State: ${gameState}`);

  let gameArr = info.game_arr.slice(1);

  let string = "";
  for (let i = 0; i < gameArr.length; i++) {
    if (i !== gameArr.length - 1) {
      if ((i + 1) % 8 === 0 && i !== 0) {
        string += gameArr[i] + ",\n";
      } else {
        string += gameArr[i] + ", ";
      }
    } else {
      string += gameArr[i];
    }
  }
  console.log(string);
  return info.game_arr;
}

sendCommand();
