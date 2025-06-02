#[allow(unexpected_cfgs)]
use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

declare_id!("8ZYbvge282tfWmbg5MtDaWTicbbj46zDT8HKynnvC9Qn");

#[program]
pub mod blueshift_anchor_vault {
    use super::*;

    pub fn deposit(ctx: Context<Vault_Action>, amount: u64) -> Result<()> {
        // check if valut is already use
        require_eq!(
            ctx.accounts.vault.lamports(),
            0,
            VaultError::VaultAlreadyExists
        );

        // check for the minimum rent needed is bigger than the amount user want to store
        require_gt!(
            amount,
            Rent::get()?.minimum_balance(0),
            VaultError::InvalidAmmount
        );

        // CPI call for transfer token from signer to vault
        let programs = ctx.accounts.system_program.to_account_info();

        let cpi_context = CpiContext::new(
            programs,
            Transfer {
                from: ctx.accounts.signer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );

        transfer(cpi_context, amount)?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Vault_Action>) -> Result<()> {
        // for withdraw we need to transfer from vault to signer (user)
        // so vault have to sign that trasaction it is job of pda's
        // to sign trasaction we use signer seeds that are &[&[&[]]]

        let programs = ctx.accounts.system_program.to_account_info();

        let accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.signer.to_account_info(),
        };

        let binding = ctx.accounts.signer.key();

        let seeds = &[b"vault", binding.as_ref(), &[ctx.bumps.vault]];

        let signer_seeds = &[&seeds[..]];

        let cpi_context = CpiContext::new_with_signer(programs, accounts, signer_seeds);

        transfer(cpi_context, ctx.accounts.vault.lamports())?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Vault_Action<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", signer.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum VaultError {
    #[msg("Vault already exists!")]
    VaultAlreadyExists,

    #[msg("Invalid Amount!")]
    InvalidAmmount,
}
