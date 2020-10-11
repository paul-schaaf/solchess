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
import { reportGameState } from "./util/report_game_state";
import {gameAccountDataLayout} from "./util/game-data-layout";

const createGame = async () => {
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

  const gameArr = await reportGameState(connection, gameAccount.publicKey);
  const creatorAccountPubKeyFromGameArr = new PublicKey(gameArr.slice(1, 33));
  console.log(
    `Creator account has been successfully saved: ${payerAccount.publicKey.equals(
      creatorAccountPubKeyFromGameArr
    )}`
  );

  console.log("Saving game state to store...");
  await store.save("game.json", {
    gameAccountPubkey: gameAccount.publicKey.toBase58(),
  });
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

createGame();
