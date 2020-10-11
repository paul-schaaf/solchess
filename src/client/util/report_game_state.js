import { gameAccountDataLayout } from "./game-data-layout";

export async function reportGameState(connection, gameAccountPublicKey) {
  const accountInfo = await connection.getAccountInfo(gameAccountPublicKey);
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
