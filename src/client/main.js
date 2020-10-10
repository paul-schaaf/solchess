import {
  establishConnection,
  establishPayer,
  loadProgram,
  sayHello,
  reportGameState,
  deploy,
} from "./deploy";

async function main() {
  await deploy();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .then(() => process.exit());
