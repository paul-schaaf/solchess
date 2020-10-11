use solana_sdk::{info, program_error::ProgramError};

use num_traits::FromPrimitive;

#[derive(FromPrimitive, ToPrimitive)]
pub enum Command {
    Create,
    Join,
    MakeMove,
}

impl Command {
    pub fn deserialize_command(command_index: u8) -> Result<Self, ProgramError> {
        if command_index > 2 {
            info!("Invalid command");
            return Err(ProgramError::InvalidArgument);
        }
        Ok(Command::from_u8(command_index).unwrap())
    }
}
