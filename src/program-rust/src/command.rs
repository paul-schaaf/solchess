#[derive(FromPrimitive, ToPrimitive)]
pub enum Command {
    Create,
    Join,
    MakeMove,
}
