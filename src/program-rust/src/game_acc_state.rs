#[derive(FromPrimitive, ToPrimitive)]
pub enum GameAccState {
    Uninitialized,
    Created,
    WaitingForJoin,
}
