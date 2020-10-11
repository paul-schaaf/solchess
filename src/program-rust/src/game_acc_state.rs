#[derive(FromPrimitive, ToPrimitive)]
pub enum GameAccState {
    Uninitialized,
    WaitingForJoin,
    Joined,
    Ongoing,
}
