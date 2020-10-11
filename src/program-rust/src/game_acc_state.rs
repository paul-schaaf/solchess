use num_traits::ToPrimitive;

#[derive(FromPrimitive, ToPrimitive)]
pub enum GameAccState {
    Uninitialized,
    WaitingForJoin,
    Ongoing,
    Over
}

impl GameAccState { 
    pub fn to_number(&self) -> u8{
        self.to_u8().unwrap()
    }
}
