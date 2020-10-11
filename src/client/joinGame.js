import {
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  PublicKey,
} from "@solana/web3.js";
import { url } from "../../url";
import { sendAndConfirmTransaction } from "./util/send-and-confirm-transaction";
import { Store } from "./util/store";
import { newAccountWithLamports } from "./util/new-account-with-lamports";
import { Connection } from "@solana/web3.js";
import { reportGameState } from "./util/report_game_state";


const joinGame = async () => {
  const store = new Store();

  let gameConfig = await store.load("game.json");
  if (!gameConfig.gameAccountPubkey) {
    throw new Error(
      "Game config file contains JSON data but not the gameAccountPubkey"
    );
  }

  const gameAccountPubkey = new PublicKey(gameConfig.gameAccountPubkey);

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

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: payerAccount.publicKey, isSigner: true, isWritable: false },
      { pubkey: gameAccountPubkey, isSigner: false, isWritable: true },
    ],
    programId,
    data: Uint8Array.of(1),
  });

  try {
    await sendAndConfirmTransaction(
      "sendCommand",
      connection,
      new Transaction().add(instruction),
      payerAccount
    );
  } catch (err) {
    console.log(err.message);
  }
  
  const gameArr = await reportGameState(connection, gameAccountPubkey);
  const joiningAccountPubKeyFromGameArr = new PublicKey(gameArr.slice(33, 65));
  console.log(
    `Joining account has been successfully saved: ${payerAccount.publicKey.equals(
      joiningAccountPubKeyFromGameArr
    )}`
  );
};

joinGame();
