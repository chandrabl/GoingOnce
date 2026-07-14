#![no_std]

//! GoingOnce — a single-lot, on-chain English auction.
//!
//! Flow:
//! 1. `initialize` — the admin lists one lot: name, description, a
//!    starting price, a minimum increment, and an end time (unix
//!    seconds).
//! 2. `bid`        — any address bids, as long as it beats the current
//!    highest bid by at least `min_increment` and the auction hasn't
//!    closed. Emits a `bid` event with the new high bid and bidder so
//!    every connected viewer's board updates without polling reads.
//! 3. `end_auction` — the admin (or anyone, once the end time has
//!    passed) closes the lot. Emits `ended` with the winner and price.
//!
//! Settlement (actually moving funds to pay for the lot) is
//! intentionally out of scope here — this contract is the bidding
//! ledger of record, not an escrow. See the README for why.

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol};

#[derive(Clone)]
#[contracttype]
pub struct Auction {
    pub item_name: String,
    pub description: String,
    pub starting_price: i128,
    pub min_increment: i128,
    pub end_time: u64,
    pub highest_bid: i128,
    pub highest_bidder: Address,
    pub has_bids: bool,
    pub admin: Address,
    pub ended: bool,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Auction,
}

const BID_EVENT: Symbol = symbol_short!("bid");
const END_EVENT: Symbol = symbol_short!("ended");

#[contract]
pub struct GoingOnceContract;

#[contractimpl]
impl GoingOnceContract {
    /// List the lot. Can only be called once per contract instance.
    /// `highest_bidder` is initialized to `admin` as a placeholder —
    /// `has_bids` is the real signal for "no bids yet", so the
    /// placeholder is never treated as a winner.
    pub fn initialize(
        env: Env,
        admin: Address,
        item_name: String,
        description: String,
        starting_price: i128,
        min_increment: i128,
        end_time: u64,
    ) {
        admin.require_auth();

        if env.storage().instance().has(&DataKey::Auction) {
            panic!("auction already initialized");
        }
        if starting_price <= 0 || min_increment <= 0 {
            panic!("starting price and increment must be positive");
        }
        if end_time <= env.ledger().timestamp() {
            panic!("end time must be in the future");
        }

        let auction = Auction {
            item_name,
            description,
            starting_price,
            min_increment,
            end_time,
            highest_bid: 0,
            highest_bidder: admin.clone(),
            has_bids: false,
            admin,
            ended: false,
        };

        env.storage().instance().set(&DataKey::Auction, &auction);
        env.storage().instance().extend_ttl(100_000, 518_400);
    }

    /// Place a bid. Must beat the current high bid (or the starting
    /// price, if no bids yet) by at least `min_increment`, and the
    /// auction must still be open.
    pub fn bid(env: Env, bidder: Address, amount: i128) {
        bidder.require_auth();

        let mut auction: Auction = env
            .storage()
            .instance()
            .get(&DataKey::Auction)
            .expect("auction not initialized");

        if auction.ended || env.ledger().timestamp() >= auction.end_time {
            panic!("auction has closed");
        }

        let floor = if auction.has_bids {
            auction.highest_bid + auction.min_increment
        } else {
            auction.starting_price
        };

        if amount < floor {
            panic!("bid too low");
        }
        if auction.has_bids && bidder == auction.highest_bidder {
            panic!("you already hold the highest bid");
        }

        auction.highest_bid = amount;
        auction.highest_bidder = bidder.clone();
        auction.has_bids = true;

        env.storage().instance().set(&DataKey::Auction, &auction);

        env.events().publish((BID_EVENT,), (bidder, amount));
    }

    /// Close the lot. The admin can end it any time; anyone can end it
    /// once the end time has passed (so a stalled auction doesn't sit
    /// open forever waiting on the admin).
    pub fn end_auction(env: Env, caller: Address) {
        caller.require_auth();

        let mut auction: Auction = env
            .storage()
            .instance()
            .get(&DataKey::Auction)
            .expect("auction not initialized");

        if auction.ended {
            panic!("auction already ended");
        }

        let time_is_up = env.ledger().timestamp() >= auction.end_time;
        if caller != auction.admin && !time_is_up {
            panic!("only the admin can end this auction early");
        }

        auction.ended = true;
        env.storage().instance().set(&DataKey::Auction, &auction);

        env.events()
            .publish((END_EVENT,), (auction.highest_bidder.clone(), auction.highest_bid));
    }

    /// Read the full auction state.
    pub fn get_auction(env: Env) -> Auction {
        env.storage()
            .instance()
            .get(&DataKey::Auction)
            .expect("auction not initialized")
    }
}

mod test;
