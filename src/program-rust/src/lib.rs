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

    let player_account = next_account_info(accounts_iter)?;
    if !player_account.is_signer {
        info!("Player account needs to sign");
        return Err(ProgramError::MissingRequiredSignature);
    }

    let game_acc = next_account_info(accounts_iter)?;

    if game_acc.owner != program_id {
        info!("Game account is not owned by this program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if game_acc.try_data_len()? < mem::size_of::<u8>() * 138 {
        info!("Game account data length too small to hold game state");
        return Err(ProgramError::AccountDataTooSmall);
    }

    let command = Command::deserialize_command(instruction_data[0])?;
    match command {
        Command::Create => create_game(&game_acc, &player_account)?,
        Command::Join => join_command(&game_acc, &player_account)?,
        Command::MakeMove => info!("MakeMoveCommand"),
    };

    Ok(())
}

fn create_game(game_acc: &AccountInfo, creator_acc: &AccountInfo) -> ProgramResult {
    info!("Received create game command");

    if !game_acc.is_signer {
        info!("Game account needs to sign");
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut data = game_acc.try_borrow_mut_data()?;
    if data[0] != GameAccState::Uninitialized.to_u8().unwrap() {
        info!("Account has already been used to create game");
        return Err(ProgramError::Custom(1337));
    }

    data[0] = GameAccState::WaitingForJoin.to_u8().unwrap();

    let creator_pubkey = creator_acc.key.to_bytes();

    for x in 1..33 {
        data[x] = creator_pubkey[x - 1];
    }

    let game = Game::new();
    let game_arr = game.to_game_arr();

    for x in 65..138 {
        data[x] = game_arr[x - 65];
    }

    Ok(())
}

fn join_command(game_acc: &AccountInfo, joining_acc: &AccountInfo) -> ProgramResult {
    let mut data = game_acc.try_borrow_mut_data()?;
    if data[0] != GameAccState::WaitingForJoin.to_u8().unwrap() {
        info!("Game account is not waiting for someone to join");
        return Err(ProgramError::Custom(1337));
    }

    data[0] = GameAccState::Joined.to_u8().unwrap();

    let joining_player_pubkey = joining_acc.key.to_bytes();

    for x in 33..65 {
        data[x] = joining_player_pubkey[x - 33];
    }

    Ok(())
}

// Required to support info! in tests
#[cfg(not(target_arch = "bpf"))]
solana_sdk::program_stubs!();
