import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  Account,
} from "@solana/web3.js";
import { url } from "../../url";
import { sendAndConfirmTransaction } from "./util/send-and-confirm-transaction";
import { Store } from "./util/store";
import { Connection } from "@solana/web3.js";
import { reportGameState } from "./util/report_game_state";

const makeMove = async () => {
  let args = process.argv.slice(2);
  console.log(args);
  if (args.length < 5) {
    throw new Error("Missing arguments");
  }

  const store = new Store();

  let gameConfig = await store.load("game.json");
  if (!gameConfig.gameAccountPubkey) {
    throw new Error(
      "Game config file contains JSON data but not the gameAccountPubkey"
    );
  } else if (!gameConfig.player_two_secret) {
    throw new Error(
      "Game config file contains JSON data but not the player_two_secret"
    );
  } else if (!gameConfig.player_one_secret) {
    throw new Error(
      "Game config file contains JSON data but not the player_one_secret"
    );
  }

  const gameAccountPubkey = new PublicKey(gameConfig.gameAccountPubkey);

  let player_acc;
  if (args[0].toLowerCase() === "w") {
    let secret = Object.values(gameConfig.player_one_secret);
    player_acc = new Account(secret);
  } else {
    let secret = Object.values(gameConfig.player_two_secret);
    player_acc = new Account(secret);
  }

  let deployConfig = await store.load("deploy.json");
  if (!deployConfig.programId) {
    throw new Error(
      "Deployment config file contains JSON data but not the programId"
    );
  }
  const programId = new PublicKey(deployConfig.programId);
  const connection = new Connection(url, "recent");
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: player_acc.publicKey, isSigner: true, isWritable: false },
      { pubkey: gameAccountPubkey, isSigner: false, isWritable: true },
    ],
    programId,
    data: Uint8Array.of(
      2,
      parseInt(args[1]),
      parseInt(args[2]),
      parseInt(args[3]),
      parseInt(args[4])
    ),
  });

  try {
    await sendAndConfirmTransaction(
      "sendCommand",
      connection,
      new Transaction().add(instruction),
      player_acc
    );
  } catch (err) {
    if (
      err.message.includes(`({"err":{"InstructionError":[0,{"Custom":1338}]}})`)
    ) {
      console.log("It's not your turn!");
    } else if (
      err.message.includes(`({"err":{"InstructionError":[0,{"Custom":1338}]}})`)
    ) {
      console.log("The chosen game is not currently ongoing!");
    } else {
      console.log(err);
    }
    return;
  }

  await reportGameState(connection, gameAccountPubkey);
};

makeMove();
