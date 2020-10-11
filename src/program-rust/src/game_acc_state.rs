#[derive(FromPrimitive, ToPrimitive)]
pub enum GameAccState {
    Created,
    WaitingForJoin,
}
