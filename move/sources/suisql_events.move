module suisql::suisql_events {
    use sui::event;
    use std::ascii::{String};

    public struct NewBankEvent has copy, drop {
        id: address,
    }

    public(package) fun emit_new_bank_event(
        id: &object::ID,
    ) {
        event::emit(NewBankEvent {
            id: object::id_to_address(id),
        })
    }

    public struct NewDBEvent has copy, drop {
        id: address,
        name: std::ascii::String,
        write_cap_id: address,
    }

    public(package) fun emit_new_db_event(
        id: &object::ID,
        name: std::ascii::String,
        write_cap_id: &object::ID,
    ) {
        event::emit(NewDBEvent {
            id: object::id_to_address(id),
            name: name,
            write_cap_id: object::id_to_address(write_cap_id),
        })
    }

    public struct RemindDBEvent has copy, drop {
        id: address,
        name: std::ascii::String,
    }

    public(package) fun emit_remind_db_event(
        id: address,
        name: std::ascii::String,
    ) {
        event::emit(RemindDBEvent {
            id: id,
            name: name,
        })
    }
}