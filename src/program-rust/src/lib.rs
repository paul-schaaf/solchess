#![cfg(feature = "program")]

#[macro_use]
extern crate num_derive;
use num_traits::ToPrimitive;

mod command;
mod game_acc_state;

use command::Command;
use game_acc_state::GameAccState;

use solana_sdk::{
    account_info::{next_account_info, AccountInfo},
    entrypoint_deprecated,
    entrypoint_deprecated::ProgramResult,
    info,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use std::mem;

use legal_chess::game::Game;

// Declare and export the program's entrypoint
entrypoint_deprecated!(process_instruction);

// Program entrypoint's implementation
fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    info!("Solchess Entrypoint");

    let accounts_iter = &mut accounts.iter();

    let creator_account = next_account_info(accounts_iter)?;
    assert!(creator_account.is_signer);

    let game_acc = next_account_info(accounts_iter)?;
    assert!(game_acc.is_signer);

    let command = Command::deserialize_command(instruction_data[0])?;

    match command {
        Command::Create => create_game(&game_acc, &creator_account, program_id)?,
        Command::Join => info!("Join Command"),
        Command::MakeMove => info!("MakeMoveCommand"),
    };

    Ok(())
}

fn create_game(
    game_acc: &AccountInfo,
    creator_acc: &AccountInfo,
    program_id: &Pubkey,
) -> ProgramResult {
    info!("Received create game command");
    if game_acc.try_data_len()? < mem::size_of::<u8>() * 138 {
        info!("Game account data length too small to hold game state");
        return Err(ProgramError::AccountDataTooSmall);
    }

    if game_acc.owner != program_id {
        info!("Game account is not owned by this program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut data = game_acc.try_borrow_mut_data()?;
    if data[0] != 0 {
        info!("Account has already been used to create game");
        return Err(ProgramError::Custom(1337));
    }

    data[0] = GameAccState::Created.to_u8().unwrap();

    let creator_pubkey = creator_acc.key.to_bytes();

    for x in 1..creator_pubkey.len() + 1 {
        data[x] = creator_pubkey[x - 1];
    }

    let game = Game::new();
    let game_arr = game.to_game_arr();

    for x in 65..game_arr.len() + 65 {
        data[x] = game_arr[x - 65];
    }

    Ok(())
}

// Required to support info! in tests
#[cfg(not(target_arch = "bpf"))]
solana_sdk::program_stubs!();
