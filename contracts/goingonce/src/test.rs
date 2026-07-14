#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::Env;

fn setup(env: &Env) -> (GoingOnceContractClient, Address) {
    let contract_id = env.register(GoingOnceContract, ());
    let client = GoingOnceContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    (client, admin)
}

fn init_default(env: &Env, client: &GoingOnceContractClient, admin: &Address) {
    let name = String::from_str(env, "Vintage Star Chart");
    let desc = String::from_str(env, "Hand-inked celestial map, circa 1890");
    client.initialize(admin, &name, &desc, &1000i128, &100i128, &(env.ledger().timestamp() + 3600));
}

#[test]
fn test_initialize_and_read() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    init_default(&env, &client, &admin);

    let auction = client.get_auction();
    assert_eq!(auction.starting_price, 1000);
    assert_eq!(auction.has_bids, false);
    assert_eq!(auction.ended, false);
}

#[test]
fn test_first_bid_must_meet_starting_price() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    init_default(&env, &client, &admin);

    let bidder = Address::generate(&env);
    let result = client.try_bid(&bidder, &999i128);
    assert!(result.is_err());

    client.bid(&bidder, &1000i128);
    let auction = client.get_auction();
    assert_eq!(auction.highest_bid, 1000);
    assert_eq!(auction.highest_bidder, bidder);
}

#[test]
fn test_second_bid_must_meet_increment() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    init_default(&env, &client, &admin);

    let bidder1 = Address::generate(&env);
    let bidder2 = Address::generate(&env);
    client.bid(&bidder1, &1000i128);

    let result = client.try_bid(&bidder2, &1050i128);
    assert!(result.is_err());

    client.bid(&bidder2, &1100i128);
    let auction = client.get_auction();
    assert_eq!(auction.highest_bid, 1100);
    assert_eq!(auction.highest_bidder, bidder2);
}

#[test]
fn test_cannot_outbid_self() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    init_default(&env, &client, &admin);

    let bidder = Address::generate(&env);
    client.bid(&bidder, &1000i128);
    let result = client.try_bid(&bidder, &1200i128);
    assert!(result.is_err());
}

#[test]
fn test_bid_after_end_time_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    init_default(&env, &client, &admin);

    env.ledger().with_mut(|l| l.timestamp += 7200);

    let bidder = Address::generate(&env);
    let result = client.try_bid(&bidder, &1000i128);
    assert!(result.is_err());
}

#[test]
fn test_admin_can_end_early_others_cannot() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    init_default(&env, &client, &admin);

    let stranger = Address::generate(&env);
    let result = client.try_end_auction(&stranger);
    assert!(result.is_err());

    client.end_auction(&admin);
    let auction = client.get_auction();
    assert_eq!(auction.ended, true);
}

#[test]
fn test_anyone_can_end_after_time_up() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    init_default(&env, &client, &admin);

    env.ledger().with_mut(|l| l.timestamp += 7200);

    let stranger = Address::generate(&env);
    client.end_auction(&stranger);
    let auction = client.get_auction();
    assert_eq!(auction.ended, true);
}
